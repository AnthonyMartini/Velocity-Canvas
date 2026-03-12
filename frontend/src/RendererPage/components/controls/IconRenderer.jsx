import PropTypes from 'prop-types'
import { evaluateValue, executeAction } from '../../../common/helpers.jsx'

export default function IconRenderer({ comp, selected, isPlaying, localVars, setLocalVars, notify, navigate, flatNodes, parentNode, onMouseDown, onClick }) {
  const handleActionClick = (e) => {
    if (isPlaying && comp.OnSelect) {
      e.stopPropagation()
      executeAction(comp.OnSelect, localVars, setLocalVars, notify, navigate, flatNodes, parentNode, comp)
    } else if (onClick) {
      onClick(e)
    }
  }

  // Find the exact SVG code by matching the selected icon value
  // We can extract this directly from the comp itself if the builder passed it through,
  // or we can statically import the schema. For this generic renderer, 
  // since we inject the raw SVG string as a property during generation if we want to be clean,
  // we can also let the Renderer just render it if we parse it.

  // The 'icon' property holds the PA enum like "Icon.Search".
  // We need to look up the SVG string from the schema's options.
  
  // A cleaner way is to inject the SVG data directly into the renderer if we don't want to import the schema here,
  // but importing the schema is standard and safe since it's local.
  // Actually, a safer way to parse arbitrary SVGs and allow color overrides:
  // We'll use a data URI or dangerouslySetInnerHTML.


  const containerStyle = {
    position: 'absolute',
    left: comp.X,
    top: comp.Y,
    width: comp.Width,
    height: comp.Height,
    backgroundColor: comp.Fill || 'transparent',
    color: comp.Color || '#0078d4',
    opacity: comp.Visible === false ? 0 : (comp.DisplayMode === 'DisplayMode.Disabled' ? 0.5 : 1),
    cursor: isPlaying && comp.OnSelect && comp.DisplayMode !== 'DisplayMode.Disabled' ? 'pointer' : 'default',
    pointerEvents: (comp.DisplayMode === 'DisplayMode.Disabled' && isPlaying) ? 'none' : 'auto',
    boxShadow: selected ? '0 0 0 2px #0078d4 inset' : 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }

  return (
    <div 
      style={containerStyle} 
      onMouseDown={onMouseDown} 
      onClick={handleActionClick}
      data-icon-type={comp.Icon}
    >
      <div 
        className="w-full h-full [&>svg]:w-full [&>svg]:h-full [&>svg]:stroke-current [&>svg]:fill-none"
        dangerouslySetInnerHTML={{ __html: comp._svg || `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"/></svg>` }} 
      />
    </div>
  )
}

IconRenderer.propTypes = {
  comp: PropTypes.shape({
    X: PropTypes.number.isRequired,
    Y: PropTypes.number.isRequired,
    Width: PropTypes.number.isRequired,
    Height: PropTypes.number.isRequired,
    Fill: PropTypes.string,
    Color: PropTypes.string,
    Icon: PropTypes.string,
    Visible: PropTypes.bool,
    DisplayMode: PropTypes.string,
    _svg: PropTypes.string,
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
