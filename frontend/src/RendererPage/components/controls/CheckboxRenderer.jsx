import PropTypes from 'prop-types'
import { executeAction } from '../../../common/helpers.jsx'
import { parseFormula, evaluateAST } from '../../../common/FormulaParser.jsx'

export default function CheckboxRenderer({ comp, selected, isPlaying, localVars, setLocalVars, notify, navigate, updateProp, flatNodes, parentNode, onMouseDown, onClick }) {
  const defaultEval = comp.Default
  const displayValue = defaultEval === true || defaultEval === 'true'
  const displayText = comp.Text

  const handleChange = (e) => {
    if (isPlaying) {
      const isChecked = e.target.checked
      if (isChecked && comp.OnCheck) {
        executeAction(comp.OnCheck, localVars, setLocalVars, notify, navigate, flatNodes, parentNode, comp)
      } else if (!isChecked && comp.OnUncheck) {
        executeAction(comp.OnUncheck, localVars, setLocalVars, notify, navigate, flatNodes, parentNode, comp)
      }
      if (comp.OnChange) { // Fallback standard action
        executeAction(comp.OnChange, localVars, setLocalVars, notify, navigate, flatNodes, parentNode, comp)
      }
    }
  }

  const handleContainerClick = (e) => {
    if (onClick) onClick(e)
    if (isPlaying && comp.OnSelect) {
      executeAction(comp.OnSelect, localVars, setLocalVars, notify, navigate, flatNodes, parentNode, comp)
    }
  }

  const containerStyle = {
    position: 'absolute',
    left: comp.X,
    top: comp.Y,
    width: comp.Width,
    height: comp.Height,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: comp.Fill,
    color: comp.Color,
    fontSize: comp.Size,
    fontWeight: comp.FontWeight?.split('.')[1]?.toLowerCase() || 'normal',
    opacity: comp.Visible === false ? 0.3 : (comp.DisplayMode === 'DisplayMode.Disabled' ? 0.5 : 1),
    cursor: isPlaying && comp.DisplayMode !== 'DisplayMode.Disabled' ? 'pointer' : (isPlaying ? 'default' : 'move'),
    userSelect: 'none',
    pointerEvents: (comp.DisplayMode === 'DisplayMode.Disabled' && isPlaying) ? 'none' : 'auto',
    boxShadow: selected ? '0 0 0 2px #0078d4 inset' : 'none',
    boxSizing: 'border-box',
    padding: '4px 8px',
  }

  // To simulate the PA checkbox closely we might need custom styling, 
  // but a native checkbox is functional for the MVP
  return (
    <div style={containerStyle} onMouseDown={onMouseDown} onClick={handleContainerClick}>
      <input
        type="checkbox"
        defaultChecked={displayValue}
        disabled={!isPlaying || comp.DisplayMode === 'DisplayMode.Disabled'}
        onChange={handleChange}
        style={{
          width: comp.CheckboxSize || 20,
          height: comp.CheckboxSize || 20,
          cursor: isPlaying && comp.DisplayMode !== 'DisplayMode.Disabled' ? 'pointer' : 'default',
        }}
      />
      <span style={{ userSelect: 'none' }}>{(comp.Text !== undefined && comp.Text !== null) ? comp.Text : 'Checkbox'}</span>
    </div>
  )
}
CheckboxRenderer.propTypes = {
  comp: PropTypes.shape({
    X: PropTypes.number.isRequired,
    Y: PropTypes.number.isRequired,
    Width: PropTypes.number.isRequired,
    Height: PropTypes.number.isRequired,
    Fill: PropTypes.string,
    Color: PropTypes.string,
    Size: PropTypes.number,
    FontWeight: PropTypes.string,
    Visible: PropTypes.bool,
    DisplayMode: PropTypes.string,
    Text: PropTypes.string,
    Default: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
    CheckboxSize: PropTypes.number,
    OnCheck: PropTypes.string,
    OnUncheck: PropTypes.string,
    OnChange: PropTypes.string,
    OnSelect: PropTypes.string,
  }).isRequired,
  selected: PropTypes.bool,
  isPlaying: PropTypes.bool,
  localVars: PropTypes.object,
  setLocalVars: PropTypes.func,
  notify: PropTypes.func,
  navigate: PropTypes.func,
  onMouseDown: PropTypes.func.isRequired,
  onClick: PropTypes.func.isRequired,
}
