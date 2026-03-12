import PropTypes from 'prop-types'
import { CSS_FW } from './cssProps.js'
import { evaluateValue, executeAction } from '../../../common/helpers.jsx'

export default function DropdownRenderer({ comp, selected, isPlaying, localVars, setLocalVars, notify, navigate, updateProp, flatNodes, parentNode, onMouseDown, onClick }) {
  const style = {
    position: 'absolute',
    left: comp.X, top: comp.Y, width: comp.Width, height: comp.Height,
    backgroundColor: comp.Fill,
    color: comp.Color,
    fontSize: comp.Size,
    fontWeight: CSS_FW[comp.FontWeight] || comp.FontWeight,
    border: `${comp.BorderThickness}px solid ${comp.BorderColor}`,
    borderRadius: 2,
    opacity: comp.Visible ? 1 : 0.3,
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
  try { items = JSON.parse(comp.Items) } catch (e) { items = comp.Items ? [comp.Items] : [] }

  const displayDefaultValue = evaluateValue(comp.Default, localVars, flatNodes, new Set(), parentNode)
  const displayValue = comp.Selected !== undefined && comp.Selected !== "" ? comp.Selected : displayDefaultValue

  const handleChange = (e) => {
    const val = e.target.value
    if (isPlaying) {
      if (updateProp) {
        updateProp(comp.id, 'Selected', val)
      }
      if (comp.OnChange) {
        executeAction(comp.OnChange, localVars, setLocalVars, notify, navigate, flatNodes, parentNode, comp)
      }
    }
  }

  if (isPlaying) {
    return (
      <select
        style={{ ...style, outline: 'none', appearance: 'auto', paddingRight: '4px', background: comp.Fill === 'transparent' ? 'transparent' : comp.Fill }}
        defaultValue={displayValue || (items[0] || '')}
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
      <span className="truncate">{displayValue || (items[0] || 'Dropdown')}</span>
      <svg className="w-4 h-4 text-subtext/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
    </div>
  )
}

DropdownRenderer.propTypes = {
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
    Default: PropTypes.string,
    Items: PropTypes.string,
  }).isRequired,
  selected: PropTypes.bool,
  isPlaying: PropTypes.bool,
  localVars: PropTypes.object,
  setLocalVars: PropTypes.func,
  notify: PropTypes.func,
  navigate: PropTypes.func,
  updateProp: PropTypes.func,
  onMouseDown: PropTypes.func.isRequired,
  onClick: PropTypes.func.isRequired,
}
