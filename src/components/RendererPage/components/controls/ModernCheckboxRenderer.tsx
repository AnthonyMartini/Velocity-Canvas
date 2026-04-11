import PropTypes from 'prop-types'
import { CSS_FW } from './cssProps'
import { executeAction } from '../../../../common/helpers'
import { getSelectionStyles, themeVars } from '@/theme/theme'
import { normalizeLiteralString, resolveModernPalette, toRgba } from './modernControlUtils'

export default function ModernCheckboxRenderer({
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
  const isViewMode = comp.DisplayMode === 'DisplayMode.View'
  const isDisabledMode = comp.DisplayMode === 'DisplayMode.Disabled'
  const isInteractive = isPlaying && !isViewMode && !isDisabledMode
  const checked = comp.Checked === true || comp.Checked === 'true'
  const label = normalizeLiteralString(comp.Label, 'Checkbox')
  const { palette, lighter30, lighter10, foreground } = resolveModernPalette(comp, canvasTheme)
  const textColor = comp.FontColor || canvasTheme?.Colors?.Darker30 || '#1b1a19'

  const toggleChecked = (nextChecked: boolean) => {
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
    if (!isInteractive) return
    toggleChecked(!checked)
  }

  return (
    <button
      type="button"
      onMouseDown={onMouseDown}
      onClick={handleClick}
      aria-label={normalizeLiteralString(comp.AccessibleLabel) || undefined}
      aria-checked={checked}
      disabled={isPlaying && (isViewMode || isDisabledMode)}
      style={{
        position: 'absolute',
        left: `${comp.X}pt`,
        top: `${comp.Y}pt`,
        width: `${comp.Width}pt`,
        height: `${comp.Height}pt`,
        display: 'flex',
        alignItems: 'center',
        gap: '10pt',
        padding: '4pt 6pt',
        background: 'transparent',
        border: 'none',
        color: isDisabledMode ? toRgba(textColor, 0.58) : textColor,
        fontFamily: comp.Font || canvasTheme?.Font || themeVars.fonts.sans,
        fontSize: `${comp.FontSize || 14}pt`,
        fontWeight: CSS_FW[comp.FontWeight] || comp.FontWeight || '400',
        fontStyle: comp.FontItalic ? 'italic' : 'normal',
        textDecoration: [
          comp.FontUnderline ? 'underline' : '',
          comp.FontStrikethrough ? 'line-through' : '',
        ].filter(Boolean).join(' ') || 'none',
        cursor: isInteractive ? 'pointer' : (isPlaying ? 'default' : 'move'),
        opacity: comp.Visible === false ? 0.3 : (isDisabledMode ? 0.58 : 1),
        userSelect: 'none',
        textAlign: 'left',
        ...getSelectionStyles(selected, 'default'),
        zIndex: renderZIndex,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: '18pt',
          height: '18pt',
          borderRadius: '6pt',
          border: `1.5pt solid ${checked ? palette : (isDisabledMode ? toRgba(palette, 0.22) : lighter10)}`,
          backgroundColor: checked ? palette : lighter30,
          boxShadow: checked ? `0 0 0 1px ${toRgba(palette, 0.18)}` : `inset 0 1px 2px ${toRgba(palette, 0.08)}`,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: foreground,
          transition: 'background-color 0.12s, border-color 0.12s, box-shadow 0.12s',
          flexShrink: 0,
        }}
      >
        {checked && (
          <svg width="11" height="11" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m4.5 10 3.2 3.2L15.5 5.8" />
          </svg>
        )}
      </span>
      <span style={{ lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {label}
      </span>
    </button>
  )
}

ModernCheckboxRenderer.propTypes = {
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
