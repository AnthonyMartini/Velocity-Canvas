import { useEffect, useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import { executeAction } from '../../../common/helpers'
import { getSelectionStyles, themeVars } from '@/theme/theme'
import { getCollectionItemLabel, normalizeLiteralString, parseItemsValue, resolveModernPalette, stripOuterQuotes, toRgba } from './modernControlUtils'

function normalizeSelection(rawValue: any) {
  if (Array.isArray(rawValue)) return rawValue
  if (typeof rawValue === 'string') {
    try {
      const parsed = JSON.parse(rawValue)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      const stripped = stripOuterQuotes(rawValue)
      return stripped ? [stripped] : []
    }
  }
  return []
}

export default function ModernDropdownRenderer({
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
  const isInteractive = isPlaying && !isViewMode && !isDisabledMode
  const items = useMemo(() => parseItemsValue(comp.Items, []), [comp.Items])
  const [isOpen, setIsOpen] = useState(false)
  const [selectedItems, setSelectedItems] = useState(() => normalizeSelection(comp.DefaultSelectedItems))
  const { palette, lighter30, lighter20, lighter10, darker10 } = resolveModernPalette(comp, canvasTheme)
  const validationState = normalizeLiteralString(comp.ValidationState, 'None').toLowerCase()
  const borderColor = validationState === 'error' ? '#d13438' : (isOpen ? palette : lighter10)
  const displayItem = selectedItems[0] ?? items[0]
  const displayText = displayItem !== undefined
    ? getCollectionItemLabel(displayItem)
    : (comp.Required ? 'Choose an option' : 'Select')

  useEffect(() => {
    setSelectedItems(normalizeSelection(comp.DefaultSelectedItems))
  }, [comp.DefaultSelectedItems, comp.id])

  const handleSelect = (item: any) => {
    const nextSelection = [item]
    const label = getCollectionItemLabel(item)
    setSelectedItems(nextSelection)
    updateProp?.(comp.id, 'DefaultSelectedItems', JSON.stringify(nextSelection))
    updateProp?.(comp.id, 'Selected', JSON.stringify(label))
    setIsOpen(false)
    if (comp.OnChange) {
      executeAction(comp.OnChange, localVars, setLocalVars, notify, navigate, flatNodes, parentNode, comp)
    }
  }

  const handleTriggerClick = (event: any) => {
    onClick(event)
    if (isInteractive) setIsOpen(open => !open)
  }

  return (
    <div
      onMouseDown={onMouseDown}
      onClick={handleTriggerClick}
      style={{
        position: 'absolute',
        left: `${comp.X}pt`,
        top: `${comp.Y}pt`,
        width: `${comp.Width}pt`,
        height: `${comp.Height}pt`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8pt',
        padding: '0 12pt',
        borderRadius: '10pt',
        border: `1.2pt solid ${isDisabledMode ? toRgba(borderColor, 0.4) : borderColor}`,
        backgroundColor: isDisabledMode ? toRgba(lighter20, 0.7) : '#ffffff',
        color: isDisabledMode ? toRgba('#1b1a19', 0.58) : '#1b1a19',
        fontFamily: canvasTheme?.Font || themeVars.fonts.sans,
        fontSize: `${comp.FontSize || 14}pt`,
        cursor: isInteractive ? 'pointer' : (isPlaying ? 'default' : 'move'),
        opacity: comp.Visible === false ? 0.3 : 1,
        boxShadow: isOpen ? `0 0 0 3px ${toRgba(palette, 0.16)}` : `0 1px 2px ${toRgba(palette, 0.08)}`,
        transition: 'border-color 0.12s, box-shadow 0.12s',
        userSelect: 'none',
        ...getSelectionStyles(selected, 'default'),
        zIndex: renderZIndex,
      }}
      aria-label={normalizeLiteralString(comp.AccessibleLabel) || undefined}
    >
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayText}</span>
      <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke={darker10} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
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
            boxShadow: `0 18px 36px ${toRgba(palette, 0.16)}`,
            overflow: 'hidden',
            zIndex: renderZIndex + 20,
          }}
        >
          {items.map((item, index) => {
            const itemLabel = getCollectionItemLabel(item)
            const isSelected = getCollectionItemLabel(selectedItems[0]) === itemLabel
            return (
              <button
                key={`${itemLabel}-${index}`}
                type="button"
                onClick={() => handleSelect(item)}
                style={{
                  width: '100%',
                  padding: '10pt 12pt',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12pt',
                  border: 'none',
                  background: isSelected ? lighter30 : '#ffffff',
                  color: '#1b1a19',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{itemLabel}</span>
                {isSelected && (
                  <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke={palette} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m4.5 10 3.2 3.2L15.5 5.8" />
                  </svg>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

ModernDropdownRenderer.propTypes = {
  comp: PropTypes.shape({
    id: PropTypes.string.isRequired,
    X: PropTypes.number.isRequired,
    Y: PropTypes.number.isRequired,
    Width: PropTypes.number.isRequired,
    Height: PropTypes.number.isRequired,
    AccessibleLabel: PropTypes.string,
    BasePaletteColor: PropTypes.string,
    DefaultSelectedItems: PropTypes.oneOfType([PropTypes.string, PropTypes.array]),
    DisplayMode: PropTypes.string,
    FontSize: PropTypes.number,
    Items: PropTypes.oneOfType([PropTypes.string, PropTypes.array]),
    OnChange: PropTypes.string,
    Required: PropTypes.bool,
    ValidationState: PropTypes.string,
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
