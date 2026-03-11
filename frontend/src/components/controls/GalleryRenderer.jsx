import PropTypes from 'prop-types'
import ButtonRenderer from './ButtonRenderer.jsx'
import LabelRenderer from './LabelRenderer.jsx'
import TextInputRenderer from './TextInputRenderer.jsx'
import DropdownRenderer from './DropdownRenderer.jsx'
import ContainerRenderer from './ContainerRenderer.jsx'

export default function GalleryRenderer({ comp, selected, isPlaying, selectedIds, onMouseDown, onClick, onChildMouseDown, onChildClick, onDropInto, dragOverId, setDragOverId }) {
  const isDragOver = dragOverId === comp.id

  const style = {
    position: 'absolute',
    left: comp.x, top: comp.y, width: comp.width, height: comp.height,
    backgroundColor: comp.fill === 'rgba(0,0,0,0)' || comp.fill === 'transparent' ? 'rgba(0,0,0,0)' : comp.fill,
    border: '2px dashed rgba(236, 72, 153, 0.4)', // Pink dashed border for Gallery
    opacity: comp.visible ? 1 : 0.3,
    cursor: isPlaying ? 'default' : 'move', userSelect: 'none',
    boxSizing: 'border-box',
    outline: selected ? '2px solid #ec4899' : 'none',
    outlineOffset: selected ? '2px' : '0',
    boxShadow: selected
      ? '0 0 0 3px rgba(236, 72, 153, 0.25)'
      : isDragOver
        ? 'inset 0 0 0 2px #ec4899'
        : 'none',
    transition: 'box-shadow 0.12s',
    zIndex: selected ? 10 : 1,
    overflow: 'hidden'
  }

  // Determine if vertical or horizontal based on the selected Variant
  const isVertical = comp.Variant ? comp.Variant.includes('Vertical') : comp.height > comp.width
  const padding = comp.TemplatePadding || 0
  const tSize = comp.TemplateSize || (isVertical ? 100 : 100)

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
      <div style={{ position: 'absolute', top: 4, left: 6, fontSize: 10, color: '#ec4899', fontWeight: 'bold', pointerEvents: 'none', userSelect: 'none', zIndex: 0 }}>
        Gallery Template
      </div>

      {isDragOver && (
        <div style={{
          position: 'absolute', inset: 0, background: 'rgba(236, 72, 153, 0.06)',
          border: '2px dashed #ec4899', borderRadius: 2, pointerEvents: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
        }}>
          <span style={{ fontSize: 11, color: '#ec4899', fontWeight: 600 }}>Drop into Template</span>
        </div>
      )}

      {/* Actual Template Wrapper */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: isVertical ? '100%' : tSize, height: isVertical ? tSize : '100%', borderBottom: isVertical ? '1px dashed rgba(236, 72, 153, 0.2)' : 'none', borderRight: !isVertical ? '1px dashed rgba(236, 72, 153, 0.2)' : 'none' }}>
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

      {/* Ghost repeating templates for visual effect only */}
      <div style={{ position: 'absolute', top: isVertical ? tSize + padding : 0, left: isVertical ? 0 : tSize + padding, width: isVertical ? '100%' : tSize, height: isVertical ? tSize : '100%', borderBottom: isVertical ? '1px dashed rgba(236, 72, 153, 0.2)' : 'none', borderRight: !isVertical ? '1px dashed rgba(236, 72, 153, 0.2)' : 'none', opacity: 0.3, pointerEvents: 'none' }}>
        {comp.children?.map(child => {
          const isChildSelected = selectedIds.includes(child.id)
          const childProps = { comp: child, selected: isChildSelected, isPlaying, selectedIds, onMouseDown: () => {}, onClick: () => {} }
          if (child.type === 'Button') return <ButtonRenderer key={child.id} {...childProps} />
          if (child.type === 'Label') return <LabelRenderer key={child.id} {...childProps} />
          if (child.type === 'TextInput') return <TextInputRenderer key={child.id} {...childProps} />
          if (child.type === 'Dropdown') return <DropdownRenderer key={child.id} {...childProps} />
          if (child.type === 'Container') return <ContainerRenderer key={child.id} {...childProps} onChildMouseDown={()=>{}} onChildClick={()=>{}} onDropInto={()=>{}} setDragOverId={()=>{}} />
          return null
        })}
      </div>
    </div>
  )
}

GalleryRenderer.propTypes = {
  comp: PropTypes.shape({
    id: PropTypes.string.isRequired,
    x: PropTypes.number.isRequired,
    y: PropTypes.number.isRequired,
    width: PropTypes.number.isRequired,
    height: PropTypes.number.isRequired,
    fill: PropTypes.string,
    TemplateSize: PropTypes.number,
    TemplatePadding: PropTypes.number,
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
