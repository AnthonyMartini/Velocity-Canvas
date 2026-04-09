import PropTypes from 'prop-types'
import { CSS_BORDER_STYLE, CSS_FW } from './cssProps'
import { getSelectionStyles, themeVars } from '@/theme/theme'
import { normalizeLiteralString, resolveModernPalette } from './modernControlUtils'

function resolveVerticalAlign(value: string) {
  if (value === 'VerticalAlign.Top') return 'flex-start'
  if (value === 'VerticalAlign.Bottom') return 'flex-end'
  return 'center'
}

export default function LinkRenderer({
  comp,
  selected,
  isPlaying,
  canvasTheme,
  onMouseDown,
  onClick,
  renderZIndex = 1,
}) {
  const { palette } = resolveModernPalette(comp, canvasTheme)
  const text = normalizeLiteralString(comp.Text, 'Open link')
  const url = normalizeLiteralString(comp.Url)
  const autoHeight = comp.AutoHeight === true || comp.AutoHeight === 'true'
  const wrap = comp.Wrap === true || comp.Wrap === 'true'
  const isDisabledMode = comp.DisplayMode === 'DisplayMode.Disabled'
  const isViewMode = comp.DisplayMode === 'DisplayMode.View'
  const isInteractive = isPlaying && !isDisabledMode && !isViewMode && Boolean(url)
  const textDecoration = [
    comp.Underline !== false && comp.Underline !== 'false' ? 'underline' : '',
    comp.Strikethrough ? 'line-through' : '',
  ].filter(Boolean).join(' ') || 'none'

  const baseStyle: any = {
    position: 'absolute',
    left: `${comp.X}pt`,
    top: `${comp.Y}pt`,
    width: `${comp.Width}pt`,
    minHeight: `${comp.Height}pt`,
    height: autoHeight ? 'auto' : `${comp.Height}pt`,
    display: 'flex',
    alignItems: resolveVerticalAlign(comp.VerticalAlign),
    justifyContent: comp.Align === 'Align.Center' ? 'center' : (comp.Align === 'Align.Right' ? 'flex-end' : 'flex-start'),
    paddingTop: `${comp.PaddingTop ?? 4}pt`,
    paddingRight: `${comp.PaddingRight ?? 6}pt`,
    paddingBottom: `${comp.PaddingBottom ?? 4}pt`,
    paddingLeft: `${comp.PaddingLeft ?? 6}pt`,
    boxSizing: 'border-box',
    border: `${comp.BorderThickness || 0}pt ${CSS_BORDER_STYLE[comp.BorderStyle] || 'solid'} ${comp.BorderColor || 'transparent'}`,
    borderTopLeftRadius: `${comp.RadiusTopLeft ?? 8}pt`,
    borderTopRightRadius: `${comp.RadiusTopRight ?? 8}pt`,
    borderBottomRightRadius: `${comp.RadiusBottomRight ?? 8}pt`,
    borderBottomLeftRadius: `${comp.RadiusBottomLeft ?? 8}pt`,
    backgroundColor: comp.Fill,
    color: comp.Color || palette,
    fontFamily: comp.Font || canvasTheme?.Font || themeVars.fonts.sans,
    fontSize: `${comp.Size || 14}pt`,
    fontWeight: CSS_FW[comp.FontWeight] || comp.FontWeight || '400',
    fontStyle: comp.Italic ? 'italic' : 'normal',
    textDecoration,
    opacity: comp.Visible === false ? 0.3 : (isDisabledMode ? 0.58 : 1),
    overflow: autoHeight ? 'visible' : 'hidden',
    whiteSpace: wrap ? 'pre-wrap' : 'nowrap',
    overflowWrap: wrap ? 'break-word' : 'normal',
    textAlign: comp.Align === 'Align.Center' ? 'center' : (comp.Align === 'Align.Right' ? 'right' : comp.Align === 'Align.Justify' ? 'justify' : 'left'),
    userSelect: 'none',
    ...getSelectionStyles(selected, 'default'),
    zIndex: renderZIndex,
  }

  if (isInteractive) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        style={{ ...baseStyle, cursor: 'pointer' }}
        onMouseDown={(event) => {
          if (!isPlaying) onMouseDown(event)
        }}
        onClick={(event) => event.stopPropagation()}
      >
        {text}
      </a>
    )
  }

  return (
    <div style={{ ...baseStyle, cursor: isPlaying ? 'default' : 'move' }} onMouseDown={onMouseDown} onClick={onClick}>
      {text}
    </div>
  )
}

LinkRenderer.propTypes = {
  comp: PropTypes.shape({
    X: PropTypes.number.isRequired,
    Y: PropTypes.number.isRequired,
    Width: PropTypes.number.isRequired,
    Height: PropTypes.number.isRequired,
    Align: PropTypes.string,
    AutoHeight: PropTypes.oneOfType([PropTypes.bool, PropTypes.string]),
    BasePaletteColor: PropTypes.string,
    BorderColor: PropTypes.string,
    BorderStyle: PropTypes.string,
    BorderThickness: PropTypes.number,
    Color: PropTypes.string,
    DisplayMode: PropTypes.string,
    Fill: PropTypes.string,
    Font: PropTypes.string,
    FontWeight: PropTypes.string,
    Italic: PropTypes.bool,
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
    Underline: PropTypes.oneOfType([PropTypes.bool, PropTypes.string]),
    Url: PropTypes.string,
    VerticalAlign: PropTypes.string,
    Visible: PropTypes.bool,
    Wrap: PropTypes.oneOfType([PropTypes.bool, PropTypes.string]),
  }).isRequired,
  selected: PropTypes.bool,
  isPlaying: PropTypes.bool,
  canvasTheme: PropTypes.object,
  renderZIndex: PropTypes.number,
  onMouseDown: PropTypes.func.isRequired,
  onClick: PropTypes.func.isRequired,
}
