import PropTypes from 'prop-types'
import { CSS_FW } from './cssProps'
import { executeAction } from '../../../common/helpers'
import { getSelectionStyles, themeVars } from '@/theme/theme'
import { normalizeLiteralString, resolveModernPalette, toRgba } from './modernControlUtils'

function getSpinnerSize(value: string) {
  const normalized = normalizeLiteralString(value, 'medium').toLowerCase()
  if (normalized.includes('small')) return 16
  if (normalized.includes('large')) return 28
  return 20
}

export default function ModernSpinnerRenderer({
  comp,
  selected,
  isPlaying,
  localVars,
  setLocalVars,
  notify,
  navigate,
  flatNodes,
  parentNode,
  canvasTheme,
  onMouseDown,
  onClick,
  renderZIndex = 1,
}) {
  const isDisabledMode = comp.DisplayMode === 'DisplayMode.Disabled'
  const label = normalizeLiteralString(comp.Label)
  const labelPosition = normalizeLiteralString(comp.LabelPosition || comp.LabelPostion, 'after').toLowerCase()
  const appearance = normalizeLiteralString(comp.Appearance, 'primary').toLowerCase()
  const size = getSpinnerSize(comp.SpinnerSize)
  const { palette, foreground } = resolveModernPalette(comp, canvasTheme)
  const spinnerColor = appearance.includes('invert') ? foreground : palette
  const textColor = comp.FontColor || (appearance.includes('invert') ? foreground : canvasTheme?.Colors?.Darker30 || '#1b1a19')
  const isBelow = labelPosition.includes('below')
  const isBefore = labelPosition.includes('before')

  const handleClick = (event: any) => {
    onClick(event)
    if (isPlaying && comp.OnChange) {
      executeAction(comp.OnChange, localVars, setLocalVars, notify, navigate, flatNodes, parentNode, comp)
    }
  }

  const spinner = (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="9" stroke={toRgba(spinnerColor, 0.18)} strokeWidth="3" />
      <path d="M12 3a9 9 0 0 1 9 9" stroke={spinnerColor} strokeWidth="3" strokeLinecap="round">
        <animateTransform
          attributeName="transform"
          attributeType="XML"
          type="rotate"
          from="0 12 12"
          to="360 12 12"
          dur="0.8s"
          repeatCount="indefinite"
        />
      </path>
    </svg>
  )

  const labelNode = label ? (
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
  ) : null

  return (
    <div
      onMouseDown={onMouseDown}
      onClick={handleClick}
      aria-label={normalizeLiteralString(comp.AccessibleLabel) || label || 'Spinner'}
      style={{
        position: 'absolute',
        left: `${comp.X}pt`,
        top: `${comp.Y}pt`,
        width: `${comp.Width}pt`,
        height: `${comp.Height}pt`,
        display: 'flex',
        flexDirection: isBelow ? 'column' : 'row',
        alignItems: 'center',
        justifyContent: isBelow ? 'center' : 'flex-start',
        gap: isBelow ? '8pt' : '10pt',
        cursor: isPlaying ? 'default' : 'move',
        opacity: comp.Visible === false ? 0.3 : (isDisabledMode ? 0.58 : 1),
        userSelect: 'none',
        ...getSelectionStyles(selected, 'default'),
        zIndex: renderZIndex,
      }}
    >
      {isBefore && labelNode}
      {spinner}
      {!isBefore && labelNode}
    </div>
  )
}

ModernSpinnerRenderer.propTypes = {
  comp: PropTypes.shape({
    X: PropTypes.number.isRequired,
    Y: PropTypes.number.isRequired,
    Width: PropTypes.number.isRequired,
    Height: PropTypes.number.isRequired,
    AccessibleLabel: PropTypes.string,
    Appearance: PropTypes.string,
    BasePaletteColor: PropTypes.string,
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
    OnChange: PropTypes.string,
    SpinnerSize: PropTypes.string,
    Visible: PropTypes.bool,
  }).isRequired,
  selected: PropTypes.bool,
  isPlaying: PropTypes.bool,
  localVars: PropTypes.object,
  setLocalVars: PropTypes.func,
  notify: PropTypes.func,
  navigate: PropTypes.func,
  flatNodes: PropTypes.array,
  parentNode: PropTypes.object,
  canvasTheme: PropTypes.object,
  renderZIndex: PropTypes.number,
  onMouseDown: PropTypes.func.isRequired,
  onClick: PropTypes.func.isRequired,
}
