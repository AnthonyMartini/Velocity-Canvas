import React, { useRef } from 'react'
import PropTypes from 'prop-types'
import { evaluateValue, executeAction } from '../../common/helpers.jsx'
// Inline calendar icon (no external dependency needed)
const CalendarIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
)

export default function DatePickerRenderer({ 
  comp, 
  selected, 
  isPlaying, 
  localVars, 
  setLocalVars, 
  notify, 
  onMouseDown, 
  onClick 
}) {
  const inputRef = useRef(null)

  // Evaluate the DefaultDate or SelectedDate to use as value
  const defaultDateStr = evaluateValue(comp.DefaultDate, localVars)
  const selectedDateStr = evaluateValue(comp.SelectedDate, localVars)
  
  // PowerApps uses SelectedDate if provided, otherwise DefaultDate
  const displayDateStr = selectedDateStr || defaultDateStr || ''

  const isInteractive = isPlaying && !comp.disabled

  // Calculate borders based on state
  let currentBorderColor = comp.borderColor
  let currentBorderThickness = comp.borderThickness
  if (comp.disabled && comp.disabledBorderColor) {
    currentBorderColor = comp.disabledBorderColor
  } else if (comp.hoverBorderColor && comp.hoverBorderColor !== 'transparent') {
    // Basic fallback without full hover state tracking implemented per component
  }
  
  let currentFill = comp.fill
  let currentColor = comp.color
  if (comp.disabled) {
    if (comp.disabledFill) currentFill = comp.disabledFill
    if (comp.disabledColor) currentColor = comp.disabledColor
  }

  const borderMap = { None: 'none', Solid: 'solid', Dashed: 'dashed', Dotted: 'dotted' }
  const fontWeightMap = {
    'FontWeight.Lighter': '300',
    'FontWeight.Normal': '400',
    'FontWeight.Semibold': '600',
    'FontWeight.Bold': '700'
  }

  // The outer wrapper styling
  const wrapperStyle = {
    position: 'absolute',
    left: comp.x,
    top: comp.y,
    width: comp.width,
    height: comp.height,
    borderStyle: borderMap[comp.borderStyle] || 'none',
    borderWidth: currentBorderThickness ? `${currentBorderThickness}px` : 0,
    borderColor: currentBorderColor,
    backgroundColor: currentFill,
    opacity: comp.visible !== false ? 1 : 0,
    pointerEvents: comp.visible !== false ? 'auto' : 'none',
    display: 'flex',
    boxSizing: 'border-box',
    overflow: 'hidden',
    outline: selected ? '2px solid #0078d4' : 'none',
    outlineOffset: selected ? '2px' : '0',
    boxShadow: selected ? '0 0 0 3px rgba(0,120,212,0.25)' : 'none',
    zIndex: selected ? 10 : 1,
  }

  // Native input styling
  const inputStyle = {
    flex: 1,
    height: '100%',
    width: '100%',
    backgroundColor: 'transparent',
    color: currentColor,
    fontSize: comp.fontSize ? `${comp.fontSize}px` : 'inherit',
    fontWeight: fontWeightMap[comp.fontWeight] || 'normal',
    fontStyle: comp.italic ? 'italic' : 'normal',
    paddingLeft: comp.paddingLeft || 0,
    paddingRight: comp.paddingRight || 0,
    paddingTop: comp.paddingTop || 0,
    paddingBottom: comp.paddingBottom || 0,
    border: 'none',
    outline: 'none',
    cursor: isInteractive ? (comp.isEditable ? 'text' : 'pointer') : 'default',
    fontFamily: comp.font || 'inherit',
  }

  // Date icon area styling
  const iconAreaStyle = {
    width: Math.max(comp.height, 40), // Typically square based on height
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: comp.iconBackground,
    color: comp.iconFill,
    cursor: isInteractive ? 'pointer' : 'default',
    borderLeft: `1px solid ${currentBorderColor}`, // Divider
    flexShrink: 0,
  }

  // Action hook
  const handleWrapperClick = (e) => {
    onClick(e)
  }

  const handleChange = (e) => {
    if (!isInteractive) return
    if (comp.OnChange) executeAction(comp.OnChange, localVars, setLocalVars, notify)
  }

  // Intercept clicks on the icon to open the native date picker calendar
  const handleIconClick = (e) => {
    e.stopPropagation()
    if (!isInteractive) {
      if (!isPlaying) onClick(e)
      return
    }
    
    if (comp.OnSelect) executeAction(comp.OnSelect, localVars, setLocalVars, notify)
    
    // Trigger native date picker if supported
    if (inputRef.current && typeof inputRef.current.showPicker === 'function') {
      try {
        inputRef.current.showPicker()
      } catch (err) {
        inputRef.current.focus()
      }
    } else if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  return (
    <div
      id={comp.id}
      style={wrapperStyle}
      onMouseDown={onMouseDown}
      onClick={handleWrapperClick}
    >
      <input
        ref={inputRef}
        type="date"
        style={inputStyle}
        value={displayDateStr}
        onChange={handleChange}
        placeholder={evaluateValue(comp.inputTextPlaceholder, localVars)}
        readOnly={!isInteractive || !comp.isEditable}
        disabled={comp.disabled}
        min={comp.startYear ? `${comp.startYear}-01-01` : undefined}
        max={comp.endYear ? `${comp.endYear}-12-31` : undefined}
        // In preview mode, allow standard native events. In edit mode, suppress them.
        onMouseDown={!isPlaying ? (e) => onMouseDown(e) : undefined} 
      />
      <div 
        style={iconAreaStyle} 
        onMouseDown={handleIconClick}
      >
        <CalendarIcon size={Math.min(20, comp.height * 0.6)} />
      </div>
    </div>
  )
}

DatePickerRenderer.propTypes = {
  comp: PropTypes.object.isRequired,
  selected: PropTypes.bool,
  isPlaying: PropTypes.bool,
  localVars: PropTypes.object,
  setLocalVars: PropTypes.func,
  notify: PropTypes.func,
  onMouseDown: PropTypes.func.isRequired,
  onClick: PropTypes.func.isRequired,
}
