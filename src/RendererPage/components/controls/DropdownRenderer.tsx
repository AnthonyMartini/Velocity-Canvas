import PropTypes from 'prop-types'
import { CSS_FW } from './cssProps'
import { executeAction } from '../../../common/helpers'
import { parseFormula, evaluateAST } from '../../../common/FormulaParser'
import { getSelectionStyles } from '@/theme/theme'

export default function DropdownRenderer({ comp, selected, isPlaying, localVars, setLocalVars, notify, navigate, updateProp, flatNodes, parentNode, onMouseDown, onClick, renderZIndex = 1 }) {
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
    cursor: isPlaying ? 'pointer' : 'move', userSelect: isPlaying ? 'auto' : 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    paddingLeft: '10pt', paddingRight: '8pt',
    boxSizing: 'border-box' as const,
    ...getSelectionStyles(selected),
    zIndex: renderZIndex,
    transition: 'box-shadow 0.1s, outline 0.1s',
  }
  let items = []
  try { items = JSON.parse(comp.Items) } catch (e) { items = comp.Items ? [comp.Items] : [] }

  const displayDefaultValue = comp.Default || ''
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
        defaultValue={(displayValue !== undefined && displayValue !== null) ? displayValue : (items[0] || '')}
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
      <span className="truncate">{(displayValue !== undefined && displayValue !== null) ? displayValue : (items[0] || 'Dropdown')}</span>
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
  renderZIndex: PropTypes.number,
  onMouseDown: PropTypes.func.isRequired,
  onClick: PropTypes.func.isRequired,
}
