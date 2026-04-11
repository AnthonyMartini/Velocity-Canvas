import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import PropTypes from 'prop-types'
import { executeAction } from '../../../../common/helpers'
import { getSelectionStyles, themeVars } from '@/theme/theme'
import { getCollectionItemLabel, normalizeLiteralString, parseItemsValue, stripOuterQuotes, toRgba } from './modernControlUtils'

const ALIGNMENT_JUSTIFY: Record<string, string> = {
  'TabListAlignment.Start': 'flex-start',
  'TabListAlignment.Center': 'center',
  'TabListAlignment.End': 'flex-end',
}

const TEXT_ALIGN: Record<string, CSSProperties['textAlign']> = {
  'Align.Left': 'left',
  'Align.Center': 'center',
  'Align.Right': 'right',
}

function parseSelectedValue(value: any) {
  if (typeof value !== 'string') return ''
  return normalizeLiteralString(value)
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
  const items = useMemo(() => parseItemsValue(comp.Items, []), [comp.Items])
  const defaultLabel = parseSelectedValue(comp.Default)
  const selectedLabel = parseSelectedValue(comp.Selected) || defaultLabel || getCollectionItemLabel(items[0])
  const [activeLabel, setActiveLabel] = useState(selectedLabel)
  const isDisabled = comp.DisplayMode === 'DisplayMode.Disabled'
  const isViewMode = comp.DisplayMode === 'DisplayMode.View'
  const isInteractive = isPlaying && !isDisabled && !isViewMode

  useEffect(() => {
    setActiveLabel(selectedLabel)
  }, [selectedLabel, comp.id])

  const appearance = comp.Appearance || 'TabListAppearance.Underline'
  const textColor = comp.Color || '#1f2937'
  const borderColor = comp.BorderColor || '#d1d5db'
  const subtleFill = toRgba(textColor, 0.08)
  const filledFill = toRgba(textColor, 0.12)
  const activeFill = appearance === 'TabListAppearance.Filled' ? textColor : subtleFill
  const activeColor = appearance === 'TabListAppearance.Filled' ? '#ffffff' : textColor

  const handleTabClick = (label: string) => {
    if (comp.OnSelect) {
      executeAction(comp.OnSelect, localVars, setLocalVars, notify, navigate, flatNodes, parentNode, comp)
    }

    if (!isInteractive) return

    if (label !== activeLabel && comp.OnChange) {
      executeAction(comp.OnChange, localVars, setLocalVars, notify, navigate, flatNodes, parentNode, comp)
    }

    setActiveLabel(label)
    updateProp?.(comp.id, 'Selected', JSON.stringify(label))
  }

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
        alignItems: 'center',
        justifyContent: ALIGNMENT_JUSTIFY[comp.Alignment] || 'center',
        gap: '8pt',
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
        const isUnderline = appearance === 'TabListAppearance.Underline'
        const isFilled = appearance === 'TabListAppearance.Filled'
        const isSubtle = appearance === 'TabListAppearance.Subtle'
        const isTransparent = appearance === 'TabListAppearance.Transparent'

        return (
          <button
            key={`${label}-${index}`}
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              handleTabClick(label)
            }}
            style={{
              minWidth: '72pt',
              minHeight: `${Math.max(28, (comp.Height || 60) - 6)}pt`,
              paddingTop: `${comp.PaddingTop || 10}pt`,
              paddingRight: `${comp.PaddingRight || 18}pt`,
              paddingBottom: `${comp.PaddingBottom || 10}pt`,
              paddingLeft: `${comp.PaddingLeft || 18}pt`,
              borderStyle: isUnderline ? 'solid' : (comp.BorderStyle === 'BorderStyle.None' ? 'none' : 'solid'),
              borderWidth: isUnderline ? '0 0 2px 0' : `${comp.BorderThickness || 1}pt`,
              borderColor: isActive ? textColor : borderColor,
              borderRadius: isUnderline
                ? '0'
                : `${comp.RadiusTopLeft || 10}pt ${comp.RadiusTopRight || 10}pt ${comp.RadiusBottomRight || 10}pt ${comp.RadiusBottomLeft || 10}pt`,
              backgroundColor: isActive
                ? activeFill
                : isFilled
                  ? filledFill
                  : isSubtle
                    ? subtleFill
                    : 'transparent',
              color: isActive ? activeColor : (isTransparent ? textColor : toRgba(textColor, 0.78)),
              fontFamily: stripOuterQuotes(comp.Font) || themeVars.fonts.sans,
              fontSize: `${comp.Size || 15}pt`,
              fontWeight: comp.FontWeight === 'FontWeight.Bold'
                ? 700
                : comp.FontWeight === 'FontWeight.Semibold'
                  ? 600
                  : comp.FontWeight === 'FontWeight.Lighter'
                    ? 300
                    : 400,
              fontStyle: comp.Italic ? 'italic' : 'normal',
              textDecoration: [
                comp.Underline && !isUnderline ? 'underline' : null,
                comp.Strikethrough ? 'line-through' : null,
              ].filter(Boolean).join(' ') || 'none',
              textAlign: TEXT_ALIGN[comp.Align] || 'center',
              boxShadow: isActive && !isUnderline ? `0 1px 2px ${toRgba(textColor, 0.12)}` : 'none',
              transition: 'background-color 0.12s, color 0.12s, border-color 0.12s',
              cursor: isInteractive ? 'pointer' : 'default',
            }}
          >
            {label}
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
    BorderColor: PropTypes.string,
    BorderStyle: PropTypes.string,
    BorderThickness: PropTypes.number,
    Color: PropTypes.string,
    Default: PropTypes.string,
    DisplayMode: PropTypes.string,
    Font: PropTypes.string,
    FontWeight: PropTypes.string,
    Items: PropTypes.oneOfType([PropTypes.string, PropTypes.array]),
    OnChange: PropTypes.string,
    OnSelect: PropTypes.string,
    Selected: PropTypes.string,
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
