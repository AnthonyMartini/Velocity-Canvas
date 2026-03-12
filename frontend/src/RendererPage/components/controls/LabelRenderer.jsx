import PropTypes from 'prop-types'
import { CSS_FW, CSS_ALIGN, CSS_JUSTIFY, CSS_VALIGN } from './cssProps.js'
import { evaluateValue, executeAction } from '../../../common/helpers.jsx'

export default function LabelRenderer({ comp, selected, isPlaying, localVars, setLocalVars, notify, navigate, flatNodes, parentNode, onMouseDown, onClick }) {
  const style = {
    position: 'absolute',
    left: comp.X, top: comp.Y, width: comp.Width, height: comp.Height,
    backgroundColor: comp.Fill === 'transparent' ? 'transparent' : comp.Fill,
    color: comp.Color,
    fontSize: comp.Size,
    fontWeight: CSS_FW[comp.FontWeight] || comp.FontWeight,
    fontStyle: comp.Italic ? 'italic' : 'normal',
    textDecoration: comp.Underline ? 'underline' : 'none',
    textAlign: CSS_ALIGN[comp.Align] || comp.Align,
    opacity: comp.Visible ? 1 : 0.3,
    cursor: isPlaying ? 'default' : 'move', userSelect: 'none',
    display: 'flex',
    alignItems: CSS_VALIGN[comp.VerticalAlign] || 'center',
    justifyContent: CSS_JUSTIFY[comp.Align] || 'flex-start',
    boxSizing: 'border-box',
    paddingLeft: comp.PaddingLeft, paddingRight: comp.PaddingRight,
    paddingTop: comp.PaddingTop, paddingBottom: comp.PaddingBottom,
    outline: selected ? '2px solid #0078d4' : '1px dashed rgba(0,0,0,0.15)',
    outlineOffset: selected ? '2px' : '0',
    boxShadow: selected ? '0 0 0 3px rgba(0,120,212,0.25)' : 'none',
    overflow: 'hidden', zIndex: selected ? 10 : 1,
    lineHeight: comp.LineHeight,
    transition: 'box-shadow 0.1s, outline 0.1s',
  }
  const displayText = evaluateValue(comp.Text, localVars, flatNodes, new Set(), parentNode)  || ''

  const handleClick = (e) => {
    onClick(e)
    if (isPlaying && comp.OnSelect) {
      executeAction(comp.OnSelect, localVars, setLocalVars, notify, navigate, flatNodes, parentNode, comp)
    }
  }

  return (
    <div style={style} onMouseDown={onMouseDown} onClick={handleClick}>{displayText}</div>
  )
}

LabelRenderer.propTypes = {
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
    Align: PropTypes.string,
    VerticalAlign: PropTypes.string,
    Visible: PropTypes.bool,
    PaddingLeft: PropTypes.number,
    PaddingRight: PropTypes.number,
    PaddingTop: PropTypes.number,
    PaddingBottom: PropTypes.number,
    LineHeight: PropTypes.number,
    Text: PropTypes.string,
  }).isRequired,
  selected: PropTypes.bool,
  isPlaying: PropTypes.bool,
  localVars: PropTypes.object,
  setLocalVars: PropTypes.func,
  notify: PropTypes.func,
  navigate: PropTypes.func,
  flatNodes: PropTypes.array,
  parentNode: PropTypes.object,
  onMouseDown: PropTypes.func.isRequired,
  onClick: PropTypes.func.isRequired,
}
