import PropTypes from 'prop-types'
import { CSS_FW } from './cssProps'
import { executeAction } from '../../../../common/helpers'
import { getSelectionStyles, themeVars } from '@/theme/theme'
import { normalizeLiteralString, resolveModernPalette, toRgba } from './modernControlUtils'

function asBoolean(value: any) {
  if (value === true || value === false) return value
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (normalized === 'true') return true
    if (normalized === 'false') return false
  }
  return Boolean(value)
}

export default function ModernToggleRenderer({
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
  canvasTheme,
  onMouseDown,
  onClick,
  renderZIndex = 1,
}) {
  const checked = asBoolean(comp.Checked)
  const isViewMode = comp.DisplayMode === 'DisplayMode.View'
  const isDisabledMode = comp.DisplayMode === 'DisplayMode.Disabled'
  const isInteractive = isPlaying && !isViewMode && !isDisabledMode
  const label = normalizeLiteralString(comp.Label, 'Toggle')
  const labelPosition = normalizeLiteralString(comp.LabelPosition || comp.LabelPostion, 'after').toLowerCase()
  const isBelow = labelPosition.includes('below')
  const isBefore = labelPosition.includes('before')
  const { palette, lighter20, foreground } = resolveModernPalette(comp, canvasTheme)
  const textColor = comp.FontColor || canvasTheme?.Colors?.Darker30 || '#1b1a19'
  const trackHeight = Math.max(20, Math.min((comp.Height || 36) - 10, 26))
  const trackWidth = Math.max(38, trackHeight * 1.8)
  const thumbSize = trackHeight - 6

  const handleToggle = () => {
    if (!isInteractive) return
    const nextChecked = !checked
    updateProp?.(comp.id, 'Checked', nextChecked)
    if (nextChecked) {
      executeAction(comp.OnCheck, localVars, setLocalVars, notify, navigate, flatNodes, parentNode, comp)
    } else {
      executeAction(comp.OnUncheck, localVars, setLocalVars, notify, navigate, flatNodes, parentNode, comp)
    }
  }

  const handleClick = (event: any) => {
    onClick(event)
    if (isPlaying && comp.OnSelect) {
      executeAction(comp.OnSelect, localVars, setLocalVars, notify, navigate, flatNodes, parentNode, comp)
    }
    handleToggle()
  }

  const labelNode = (
    <span
      style={{
        color: isDisabledMode ? toRgba(textColor, 0.58) : textColor,
        fontFamily: comp.Font || canvasTheme?.Font || themeVars.fonts.sans,
        fontSize: `${comp.FontSize || 14}pt`,
        fontWeight: CSS_FW[comp.FontWeight] || comp.FontWeight || '400',
        fontStyle: comp.FontItalic ? 'italic' : 'normal',
        textDecoration: [
          comp.FontUnderline ? 'underline' : '',
          comp.FontStrikethrough ? 'line-through' : '',
        ].filter(Boolean).join(' ') || 'none',
        lineHeight: 1.2,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  )

  return (
    <button
      type="button"
      onMouseDown={onMouseDown}
      onClick={handleClick}
      aria-label={normalizeLiteralString(comp.AccessibleLabel) || label}
      aria-checked={checked}
      disabled={isPlaying && (isViewMode || isDisabledMode)}
      style={{
        position: 'absolute',
        left: `${comp.X}pt`,
        top: `${comp.Y}pt`,
        width: `${comp.Width}pt`,
        height: `${comp.Height}pt`,
        display: 'flex',
        flexDirection: isBelow ? 'column' : 'row',
        alignItems: 'center',
        justifyContent: isBelow ? 'center' : 'space-between',
        gap: '10pt',
        padding: '4pt 6pt',
        boxSizing: 'border-box',
        background: 'transparent',
        border: 'none',
        cursor: isInteractive ? 'pointer' : (isPlaying ? 'default' : 'move'),
        opacity: comp.Visible === false ? 0.3 : (isDisabledMode ? 0.58 : 1),
        userSelect: 'none',
        ...getSelectionStyles(selected, 'default'),
        zIndex: renderZIndex,
      }}
    >
      {isBefore && labelNode}
      <span
        aria-hidden="true"
        style={{
          position: 'relative',
          width: `${trackWidth}pt`,
          height: `${trackHeight}pt`,
          borderRadius: `${trackHeight}pt`,
          backgroundColor: checked ? palette : lighter20,
          boxShadow: checked ? `0 0 0 1px ${toRgba(palette, 0.2)}` : `inset 0 1px 2px ${toRgba(palette, 0.08)}`,
          display: 'inline-flex',
          alignItems: 'center',
          transition: 'background-color 0.14s, box-shadow 0.14s',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: '3pt',
            left: checked ? `calc(100% - ${thumbSize + 3}pt)` : '3pt',
            width: `${thumbSize}pt`,
            height: `${thumbSize}pt`,
            borderRadius: '999px',
            backgroundColor: foreground,
            boxShadow: `0 2px 4px ${toRgba('#000000', 0.22)}`,
            transition: 'left 0.14s ease',
          }}
        />
      </span>
      {!isBefore && labelNode}
    </button>
  )
}

ModernToggleRenderer.propTypes = {
  comp: PropTypes.shape({
    id: PropTypes.string.isRequired,
    X: PropTypes.number.isRequired,
    Y: PropTypes.number.isRequired,
    Width: PropTypes.number.isRequired,
    Height: PropTypes.number.isRequired,
    AccessibleLabel: PropTypes.string,
    BasePaletteColor: PropTypes.string,
    Checked: PropTypes.oneOfType([PropTypes.bool, PropTypes.string]),
    DisplayMode: PropTypes.string,
    Font: PropTypes.string,
    FontColor: PropTypes.string,
    FontItalic: PropTypes.bool,
    FontSize: PropTypes.number,
    FontStrikethrough: PropTypes.bool,
    FontUnderline: PropTypes.bool,
    FontWeight: PropTypes.string,
    Label: PropTypes.string,
    LabelPosition: PropTypes.string,
    LabelPostion: PropTypes.string,
    OnCheck: PropTypes.string,
    OnSelect: PropTypes.string,
    OnUncheck: PropTypes.string,
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
  canvasTheme: PropTypes.object,
  renderZIndex: PropTypes.number,
  onMouseDown: PropTypes.func.isRequired,
  onClick: PropTypes.func.isRequired,
}
