import PropTypes from 'prop-types'
import ButtonRenderer from './ButtonRenderer'
import ModernButtonRenderer from './ModernButtonRenderer'
import ModernDropdownRenderer from './ModernDropdownRenderer'
import ModernTabListRenderer from './ModernTabListRenderer'
import ModernCheckboxRenderer from './ModernCheckboxRenderer'
import ModernComboBoxRenderer from './ModernComboBoxRenderer'
import ModernProgressBarRenderer from './ModernProgressBarRenderer'
import ModernSliderRenderer from './ModernSliderRenderer'
import ModernSpinnerRenderer from './ModernSpinnerRenderer'
import ModernTextRenderer from './ModernTextRenderer'
import ModernTextInputRenderer from './ModernTextInputRenderer'
import ModernToggleRenderer from './ModernToggleRenderer'
import LinkRenderer from './LinkRenderer'
import NumberInputRenderer from './NumberInputRenderer'
import ModernDatePickerRenderer from './ModernDatePickerRenderer'
import RichTextEditorRenderer from './RichTextEditorRenderer'
import RatingRenderer from './RatingRenderer'
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
import ToggleRenderer from './ToggleRenderer'
import RadioRenderer from './RadioRenderer'
import SliderRenderer from './SliderRenderer'
import { CSS_BORDER_STYLE } from './cssProps'
import { resolveProperties } from '../../../../common/helpers'
import { getDragOutlineStyles, getSelectionStyles } from '@/theme/theme'

