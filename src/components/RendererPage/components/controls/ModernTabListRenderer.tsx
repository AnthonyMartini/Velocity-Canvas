import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import PropTypes from 'prop-types'
import { executeAction } from '../../../../common/helpers'
import { getSelectionStyles, themeVars } from '@/theme/theme'
import {
  getCollectionItemLabel,
  normalizeLiteralString,
  parseItemsValue,
  parseTabListSelectionRecord,
  stripOuterQuotes,
  toRgba,
} from './modernControlUtils'

const TEXT_ALIGN: Record<string, CSSProperties['textAlign']> = {
  'Align.Left': 'left',
  'Align.Center': 'center',
  'Align.Right': 'right',
}

/** Legacy horizontal distribution (Power Apps); maps to row + justify when Alignment was TabListAlignment.* */
const LEGACY_ALIGNMENT_JUSTIFY: Record<string, string> = {
  'TabListAlignment.Start': 'flex-start',
  'TabListAlignment.Center': 'center',
  'TabListAlignment.End': 'flex-end',
}

const LEGACY_APPEARANCE_MAP: Record<string, string> = {
  'TabListAppearance.Underline': 'TabListAppearance.SubtleCircular',
  'TabListAppearance.Filled': 'TabListAppearance.FilledCircular',
}

/** Scales tab chrome relative to authored Size / padding (TabSize.Medium = baseline). */
const TAB_SIZE_METRICS: Record<
  string,
  {
    fontScale: number
    padScale: number
    minTabWidth: number
    rowGapPt: number
    colGapPx: number
    minHeightFloor: number
    heightTrim: number
  }
> = {
  'TabSize.Small': {
    fontScale: 0.9,
    padScale: 0.88,
    minTabWidth: 58,
    rowGapPt: 6,
    colGapPx: 6,
    minHeightFloor: 24,
    heightTrim: 6,
  },
  'TabSize.Medium': {
    fontScale: 1,
    padScale: 1,
    minTabWidth: 72,
    rowGapPt: 8,
    colGapPx: 8,
    minHeightFloor: 28,
    heightTrim: 6,
  },
  'TabSize.Large': {
    fontScale: 1.1,
    padScale: 1.1,
    minTabWidth: 86,
    rowGapPt: 10,
    colGapPx: 10,
    minHeightFloor: 32,
    heightTrim: 4,
  },
}

function getTabSizeMetrics(comp: any) {
  const key = comp.TabSize || 'TabSize.Medium'
  return TAB_SIZE_METRICS[key] || TAB_SIZE_METRICS['TabSize.Medium']
}

function getTabListFlexLayout(comp: any) {
  const { rowGapPt, colGapPx } = getTabSizeMetrics(comp)
  const raw = comp.Alignment || 'LayoutDirection.Horizontal'
  if (raw === 'LayoutDirection.Vertical') {
    return {
      flexDirection: 'column' as const,
      alignItems: 'stretch' as const,
      justifyContent: 'flex-start' as const,
      gap: `${colGapPx}px`,
    }
  }
  const justify =
    LEGACY_ALIGNMENT_JUSTIFY[raw] ||
    (raw === 'LayoutDirection.Horizontal' ? 'center' : 'center')
  return {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: justify as 'flex-start' | 'center' | 'flex-end',
    gap: `${rowGapPt}pt`,
  }
}

