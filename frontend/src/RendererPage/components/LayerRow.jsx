import PropTypes from 'prop-types'
import { TYPE_ICONS, TYPE_COLORS } from '../../common/constants.jsx'

export default function LayerRow({ node, selectedIds, onSelect, depth, isCollapsed, toggleCollapse }) {
  const isContainer = node.type === 'Container' || node.type === 'Gallery'
  const hasChildren = isContainer && node.children?.length > 0
  const isSelected = selectedIds.includes(node.id)

  const Icon = TYPE_ICONS[node.type]
  const colorClass = TYPE_COLORS[node.type] || 'bg-overlay'

  return (
    <div 
      className={`flex items-center gap-1.5 w-full text-left text-xs px-2 py-1.5 rounded-lg transition-all duration-100 ${
        isSelected
          ? 'bg-accent/15 text-accent border border-accent/30'
          : 'text-subtext hover:bg-overlay/30 border border-transparent'
      }`}
      style={{ paddingLeft: `${8 + depth * 14}px` }}
    >
      {/* Collapse/Expand Toggle */}
      <div className="w-4 h-4 flex items-center justify-center shrink-0">
        {hasChildren && (
          <button 
            onClick={(e) => { e.stopPropagation(); toggleCollapse(node.id); }}
            className="w-full h-full flex items-center justify-center rounded hover:bg-overlay/40 text-subtext/40 hover:text-subtext transition-colors"
          >
            <svg 
              className={`w-3 h-3 transition-transform duration-200 ${isCollapsed ? '-rotate-90' : 'rotate-0'}`} 
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        )}
      </div>

      <button 
        onClick={(e) => {
          if (node.type !== 'App') onSelect(e, node.id)
        }}
        className={`flex-1 flex items-center gap-1.5 truncate ${node.type === 'App' ? 'cursor-default' : 'cursor-pointer'}`}
      >
        <span className={`w-4 h-4 rounded flex items-center justify-center shrink-0 text-white ${colorClass}`}>
          {Icon && <Icon className="w-2.5 h-2.5" />}
        </span>
        <span className="truncate">{node.name || (node.type === 'Container' ? 'Container' : (node.text || node.type))}</span>
        <span className="ml-auto text-subtext/30 text-[10px] shrink-0">{node.type}</span>
      </button>
    </div>
  )
}

LayerRow.propTypes = {
  node: PropTypes.shape({
    id: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired,
    name: PropTypes.string,
    text: PropTypes.string,
    children: PropTypes.array,
  }).isRequired,
  selectedIds: PropTypes.arrayOf(PropTypes.string).isRequired,
  onSelect: PropTypes.func.isRequired,
  depth: PropTypes.number.isRequired,
  isCollapsed: PropTypes.bool.isRequired,
  toggleCollapse: PropTypes.func.isRequired,
}
