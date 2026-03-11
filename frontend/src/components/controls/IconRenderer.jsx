import { evaluateValue, executeAction } from '../../common/helpers.jsx'

export default function IconRenderer({ comp, selected, isPlaying, localVars, setLocalVars, notify, onMouseDown, onClick }) {
  const handleActionClick = (e) => {
    if (isPlaying && comp.OnSelect) {
      e.stopPropagation()
      executeAction(comp.OnSelect, localVars, setLocalVars, notify)
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
    left: comp.x,
    top: comp.y,
    width: comp.width,
    height: comp.height,
    backgroundColor: comp.fill || 'transparent',
    color: comp.color || '#0078d4',
    opacity: comp.visible === false ? 0 : (comp.disabled ? 0.5 : 1),
    cursor: isPlaying && comp.OnSelect && !comp.disabled ? 'pointer' : 'default',
    pointerEvents: (comp.disabled && isPlaying) ? 'none' : 'auto',
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
      data-icon-type={comp.icon}
    >
      <div 
        className="w-full h-full [&>svg]:w-full [&>svg]:h-full [&>svg]:stroke-current [&>svg]:fill-none"
        dangerouslySetInnerHTML={{ __html: comp._svg || `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"/></svg>` }} 
      />
    </div>
  )
}
