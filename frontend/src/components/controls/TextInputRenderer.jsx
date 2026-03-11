import PropTypes from 'prop-types'
import { CSS_FW } from './cssProps.js'
import { evaluateValue, executeAction } from '../../common/helpers.jsx'

export default function TextInputRenderer({ comp, selected, isPlaying, localVars, setLocalVars, notify, onMouseDown, onClick }) {
  const style = {
    position: 'absolute',
    left: comp.x, top: comp.y, width: comp.width, height: comp.height,
    backgroundColor: comp.fill,
    color: comp.color,
    fontSize: comp.fontSize,
    fontWeight: CSS_FW[comp.fontWeight] || comp.fontWeight,
    border: `${comp.borderThickness}px solid ${comp.borderColor}`,
    borderRadius: 2,
    opacity: comp.visible ? 1 : 0.3,
    cursor: isPlaying ? 'text' : 'move', userSelect: isPlaying ? 'auto' : 'none',
    display: 'flex', alignItems: 'center',
    paddingLeft: 8, paddingRight: 8,
    boxSizing: 'border-box',
    outline: selected ? '2px solid #0078d4' : 'none',
    outlineOffset: selected ? '2px' : '0',
    boxShadow: selected ? '0 0 0 3px rgba(0,120,212,0.25)' : 'none',
    zIndex: selected ? 10 : 1,
    transition: 'box-shadow 0.1s, outline 0.1s',
  }
  const displayValue = evaluateValue(comp.value, localVars)
  const displayHint = evaluateValue(comp.hint, localVars)

  const handleChange = (e) => {
    if (isPlaying && comp.OnChange) {
      executeAction(comp.OnChange, localVars, setLocalVars, notify)
    }
  }

  if (isPlaying) {
    return (
      <input
        type="text"
        style={{ ...style, outline: 'none', background: comp.fill === 'transparent' ? 'transparent' : comp.fill }}
        defaultValue={displayValue || ''}
        placeholder={displayHint || ''}
        onMouseDown={onMouseDown}
        onClick={onClick}
        onChange={handleChange}
      />
    )
  }

  return (
    <div style={style} onMouseDown={onMouseDown} onClick={onClick}>
      {displayValue
        ? <span>{displayValue}</span>
        : <span style={{ color: '#aaa', fontStyle: 'italic' }}>{comp.hint}</span>
      }
    </div>
  )
}

TextInputRenderer.propTypes = {
  comp: PropTypes.shape({
    x: PropTypes.number.isRequired,
    y: PropTypes.number.isRequired,
    width: PropTypes.number.isRequired,
    height: PropTypes.number.isRequired,
    fill: PropTypes.string,
    color: PropTypes.string,
    fontSize: PropTypes.number,
    fontWeight: PropTypes.string,
    borderThickness: PropTypes.number,
    borderColor: PropTypes.string,
    visible: PropTypes.bool,
    value: PropTypes.string,
    hint: PropTypes.string,
  }).isRequired,
  selected: PropTypes.bool,
  isPlaying: PropTypes.bool,
  localVars: PropTypes.object,
  setLocalVars: PropTypes.func,
  notify: PropTypes.func,
  onMouseDown: PropTypes.func.isRequired,
  onClick: PropTypes.func.isRequired,
}
