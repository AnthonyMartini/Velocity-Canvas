import { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { CSS_BORDER_STYLE, CSS_FW } from './cssProps'
import { executeAction } from '../../../common/helpers'
import { getSelectionStyles, themeVars } from '@/theme/theme'
import { normalizeLiteralString, resolveModernPalette, toRgba } from './modernControlUtils'

function resolveInitialValue(comp: any) {
  const liveText = normalizeLiteralString(comp.Text)
  if (liveText) return liveText
  return normalizeLiteralString(comp.Default)
}

function resolveInputType(value: string) {
  const normalized = normalizeLiteralString(value, 'text').toLowerCase()
  if (normalized.includes('password')) return 'password'
  if (normalized.includes('number')) return 'number'
  return 'text'
}

function shouldTriggerOutput(value: any) {
  if (value === false) return false
  if (typeof value === 'string') return value.trim().toLowerCase() !== 'false'
  return true
}

export default function ModernTextInputRenderer({
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
  const [value, setValue] = useState(() => resolveInitialValue(comp))
  const [isFocused, setIsFocused] = useState(false)
  const isDisabledMode = comp.DisplayMode === 'DisplayMode.Disabled'
  const isViewMode = comp.DisplayMode === 'DisplayMode.View'
  const isInteractive = isPlaying && !isDisabledMode && !isViewMode
  const triggerOutput = shouldTriggerOutput(comp.TriggerOutput)
  const validationState = normalizeLiteralString(comp.ValidationState, 'none').toLowerCase()
  const { palette, lighter30, lighter10 } = resolveModernPalette(comp, canvasTheme)
  const borderColor = validationState === 'error'
    ? '#d13438'
    : (isFocused ? palette : (comp.BorderColor || lighter10))

  useEffect(() => {
    setValue(resolveInitialValue(comp))
  }, [comp.id, comp.Default, comp.Text])

  const commitValue = (nextValue: string) => {
    updateProp?.(comp.id, 'Text', nextValue)
    if (comp.OnChange) {
      executeAction(comp.OnChange, localVars, setLocalVars, notify, navigate, flatNodes, parentNode, comp)
    }
  }

  const handleChange = (event: any) => {
    const nextValue = event.target.value
    setValue(nextValue)
    if (isInteractive && triggerOutput) {
      commitValue(nextValue)
    }
  }

  const handleBlur = () => {
    setIsFocused(false)
    if (isInteractive && !triggerOutput) {
      commitValue(value)
    }
  }

  return (
    <div
      onMouseDown={onMouseDown}
      onClick={(event) => {
        onClick(event)
        if (isPlaying && comp.OnSelect) {
          executeAction(comp.OnSelect, localVars, setLocalVars, notify, navigate, flatNodes, parentNode, comp)
        }
      }}
      style={{
        position: 'absolute',
        left: `${comp.X}pt`,
        top: `${comp.Y}pt`,
        width: `${comp.Width}pt`,
        height: `${comp.Height}pt`,
        display: 'flex',
        alignItems: 'stretch',
        padding: 0,
        border: `${comp.BorderThickness || 1}pt ${CSS_BORDER_STYLE[comp.BorderStyle] || 'solid'} ${isDisabledMode ? toRgba(borderColor, 0.4) : borderColor}`,
        borderTopLeftRadius: `${comp.RadiusTopLeft ?? 10}pt`,
        borderTopRightRadius: `${comp.RadiusTopRight ?? 10}pt`,
        borderBottomRightRadius: `${comp.RadiusBottomRight ?? 10}pt`,
        borderBottomLeftRadius: `${comp.RadiusBottomLeft ?? 10}pt`,
        backgroundColor: isDisabledMode ? lighter30 : (comp.Fill || '#ffffff'),
        boxShadow: isFocused ? `0 0 0 3px ${toRgba(palette, 0.14)}` : `0 1px 2px ${toRgba(palette, 0.08)}`,
        opacity: comp.Visible === false ? 0.3 : 1,
        userSelect: isPlaying ? 'auto' : 'none',
        cursor: isInteractive ? 'text' : (isPlaying ? 'default' : 'move'),
        transition: 'border-color 0.12s, box-shadow 0.12s',
        ...getSelectionStyles(selected, 'default'),
        zIndex: renderZIndex,
      }}
    >
      <input
        type={resolveInputType(comp.Type)}
        value={value}
        readOnly={isViewMode || !isPlaying}
        disabled={isPlaying && isDisabledMode}
        maxLength={Number(comp.MaxLength) > 0 ? Number(comp.MaxLength) : undefined}
        placeholder={normalizeLiteralString(comp.Placeholder)}
        onChange={handleChange}
        onFocus={() => setIsFocused(true)}
        onBlur={handleBlur}
        onMouseDown={(event) => {
          if (isPlaying) event.stopPropagation()
        }}
        onClick={(event) => {
          if (isPlaying) event.stopPropagation()
        }}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          outline: 'none',
          borderRadius: 'inherit',
          paddingTop: `${comp.PaddingTop ?? 6}pt`,
          paddingRight: `${comp.PaddingRight ?? 12}pt`,
          paddingBottom: `${comp.PaddingBottom ?? 6}pt`,
          paddingLeft: `${comp.PaddingLeft ?? 12}pt`,
          boxSizing: 'border-box',
          background: 'transparent',
          color: isDisabledMode ? toRgba(comp.Color || '#1f2328', 0.58) : (comp.Color || '#1f2328'),
          fontFamily: comp.Font || canvasTheme?.Font || themeVars.fonts.sans,
          fontSize: `${comp.Size || 14}pt`,
          fontWeight: CSS_FW[comp.FontWeight] || comp.FontWeight || '400',
          fontStyle: comp.Italic ? 'italic' : 'normal',
          textDecoration: [
            comp.Underline ? 'underline' : '',
            comp.Strikethrough ? 'line-through' : '',
          ].filter(Boolean).join(' ') || 'none',
          textAlign: comp.Align === 'Align.Center' ? 'center' : (comp.Align === 'Align.Right' ? 'right' : 'left'),
        }}
      />
    </div>
  )
}

