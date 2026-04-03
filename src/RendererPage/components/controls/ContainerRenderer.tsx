import PropTypes from 'prop-types'
import ButtonRenderer from './ButtonRenderer'
import LabelRenderer from './LabelRenderer'
import TextInputRenderer from './TextInputRenderer'
import DropdownRenderer from './DropdownRenderer'
import GalleryRenderer from './GalleryRenderer'
import CheckboxRenderer from './CheckboxRenderer'
import RectangleRenderer from './RectangleRenderer'
import IconRenderer from './IconRenderer'
import HtmlTextRenderer from './HtmlTextRenderer'
import DatePickerRenderer from './DatePickerRenderer'
import ComboBoxRenderer from './ComboBoxRenderer'
import { CSS_BORDER_STYLE } from './cssProps'
import { resolveProperties } from '../../../common/helpers'

export default function ContainerRenderer({ 
  comp, selected, isPlaying, selectedIds, localVars, setLocalVars, flatNodes, notify, navigate, 
  updateProp, parentNode, onMouseDown, onClick, onChildMouseDown, onChildClick,
  onDropInto, dragOverId, setDragOverId 
}) {
  const shadowMap = {
    'DropShadow.None': 'none',
    'DropShadow.Light': '0 2px 4px rgba(0,0,0,0.1)',
    'DropShadow.Medium': '0 4px 8px rgba(0,0,0,0.15)',
    'DropShadow.Heavy': '0 8px 16px rgba(0,0,0,0.2)'
  }

  const style: any = {
    position: 'absolute',
    left: comp.X, top: comp.Y, width: comp.Width, height: comp.Height,
    backgroundColor: comp.Fill === 'rgba(0,0,0,0)' || comp.Fill === 'transparent' ? 'rgba(0,0,0,0)' : comp.Fill,
    border: (comp.BorderStyle && comp.BorderStyle !== 'BorderStyle.None' && (comp.BorderThickness || 0) > 0)
      ? `${comp.BorderThickness}px ${CSS_BORDER_STYLE[comp.BorderStyle] || 'solid'} ${comp.BorderColor}`
      : 'none',
    borderRadius: `${comp.RadiusTopLeft || 0}px ${comp.RadiusTopRight || 0}px ${comp.RadiusBottomRight || 0}px ${comp.RadiusBottomLeft || 0}px`,
    opacity: comp.Visible ? 1 : 0.3,
    cursor: isPlaying ? 'default' : 'move', userSelect: 'none',
    boxSizing: 'border-box',
    outline: selected ? '2px solid #0078d4' : 'none',
    outlineOffset: selected ? '2px' : '0',
    boxShadow: selected
      ? '0 0 0 3px rgba(0,120,212,0.25)'
      : (shadowMap[comp.DropShadow] || 'none'),
    zIndex: selected ? 9999 : (comp.ZIndex ?? 1),
  }

  if (dragOverId === comp.id) {
    style.outline = '4px solid rgba(0,120,212,0.5)'
    style.outlineOffset = '2px'
  }

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
      onMouseUp={(e) => {
        if (isPlaying) return
        // If we are dragging something and mouse up over this container, 
        // the index.tsx onUp handles the actual tree move, but we could also 
        // trigger it here if index.tsx didn't. 
        // For now, index.tsx handles the final drop logic using dragOverId.
      }}
    >
      {/* Container label badge */}
      {!comp.children?.length && (
        <div style={{ position: 'absolute', top: 4, left: 6, fontSize: 10, color: 'rgba(0,0,0,0.25)', pointerEvents: 'none', userSelect: 'none' }}>
          Container
        </div>
      )}

      {/* Children */}
      {(comp.children || []).map(rawChild => {
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
  )
}

ContainerRenderer.propTypes = {
  comp: PropTypes.shape({
    id: PropTypes.string.isRequired,
    X: PropTypes.number.isRequired,
    Y: PropTypes.number.isRequired,
    Width: PropTypes.number.isRequired,
    Height: PropTypes.number.isRequired,
    Fill: PropTypes.string,
    BorderStyle: PropTypes.string,
    BorderThickness: PropTypes.number,
    BorderColor: PropTypes.string,
    RadiusTopLeft: PropTypes.number,
    RadiusTopRight: PropTypes.number,
    RadiusBottomLeft: PropTypes.number,
    RadiusBottomRight: PropTypes.number,
    DropShadow: PropTypes.string,
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