export default function ModernTabListRenderer({
  comp,
  selected,
  isPlaying,
  localVars,
  setLocalVars,
  notify,
  navigate,
  updateProp,
  flatNodes,
  parentNode,
  onMouseDown,
  onClick,
  renderZIndex = 1,
}) {
  const items = useMemo(() => {
    const raw = parseItemsValue(comp.Items, [])
    return raw.filter((item) => String(getCollectionItemLabel(item)).trim() !== '')
  }, [comp.Items])
  const defaultLabel = parseTabListSelectionRecord(comp.Default)
  const selectedLabel =
    parseTabListSelectionRecord(comp.Selected) ||
    defaultLabel ||
    (items[0] !== undefined ? getCollectionItemLabel(items[0]) : '')
  const [activeLabel, setActiveLabel] = useState(selectedLabel)
  const isDisabled = comp.DisplayMode === 'DisplayMode.Disabled'
  const isViewMode = comp.DisplayMode === 'DisplayMode.View'
  const isInteractive = isPlaying && !isDisabled && !isViewMode

  useEffect(() => {
    setActiveLabel(selectedLabel)
  }, [selectedLabel, comp.id])

  const rawAppearance = comp.Appearance || 'TabListAppearance.Subtle'
  const legacyUnderline = rawAppearance === 'TabListAppearance.Underline'
  const appearance = LEGACY_APPEARANCE_MAP[rawAppearance] || rawAppearance
  const textColor = comp.Color || '#1f2937'
  const tabChromeBorderColor = comp.BorderColor || '#d1d5db'
  const subtleFill = toRgba(textColor, 0.08)
  const filledFill = toRgba(textColor, 0.12)

  const isTransparent = appearance === 'TabListAppearance.Transparent'
  const isSubtle = appearance === 'TabListAppearance.Subtle'
  const isSubtleCircular = appearance === 'TabListAppearance.SubtleCircular'
  const isFilledCircular = appearance === 'TabListAppearance.FilledCircular'

  const pillRadius = '9999px'
  const softRadius = '6px'
  const tabBorderRadius =
    isSubtleCircular || isFilledCircular ? pillRadius : legacyUnderline ? '0' : softRadius

  const handleTabClick = (label: string) => {
    if (comp.OnSelect) {
      executeAction(comp.OnSelect, localVars, setLocalVars, notify, navigate, flatNodes, parentNode, comp)
    }

    if (!isInteractive) return

    if (label !== activeLabel && comp.OnChange) {
      executeAction(comp.OnChange, localVars, setLocalVars, notify, navigate, flatNodes, parentNode, comp)
    }

    setActiveLabel(label)
    updateProp?.(comp.id, 'Selected', JSON.stringify({ Value: label }))
  }

  const flexLayout = getTabListFlexLayout(comp)
  const tabSize = getTabSizeMetrics(comp)
  const fontPt = (comp.Size || 15) * tabSize.fontScale
  const padTop = (comp.PaddingTop ?? 10) * tabSize.padScale
  const padRight = (comp.PaddingRight ?? 18) * tabSize.padScale
  const padBottom = (comp.PaddingBottom ?? 10) * tabSize.padScale
  const padLeft = (comp.PaddingLeft ?? 18) * tabSize.padScale
  const tabMinHeight = Math.max(tabSize.minHeightFloor, (comp.Height || 60) - tabSize.heightTrim)
  /** Transparent: text only; a single 2px line sits under the selected tab (no fills). */
  const transparentUnderlineMode = isTransparent

  return (
    <div
      onMouseDown={onMouseDown}
      onClick={onClick}
      style={{
        position: 'absolute',
        left: `${comp.X}pt`,
        top: `${comp.Y}pt`,
        width: `${comp.Width}pt`,
        minHeight: `${comp.Height}pt`,
        display: 'flex',
        flexDirection: flexLayout.flexDirection,
        alignItems: flexLayout.alignItems,
        justifyContent: flexLayout.justifyContent,
        gap: flexLayout.gap,
        opacity: comp.Visible === false ? 0.3 : 1,
        cursor: isInteractive ? 'pointer' : (isPlaying ? 'default' : 'move'),
        userSelect: 'none',
        ...getSelectionStyles(selected),
        zIndex: renderZIndex,
      }}
      aria-label={normalizeLiteralString(comp.AccessibleLabel) || undefined}
    >
      {items.map((item, index) => {
        const label = getCollectionItemLabel(item)
        const isActive = label === activeLabel

        let inactiveBg = 'transparent'
        if (isSubtle || isSubtleCircular) inactiveBg = subtleFill
        if (isFilledCircular) inactiveBg = filledFill

        const showUnderlineChrome = legacyUnderline || (isSubtleCircular && !isFilledCircular)

        let backgroundColor: string
        let color: string
        let borderStyle: string
        let borderWidth: string
        let borderColor: string
        let borderRadiusOut: string
        let boxShadow: string

        if (transparentUnderlineMode) {
          backgroundColor = 'transparent'
          color = isActive ? textColor : toRgba(textColor, 0.62)
          borderStyle = 'none'
          borderWidth = '0'
          borderColor = 'transparent'
          borderRadiusOut = '0'
          boxShadow = 'none'
        } else {
          backgroundColor =
            isFilledCircular && isActive ? textColor : isActive ? subtleFill : inactiveBg
          color =
            isFilledCircular && isActive
              ? '#ffffff'
              : isActive
                ? textColor
                : toRgba(textColor, 0.78)
          borderStyle = showUnderlineChrome
            ? 'solid'
            : comp.BorderStyle === 'BorderStyle.None'
              ? 'none'
              : 'solid'
          borderWidth = showUnderlineChrome ? '0 0 2px 0' : `${comp.BorderThickness || 1}pt`
          borderColor = isActive ? textColor : tabChromeBorderColor
          borderRadiusOut = tabBorderRadius
          boxShadow =
            isActive && !showUnderlineChrome ? `0 1px 2px ${toRgba(textColor, 0.12)}` : 'none'
        }

        return (
          <button
            key={`${label}-${index}`}
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              handleTabClick(label)
            }}
            style={{
              position: 'relative',
              minWidth: flexLayout.flexDirection === 'row' ? `${tabSize.minTabWidth}pt` : undefined,
              width: flexLayout.flexDirection === 'column' ? '100%' : undefined,
              minHeight: `${tabMinHeight}pt`,
              paddingTop: `${padTop}pt`,
              paddingRight: `${padRight}pt`,
              paddingBottom: `${padBottom}pt`,
              paddingLeft: `${padLeft}pt`,
              borderStyle,
              borderWidth,
              borderColor,
              borderRadius: borderRadiusOut,
              backgroundColor,
              color,
              fontFamily: stripOuterQuotes(comp.Font) || themeVars.fonts.sans,
              fontSize: `${fontPt}pt`,
              fontWeight: comp.FontWeight === 'FontWeight.Bold'
                ? 700
                : comp.FontWeight === 'FontWeight.Semibold'
                  ? 600
                  : comp.FontWeight === 'FontWeight.Lighter'
                    ? 300
                    : 400,
              fontStyle: comp.Italic ? 'italic' : 'normal',
              textDecoration: [
                comp.Underline && !showUnderlineChrome ? 'underline' : null,
                comp.Strikethrough ? 'line-through' : null,
              ].filter(Boolean).join(' ') || 'none',
              textAlign: TEXT_ALIGN[comp.Align] || 'center',
              boxShadow,
              transition:
                'background-color 0.12s, color 0.12s, border-color 0.12s, box-shadow 0.12s',
              cursor: isInteractive ? 'pointer' : 'default',
            }}
          >
            {transparentUnderlineMode ? (
              <span style={{ position: 'relative', display: 'inline-block' }}>
                {label}
                {isActive ? (
                  <span
                    aria-hidden
                    style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      bottom: '-3px',
                      height: '2px',
                      borderRadius: '1px',
                      backgroundColor: textColor,
                      transition: 'opacity 0.16s ease-out',
                    }}
                  />
                ) : null}
              </span>
            ) : (
              label
            )}
          </button>
        )
      })}
    </div>
  )
}

