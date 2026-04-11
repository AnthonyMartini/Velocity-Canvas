import PropTypes from 'prop-types'
import { executeAction } from '../../../../common/helpers'
import { getInsetSelectionStyles, themeVars } from '@/theme/theme'
import { CSS_BORDER_STYLE } from './cssProps'

const CLOUD_SVG = `
<svg viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="8" y="8" width="144" height="104" rx="22" fill="currentColor" fill-opacity="0.08"/>
  <path d="M52 78c-11.046 0-20-8.954-20-20 0-9.964 7.283-18.227 16.818-19.755C52.06 27.21 61.873 20 73.5 20c14.09 0 25.73 10.34 27.769 23.87C111.947 44.48 120 53.334 120 64c0 12.15-9.85 22-22 22H52Z" fill="currentColor" fill-opacity="0.2"/>
  <path d="M49 79h50c12.15 0 22-9.85 22-22 0-10.666-8.053-19.52-18.731-20.13C100.23 23.34 88.59 13 74.5 13 62.873 13 53.06 20.21 49.818 31.245 40.283 32.773 33 41.036 33 51c0 11.046 8.954 20 20 20" stroke="currentColor" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M71 56l9 9 18-18" stroke="currentColor" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`.trim()

export default function ImageRenderer({
  comp,
  selected,
  isPlaying,
  localVars,
  setLocalVars,
  notify,
  navigate,
  flatNodes,
  parentNode,
  onMouseDown,
  onClick,
  renderZIndex = 1,
}) {
  const handleActionClick = (event) => {
    if (isPlaying && comp.OnSelect && comp.DisplayMode !== 'DisplayMode.Disabled') {
      event.stopPropagation()
      executeAction(comp.OnSelect, localVars, setLocalVars, notify, navigate, flatNodes, parentNode, comp)
      return
    }

    if (onClick) onClick(event)
  }

  const radiusTopLeft = comp.RadiusTopLeft ?? 12
  const radiusTopRight = comp.RadiusTopRight ?? 12
  const radiusBottomRight = comp.RadiusBottomRight ?? 12
  const radiusBottomLeft = comp.RadiusBottomLeft ?? 12

  const containerStyle: any = {
    position: 'absolute',
    left: `${comp.X}pt`,
    top: `${comp.Y}pt`,
    width: `${comp.Width}pt`,
    height: `${comp.Height}pt`,
    backgroundColor: comp.Fill || '#f8fafc',
    color: comp.Color || '#60a5fa',
    border: `${comp.BorderThickness || 0}pt ${CSS_BORDER_STYLE[comp.BorderStyle] || 'solid'} ${comp.BorderColor || '#d1d5db'}`,
    borderRadius: `${radiusTopLeft}pt ${radiusTopRight}pt ${radiusBottomRight}pt ${radiusBottomLeft}pt`,
    opacity: comp.Visible === false ? 0 : (comp.DisplayMode === 'DisplayMode.Disabled' ? 0.5 : 1),
    cursor: isPlaying && comp.OnSelect && comp.DisplayMode !== 'DisplayMode.Disabled' ? 'pointer' : 'default',
    pointerEvents: (comp.DisplayMode === 'DisplayMode.Disabled' && isPlaying) ? 'none' : 'auto',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: `${comp.PaddingTop || 0}pt`,
    paddingRight: `${comp.PaddingRight || 0}pt`,
    paddingBottom: `${comp.PaddingBottom || 0}pt`,
    paddingLeft: `${comp.PaddingLeft || 0}pt`,
    boxSizing: 'border-box' as const,
    ...getInsetSelectionStyles(selected),
    zIndex: renderZIndex,
  }

  return (
    <div
      style={containerStyle}
      onMouseDown={onMouseDown}
      onClick={handleActionClick}
      data-image-type="cloud-placeholder"
      title={comp.Tooltip ? String(comp.Tooltip).replace(/^['"]|['"]$/g, '') : undefined}
      aria-label={comp.AccessibleLabel ? String(comp.AccessibleLabel).replace(/^['"]|['"]$/g, '') : undefined}
    >
      <div
        className="w-full h-full [&>svg]:w-full [&>svg]:h-full"
        style={{ color: comp.Color || themeVars.colors.selection }}
        dangerouslySetInnerHTML={{ __html: CLOUD_SVG }}
      />
    </div>
  )
}

ImageRenderer.propTypes = {
  comp: PropTypes.shape({
    X: PropTypes.number.isRequired,
    Y: PropTypes.number.isRequired,
    Width: PropTypes.number.isRequired,
    Height: PropTypes.number.isRequired,
    Fill: PropTypes.string,
    Color: PropTypes.string,
    BorderColor: PropTypes.string,
    BorderStyle: PropTypes.string,
    BorderThickness: PropTypes.number,
    PaddingTop: PropTypes.number,
    PaddingRight: PropTypes.number,
    PaddingBottom: PropTypes.number,
    PaddingLeft: PropTypes.number,
    RadiusTopLeft: PropTypes.number,
    RadiusTopRight: PropTypes.number,
    RadiusBottomRight: PropTypes.number,
    RadiusBottomLeft: PropTypes.number,
    OnSelect: PropTypes.string,
    AccessibleLabel: PropTypes.string,
    Tooltip: PropTypes.string,
    Visible: PropTypes.bool,
    DisplayMode: PropTypes.string,
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
