import PropTypes from 'prop-types'
import { executeAction } from '../../../common/helpers'
import { SCHEMAS } from '../../constants'

export default function IconRenderer({ comp, selected, isPlaying, localVars, setLocalVars, notify, navigate, flatNodes, parentNode, onMouseDown, onClick, renderZIndex = 1 }) {
  const handleActionClick = (e) => {
    if (isPlaying && comp.OnSelect) {
      e.stopPropagation()
      executeAction(comp.OnSelect, localVars, setLocalVars, notify, navigate, flatNodes, parentNode, comp)
    } else if (onClick) {
      onClick(e)
    }
  }

  // Resolve the SVG based on the comp.Icon property.
  // We prioritize the schema mapping over the injected comp._svg for better reactivity during manual edits.
  const iconSchema = SCHEMAS.Icon as any;
  const iconProp = iconSchema.properties.find((p: any) => p.key === 'Icon') as any;
  const schemaOptionVal = iconProp?.options?.find((o: any) => o?.value === comp.Icon);
  const resolvedSvg = schemaOptionVal ? schemaOptionVal.svg : (comp._svg || `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"/></svg>`);

  const containerStyle: any = {
    position: 'absolute',
    left: `${comp.X}pt`,
    top: `${comp.Y}pt`,
    width: `${comp.Width}pt`,
    height: `${comp.Height}pt`,
    backgroundColor: comp.Fill || 'transparent',
    color: comp.Color || '#0078d4',
    opacity: comp.Visible === false ? 0 : (comp.DisplayMode === 'DisplayMode.Disabled' ? 0.5 : 1),
    cursor: isPlaying && comp.OnSelect && comp.DisplayMode !== 'DisplayMode.Disabled' ? 'pointer' : 'default',
    pointerEvents: (comp.DisplayMode === 'DisplayMode.Disabled' && isPlaying) ? 'none' : 'auto',
    boxShadow: selected ? '0 0 0 2px #0078d4 inset' : 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: renderZIndex
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
        dangerouslySetInnerHTML={{ __html: resolvedSvg }} 
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
  renderZIndex: PropTypes.number,
  onMouseDown: PropTypes.func.isRequired,
  onClick: PropTypes.func.isRequired,
}
