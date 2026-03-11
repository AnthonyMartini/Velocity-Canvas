import PropTypes from 'prop-types'
import { CSS_FW } from './cssProps.js'
import { evaluateValue, executeAction } from '../../common/helpers.jsx'

export default function ButtonRenderer({ comp, selected, isPlaying, localVars, setLocalVars, notify, onMouseDown, onClick }) {
  const style = {
    position: 'absolute',
    left: comp.x, top: comp.y, width: comp.width, height: comp.height,
    backgroundColor: comp.fill,
    color: comp.color,
    fontSize: comp.fontSize,
    fontWeight: CSS_FW[comp.fontWeight] || comp.fontWeight,
    fontStyle: comp.italic ? 'italic' : 'normal',
    textDecoration: comp.underline ? 'underline' : 'none',
    borderRadius: comp.borderRadius,
    border: `${comp.borderThickness}px solid ${comp.borderColor}`,
    opacity: comp.visible ? 1 : 0.3,
    cursor: isPlaying ? 'pointer' : 'move', userSelect: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxSizing: 'border-box',
    outline: selected ? '2px solid #0078d4' : 'none',
    outlineOffset: selected ? '2px' : '0',
    boxShadow: selected ? '0 0 0 3px rgba(0,120,212,0.25)' : '0 1px 3px rgba(0,0,0,0.15)',
    transition: 'box-shadow 0.1s, outline 0.1s',
    zIndex: selected ? 10 : 1,
  }
  const handleClick = (e) => {
    onClick(e)
    if (isPlaying && comp.OnSelect) {
      executeAction(comp.OnSelect, localVars, setLocalVars, notify)
    }
  }

  const displayText = evaluateValue(comp.text, localVars)

  return (
    <button style={style} onMouseDown={onMouseDown} onClick={handleClick} disabled={comp.disabled}>
      {displayText}
    </button>
  )
}

ButtonRenderer.propTypes = {
  comp: PropTypes.shape({
    x: PropTypes.number.isRequired,
    y: PropTypes.number.isRequired,
    width: PropTypes.number.isRequired,
    height: PropTypes.number.isRequired,
    fill: PropTypes.string,
    color: PropTypes.string,
    fontSize: PropTypes.number,
    fontWeight: PropTypes.string,
    italic: PropTypes.bool,
    underline: PropTypes.bool,
    borderRadius: PropTypes.number,
    borderThickness: PropTypes.number,
    borderColor: PropTypes.string,
    visible: PropTypes.bool,
    disabled: PropTypes.bool,
    text: PropTypes.string,
  }).isRequired,
  selected: PropTypes.bool,
  isPlaying: PropTypes.bool,
  localVars: PropTypes.object,
  setLocalVars: PropTypes.func,
  notify: PropTypes.func,
  onMouseDown: PropTypes.func.isRequired,
  onClick: PropTypes.func.isRequired,
}
