import { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { CSS_BORDER_STYLE, CSS_FW } from './cssProps'
import { executeAction } from '../../../common/helpers'
import { getSelectionStyles } from '@/theme/theme'

function asBoolean(value) {
  if (value === true || value === false) return value
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (normalized === 'true') return true
    if (normalized === 'false') return false
  }
  return Boolean(value)
}

export default function ToggleRenderer({ comp, selected, isPlaying, localVars, setLocalVars, notify, navigate, updateProp, flatNodes, parentNode, onMouseDown, onClick, renderZIndex = 1 }) {
  const displayValue = asBoolean(comp.Value ?? comp.Default)
  const [checked, setChecked] = useState(displayValue)

  useEffect(() => {
    setChecked(displayValue)
  }, [comp.id, displayValue])

  const disabled = comp.DisplayMode === 'DisplayMode.Disabled'
  const currentLabel = checked ? comp.TrueText : comp.FalseText
  const trackWidth = Math.min(Math.max((comp.Height || 32) * 1.8, 44), Math.max((comp.Width || 110) - 56, 44))
  const trackHeight = Math.max((comp.Height || 32) - 8, 20)
  const knobSize = Math.max(trackHeight - 6, 12)

  const containerStyle: any = {
    position: 'absolute',
    left: `${comp.X}pt`,
    top: `${comp.Y}pt`,
    width: `${comp.Width}pt`,
    height: `${comp.Height}pt`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8pt',
    padding: '4pt',
    boxSizing: 'border-box',
    backgroundColor: comp.Fill,
    color: comp.Color,
    fontSize: `${comp.Size || 13}pt`,
    fontWeight: CSS_FW[comp.FontWeight] || comp.FontWeight,
    opacity: comp.Visible === false ? 0.3 : (disabled ? 0.5 : 1),
    cursor: isPlaying && !disabled ? 'pointer' : (isPlaying ? 'default' : 'move'),
    userSelect: 'none',
    ...getSelectionStyles(selected),
    zIndex: renderZIndex,
    transition: 'box-shadow 0.1s, outline 0.1s',
  }

  const handleContainerClick = (e) => {
    if (onClick) onClick(e)
    if (isPlaying && comp.OnSelect) {
      executeAction(comp.OnSelect, localVars, setLocalVars, notify, navigate, flatNodes, parentNode, comp)
    }
  }

  const handleToggle = (nextChecked) => {
    if (!isPlaying || disabled) return
    setChecked(nextChecked)
    updateProp?.(comp.id, 'Value', nextChecked)
    if (nextChecked && comp.OnCheck) {
      executeAction(comp.OnCheck, localVars, setLocalVars, notify, navigate, flatNodes, parentNode, comp)
    } else if (!nextChecked && comp.OnUncheck) {
      executeAction(comp.OnUncheck, localVars, setLocalVars, notify, navigate, flatNodes, parentNode, comp)
    }
    if (comp.OnChange) {
      executeAction(comp.OnChange, localVars, setLocalVars, notify, navigate, flatNodes, parentNode, comp)
    }
  }

  return (
    <div style={containerStyle} onMouseDown={onMouseDown} onClick={handleContainerClick}>
      <button
        type="button"
        aria-label={comp.AccessibleLabel || 'Toggle'}
        disabled={!isPlaying || disabled}
        onClick={(e) => {
          e.stopPropagation()
          handleToggle(!checked)
        }}
        style={{
          position: 'relative',
          width: `${trackWidth}pt`,
          height: `${trackHeight}pt`,
          borderRadius: `${trackHeight / 2}pt`,
          border: `${comp.BorderThickness || 0}pt ${CSS_BORDER_STYLE[comp.BorderStyle] || 'solid'} ${comp.BorderColor || 'transparent'}`,
          backgroundColor: checked ? comp.TrueFill : comp.FalseFill,
          flexShrink: 0,
          transition: 'background-color 0.15s ease',
          cursor: isPlaying && !disabled ? 'pointer' : 'default',
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: '50%',
            left: checked ? `calc(100% - ${knobSize + 3}pt)` : '3pt',
            width: `${knobSize}pt`,
            height: `${knobSize}pt`,
            borderRadius: '9999px',
            backgroundColor: comp.HandleFill,
            transform: 'translateY(-50%)',
            transition: 'left 0.15s ease',
            boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
          }}
        />
      </button>
      <span style={{ flex: 1, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {currentLabel}
      </span>
    </div>
  )
}

ToggleRenderer.propTypes = {
  comp: PropTypes.shape({
    id: PropTypes.string.isRequired,
    X: PropTypes.number.isRequired,
    Y: PropTypes.number.isRequired,
    Width: PropTypes.number.isRequired,
    Height: PropTypes.number.isRequired,
    Fill: PropTypes.string,
    Color: PropTypes.string,
    Size: PropTypes.number,
    FontWeight: PropTypes.string,
    Default: PropTypes.oneOfType([PropTypes.bool, PropTypes.string]),
    Value: PropTypes.oneOfType([PropTypes.bool, PropTypes.string]),
    TrueText: PropTypes.string,
    FalseText: PropTypes.string,
    TrueFill: PropTypes.string,
    FalseFill: PropTypes.string,
    HandleFill: PropTypes.string,
    BorderColor: PropTypes.string,
    BorderStyle: PropTypes.string,
    BorderThickness: PropTypes.number,
    DisplayMode: PropTypes.string,
    Visible: PropTypes.bool,
    OnCheck: PropTypes.string,
    OnUncheck: PropTypes.string,
    OnChange: PropTypes.string,
    OnSelect: PropTypes.string,
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
