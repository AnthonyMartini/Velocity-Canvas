import PropTypes from 'prop-types'
import ButtonRenderer from './ButtonRenderer'
import LabelRenderer from './LabelRenderer'
import TextInputRenderer from './TextInputRenderer'
import DropdownRenderer from './DropdownRenderer'
import CheckboxRenderer from './CheckboxRenderer'
import RectangleRenderer from './RectangleRenderer'
import IconRenderer from './IconRenderer'
import HtmlTextRenderer from './HtmlTextRenderer'
import DatePickerRenderer from './DatePickerRenderer'
import ComboBoxRenderer from './ComboBoxRenderer'
import ContainerRenderer from './ContainerRenderer'
import { resolveProperties } from '../../../common/helpers'

export default function GalleryRenderer({ 
  comp, selected, isPlaying, selectedIds, localVars, setLocalVars, flatNodes, notify, navigate, 
  updateProp, parentNode, onMouseDown, onClick, onChildMouseDown, onChildClick,
  onDropInto, dragOverId, setDragOverId
}) {
  const style: any = {
    position: 'absolute',
    left: comp.X, top: comp.Y, width: comp.Width, height: comp.Height,
    backgroundColor: comp.Fill === 'rgba(0,0,0,0)' || comp.Fill === 'transparent' ? 'rgba(0,0,0,0)' : comp.Fill,
    border: '2px dashed rgba(236, 72, 153, 0.4)', // Pink dashed border for Gallery
    opacity: comp.Visible ? 1 : 0.3,
    cursor: isPlaying ? 'default' : 'move', userSelect: 'none',
    boxSizing: 'border-box',
    outline: selected ? '2px solid #ec4899' : 'none',
    outlineOffset: selected ? '2px' : '0',
    boxShadow: selected
      ? '0 0 0 3px rgba(236, 72, 153, 0.25)'
      : 'none',
    transition: 'box-shadow 0.12s',
    zIndex: selected ? 10 : 1,
    overflow: 'hidden',
  }

  if (dragOverId === comp.id) {
    style.outline = '4px solid rgba(236,72,153,0.5)'
    style.outlineOffset = '2px'
  }

  // Determine if vertical or horizontal based on the selected Variant
  const isVertical = comp.Variant ? comp.Variant.includes('Vertical') : comp.Height > comp.Width
  const padding = comp.TemplatePadding || 0
  const tSize = comp.TemplateSize || 100

  return (
    <div
      style={style}
      data-container-id={comp.id}
      onMouseDown={(e) => { e.stopPropagation(); onMouseDown(e); }}
      onClick={onClick}
      onDragOver={(e) => {
        if (isPlaying) return
        e.preventDefault()
        if (dragOverId !== comp.id) setDragOverId(comp.id)
      }}
    >
      <div style={{ position: 'absolute', top: 4, left: 6, fontSize: 10, color: '#ec4899', fontWeight: 'bold', pointerEvents: 'none', userSelect: 'none', zIndex: 0 }}>
        Gallery Template
      </div>

      {/* Actual Template Wrapper */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: isVertical ? '100%' : tSize, height: isVertical ? tSize : '100%', borderBottom: isVertical ? '1px dashed rgba(236, 72, 153, 0.2)' : 'none', borderRight: !isVertical ? '1px dashed rgba(236, 72, 153, 0.2)' : 'none' }}>
        {[...(comp.children || [])].reverse().map(rawChild => {
          const isChildSelected = selectedIds.includes(rawChild.id)
          const child = resolveProperties(rawChild, localVars, flatNodes, comp)
          const childProps = {
            comp: child,
            selected: isChildSelected,
            isPlaying,
            selectedIds,
            localVars, setLocalVars, flatNodes, notify, navigate,
            updateProp,
            parentNode: comp,
            onMouseDown: (e) => { e.stopPropagation(); onChildMouseDown(e, child.id) },
            onClick: (e) => { e.stopPropagation(); onChildClick(e, child.id) },
            onDropInto, dragOverId, setDragOverId,
          }
          if (child.type === 'Button') return <ButtonRenderer key={child.id} {...childProps} />
          if (child.type === 'Label') return <LabelRenderer key={child.id} {...childProps} />
          if (child.type === 'TextInput') return <TextInputRenderer key={child.id} {...childProps} />
          if (child.type === 'Dropdown') return <DropdownRenderer key={child.id} {...childProps} />
          if (child.type === 'Checkbox') return <CheckboxRenderer key={child.id} {...childProps} />
          if (child.type === 'Rectangle') return <RectangleRenderer key={child.id} {...childProps} />
          if (child.type === 'Icon') return <IconRenderer key={child.id} {...childProps} />
          if (child.type === 'HtmlText') return <HtmlTextRenderer key={child.id} {...childProps} />
          if (child.type === 'DatePicker') return <DatePickerRenderer key={child.id} {...childProps} />
          if (child.type === 'ComboBox') return <ComboBoxRenderer key={child.id} {...childProps} />
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
        {[...(comp.children || [])].reverse().map(rawChild => {
          const child = resolveProperties(rawChild, localVars, flatNodes, comp)
          const isChildSelected = selectedIds.includes(child.id)
          const childProps = { 
            comp: child, selected: isChildSelected, isPlaying, selectedIds, 
            localVars, setLocalVars, flatNodes, notify, navigate, updateProp, 
            parentNode: comp, onMouseDown: () => {}, onClick: () => {},
            onDropInto, dragOverId, setDragOverId,
          }
          if (child.type === 'Button') return <ButtonRenderer key={child.id} {...childProps} />
          if (child.type === 'Label') return <LabelRenderer key={child.id} {...childProps} />
          if (child.type === 'TextInput') return <TextInputRenderer key={child.id} {...childProps} />
          if (child.type === 'Dropdown') return <DropdownRenderer key={child.id} {...childProps} />
          if (child.type === 'Checkbox') return <CheckboxRenderer key={child.id} {...childProps} />
          if (child.type === 'Rectangle') return <RectangleRenderer key={child.id} {...childProps} />
          if (child.type === 'Icon') return <IconRenderer key={child.id} {...childProps} />
          if (child.type === 'HtmlText') return <HtmlTextRenderer key={child.id} {...childProps} />
          if (child.type === 'DatePicker') return <DatePickerRenderer key={child.id} {...childProps} />
          if (child.type === 'ComboBox') return <ComboBoxRenderer key={child.id} {...childProps} />
          if (child.type === 'Container') return <ContainerRenderer key={child.id} {...childProps} onChildMouseDown={()=>{}} onChildClick={()=>{}} />
          return null
        })}
      </div>
    </div>
  )
}

GalleryRenderer.propTypes = {
  comp: PropTypes.shape({
    id: PropTypes.string.isRequired,
    X: PropTypes.number.isRequired,
    Y: PropTypes.number.isRequired,
    Width: PropTypes.number.isRequired,
    Height: PropTypes.number.isRequired,
    Fill: PropTypes.string,
    TemplateSize: PropTypes.number,
    TemplatePadding: PropTypes.number,
    Visible: PropTypes.bool,
    children: PropTypes.array,
  }).isRequired,
  selected: PropTypes.bool,
  isPlaying: PropTypes.bool,
  selectedIds: PropTypes.arrayOf(PropTypes.string).isRequired,
  onMouseDown: PropTypes.func.isRequired,
  onClick: PropTypes.func.isRequired,
  onChildMouseDown: PropTypes.func.isRequired,
  onChildClick: PropTypes.func.isRequired,
  onDropInto: PropTypes.func,
  dragOverId: PropTypes.string,
  setDragOverId: PropTypes.func,
}
