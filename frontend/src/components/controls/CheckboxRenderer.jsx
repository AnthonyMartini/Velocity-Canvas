import { evaluateValue, executeAction } from '../../common/helpers.jsx'

export default function CheckboxRenderer({ comp, selected, isPlaying, localVars, setLocalVars, notify, onMouseDown, onClick }) {
  const displayValue = evaluateValue(comp.value, localVars) === true || evaluateValue(comp.value, localVars) === 'true'
  const displayText = evaluateValue(comp.text, localVars)

  const handleChange = (e) => {
    if (isPlaying) {
      const isChecked = e.target.checked
      if (isChecked && comp.OnCheck) {
        executeAction(comp.OnCheck, localVars, setLocalVars, notify)
      } else if (!isChecked && comp.OnUncheck) {
        executeAction(comp.OnUncheck, localVars, setLocalVars, notify)
      }
      if (comp.OnChange) { // Fallback standard action
        executeAction(comp.OnChange, localVars, setLocalVars, notify)
      }
    }
  }

  const handleContainerClick = (e) => {
    if (onClick) onClick(e)
    if (isPlaying && comp.OnSelect) {
      executeAction(comp.OnSelect, localVars, setLocalVars, notify)
    }
  }

  const containerStyle = {
    position: 'absolute',
    left: comp.x,
    top: comp.y,
    width: comp.width,
    height: comp.height,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: comp.fill,
    color: comp.color,
    fontSize: comp.fontSize,
    fontWeight: comp.fontWeight?.split('.')[1]?.toLowerCase() || 'normal',
    opacity: comp.visible === false ? 0.3 : (comp.disabled ? 0.5 : 1),
    cursor: isPlaying && !comp.disabled ? 'pointer' : 'default',
    pointerEvents: (comp.disabled && isPlaying) ? 'none' : 'auto',
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
        disabled={!isPlaying || comp.disabled}
        onChange={handleChange}
        style={{
          width: comp.checkboxSize || 20,
          height: comp.checkboxSize || 20,
          cursor: isPlaying && !comp.disabled ? 'pointer' : 'default',
        }}
      />
      <span style={{ userSelect: 'none' }}>{displayText}</span>
    </div>
  )
}
