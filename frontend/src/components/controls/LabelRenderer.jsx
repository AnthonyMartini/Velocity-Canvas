import PropTypes from 'prop-types'
import { CSS_FW, CSS_ALIGN, CSS_JUSTIFY, CSS_VALIGN } from './cssProps.js'
import { evaluateValue } from '../../common/helpers.jsx'

export default function LabelRenderer({ comp, selected, isPlaying, localVars, onMouseDown, onClick }) {
  const style = {
    position: 'absolute',
    left: comp.x, top: comp.y, width: comp.width, height: comp.height,
    backgroundColor: comp.fill === 'transparent' ? 'transparent' : comp.fill,
    color: comp.color,
    fontSize: comp.fontSize,
    fontWeight: CSS_FW[comp.fontWeight] || comp.fontWeight,
    fontStyle: comp.italic ? 'italic' : 'normal',
    textDecoration: comp.underline ? 'underline' : 'none',
    textAlign: CSS_ALIGN[comp.align] || comp.align,
    opacity: comp.visible ? 1 : 0.3,
    cursor: isPlaying ? 'default' : 'move', userSelect: 'none',
    display: 'flex',
    alignItems: CSS_VALIGN[comp.verticalAlign] || 'center',
    justifyContent: CSS_JUSTIFY[comp.align] || 'flex-start',
    boxSizing: 'border-box',
    paddingLeft: comp.paddingLeft, paddingRight: comp.paddingRight,
    paddingTop: comp.paddingTop, paddingBottom: comp.paddingBottom,
    outline: selected ? '2px solid #0078d4' : '1px dashed rgba(0,0,0,0.15)',
    outlineOffset: selected ? '2px' : '0',
    boxShadow: selected ? '0 0 0 3px rgba(0,120,212,0.25)' : 'none',
    overflow: 'hidden', zIndex: selected ? 10 : 1,
    lineHeight: comp.lineHeight,
    transition: 'box-shadow 0.1s, outline 0.1s',
  }
  const displayText = evaluateValue(comp.text, localVars)

  return (
    <div style={style} onMouseDown={onMouseDown} onClick={onClick}>{displayText}</div>
  )
}

LabelRenderer.propTypes = {
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
    align: PropTypes.string,
    verticalAlign: PropTypes.string,
    visible: PropTypes.bool,
    paddingLeft: PropTypes.number,
    paddingRight: PropTypes.number,
    paddingTop: PropTypes.number,
    paddingBottom: PropTypes.number,
    lineHeight: PropTypes.number,
    text: PropTypes.string,
  }).isRequired,
  selected: PropTypes.bool,
  isPlaying: PropTypes.bool,
  localVars: PropTypes.object,
  onMouseDown: PropTypes.func.isRequired,
  onClick: PropTypes.func.isRequired,
}
