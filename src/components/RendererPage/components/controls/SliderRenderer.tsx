import { useEffect, useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import { CSS_BORDER_STYLE } from './cssProps'
import { executeAction } from '../../../../common/helpers'
import { getSelectionStyles } from '@/theme/theme'

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

export default function SliderRenderer({ comp, selected, isPlaying, localVars, setLocalVars, notify, navigate, updateProp, flatNodes, parentNode, onMouseDown, onClick, renderZIndex = 1 }) {
  const min = Number(comp.Min ?? 0)
  const max = Number(comp.Max ?? 100)
  const step = Number(comp.Step ?? 1) || 1
  const initialValue = clamp(Number(comp.Value ?? comp.Default ?? min), min, max)
  const [value, setValue] = useState(initialValue)

  useEffect(() => {
    setValue(initialValue)
  }, [comp.id, initialValue])

  const disabled = comp.DisplayMode === 'DisplayMode.Disabled'
  const percent = useMemo(() => {
    if (max <= min) return 0
    return ((value - min) / (max - min)) * 100
  }, [max, min, value])

  const containerStyle: any = {
    position: 'absolute',
    left: `${comp.X}pt`,
    top: `${comp.Y}pt`,
    width: `${comp.Width}pt`,
    height: `${comp.Height}pt`,
    backgroundColor: comp.Fill,
    border: (comp.BorderStyle && comp.BorderStyle !== 'BorderStyle.None' && (comp.BorderThickness || 0) > 0)
      ? `${comp.BorderThickness}pt ${CSS_BORDER_STYLE[comp.BorderStyle] || 'solid'} ${comp.BorderColor}`
      : 'none',
    display: 'flex',
    alignItems: 'center',
    gap: '10pt',
    padding: '6pt 8pt',
    boxSizing: 'border-box',
    opacity: comp.Visible === false ? 0.3 : (disabled ? 0.5 : 1),
    cursor: isPlaying && !disabled ? 'pointer' : (isPlaying ? 'default' : 'move'),
    userSelect: 'none',
    ...getSelectionStyles(selected),
    zIndex: renderZIndex,
    transition: 'box-shadow 0.1s, outline 0.1s',
  }

  const handleChange = (event) => {
    const nextValue = Number(event.target.value)
    setValue(nextValue)
    if (!isPlaying || disabled) return
    updateProp?.(comp.id, 'Value', nextValue)
    if (comp.OnChange) {
      executeAction(comp.OnChange, localVars, setLocalVars, notify, navigate, flatNodes, parentNode, comp)
    }
  }

  return (
    <div style={containerStyle} onMouseDown={onMouseDown} onClick={onClick}>
      <div
        style={{
          position: 'relative',
          flex: 1,
          minWidth: 0,
          height: '12pt',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: '50% 0 auto 0',
            height: '4pt',
            transform: 'translateY(-50%)',
            background: `linear-gradient(to right, ${comp.ValueFill} 0%, ${comp.ValueFill} ${percent}%, ${comp.RailFill} ${percent}%, ${comp.RailFill} 100%)`,
            borderRadius: '9999px',
            pointerEvents: 'none',
          }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={!isPlaying || disabled}
          aria-label={comp.AccessibleLabel || 'Slider'}
          onChange={handleChange}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'relative',
            width: '100%',
            margin: 0,
            accentColor: comp.HandleFill || comp.ValueFill,
            background: 'transparent',
            cursor: isPlaying && !disabled ? 'pointer' : 'default',
          }}
        />
      </div>
      {comp.ShowValue !== false && (
        <span style={{ minWidth: '30pt', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
      )}
    </div>
  )
}

SliderRenderer.propTypes = {
  comp: PropTypes.shape({
    id: PropTypes.string.isRequired,
    X: PropTypes.number.isRequired,
    Y: PropTypes.number.isRequired,
    Width: PropTypes.number.isRequired,
    Height: PropTypes.number.isRequired,
    Default: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    Value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    Min: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    Max: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    Step: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    ShowValue: PropTypes.oneOfType([PropTypes.bool, PropTypes.string]),
    Fill: PropTypes.string,
    RailFill: PropTypes.string,
    ValueFill: PropTypes.string,
    HandleFill: PropTypes.string,
    BorderColor: PropTypes.string,
    BorderStyle: PropTypes.string,
    BorderThickness: PropTypes.number,
    DisplayMode: PropTypes.string,
    Visible: PropTypes.bool,
    OnChange: PropTypes.string,
    AccessibleLabel: PropTypes.string,
  }).isRequired,
  selected: PropTypes.bool,
  isPlaying: PropTypes.bool,
  localVars: PropTypes.object,
  setLocalVars: PropTypes.func,
  notify: PropTypes.func,
  navigate: PropTypes.func,
  updateProp: PropTypes.func,
  renderZIndex: PropTypes.number,
  onMouseDown: PropTypes.func.isRequired,
  onClick: PropTypes.func.isRequired,
}
