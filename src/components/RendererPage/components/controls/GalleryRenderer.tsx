import PropTypes from 'prop-types'
import ButtonRenderer from './ButtonRenderer'
import ModernButtonRenderer from './ModernButtonRenderer'
import ModernTextRenderer from './ModernTextRenderer'
import LabelRenderer from './LabelRenderer'
import TextInputRenderer from './TextInputRenderer'
import DropdownRenderer from './DropdownRenderer'
import CheckboxRenderer from './CheckboxRenderer'
import RectangleRenderer from './RectangleRenderer'
import IconRenderer from './IconRenderer'
import HtmlTextRenderer from './HtmlTextRenderer'
import DatePickerRenderer from './DatePickerRenderer'
import ComboBoxRenderer from './ComboBoxRenderer'
import ToggleRenderer from './ToggleRenderer'
import RadioRenderer from './RadioRenderer'
import SliderRenderer from './SliderRenderer'
import ContainerRenderer from './ContainerRenderer'
import { resolveProperties } from '../../../../common/helpers'
import { parseFormula, evaluateAST } from '../../../../common/FormulaParser'
import { getDragOutlineStyles, getSelectionStyles, themeVars } from '@/theme/theme'

// Normalise Items to an array of records.
// Plain arrays → [{Value: item}]. Plain objects pass through as [record].
function normaliseItems(raw: any): Record<string, any>[] {
  if (!raw) return []
  if (Array.isArray(raw)) {
    return raw.map(v =>
      (v !== null && typeof v === 'object' && !Array.isArray(v)) ? v : { Value: v }
    )
  }
  if (typeof raw === 'object') return [raw]
  return []
}

