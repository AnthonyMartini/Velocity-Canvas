import PropTypes from 'prop-types'
import { CSS_FW } from './cssProps.js'
import { evaluateValue, executeAction } from '../../common/helpers.jsx'

export default function DropdownRenderer({ comp, selected, isPlaying, localVars, setLocalVars, notify, onMouseDown, onClick }) {
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
    cursor: isPlaying ? 'pointer' : 'move', userSelect: isPlaying ? 'auto' : 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    paddingLeft: 10, paddingRight: 8,
    boxSizing: 'border-box',
    outline: selected ? '2px solid #0078d4' : 'none',
    outlineOffset: selected ? '2px' : '0',
    boxShadow: selected ? '0 0 0 3px rgba(0,120,212,0.25)' : 'none',
    zIndex: selected ? 10 : 1,
    transition: 'box-shadow 0.1s, outline 0.1s',
  }
  let items = []
  try { items = JSON.parse(comp.items) } catch (e) { items = comp.items ? [comp.items] : [] }

  const displayDefaultValue = evaluateValue(comp.defaultValue, localVars)

  const handleChange = (e) => {
    if (isPlaying && comp.OnChange) {
      executeAction(comp.OnChange, localVars, setLocalVars, notify)
    }
  }

  if (isPlaying) {
    return (
      <select
        style={{ ...style, outline: 'none', appearance: 'auto', paddingRight: '4px', background: comp.fill === 'transparent' ? 'transparent' : comp.fill }}
        defaultValue={displayDefaultValue || (items[0] || '')}
        onMouseDown={onMouseDown}
        onClick={onClick}
        onChange={handleChange}
      >
        {items.map((item, i) => <option key={i} value={item}>{item}</option>)}
      </select>
    )
  }

  return (
    <div style={style} onMouseDown={onMouseDown} onClick={onClick}>
      <span className="truncate">{displayDefaultValue || (items[0] || 'Dropdown')}</span>
      <svg className="w-4 h-4 text-subtext/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
    </div>
  )
}

DropdownRenderer.propTypes = {
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
    defaultValue: PropTypes.string,
    items: PropTypes.string,
  }).isRequired,
  selected: PropTypes.bool,
  isPlaying: PropTypes.bool,
  localVars: PropTypes.object,
  setLocalVars: PropTypes.func,
  notify: PropTypes.func,
  onMouseDown: PropTypes.func.isRequired,
  onClick: PropTypes.func.isRequired,
}