ModernTextInputRenderer.propTypes = {
  comp: PropTypes.shape({
    id: PropTypes.string.isRequired,
    X: PropTypes.number.isRequired,
    Y: PropTypes.number.isRequired,
    Width: PropTypes.number.isRequired,
    Height: PropTypes.number.isRequired,
    Align: PropTypes.string,
    Appearance: PropTypes.string,
    BasePaletteColor: PropTypes.string,
    BorderColor: PropTypes.string,
    BorderStyle: PropTypes.string,
    BorderThickness: PropTypes.number,
    Color: PropTypes.string,
    Default: PropTypes.string,
    DisplayMode: PropTypes.string,
    Fill: PropTypes.string,
    Font: PropTypes.string,
    FontWeight: PropTypes.string,
    Italic: PropTypes.bool,
    MaxLength: PropTypes.number,
    OnChange: PropTypes.string,
    OnSelect: PropTypes.string,
    PaddingBottom: PropTypes.number,
    PaddingLeft: PropTypes.number,
    PaddingRight: PropTypes.number,
    PaddingTop: PropTypes.number,
    Placeholder: PropTypes.string,
    RadiusBottomLeft: PropTypes.number,
    RadiusBottomRight: PropTypes.number,
    RadiusTopLeft: PropTypes.number,
    RadiusTopRight: PropTypes.number,
    Required: PropTypes.bool,
    Size: PropTypes.number,
    Strikethrough: PropTypes.bool,
    Text: PropTypes.string,
    TriggerOutput: PropTypes.oneOfType([PropTypes.bool, PropTypes.string]),
    Type: PropTypes.string,
    Underline: PropTypes.bool,
    ValidationState: PropTypes.string,
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
