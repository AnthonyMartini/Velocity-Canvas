import PropTypes from 'prop-types'
import { CSS_FW, CSS_ALIGN, CSS_JUSTIFY, CSS_VALIGN } from './cssProps.js'
import { executeAction } from '../../../common/helpers.jsx'
import { parseFormula, evaluateAST } from '../../../common/FormulaParser.jsx'

export default function ButtonRenderer({ comp, selected, isPlaying, localVars, setLocalVars, notify, navigate, flatNodes, parentNode, onMouseDown, onClick }) {
  const style = {
    position: 'absolute',
    left: comp.X, top: comp.Y, width: comp.Width, height: comp.Height,
    backgroundColor: comp.Fill,
    color: comp.Color,
    fontSize: comp.Size,
    fontWeight: CSS_FW[comp.FontWeight] || comp.FontWeight,
    fontStyle: comp.Italic ? 'italic' : 'normal',
    textDecoration: comp.Underline ? 'underline' : 'none',
    borderRadius: comp.RadiusTopLeft, // Simplified for now
    border: `${comp.BorderThickness}px solid ${comp.BorderColor}`,
    opacity: comp.Visible ? 1 : 0.3,
    cursor: isPlaying ? 'pointer' : 'move', userSelect: 'none',
    display: 'flex', 
    alignItems: CSS_VALIGN[comp.VerticalAlign] || 'center',
    justifyContent: CSS_JUSTIFY[comp.Align] || 'center',
    textAlign: CSS_ALIGN[comp.Align] || 'center',
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
      executeAction(comp.OnSelect, localVars, setLocalVars, notify, navigate, flatNodes, parentNode, comp)
    }
  }

  const displayText = (comp.Text !== undefined && comp.Text !== null) ? comp.Text : 'Button'

  return (
    <button style={style} onMouseDown={onMouseDown} onClick={handleClick} disabled={comp.Disabled}>
      {displayText}
    </button>
  )
}

ButtonRenderer.propTypes = {
  comp: PropTypes.shape({
    X: PropTypes.number.isRequired,
    Y: PropTypes.number.isRequired,
    Width: PropTypes.number.isRequired,
    Height: PropTypes.number.isRequired,
    Fill: PropTypes.string,
    Color: PropTypes.string,
    Size: PropTypes.number,
    FontWeight: PropTypes.string,
    Italic: PropTypes.bool,
    Underline: PropTypes.bool,
    RadiusTopLeft: PropTypes.number,
    BorderThickness: PropTypes.number,
    BorderColor: PropTypes.string,
    Visible: PropTypes.bool,
    Disabled: PropTypes.bool,
    Text: PropTypes.string,
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
