import PropTypes from 'prop-types'
import { CSS_BORDER_STYLE, CSS_FW } from './cssProps'
import { executeAction } from '../../../common/helpers'
import { getSelectionStyles, themeVars } from '@/theme/theme'
import { normalizeLiteralString } from './modernControlUtils'

function resolveVerticalAlign(value: string) {
  if (value === 'VerticalAlign.Top') return 'flex-start'
  if (value === 'VerticalAlign.Bottom') return 'flex-end'
  return 'center'
}

export default function ModernTextRenderer({
  comp,
  selected,
  isPlaying,
  localVars,
  setLocalVars,
  notify,
  navigate,
  flatNodes,
  parentNode,
  canvasTheme,
  onMouseDown,
  onClick,
  renderZIndex = 1,
}) {
  const text = normalizeLiteralString(comp.Text, 'Text')
  const autoHeight = comp.AutoHeight === true || comp.AutoHeight === 'true'
  const wrap = comp.Wrap !== false && comp.Wrap !== 'false'

  const handleClick = (event: any) => {
    onClick(event)
    if (isPlaying && comp.OnSelect) {
      executeAction(comp.OnSelect, localVars, setLocalVars, notify, navigate, flatNodes, parentNode, comp)
    }
  }

  return (
    <div
      onMouseDown={onMouseDown}
      onClick={handleClick}
      style={{
        position: 'absolute',
        left: `${comp.X}pt`,
        top: `${comp.Y}pt`,
        width: `${comp.Width}pt`,
        minHeight: `${comp.Height}pt`,
        height: autoHeight ? 'auto' : `${comp.Height}pt`,
        display: 'flex',
        alignItems: resolveVerticalAlign(comp.VerticalAlign),
        justifyContent: comp.Align === 'Align.Center' ? 'center' : (comp.Align === 'Align.Right' ? 'flex-end' : 'flex-start'),
        paddingTop: `${comp.PaddingTop ?? 6}pt`,
        paddingRight: `${comp.PaddingRight ?? 8}pt`,
        paddingBottom: `${comp.PaddingBottom ?? 6}pt`,
        paddingLeft: `${comp.PaddingLeft ?? 8}pt`,
        boxSizing: 'border-box',
        border: `${comp.BorderThickness || 0}pt ${CSS_BORDER_STYLE[comp.BorderStyle] || 'solid'} ${comp.BorderColor || 'transparent'}`,
        borderTopLeftRadius: `${comp.RadiusTopLeft ?? 8}pt`,
        borderTopRightRadius: `${comp.RadiusTopRight ?? 8}pt`,
        borderBottomRightRadius: `${comp.RadiusBottomRight ?? 8}pt`,
        borderBottomLeftRadius: `${comp.RadiusBottomLeft ?? 8}pt`,
        backgroundColor: comp.Fill,
        color: comp.Color || '#201f1e',
        cursor: isPlaying && comp.OnSelect ? 'pointer' : (isPlaying ? 'default' : 'move'),
        opacity: comp.Visible === false ? 0.3 : 1,
        userSelect: 'none',
        overflow: autoHeight ? 'visible' : 'hidden',
        ...getSelectionStyles(selected, 'default'),
        zIndex: renderZIndex,
      }}
    >
      <span
        style={{
          width: '100%',
          fontFamily: comp.Font || canvasTheme?.Font || themeVars.fonts.sans,
          fontSize: `${comp.Size || 14}pt`,
          fontWeight: CSS_FW[comp.FontWeight] || comp.FontWeight || '400',
          fontStyle: comp.Italic ? 'italic' : 'normal',
          textDecoration: [
            comp.Underline ? 'underline' : '',
            comp.Strikethrough ? 'line-through' : '',
          ].filter(Boolean).join(' ') || 'none',
          textAlign: comp.Align === 'Align.Center' ? 'center' : (comp.Align === 'Align.Right' ? 'right' : comp.Align === 'Align.Justify' ? 'justify' : 'left'),
          whiteSpace: wrap ? 'pre-wrap' : 'nowrap',
          overflowWrap: wrap ? 'break-word' : 'normal',
          textOverflow: autoHeight ? 'clip' : 'ellipsis',
          overflow: autoHeight ? 'visible' : 'hidden',
          lineHeight: 1.35,
        }}
      >
        {text}
      </span>
    </div>
  )
}

ModernTextRenderer.propTypes = {
  comp: PropTypes.shape({
    X: PropTypes.number.isRequired,
    Y: PropTypes.number.isRequired,
    Width: PropTypes.number.isRequired,
    Height: PropTypes.number.isRequired,
    Align: PropTypes.string,
    AutoHeight: PropTypes.oneOfType([PropTypes.bool, PropTypes.string]),
    BorderColor: PropTypes.string,
    BorderStyle: PropTypes.string,
    BorderThickness: PropTypes.number,
    Color: PropTypes.string,
    Fill: PropTypes.string,
    Font: PropTypes.string,
    FontWeight: PropTypes.string,
    Italic: PropTypes.bool,
    OnSelect: PropTypes.string,
    PaddingBottom: PropTypes.number,
    PaddingLeft: PropTypes.number,
    PaddingRight: PropTypes.number,
    PaddingTop: PropTypes.number,
    RadiusBottomLeft: PropTypes.number,
    RadiusBottomRight: PropTypes.number,
    RadiusTopLeft: PropTypes.number,
    RadiusTopRight: PropTypes.number,
    Size: PropTypes.number,
    Strikethrough: PropTypes.bool,
    Text: PropTypes.string,
    Underline: PropTypes.bool,
    VerticalAlign: PropTypes.string,
    Visible: PropTypes.bool,
    Wrap: PropTypes.oneOfType([PropTypes.bool, PropTypes.string]),
  }).isRequired,
  selected: PropTypes.bool,
  isPlaying: PropTypes.bool,
  localVars: PropTypes.object,
  setLocalVars: PropTypes.func,
  notify: PropTypes.func,
  navigate: PropTypes.func,
  flatNodes: PropTypes.array,
  parentNode: PropTypes.object,
  canvasTheme: PropTypes.object,
  renderZIndex: PropTypes.number,
  onMouseDown: PropTypes.func.isRequired,
  onClick: PropTypes.func.isRequired,
}
