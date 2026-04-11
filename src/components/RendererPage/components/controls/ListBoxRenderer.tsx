import { useEffect, useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import { CSS_ALIGN, CSS_BORDER_STYLE, CSS_FW } from './cssProps'
import { executeAction } from '../../../../common/helpers'
import { getSelectionStyles } from '@/theme/theme'

function parseItems(value: any) {
  if (Array.isArray(value)) return value
  if (typeof value !== 'string') return []

  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return value ? [value] : []
  }
}

function toLabel(item: any) {
  if (item == null) return ''
  if (typeof item !== 'object') return String(item)

  for (const key of ['Value', 'Label', 'Title', 'Name']) {
    if (item[key] !== undefined && item[key] !== null) return String(item[key])
  }

  const firstKey = Object.keys(item)[0]
  return firstKey ? String(item[firstKey]) : JSON.stringify(item)
}

function parseSelection(value: any) {
  if (Array.isArray(value)) return value.map(toLabel)
  if (typeof value !== 'string') return []

  try {
    const parsed = JSON.parse(value)
    if (Array.isArray(parsed)) return parsed.map(toLabel)
    if (parsed !== undefined && parsed !== null && parsed !== '') return [toLabel(parsed)]
  } catch {
    const trimmed = value.trim()
    if (trimmed && trimmed !== '""') {
      return [trimmed.replace(/^['"]|['"]$/g, '')]
    }
  }

  return []
}

export default function ListBoxRenderer({
  comp,
  selected,
  isPlaying,
  localVars,
  setLocalVars,
  notify,
  navigate,
  updateProp,
  flatNodes,
  parentNode,
  onMouseDown,
  onClick,
  renderZIndex = 1,
}) {
  const items = useMemo(() => parseItems(comp.Items), [comp.Items])
  const isDisabled = comp.DisplayMode === 'DisplayMode.Disabled'
  const isViewMode = comp.DisplayMode === 'DisplayMode.View'
  const isInteractive = isPlaying && !isDisabled && !isViewMode
  const [selectedValues, setSelectedValues] = useState<string[]>(() => {
    const selectedFromItems = parseSelection(comp.SelectedItems)
    return selectedFromItems.length ? selectedFromItems : parseSelection(comp.Selected || comp.Default)
  })

  useEffect(() => {
    const selectedFromItems = parseSelection(comp.SelectedItems)
    const nextValues = selectedFromItems.length ? selectedFromItems : parseSelection(comp.Selected || comp.Default)
    setSelectedValues(nextValues)
  }, [comp.SelectedItems, comp.Selected, comp.Default, comp.id])

  const baseStyle: any = {
    position: 'absolute',
    left: `${comp.X}pt`,
    top: `${comp.Y}pt`,
    width: `${comp.Width}pt`,
    height: `${comp.Height}pt`,
    backgroundColor: isDisabled ? comp.DisabledFill : comp.Fill,
    color: isDisabled ? comp.DisabledColor : comp.Color,
    fontSize: `${comp.Size}pt`,
    fontWeight: CSS_FW[comp.FontWeight] || comp.FontWeight,
    fontStyle: comp.Italic ? 'italic' : 'normal',
    textDecoration: [
      comp.Underline ? 'underline' : null,
      comp.Strikethrough ? 'line-through' : null,
    ].filter(Boolean).join(' ') || 'none',
    border: `${comp.BorderThickness}pt ${CSS_BORDER_STYLE[comp.BorderStyle] || 'solid'} ${isDisabled ? comp.DisabledBorderColor : comp.BorderColor}`,
    opacity: comp.Visible === false ? 0.3 : 1,
    cursor: isInteractive ? 'pointer' : (isPlaying ? 'default' : 'move'),
    userSelect: 'none',
    overflow: 'hidden',
    boxSizing: 'border-box' as const,
    paddingTop: `${comp.PaddingTop || 0}pt`,
    paddingRight: `${comp.PaddingRight || 0}pt`,
    paddingBottom: `${comp.PaddingBottom || 0}pt`,
    paddingLeft: `${comp.PaddingLeft || 0}pt`,
    ...getSelectionStyles(selected),
    zIndex: renderZIndex,
  }

  const lineHeight = Math.max(20, Number(comp.LineHeight) || 32)
  const visibleRows = Math.max(2, Math.floor((comp.Height || 120) / lineHeight))

  const commitSelection = (labels: string[]) => {
    setSelectedValues(labels)
    updateProp?.(comp.id, 'Selected', JSON.stringify(labels[0] || ''))
    updateProp?.(comp.id, 'SelectedItems', JSON.stringify(labels))
    updateProp?.(comp.id, 'SelectedItemsText', JSON.stringify(labels))
    if (comp.OnChange) {
      executeAction(comp.OnChange, localVars, setLocalVars, notify, navigate, flatNodes, parentNode, comp)
    }
  }

  const handleNativeChange = (event: any) => {
    if (!isInteractive) return

    const labels = Array.from(event.target.selectedOptions || []).map((option: any) => option.value)
    commitSelection(labels)
  }

  const handlePreviewClick = (label: string) => {
    if (!isInteractive) return

    let nextSelection = [label]
    if (comp.SelectMultiple) {
      nextSelection = selectedValues.includes(label)
        ? selectedValues.filter((value) => value !== label)
        : [...selectedValues, label]
    }

    if (!comp.SelectMultiple) {
      nextSelection = [label]
    }

    commitSelection(nextSelection)
    if (comp.OnSelect) {
      executeAction(comp.OnSelect, localVars, setLocalVars, notify, navigate, flatNodes, parentNode, comp)
    }
  }

  if (isPlaying) {
    return (
      <select
        multiple={Boolean(comp.SelectMultiple)}
        size={visibleRows}
        value={comp.SelectMultiple ? selectedValues : (selectedValues[0] || '')}
        onChange={handleNativeChange}
        onMouseDown={onMouseDown}
        onClick={onClick}
        style={{
          ...baseStyle,
          outline: 'none',
          textAlign: CSS_ALIGN[comp.Align] || 'left',
          paddingLeft: `${comp.ItemPaddingLeft || 0}pt`,
        }}
      >
        {items.map((item, index) => {
          const label = toLabel(item)
          return (
            <option key={`${label}-${index}`} value={label}>
              {label}
            </option>
          )
        })}
      </select>
    )
  }

  return (
    <div style={baseStyle} onMouseDown={onMouseDown} onClick={onClick}>
      <div
        style={{
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          backgroundColor: comp.Fill,
        }}
      >
        {items.map((item, index) => {
          const label = toLabel(item)
          const isSelected = selectedValues.includes(label)
          return (
            <button
              key={`${label}-${index}`}
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                handlePreviewClick(label)
              }}
              style={{
                width: '100%',
                minHeight: `${lineHeight}pt`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                textAlign: CSS_ALIGN[comp.Align] || 'left',
                paddingLeft: `${comp.ItemPaddingLeft || 0}pt`,
                paddingRight: '10pt',
                border: 'none',
                borderBottom: index === items.length - 1 ? 'none' : `1px solid ${comp.BorderColor}22`,
                background: isSelected ? comp.SelectionFill : comp.Fill,
                color: isSelected ? comp.SelectionColor : comp.Color,
                cursor: isInteractive ? 'pointer' : 'default',
                font: 'inherit',
              }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>
                {label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

ListBoxRenderer.propTypes = {
  comp: PropTypes.shape({
    id: PropTypes.string.isRequired,
    X: PropTypes.number.isRequired,
    Y: PropTypes.number.isRequired,
    Width: PropTypes.number.isRequired,
    Height: PropTypes.number.isRequired,
    Fill: PropTypes.string,
    Color: PropTypes.string,
    Items: PropTypes.oneOfType([PropTypes.string, PropTypes.array]),
    Default: PropTypes.string,
    Selected: PropTypes.string,
    SelectedItems: PropTypes.oneOfType([PropTypes.string, PropTypes.array]),
    SelectMultiple: PropTypes.bool,
    BorderColor: PropTypes.string,
    BorderStyle: PropTypes.string,
    BorderThickness: PropTypes.number,
    DisplayMode: PropTypes.string,
    FontWeight: PropTypes.string,
    ItemPaddingLeft: PropTypes.number,
    LineHeight: PropTypes.number,
    Size: PropTypes.number,
    Visible: PropTypes.bool,
  }).isRequired,
  selected: PropTypes.bool,
  isPlaying: PropTypes.bool,
  localVars: PropTypes.object,
  setLocalVars: PropTypes.func,
  notify: PropTypes.func,
  navigate: PropTypes.func,
  updateProp: PropTypes.func,
  flatNodes: PropTypes.array,
  parentNode: PropTypes.object,
  renderZIndex: PropTypes.number,
  onMouseDown: PropTypes.func.isRequired,
  onClick: PropTypes.func.isRequired,
}
