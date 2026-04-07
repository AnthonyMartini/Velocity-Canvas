import PropTypes from 'prop-types'
import { CSS_FW, CSS_ALIGN, CSS_JUSTIFY, CSS_VALIGN, CSS_BORDER_STYLE } from './cssProps'
import { executeAction } from '../../../common/helpers'
import { parseFormula, evaluateAST } from '../../../common/FormulaParser'
import { resolveSampleText } from './sampleText'
import { getSelectionStyles } from '@/theme/theme'

export default function LabelRenderer({ comp, selected, isPlaying, localVars, setLocalVars, notify, navigate, flatNodes, parentNode, onMouseDown, onClick, renderZIndex = 1 }) {
  const style: any = {
    position: 'absolute',
    left: `${comp.X}pt`, top: `${comp.Y}pt`, width: `${comp.Width}pt`, height: `${comp.Height}pt`,
    backgroundColor: comp.Fill === 'transparent' ? 'transparent' : comp.Fill,
    color: comp.Color,
    fontSize: `${comp.Size}pt`,
    fontWeight: CSS_FW[comp.FontWeight] || comp.FontWeight,
    fontStyle: comp.Italic ? 'italic' : 'normal',
    textDecoration: comp.Underline ? 'underline' : 'none',
    textAlign: CSS_ALIGN[comp.Align] || comp.Align,
    opacity: comp.Visible ? 1 : 0.3,
    cursor: isPlaying ? 'default' : 'move', userSelect: 'none',
    display: 'flex',
    alignItems: CSS_VALIGN[comp.VerticalAlign] || 'center',
    justifyContent: CSS_JUSTIFY[comp.Align] || 'flex-start',
    boxSizing: 'border-box' as const,
    paddingLeft: `${comp.PaddingLeft}pt`, paddingRight: `${comp.PaddingRight}pt`,
    paddingTop: `${comp.PaddingTop}pt`, paddingBottom: `${comp.PaddingBottom}pt`,
    border: (comp.BorderStyle && comp.BorderStyle !== 'BorderStyle.None' && comp.BorderThickness > 0)
      ? `${comp.BorderThickness}pt ${CSS_BORDER_STYLE[comp.BorderStyle] || 'solid'} ${comp.BorderColor}`
      : 'none',
    ...getSelectionStyles(selected),
    overflow: 'hidden', zIndex: renderZIndex,
    lineHeight: comp.LineHeight,
    transition: 'box-shadow 0.1s, outline 0.1s',
  }
  const displayText = resolveSampleText((comp.Text !== undefined && comp.Text !== null) ? comp.Text : '')

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
  renderZIndex: PropTypes.number,
  onMouseDown: PropTypes.func.isRequired,
  onClick: PropTypes.func.isRequired,
}
