import { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { CSS_FW } from './cssProps'
import { executeAction } from '../../../common/helpers'
import { resolveSampleText } from './sampleText'
import { getSelectionStyles, themeVars } from '@/theme/theme'

function normalizeTextInputValue(value) {
  if (value === undefined || value === null) return ''
  const normalized = String(value).trim()
  if (normalized === '""' || normalized === "''") return ''
  return String(value)
}

export default function TextInputRenderer({ comp, selected, isPlaying, localVars, setLocalVars, notify, navigate, updateProp, flatNodes, parentNode, onMouseDown, onClick, renderZIndex = 1 }) {
  const style: any = {
    position: 'absolute',
    left: `${comp.X}pt`, top: `${comp.Y}pt`, width: `${comp.Width}pt`, height: `${comp.Height}pt`,
    backgroundColor: comp.Fill,
    color: comp.Color,
    fontSize: `${comp.Size}pt`,
    fontWeight: CSS_FW[comp.FontWeight] || comp.FontWeight,
    border: `${comp.BorderThickness}pt solid ${comp.BorderColor}`,
    borderRadius: '2pt',
    opacity: comp.Visible ? 1 : 0.3,
    cursor: isPlaying ? 'text' : 'move', userSelect: isPlaying ? 'auto' : 'none',
    display: 'flex', alignItems: 'center',
    paddingLeft: `${comp.PaddingLeft || 0}pt`,
    paddingRight: `${comp.PaddingRight || 0}pt`,
    paddingTop: `${comp.PaddingTop || 0}pt`,
    paddingBottom: `${comp.PaddingBottom || 0}pt`,
    boxSizing: 'border-box' as const,
    ...getSelectionStyles(selected),
    zIndex: renderZIndex,
    lineHeight: comp.LineHeight,
    transition: 'box-shadow 0.1s, outline 0.1s',
  }
  const rawDefaultValue = normalizeTextInputValue(comp.Default)
  const rawTextValue = normalizeTextInputValue(comp.Text)
  const rawHintValue = normalizeTextInputValue(comp.HintText)
  const displayDefaultValue = resolveSampleText(rawDefaultValue)
  const displayHint = resolveSampleText(rawHintValue)
  const displayValue = resolveSampleText(rawTextValue || displayDefaultValue)
  const hasDisplayValue = displayValue !== undefined && displayValue !== null && String(displayValue).trim() !== ''
  const [liveValue, setLiveValue] = useState(hasDisplayValue ? String(displayValue) : '')

  useEffect(() => {
    setLiveValue(hasDisplayValue ? String(displayValue) : '')
  }, [comp.id, displayValue, hasDisplayValue])

  const handleChange = (e) => {
    const val = e.target.value
    if (isPlaying) {
      setLiveValue(val)
      if (updateProp) updateProp(comp.id, 'Text', val)
      if (comp.OnChange) {
        executeAction(comp.OnChange, localVars, setLocalVars, notify, navigate, flatNodes, parentNode, comp)
      }
    }
  }

  if (isPlaying) {
    return (
      <input
        type="text"
        style={{ ...style, outline: 'none', background: comp.Fill === 'transparent' ? 'transparent' : comp.Fill, lineHeight: comp.LineHeight }}
        value={liveValue}
        placeholder={displayHint || ''}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        onChange={handleChange}
      />
    )
  }

  return (
      <div style={style} onMouseDown={onMouseDown} onClick={onClick}>
      {hasDisplayValue
        ? <span>{displayValue}</span>
        : <span style={{ color: themeVars.colors.placeholder, fontStyle: 'italic' }}>{displayHint}</span>
      }
    </div>
  )
}

TextInputRenderer.propTypes = {
  comp: PropTypes.shape({
    X: PropTypes.number.isRequired,
    Y: PropTypes.number.isRequired,
    Width: PropTypes.number.isRequired,
    Height: PropTypes.number.isRequired,
    Fill: PropTypes.string,
    Color: PropTypes.string,
    Size: PropTypes.number,
    FontWeight: PropTypes.string,
    BorderThickness: PropTypes.number,
    BorderColor: PropTypes.string,
    Visible: PropTypes.bool,
    PaddingLeft: PropTypes.number,
    PaddingRight: PropTypes.number,
    PaddingTop: PropTypes.number,
    PaddingBottom: PropTypes.number,
    Default: PropTypes.string,
    HintText: PropTypes.string,
    LineHeight: PropTypes.number,
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