export default function ContainerRenderer({ 
  comp, selected, isPlaying, selectedIds, localVars, setLocalVars, flatNodes, notify, navigate, 
  updateProp, onMouseDown, onClick, onChildMouseDown, onChildClick,
  onDropInto, dragOverId, setDragOverId, canvasTheme, renderZIndex = 1
}) {
  if (comp?.Visible === false) return null

  const shadowMap = {
    'DropShadow.None': 'none',
    'DropShadow.Light': '0 2px 4px rgba(0,0,0,0.1)',
    'DropShadow.Semilight': '0 3px 6px rgba(0,0,0,0.12)',
    'DropShadow.Regular': '0 4px 8px rgba(0,0,0,0.14)',
    'DropShadow.Semibold': '0 6px 12px rgba(0,0,0,0.16)',
    'DropShadow.Bold': '0 8px 16px rgba(0,0,0,0.2)',
    'DropShadow.ExtraBold': '0 12px 24px rgba(0,0,0,0.24)',
    // Legacy values kept for backward-compatible rendering of older saved data.
    'DropShadow.Medium': '0 4px 8px rgba(0,0,0,0.14)',
    'DropShadow.Heavy': '0 8px 16px rgba(0,0,0,0.2)'
  }

  const style: any = {
    position: 'absolute',
    left: `${comp.X}pt`, top: `${comp.Y}pt`, width: `${comp.Width}pt`, height: `${comp.Height}pt`,
    backgroundColor: comp.Fill === 'rgba(0,0,0,0)' || comp.Fill === 'transparent' ? 'rgba(0,0,0,0)' : comp.Fill,
    border: (comp.BorderStyle && comp.BorderStyle !== 'BorderStyle.None' && (comp.BorderThickness || 0) > 0)
      ? `${comp.BorderThickness}pt ${CSS_BORDER_STYLE[comp.BorderStyle] || 'solid'} ${comp.BorderColor}`
      : 'none',
    borderRadius: `${comp.RadiusTopLeft || 0}pt ${comp.RadiusTopRight || 0}pt ${comp.RadiusBottomRight || 0}pt ${comp.RadiusBottomLeft || 0}pt`,
    cursor: isPlaying ? 'default' : 'move', userSelect: 'none',
    boxSizing: 'border-box',
    ...getSelectionStyles(selected, 'default', shadowMap[comp.DropShadow] || 'none'),
    zIndex: renderZIndex,
  }

  if (dragOverId === comp.id) {
    Object.assign(style, getDragOutlineStyles('default'))
  }

  const handleContainerMouseDown = (e) => {
    e.stopPropagation()
    if (e.target !== e.currentTarget) return
    onMouseDown(e)
  }

  const handleContainerClick = (e) => {
    e.stopPropagation()
    if (e.target !== e.currentTarget) return
    onClick(e)
  }

  return (
    <div
      style={style}
      data-container-id={comp.id}
      onMouseDown={handleContainerMouseDown}
      onClick={handleContainerClick}
      onDragOver={(e) => {
        if (isPlaying) return
        e.preventDefault()
        if (dragOverId !== comp.id) setDragOverId(comp.id)
      }}
      onMouseUp={() => {
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
      {(comp.children || []).map((rawChild, childIndex) => {
        const isChildSelected = selectedIds.includes(rawChild.id)
        const child = resolveProperties(rawChild, localVars, flatNodes, comp)
        if (child?.Visible === false) return null
        const childProps = {
          comp: child,
          selected: isChildSelected,
          isPlaying,
          selectedIds,
          localVars, setLocalVars, flatNodes, notify, navigate,
          updateProp,
          parentNode: comp,
          canvasTheme,
          renderZIndex: childIndex + 1,
          onMouseDown: (e) => { e.stopPropagation(); onChildMouseDown(e, child.id) },
          onClick: (e) => { e.stopPropagation(); onChildClick(e, child.id) },
          onDropInto, dragOverId, setDragOverId,
        }
        if (child.type === 'Button') return <ButtonRenderer key={child.id} {...childProps} />
        if (child.type === 'ModernButton') return <ModernButtonRenderer key={child.id} {...childProps} />
        if (child.type === 'ModernDropdown') return <ModernDropdownRenderer key={child.id} {...childProps} />
        if (child.type === 'ModernTabList') return <ModernTabListRenderer key={child.id} {...childProps} />
        if (child.type === 'ModernCheckbox') return <ModernCheckboxRenderer key={child.id} {...childProps} />
        if (child.type === 'ModernComboBox') return <ModernComboBoxRenderer key={child.id} {...childProps} />
        if (child.type === 'ModernProgressBar') return <ModernProgressBarRenderer key={child.id} {...childProps} />
        if (child.type === 'ModernSlider') return <ModernSliderRenderer key={child.id} {...childProps} />
        if (child.type === 'ModernSpinner') return <ModernSpinnerRenderer key={child.id} {...childProps} />
        if (child.type === 'ModernText') return <ModernTextRenderer key={child.id} {...childProps} />
        if (child.type === 'ModernTextInput') return <ModernTextInputRenderer key={child.id} {...childProps} />
        if (child.type === 'ModernToggle') return <ModernToggleRenderer key={child.id} {...childProps} />
        if (child.type === 'Link') return <LinkRenderer key={child.id} {...childProps} />
        if (child.type === 'NumberInput') return <NumberInputRenderer key={child.id} {...childProps} />
        if (child.type === 'ModernDatePicker') return <ModernDatePickerRenderer key={child.id} {...childProps} />
        if (child.type === 'RichTextEditor') return <RichTextEditorRenderer key={child.id} {...childProps} />
        if (child.type === 'Rating') return <RatingRenderer key={child.id} {...childProps} />
        if (child.type === 'Label') return <LabelRenderer key={child.id} {...childProps} />
        if (child.type === 'TextInput') return <TextInputRenderer key={child.id} {...childProps} />
        if (child.type === 'Dropdown') return <DropdownRenderer key={child.id} {...childProps} />
        if (child.type === 'Checkbox') return <CheckboxRenderer key={child.id} {...childProps} />
        if (child.type === 'Rectangle') return <RectangleRenderer key={child.id} {...childProps} />
        if (child.type === 'Icon') return <IconRenderer key={child.id} {...childProps} />
        if (child.type === 'HtmlText') return <HtmlTextRenderer key={child.id} {...childProps} />
        if (child.type === 'DatePicker') return <DatePickerRenderer key={child.id} {...childProps} />
        if (child.type === 'ComboBox') return <ComboBoxRenderer key={child.id} {...childProps} />
        if (child.type === 'Toggle') return <ToggleRenderer key={child.id} {...childProps} />
        if (child.type === 'Radio') return <RadioRenderer key={child.id} {...childProps} />
        if (child.type === 'Slider') return <SliderRenderer key={child.id} {...childProps} />
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
  canvasTheme: PropTypes.object,
  renderZIndex: PropTypes.number,
}
