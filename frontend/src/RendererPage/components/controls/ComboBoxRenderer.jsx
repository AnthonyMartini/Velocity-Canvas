import React, { useRef, useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { evaluateValue, executeAction } from '../../../common/helpers.jsx'
// Inline icons (no external dependency needed)
const ChevronDownIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
)
const SearchIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
)

export default function ComboBoxRenderer({ 
  comp, 
  selected, 
  isPlaying, 
  localVars, 
  setLocalVars, 
  notify,
  navigate,
  flatNodes,
  parentNode,
  onMouseDown, 
  onClick 
}) {
  const containerRef = useRef(null)

  const isInteractive = isPlaying && comp.DisplayMode !== 'DisplayMode.Disabled' && comp.DisplayMode !== 'DisplayMode.View'

  // Safely parse JSON properties
  const parseJsonStr = (str, fallback = []) => {
    try { return JSON.parse(str) } catch (e) { return fallback }
  }

  // ComboBox strictly deals with arrays of items.
  let rawItems = evaluateValue(comp.Items, localVars, flatNodes, new Set(), parentNode)
  let items = []
  if (Array.isArray(rawItems)) items = rawItems
  else items = parseJsonStr(rawItems, [])

  const selectMultiple = comp.SelectMultiple || false
  const isSearchable = comp.IsSearchable !== false // defaults true based on PA usage often
  
  // PowerApps has SearchFields and DisplayFields
  const displayFields = parseJsonStr(comp.DisplayFields, [])
  const placeholder = evaluateValue(comp.InputTextPlaceholder, localVars, flatNodes, new Set(), parentNode) || ''

  // Internal state for the dropdown simulation MVP
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [localSelected, setLocalSelected] = useState([]) // For MVP standalone preview

  // Calculate borders based on state
  let currentBorderColor = comp.BorderColor
  let currentBorderThickness = comp.BorderThickness
  if (comp.DisplayMode === 'DisplayMode.Disabled') {
    currentBorderColor = '#c8c6c4' 
  } else if (isOpen) {
    currentBorderColor = comp.FocusedBorderColor
    currentBorderThickness = comp.FocusedBorderThickness
  }

  let currentFill = comp.Fill
  let currentColor = comp.Color
  if (comp.DisplayMode === 'DisplayMode.Disabled') {
    currentFill = '#f3f2f1'
    currentColor = '#a19f9d'
  }

  const borderMap = { None: 'none', Solid: 'solid', Dashed: 'dashed', Dotted: 'dotted' }
  const fontWeightMap = {
    'FontWeight.Lighter': '300',
    'FontWeight.Normal': '400',
    'FontWeight.Semibold': '600',
    'FontWeight.Bold': '700'
  }

  // Container styling
  const wrapperStyle = {
    position: 'absolute',
    left: comp.X,
    top: comp.Y,
    width: comp.Width,
    height: comp.Height,
    borderStyle: borderMap[comp.BorderStyle] || 'none',
    borderWidth: currentBorderThickness ? `${currentBorderThickness}px` : 0,
    borderColor: currentBorderColor,
    backgroundColor: currentFill,
    color: currentColor,
    fontSize: comp.Size ? `${comp.Size}px` : 'inherit',
    fontWeight: fontWeightMap[comp.FontWeight] || 'normal',
    opacity: comp.Visible !== false ? 1 : 0,
    pointerEvents: comp.Visible !== false ? 'auto' : 'none',
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
    padding: '0 8px',
    cursor: isInteractive ? 'pointer' : (isPlaying ? 'default' : 'move'),
    userSelect: 'none',
    fontFamily: comp.Font || 'inherit',
    outline: selected ? '2px solid #0078d4' : 'none',
    outlineOffset: selected ? '2px' : '0',
    boxShadow: selected ? '0 0 0 3px rgba(0,120,212,0.25)' : 'none',
    zIndex: selected ? 10 : 1,
  }

  // Actions
  const handleWrapperMouseDown = (e) => {
    onMouseDown(e)
  }

  const handleWrapperClick = (e) => {
    onClick(e)
    if (isInteractive) {
      setIsOpen(!isOpen)
      if (comp.OnSelect) executeAction(comp.OnSelect, localVars, setLocalVars, notify, navigate, flatNodes, parentNode, comp)
    }
  }

  const handleItemSelect = (e, item) => {
    e.stopPropagation()
    if (!isInteractive) return
    
    if (selectMultiple) {
      const idx = localSelected.findIndex(i => JSON.stringify(i) === JSON.stringify(item))
      if (idx > -1) {
        setLocalSelected(localSelected.filter((_, i) => i !== idx))
      } else {
        setLocalSelected([...localSelected, item])
      }
    } else {
      setLocalSelected([item])
      setIsOpen(false)
    }
    
    if (comp.OnChange) executeAction(comp.OnChange, localVars, setLocalVars, notify, navigate, flatNodes, parentNode, comp)
    if (comp.OnNavigate) executeAction(comp.OnNavigate, localVars, setLocalVars, notify, navigate, flatNodes, parentNode, comp)
  }

  // Render Display Text MVP
  const getDisplayText = (item) => {
    if (typeof item !== 'object' || item === null) return String(item)
    if (displayFields.length > 0) return String(item[displayFields[0]] || '')
    const keys = Object.keys(item)
    return String(item[keys[0]] || JSON.stringify(item))
  }

  // Search MVP 
  const filteredItems = items.filter(item => {
    if (!searchTerm) return true
    const text = getDisplayText(item).toLowerCase()
    return text.includes(searchTerm.toLowerCase())
  })

  // Display value in the closed box
  let boxText = ''
  if (localSelected.length > 0) {
    if (selectMultiple) {
      boxText = localSelected.map(getDisplayText).join(', ')
    } else {
      boxText = getDisplayText(localSelected[0])
    }
  } else {
    boxText = placeholder
  }

  return (
    <div
      id={comp.id}
      style={wrapperStyle}
      onMouseDown={handleWrapperMouseDown}
      onClick={handleWrapperClick}
    >
      <div ref={containerRef} className="w-full h-full flex items-center justify-between relative">
        <div className="flex-1 truncate select-none text-sm" style={{ opacity: localSelected.length ? 1 : 0.6 }}>
          {boxText}
        </div>
        
        <div className="flex items-center gap-1 shrink-0 ml-1 text-gray-500">
          {isSearchable && <SearchIcon size={14} />}
          <ChevronDownIcon size={16} />
        </div>

        {/* The Dropdown Flyout Panel */}
        {isOpen && isInteractive && (
          <div 
            className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-300 shadow-lg rounded-sm z-50 overflow-hidden flex flex-col"
            style={{ 
              minHeight: 50,
              maxHeight: 250, 
              marginLeft: -1, 
              marginRight: -1 
            }}
            onMouseDown={e => e.stopPropagation()} 
            onClick={e => e.stopPropagation()} 
          >
            {isSearchable && (
              <div className="border-b border-gray-200 p-1 shrink-0 bg-gray-50/50">
                <input 
                  autoFocus
                  type="text"
                  placeholder="Search..."
                  className="w-full text-sm p-1.5 outline-none bg-transparent"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  onMouseDown={e => e.stopPropagation()}
                />
              </div>
            )}
            
            <div className="overflow-y-auto flex-1 py-1">
              {filteredItems.length === 0 ? (
                <div className="px-3 py-2 text-xs text-gray-400 italic">No items found</div>
              ) : (
                filteredItems.map((item, i) => {
                  const isSelectedLocally = localSelected.some(sel => JSON.stringify(sel) === JSON.stringify(item))
                  return (
                    <div 
                      key={i}
                      className={`px-3 py-2 text-sm cursor-pointer transition-colors flex items-center gap-2 ${isSelectedLocally ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-100 text-gray-800'}`}
                      onClick={(e) => handleItemSelect(e, item)}
                    >
                      {selectMultiple && (
                        <div className={`w-3.5 h-3.5 border rounded-sm flex items-center justify-center shrink-0 ${isSelectedLocally ? 'bg-blue-600 border-blue-600' : 'border-gray-400'}`}>
                          {isSelectedLocally && <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                        </div>
                      )}
                      <span className="truncate">{getDisplayText(item)}</span>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

ComboBoxRenderer.propTypes = {
  comp: PropTypes.shape({
    X: PropTypes.number.isRequired,
    Y: PropTypes.number.isRequired,
    Width: PropTypes.number.isRequired,
    Height: PropTypes.number.isRequired,
    Fill: PropTypes.string,
    Color: PropTypes.string,
    Items: PropTypes.string,
    DisplayFields: PropTypes.string,
    SearchFields: PropTypes.string,
    InputTextPlaceholder: PropTypes.string,
    Visible: PropTypes.bool,
    DisplayMode: PropTypes.string,
    Font: PropTypes.string,
    FontWeight: PropTypes.string,
    Size: PropTypes.number,
    BorderColor: PropTypes.string,
    BorderStyle: PropTypes.string,
    BorderThickness: PropTypes.number,
    FocusedBorderColor: PropTypes.string,
    FocusedBorderThickness: PropTypes.number,
    OnChange: PropTypes.string,
    OnSelect: PropTypes.string,
    OnNavigate: PropTypes.string,
  }).isRequired,
  selected: PropTypes.bool,
  isPlaying: PropTypes.bool,
  localVars: PropTypes.object,
  setLocalVars: PropTypes.func,
  notify: PropTypes.func,
  navigate: PropTypes.func,
  onMouseDown: PropTypes.func.isRequired,
  onClick: PropTypes.func.isRequired,
}
