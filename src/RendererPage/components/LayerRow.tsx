import PropTypes from 'prop-types'
import { TYPE_ICONS, TYPE_COLORS } from '../../common/constants'

export default function LayerRow({ node, selectedIds, onSelect, onReorder, depth, isCollapsed, toggleCollapse }) {
  const isContainer = node.type === 'Container' || node.type === 'Gallery'
  const hasChildren = isContainer && node.children?.length > 0
  const isSelected = selectedIds.includes(node.id)

  const Icon = TYPE_ICONS[node.type]
  const colorClass = TYPE_COLORS[node.type] || 'bg-overlay'

  return (
    <div 
      className={`group flex items-center gap-1 w-full text-left text-xs px-2 py-1.5 rounded-lg transition-all duration-100 ${
        isSelected
          ? 'bg-accent/15 text-accent border border-accent/30'
          : 'text-subtext hover:bg-overlay/30 border border-transparent'
      }`}
      style={{ paddingLeft: `${4 + depth * 10}px` }}
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
        className={` flex-1 flex items-center gap-1.5 truncate ${node.type === 'App' ? 'cursor-default' : 'cursor-pointer'}`}
      >
        <span className={` relative w-5 h-5 rounded flex items-center justify-center shrink-0 text-white ${colorClass}`}>
          {Icon && <Icon className="w-3.5 h-3.5" />}
        </span>
        <span className="truncate">{node.name || (node.type === 'Container' ? 'Container' : (node.text || node.type))}</span>
      </button>

      {/* Reorder Buttons (Visible on Hover) */}
      {node.type !== 'App' && node.type !== 'Screen' && (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-auto pl-1">
          <button 
            onClick={(e) => { e.stopPropagation(); onReorder(node.id, 'down'); }}
            title="Move Down"
            className="p-1 rounded hover:bg-accent/20 text-subtext/40 hover:text-accent transition-colors"
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 9l-7 7-7-7"/></svg>
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onReorder(node.id, 'up'); }}
            title="Move Up"
            className="p-1 rounded hover:bg-accent/20 text-subtext/40 hover:text-accent transition-colors"
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 15l7-7 7 7"/></svg>
          </button>
        </div>
      )}
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