export default function GalleryRenderer({ 
  comp, selected, isPlaying, selectedIds, localVars, setLocalVars, flatNodes, notify, navigate, 
  updateProp, parentNode, onMouseDown, onClick, onChildMouseDown, onChildClick,
  onDropInto, dragOverId, setDragOverId, canvasTheme, renderZIndex = 1
}) {
  const style: any = {
    position: 'absolute',
    left: `${comp.X}pt`, top: `${comp.Y}pt`, width: `${comp.Width}pt`, height: `${comp.Height}pt`,
    backgroundColor: comp.Fill === 'rgba(0,0,0,0)' || comp.Fill === 'transparent' ? 'rgba(0,0,0,0)' : comp.Fill,
    border: `2px dashed ${themeVars.colors.gallerySelectionSoft}`,
    opacity: comp.Visible ? 1 : 0.3,
    cursor: isPlaying ? 'default' : 'move', userSelect: 'none',
    boxSizing: 'border-box',
    ...getSelectionStyles(selected, 'gallery'),
    transition: 'box-shadow 0.12s',
    zIndex: renderZIndex,
    overflow: 'hidden',
  }

  if (dragOverId === comp.id) {
    Object.assign(style, getDragOutlineStyles('gallery'))
  }

  const isVertical = comp.Variant ? comp.Variant.includes('Vertical') : comp.Height > comp.Width
  const padding = Number(comp.TemplatePadding) || 0
  const tSize = Number(comp.TemplateSize) || 100
  const wrapCount = Math.max(1, Math.floor(Number(comp.WrapCount) || 1))
  const crossAxisExtent = isVertical ? Number(comp.Width) || 0 : Number(comp.Height) || 0
  const slotCrossSize = wrapCount > 0 ? crossAxisExtent / wrapCount : crossAxisExtent

  function getTemplateSlotStyle(index: number, isGhost = false) {
    const lane = wrapCount > 1 ? index % wrapCount : 0
    const band = wrapCount > 1 ? Math.floor(index / wrapCount) : index
    const primaryOffset = band * (tSize + padding)

    const slotStyle: any = {
      position: 'absolute',
      top: isVertical ? `${primaryOffset}pt` : `${lane * slotCrossSize}pt`,
      left: isVertical ? `${lane * slotCrossSize}pt` : `${primaryOffset}pt`,
      width: isVertical ? `${slotCrossSize}pt` : `${tSize}pt`,
      height: isVertical ? `${tSize}pt` : `${slotCrossSize}pt`,
      overflow: 'hidden',
      boxSizing: 'border-box',
      borderBottom: isVertical ? `1px dashed ${themeVars.colors.gallerySelectionSoft}` : 'none',
      borderRight: !isVertical ? `1px dashed ${themeVars.colors.gallerySelectionSoft}` : 'none',
      opacity: isGhost ? 0.3 : 1,
      pointerEvents: isGhost ? 'none' : 'auto',
    }

    return slotStyle
  }

  const handleGalleryMouseDown = (e) => {
    e.stopPropagation()
    if (e.target !== e.currentTarget) return
    onMouseDown(e)
  }

  const handleGalleryClick = (e) => {
    e.stopPropagation()
    if (e.target !== e.currentTarget) return
    onClick(e)
  }

  // ── Helper: render children for one template row with given localVars ──────
  function renderChildren(rowLocalVars, isEditableRow) {
    return (comp.children || []).map((rawChild, childIndex) => {
      // Resolve formula properties for this row
      const child = resolveProperties(rawChild, rowLocalVars, flatNodes, comp)
      const childProps: any = {
        comp: child,
        selected: selectedIds.includes(child.id),
        isPlaying,
        selectedIds,
        localVars: rowLocalVars,
        setLocalVars,
        notify,
        navigate,
        flatNodes,
        updateProp,
        parentNode: comp,
        canvasTheme,
        renderZIndex: childIndex + 1,
        onDropInto, dragOverId, setDragOverId,
      }

      if (isEditableRow) {
        childProps.onMouseDown = (e) => { e.stopPropagation(); onChildMouseDown(e, child.id) }
        childProps.onClick     = (e) => { e.stopPropagation(); onChildClick(e, child.id) }
      } else {
        childProps.onMouseDown = () => {}
        childProps.onClick     = () => {}
      }
      if (child.type === 'Button')     return <ButtonRenderer key={child.id} {...childProps} />
      if (child.type === 'ModernButton') return <ModernButtonRenderer key={child.id} {...childProps} />
      if (child.type === 'ModernText') return <ModernTextRenderer key={child.id} {...childProps} />
      if (child.type === 'Label')      return <LabelRenderer key={child.id} {...childProps} />
      if (child.type === 'TextInput')  return <TextInputRenderer key={child.id} {...childProps} />
      if (child.type === 'Dropdown')   return <DropdownRenderer key={child.id} {...childProps} />
      if (child.type === 'Checkbox')   return <CheckboxRenderer key={child.id} {...childProps} />
      if (child.type === 'Rectangle')  return <RectangleRenderer key={child.id} {...childProps} />
      if (child.type === 'Icon')       return <IconRenderer key={child.id} {...childProps} />
      if (child.type === 'HtmlText')   return <HtmlTextRenderer key={child.id} {...childProps} />
      if (child.type === 'DatePicker') return <DatePickerRenderer key={child.id} {...childProps} />
      if (child.type === 'ComboBox')   return <ComboBoxRenderer key={child.id} {...childProps} />
      if (child.type === 'Toggle')     return <ToggleRenderer key={child.id} {...childProps} />
      if (child.type === 'Radio')      return <RadioRenderer key={child.id} {...childProps} />
      if (child.type === 'Slider')     return <SliderRenderer key={child.id} {...childProps} />
      if (child.type === 'Container')  return (
        <ContainerRenderer key={child.id} {...childProps}
          onChildMouseDown={onChildMouseDown} onChildClick={onChildClick}
          onDropInto={onDropInto} dragOverId={dragOverId} setDragOverId={setDragOverId}
        />
      )
      if (child.type === 'Gallery')    return (
        <GalleryRenderer key={child.id} {...childProps}
          onChildMouseDown={onChildMouseDown} onChildClick={onChildClick}
          onDropInto={onDropInto} dragOverId={dragOverId} setDragOverId={setDragOverId}
        />
      )
      return null
    })
  }

  // ── Evaluate Items (used in both play mode and design mode preview) ─────────
  const itemsRaw = (() => {
    if (!comp.Items) return null
    if (typeof comp.Items !== 'string') return comp.Items // Already evaluated by resolveProperties
    try {
      const ast = parseFormula(String(comp.Items))
      const res = evaluateAST(ast, localVars, flatNodes, new Set(), parentNode, comp)
      console.log('Gallery Evaluated Items Raw:', res)
      return res
    } catch (e) { 
      console.error('Gallery Items Error:', e)
      return null 
    }
  })()
  const rows = normaliseItems(itemsRaw)
  console.log('Gallery Normalised Rows:', rows)

  // ── Play mode: render one row per record ─────────────────────────────────
  if (isPlaying) {
    return (
      <div style={style} data-container-id={comp.id}>
        {rows.map((record, idx) => {
          const rowLocalVars = { ...localVars, ThisItem: record }
          return (
            <div key={idx} style={getTemplateSlotStyle(idx)}>
              {renderChildren(rowLocalVars, {
                onMouseDown: (e) => { e.stopPropagation(); onChildMouseDown(e, null) },
                onClick:     (e) => { e.stopPropagation(); onChildClick(e, null) },
              })}
            </div>
          )
        })}
      </div>
    )
  }

  // ── Design mode: template row + ghost rows ────────────────────────────────
  // If Items resolves to data, show one ghost row per extra item for preview.
  const ghostCount = Math.max(0, rows.length - 1)

  return (
    <div
      style={style}
      data-container-id={comp.id}
      onMouseDown={handleGalleryMouseDown}
      onClick={handleGalleryClick}
      onDragOver={(e) => {
        e.preventDefault()
        if (dragOverId !== comp.id) setDragOverId(comp.id)
      }}
    >
      <div style={{ position: 'absolute', top: 4, left: 6, fontSize: 10, color: themeVars.colors.gallerySelection, fontWeight: 'bold', pointerEvents: 'none', userSelect: 'none', zIndex: 0 }}>
        Gallery Template
      </div>

      {/* Active (editable) template row */}
      <div style={getTemplateSlotStyle(0)}>
        {renderChildren(rows.length > 0 ? { ...localVars, ThisItem: rows[0] } : localVars, true)}
      </div>

      {/* Ghost rows — one per additional item (or 1 if no Items set) */}
      {Array.from({ length: ghostCount }).map((_, gi) => {
        const ghostRowVars = rows.length > gi + 1 ? { ...localVars, ThisItem: rows[gi + 1] } : localVars
        return (
          <div key={gi} style={getTemplateSlotStyle(gi + 1, true)}>
            {renderChildren(ghostRowVars, false)}
          </div>
        )
      })}
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
    WrapCount: PropTypes.number,
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
