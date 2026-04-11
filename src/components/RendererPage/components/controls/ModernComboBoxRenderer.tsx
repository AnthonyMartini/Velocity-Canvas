import { useEffect, useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import { CSS_BORDER_STYLE, CSS_FW } from './cssProps'
import { executeAction } from '../../../../common/helpers'
import { getSelectionStyles, themeVars } from '@/theme/theme'
import { areItemsEqual, getCollectionItemLabel, normalizeLiteralString, parseItemsValue, resolveModernPalette, stripOuterQuotes, toRgba } from './modernControlUtils'

function parseSelection(rawValue: any) {
  if (Array.isArray(rawValue)) return rawValue
  if (typeof rawValue !== 'string') return []

  const trimmed = rawValue.trim()
  if (!trimmed) return []

  try {
    const parsed = JSON.parse(trimmed)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    const stripped = stripOuterQuotes(trimmed)
    return stripped ? [stripped] : []
  }
}

function getDisplayFields(value: any) {
  const parsed = parseItemsValue(value, [])
  return parsed.filter((field) => typeof field === 'string')
}

export default function ModernComboBoxRenderer({
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
  canvasTheme,
  onMouseDown,
  onClick,
  renderZIndex = 1,
}) {
  const isViewMode = comp.DisplayMode === 'DisplayMode.View'
  const isDisabledMode = comp.DisplayMode === 'DisplayMode.Disabled'
  const isInteractive = isPlaying && !isDisabledMode && !isViewMode
  const items = useMemo(() => parseItemsValue(comp.Items, []), [comp.Items])
  const displayFields = useMemo(() => getDisplayFields(comp.DisplayFields), [comp.DisplayFields])
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedItems, setSelectedItems] = useState(() => parseSelection(comp.DefaultSelectedItems))

  const { palette, lighter30, lighter20, lighter10 } = resolveModernPalette(comp, canvasTheme)
  const isSearchable = comp.AllowSearching !== false && comp.IsSearchable !== false
  const selectMultiple = comp.AllowMultipleSelection === true || comp.SelectMultiple === true
  const filteredItems = items.filter((item) => {
    if (!searchTerm) return true
    return getCollectionItemLabel(item, displayFields, comp.ItemDisplayText).toLowerCase().includes(searchTerm.toLowerCase())
  })

  useEffect(() => {
    setSelectedItems(parseSelection(comp.DefaultSelectedItems))
  }, [comp.DefaultSelectedItems, comp.id])

  const commitSelection = (nextSelection: any[]) => {
    setSelectedItems(nextSelection)
    updateProp?.(comp.id, 'DefaultSelectedItems', JSON.stringify(nextSelection))
    updateProp?.(comp.id, 'SelectedItems', JSON.stringify(nextSelection))
    updateProp?.(comp.id, 'Selected', nextSelection.length ? JSON.stringify(getCollectionItemLabel(nextSelection[0], displayFields, comp.ItemDisplayText)) : '""')
    updateProp?.(comp.id, 'SearchText', JSON.stringify(searchTerm))
    if (comp.OnChange) {
      executeAction(comp.OnChange, localVars, setLocalVars, notify, navigate, flatNodes, parentNode, comp)
    }
  }

  const handleItemSelect = (item: any) => {
    if (!isInteractive) return

    if (selectMultiple) {
      const exists = selectedItems.some((selectedItem) => areItemsEqual(selectedItem, item))
      const nextSelection = exists
        ? selectedItems.filter((selectedItem) => !areItemsEqual(selectedItem, item))
        : [...selectedItems, item]
      commitSelection(nextSelection)
    } else {
      commitSelection([item])
      setIsOpen(false)
    }
  }

  const displayText = selectedItems.length
    ? selectedItems.map((item) => getCollectionItemLabel(item, displayFields, comp.ItemDisplayText)).join(normalizeLiteralString(comp.MultiValueDelimiter, ', '))
    : normalizeLiteralString(comp.InputTextPlaceholder, 'Select option')

  return (
    <div
      onMouseDown={onMouseDown}
      onClick={(event) => {
        onClick(event)
        if (isInteractive) setIsOpen(open => !open)
      }}
      style={{
        position: 'absolute',
        left: `${comp.X}pt`,
        top: `${comp.Y}pt`,
        width: `${comp.Width}pt`,
        minHeight: `${comp.Height}pt`,
        borderRadius: `${comp.RadiusTopLeft ?? 10}pt`,
        border: `${comp.BorderThickness || 1}pt ${CSS_BORDER_STYLE[comp.BorderStyle] || 'solid'} ${isOpen ? palette : (comp.BorderColor || lighter10)}`,
        backgroundColor: comp.Fill || '#ffffff',
        color: comp.Color || '#1f2328',
        padding: `${comp.PaddingTop ?? 6}pt ${comp.PaddingRight ?? 12}pt ${comp.PaddingBottom ?? 6}pt ${comp.PaddingLeft ?? 12}pt`,
        display: 'flex',
        alignItems: 'center',
        gap: '8pt',
        boxSizing: 'border-box',
        cursor: isInteractive ? 'pointer' : (isPlaying ? 'default' : 'move'),
        opacity: comp.Visible === false ? 0.3 : (isDisabledMode ? 0.6 : 1),
        boxShadow: isOpen ? `0 0 0 3px ${toRgba(palette, 0.16)}` : `0 1px 2px ${toRgba(palette, 0.08)}`,
        fontFamily: comp.Font || canvasTheme?.Font || themeVars.fonts.sans,
        fontSize: `${comp.Size || 14}pt`,
        fontWeight: CSS_FW[comp.FontWeight] || comp.FontWeight || '400',
        fontStyle: comp.Italic ? 'italic' : 'normal',
        textDecoration: [
          comp.Underline ? 'underline' : '',
          comp.Strikethrough ? 'line-through' : '',
        ].filter(Boolean).join(' ') || 'none',
        userSelect: 'none',
        transition: 'border-color 0.12s, box-shadow 0.12s',
        ...getSelectionStyles(selected, 'default'),
        zIndex: renderZIndex,
      }}
      aria-label={normalizeLiteralString(comp.AccessibleLabel) || undefined}
    >
      <div style={{ flex: 1, minWidth: 0, opacity: selectedItems.length ? 1 : 0.62, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {displayText}
      </div>
      <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke={comp.Color || palette} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <path d="m5 7 5 5 5-5" />
      </svg>

      {isOpen && isInteractive && (
        <div
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 'calc(100% + 6pt)',
            borderRadius: '12pt',
            border: `1pt solid ${lighter10}`,
            backgroundColor: '#ffffff',
            boxShadow: `0 20px 40px ${toRgba(palette, 0.18)}`,
            overflow: 'hidden',
            zIndex: renderZIndex + 20,
          }}
        >
          {isSearchable && (
            <div style={{ padding: '10pt 12pt', borderBottom: `1px solid ${lighter20}`, backgroundColor: lighter30 }}>
              <input
                autoFocus
                type="text"
                value={searchTerm}
                placeholder={normalizeLiteralString(comp.InputTextPlaceholder, 'Search')}
                onChange={(event) => setSearchTerm(event.target.value)}
                onMouseDown={(event) => event.stopPropagation()}
                style={{
                  width: '100%',
                  border: `1px solid ${lighter10}`,
                  borderRadius: '8pt',
                  padding: '6pt 8pt',
                  outline: 'none',
                  font: 'inherit',
                }}
              />
            </div>
          )}

          <div style={{ maxHeight: '220pt', overflowY: 'auto' }}>
            {filteredItems.length === 0 && (
              <div style={{ padding: '12pt', color: toRgba(comp.Color || '#1f2328', 0.56) }}>No items found</div>
            )}

            {filteredItems.map((item, index) => {
              const label = getCollectionItemLabel(item, displayFields, comp.ItemDisplayText)
              const isItemSelected = selectedItems.some((selectedItem) => areItemsEqual(selectedItem, item))
              return (
                <button
                  key={`${label}-${index}`}
                  type="button"
                  onClick={() => handleItemSelect(item)}
                  style={{
                    width: '100%',
                    padding: '10pt 12pt',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10pt',
                    border: 'none',
                    backgroundColor: isItemSelected ? lighter30 : '#ffffff',
                    color: comp.Color || '#1f2328',
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  {selectMultiple && (
                    <span
                      style={{
                        width: '14pt',
                        height: '14pt',
                        borderRadius: '4pt',
                        border: `1.4pt solid ${isItemSelected ? palette : lighter10}`,
                        backgroundColor: isItemSelected ? palette : '#ffffff',
                        color: '#ffffff',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {isItemSelected && (
                        <svg width="9" height="9" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="m4.5 10 3.2 3.2L15.5 5.8" />
                        </svg>
                      )}
                    </span>
                  )}
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

ModernComboBoxRenderer.propTypes = {
  comp: PropTypes.shape({
    id: PropTypes.string.isRequired,
    X: PropTypes.number.isRequired,
    Y: PropTypes.number.isRequired,
    Width: PropTypes.number.isRequired,
    Height: PropTypes.number.isRequired,
    AccessibleLabel: PropTypes.string,
    AllowMultipleSelection: PropTypes.bool,
    AllowSearching: PropTypes.bool,
    BasePaletteColor: PropTypes.string,
    BorderColor: PropTypes.string,
    BorderStyle: PropTypes.string,
    BorderThickness: PropTypes.number,
    Color: PropTypes.string,
    DefaultSelectedItems: PropTypes.oneOfType([PropTypes.string, PropTypes.array]),
    DisplayFields: PropTypes.oneOfType([PropTypes.string, PropTypes.array]),
    DisplayMode: PropTypes.string,
    Fill: PropTypes.string,
    Font: PropTypes.string,
    FontWeight: PropTypes.string,
    InputTextPlaceholder: PropTypes.string,
    IsSearchable: PropTypes.bool,
    Italic: PropTypes.bool,
    ItemDisplayText: PropTypes.string,
    Items: PropTypes.oneOfType([PropTypes.string, PropTypes.array]),
    MultiValueDelimiter: PropTypes.string,
    OnChange: PropTypes.string,
    PaddingBottom: PropTypes.number,
    PaddingLeft: PropTypes.number,
    PaddingRight: PropTypes.number,
    PaddingTop: PropTypes.number,
    RadiusBottomLeft: PropTypes.number,
    RadiusBottomRight: PropTypes.number,
    RadiusTopLeft: PropTypes.number,
    RadiusTopRight: PropTypes.number,
    SelectMultiple: PropTypes.bool,
    Size: PropTypes.number,
    Strikethrough: PropTypes.bool,
    Underline: PropTypes.bool,
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
  canvasTheme: PropTypes.object,
  renderZIndex: PropTypes.number,
  onMouseDown: PropTypes.func.isRequired,
  onClick: PropTypes.func.isRequired,
}
