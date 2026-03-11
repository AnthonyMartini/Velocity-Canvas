import PropTypes from 'prop-types'
import ButtonRenderer from './ButtonRenderer.jsx'
import LabelRenderer from './LabelRenderer.jsx'
import TextInputRenderer from './TextInputRenderer.jsx'
import DropdownRenderer from './DropdownRenderer.jsx'
import GalleryRenderer from './GalleryRenderer.jsx'

export default function ContainerRenderer({ comp, selected, isPlaying, selectedIds, onMouseDown, onClick, onChildMouseDown, onChildClick, onDropInto, dragOverId, setDragOverId }) {
  const borderMap = { None: 'none', Solid: 'solid', Dashed: 'dashed', Dotted: 'dotted' }
  const isDragOver = dragOverId === comp.id

  const style = {
    position: 'absolute',
    left: comp.x, top: comp.y, width: comp.width, height: comp.height,
    backgroundColor: comp.fill === 'rgba(0,0,0,0)' || comp.fill === 'transparent' ? 'rgba(0,0,0,0)' : comp.fill,
    border: comp.borderStyle === 'None'
      ? '1px dashed rgba(0,0,0,0.12)'
      : `${comp.borderThickness}px ${borderMap[comp.borderStyle] || 'solid'} ${comp.borderColor}`,
    opacity: comp.visible ? 1 : 0.3,
    cursor: isPlaying ? 'default' : 'move', userSelect: 'none',
    boxSizing: 'border-box',
    outline: selected ? '2px solid #0078d4' : 'none',
    outlineOffset: selected ? '2px' : '0',
    boxShadow: selected
      ? '0 0 0 3px rgba(0,120,212,0.25)'
      : isDragOver
        ? 'inset 0 0 0 2px #0078d4'
        : 'none',
    transition: 'box-shadow 0.12s',
    zIndex: selected ? 10 : 1,
  }

  return (
    <div
      style={style}
      data-container-id={comp.id}
      onMouseDown={(e) => { e.stopPropagation(); onMouseDown(e); }}
      onClick={onClick}
      onDragOver={e => { e.preventDefault(); e.stopPropagation(); setDragOverId(comp.id) }}
      onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOverId(null) }}
      onDrop={e => { e.preventDefault(); e.stopPropagation(); onDropInto(comp.id); setDragOverId(null) }}
    >
      {/* Container label badge */}
      {!comp.children?.length && (
        <div style={{ position: 'absolute', top: 4, left: 6, fontSize: 10, color: 'rgba(0,0,0,0.25)', pointerEvents: 'none', userSelect: 'none' }}>
          Container
        </div>
      )}

      {/* Drag-over highlight overlay */}
      {isDragOver && (
        <div style={{
          position: 'absolute', inset: 0, background: 'rgba(0,120,212,0.06)',
          border: '2px dashed #0078d4', borderRadius: 2, pointerEvents: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 11, color: '#0078d4', fontWeight: 600 }}>Drop here</span>
        </div>
      )}

      {/* Children */}
      {comp.children?.map(child => {
        const isChildSelected = selectedIds.includes(child.id)
        const childProps = {
          comp: child,
          selected: isChildSelected,
          isPlaying,
          selectedIds,
          onMouseDown: (e) => { e.stopPropagation(); onChildMouseDown(e, child.id) },
          onClick: (e) => { e.stopPropagation(); onChildClick(e, child.id) },
        }
        if (child.type === 'Button') return <ButtonRenderer key={child.id} {...childProps} />
        if (child.type === 'Label') return <LabelRenderer key={child.id} {...childProps} />
        if (child.type === 'TextInput') return <TextInputRenderer key={child.id} {...childProps} />
        if (child.type === 'Dropdown') return <DropdownRenderer key={child.id} {...childProps} />
        if (child.type === 'Container') return (
          <ContainerRenderer
            key={child.id} {...childProps}
            onChildMouseDown={onChildMouseDown}
            onChildClick={onChildClick}
            onDropInto={onDropInto}
            dragOverId={dragOverId}
            setDragOverId={setDragOverId}
          />
        )
        if (child.type === 'Gallery') return (
          <GalleryRenderer
            key={child.id} {...childProps}
            onChildMouseDown={onChildMouseDown}
            onChildClick={onChildClick}
            onDropInto={onDropInto}
            dragOverId={dragOverId}
            setDragOverId={setDragOverId}
          />
        )
        return null
      })}
    </div>
  )
}

ContainerRenderer.propTypes = {
  comp: PropTypes.shape({
    id: PropTypes.string.isRequired,
    x: PropTypes.number.isRequired,
    y: PropTypes.number.isRequired,
    width: PropTypes.number.isRequired,
    height: PropTypes.number.isRequired,
    fill: PropTypes.string,
    borderStyle: PropTypes.string,
    borderThickness: PropTypes.number,
    borderColor: PropTypes.string,
    visible: PropTypes.bool,
    children: PropTypes.array,
  }).isRequired,
  selected: PropTypes.bool,
  isPlaying: PropTypes.bool,
  selectedIds: PropTypes.arrayOf(PropTypes.string).isRequired,
  onMouseDown: PropTypes.func.isRequired,
  onClick: PropTypes.func.isRequired,
  onChildMouseDown: PropTypes.func.isRequired,
  onChildClick: PropTypes.func.isRequired,
  onDropInto: PropTypes.func.isRequired,
  dragOverId: PropTypes.string,
  setDragOverId: PropTypes.func.isRequired,
}
