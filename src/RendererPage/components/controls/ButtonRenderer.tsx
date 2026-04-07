import PropTypes from 'prop-types'
import { CSS_FW, CSS_ALIGN, CSS_JUSTIFY, CSS_VALIGN } from './cssProps'
import { executeAction } from '../../../common/helpers'
import { parseFormula, evaluateAST } from '../../../common/FormulaParser'
import { resolveSampleText } from './sampleText'
import { getSelectionStyles, themeVars } from '@/theme/theme'

export default function ButtonRenderer({ comp, selected, isPlaying, localVars, setLocalVars, notify, navigate, flatNodes, parentNode, onMouseDown, onClick, renderZIndex = 1 }) {
  const style: any = {
    position: 'absolute',
    left: `${comp.X}pt`, top: `${comp.Y}pt`, width: `${comp.Width}pt`, height: `${comp.Height}pt`,
    backgroundColor: comp.Fill,
    color: comp.Color,
    fontSize: `${comp.Size}pt`,
    fontWeight: CSS_FW[comp.FontWeight] || comp.FontWeight,
    fontStyle: comp.Italic ? 'italic' : 'normal',
    textDecoration: comp.Underline ? 'underline' : 'none',
    borderRadius: `${comp.RadiusTopLeft}pt`, // Simplified for now
    border: `${comp.BorderThickness}pt solid ${comp.BorderColor}`,
    opacity: comp.Visible ? 1 : 0.3,
    cursor: isPlaying ? 'pointer' : 'move', userSelect: 'none',
    display: 'flex', 
    alignItems: CSS_VALIGN[comp.VerticalAlign] || 'center',
    justifyContent: CSS_JUSTIFY[comp.Align] || 'center',
    textAlign: CSS_ALIGN[comp.Align] || 'center',
    boxSizing: 'border-box' as const,
    ...getSelectionStyles(selected, 'default', themeVars.shadows.controlRest),
    transition: 'box-shadow 0.1s, outline 0.1s',
    zIndex: renderZIndex,
  }
  const handleClick = (e) => {
    onClick(e)
    if (isPlaying && comp.OnSelect) {
      executeAction(comp.OnSelect, localVars, setLocalVars, notify, navigate, flatNodes, parentNode, comp)
    }
  }

  const displayText = resolveSampleText((comp.Text !== undefined && comp.Text !== null) ? comp.Text : 'Button')

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
  renderZIndex: PropTypes.number,
  onMouseDown: PropTypes.func.isRequired,
  onClick: PropTypes.func.isRequired,
}