ModernTabListRenderer.propTypes = {
  comp: PropTypes.shape({
    id: PropTypes.string.isRequired,
    X: PropTypes.number.isRequired,
    Y: PropTypes.number.isRequired,
    Width: PropTypes.number.isRequired,
    Height: PropTypes.number.isRequired,
    AccessibleLabel: PropTypes.string,
    Align: PropTypes.string,
    Alignment: PropTypes.string,
    Appearance: PropTypes.string,
    TabSize: PropTypes.string,
    BorderColor: PropTypes.string,
    BorderStyle: PropTypes.string,
    BorderThickness: PropTypes.number,
    Color: PropTypes.string,
    Default: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
    DisplayMode: PropTypes.string,
    Font: PropTypes.string,
    FontWeight: PropTypes.string,
    Items: PropTypes.oneOfType([PropTypes.string, PropTypes.array]),
    OnChange: PropTypes.string,
    OnSelect: PropTypes.string,
    Selected: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
    Size: PropTypes.number,
    Visible: PropTypes.bool,
  }).isRequired,
  selected: PropTypes.bool,
  isPlaying: PropTypes.bool,
  localVars: PropTypes.object,
  setLocalVars: PropTypes.func,
  notify: PropTypes.func,
  navigate: PropTypes.func,
  updateProp: PropTypes.func,
  flatNodes: PropTypes.array,
  parentNode: PropTypes.object,
  renderZIndex: PropTypes.number,
  onMouseDown: PropTypes.func.isRequired,
  onClick: PropTypes.func.isRequired,
}
