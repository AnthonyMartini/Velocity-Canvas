import { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { CSS_BORDER_STYLE } from './cssProps'
import { executeAction } from '../../../common/helpers'
import { getSelectionStyles, themeVars } from '@/theme/theme'
import { clamp, normalizeLiteralString, resolveModernPalette, toRgba } from './modernControlUtils'

function formatPrecision(value: number, precision: number) {
  if (!Number.isFinite(value)) return value
  if (!Number.isFinite(precision) || precision <= 0) return Math.round(value)
  return Number(value.toFixed(precision))
}

export default function NumberInputRenderer({
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
  const min = Number.isFinite(Number(comp.Min)) ? Number(comp.Min) : -Infinity
  const max = Number.isFinite(Number(comp.Max)) ? Number(comp.Max) : Infinity
  const step = Number.isFinite(Number(comp.Step)) && Number(comp.Step) > 0 ? Number(comp.Step) : 1
  const precision = Math.max(0, Number(comp.Precision || 0))
  const initialValue = comp.Value ?? comp.Default ?? ''
  const [value, setValue] = useState(String(initialValue))
  const [isFocused, setIsFocused] = useState(false)
  const isDisabledMode = comp.DisplayMode === 'DisplayMode.Disabled'
  const isViewMode = comp.DisplayMode === 'DisplayMode.View'
  const isInteractive = isPlaying && !isDisabledMode && !isViewMode
  const validationState = normalizeLiteralString(comp.ValidationState, 'none').toLowerCase()
  const { palette, lighter30, lighter10 } = resolveModernPalette(comp, canvasTheme)
  const borderColor = validationState === 'error'
    ? '#d13438'
    : (isFocused ? palette : (comp.BorderColor || lighter10))

  useEffect(() => {
    setValue(String(comp.Value ?? comp.Default ?? ''))
  }, [comp.id, comp.Value, comp.Default])

  const commitValue = (rawValue: string) => {
    const parsed = Number(rawValue)
    if (!Number.isFinite(parsed)) return
    const normalized = formatPrecision(clamp(parsed, min, max), precision)
    setValue(String(normalized))
    updateProp?.(comp.id, 'Value', normalized)
    if (comp.OnChange) {
      executeAction(comp.OnChange, localVars, setLocalVars, notify, navigate, flatNodes, parentNode, comp)
    }
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
        height: `${comp.Height}pt`,
        display: 'flex',
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
        type="number"
        value={value}
        min={Number.isFinite(min) ? min : undefined}
        max={Number.isFinite(max) ? max : undefined}
        step={step}
        readOnly={!isInteractive}
        disabled={isPlaying && isDisabledMode}
        placeholder={normalizeLiteralString(comp.HintText)}
        onFocus={() => setIsFocused(true)}
        onBlur={(event) => {
          setIsFocused(false)
          commitValue(event.target.value)
        }}
        onChange={(event) => {
          setValue(event.target.value)
          if (isInteractive && event.target.value !== '' && Number.isFinite(Number(event.target.value))) {
            commitValue(event.target.value)
          }
        }}
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
          textAlign: comp.Align === 'Align.Center' ? 'center' : (comp.Align === 'Align.Right' ? 'right' : 'left'),
        }}
      />
    </div>
  )
}

NumberInputRenderer.propTypes = {
  comp: PropTypes.shape({
    id: PropTypes.string.isRequired,
    X: PropTypes.number.isRequired,
    Y: PropTypes.number.isRequired,
    Width: PropTypes.number.isRequired,
    Height: PropTypes.number.isRequired,
    Align: PropTypes.string,
    BasePaletteColor: PropTypes.string,
    BorderColor: PropTypes.string,
    BorderStyle: PropTypes.string,
    BorderThickness: PropTypes.number,
    Color: PropTypes.string,
    Default: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    DisplayMode: PropTypes.string,
    Fill: PropTypes.string,
    Font: PropTypes.string,
    HintText: PropTypes.string,
    Max: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    Min: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    OnChange: PropTypes.string,
    PaddingBottom: PropTypes.number,
    PaddingLeft: PropTypes.number,
    PaddingRight: PropTypes.number,
    PaddingTop: PropTypes.number,
    Precision: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    RadiusBottomLeft: PropTypes.number,
    RadiusBottomRight: PropTypes.number,
    RadiusTopLeft: PropTypes.number,
    RadiusTopRight: PropTypes.number,
    Size: PropTypes.number,
    Step: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    ValidationState: PropTypes.string,
    Value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
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
