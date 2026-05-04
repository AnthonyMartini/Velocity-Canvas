import React, { useEffect, useRef, useState } from 'react'
import PropTypes from 'prop-types'
import { executeAction } from '../../../../common/helpers'
import { formatDateSelectionForStorage, toDateInputValue } from '@/features/powerapps/date-values'
import { getSelectionStyles, themeVars } from '@/theme/theme'
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
  navigate,
  flatNodes,
  parentNode,
  updateProp,
  onMouseDown, 
  onClick,
  renderZIndex = 1
}) {
  const inputRef = useRef(null)

  // Evaluate the DefaultDate or SelectedDate to use as value
  const defaultDateStr = comp.DefaultDate
  const selectedDateStr = comp.SelectedDate
  
  // PowerApps uses SelectedDate if provided, otherwise DefaultDate
  const displayDateStr = toDateInputValue(selectedDateStr) || toDateInputValue(defaultDateStr)
  const [liveValue, setLiveValue] = useState(displayDateStr)

  useEffect(() => {
    setLiveValue(displayDateStr)
  }, [comp.id, displayDateStr])

  const isDisabledMode = comp.DisplayMode === 'DisplayMode.Disabled'
  const isInteractive = isPlaying && !comp.disabled && !isDisabledMode
  const allowsKeyboardEditing = comp.IsEditable !== false

  // Calculate borders based on state
  let currentBorderColor = comp.BorderColor
  let currentBorderThickness = comp.BorderThickness
  if (isDisabledMode && comp.DisabledBorderColor) {
    currentBorderColor = comp.DisabledBorderColor
  } else if (comp.HoverBorderColor && comp.HoverBorderColor !== 'transparent') {
    // Basic fallback without full hover state tracking implemented per component
  }
  
  let currentFill = comp.Fill
  let currentColor = comp.Color
  if (isDisabledMode) {
    currentFill = comp.DisabledFill || themeVars.colors.controlDisabledFill
    currentColor = comp.DisabledColor || themeVars.colors.controlDisabled
  }

  const borderMap = { None: 'none', Solid: 'solid', Dashed: 'dashed', Dotted: 'dotted' }
  const fontWeightMap = {
    'FontWeight.Lighter': '300',
    'FontWeight.Normal': '400',
    'FontWeight.Semibold': '600',
    'FontWeight.Bold': '700'
  }

  // The outer wrapper styling
  const wrapperStyle: any = {
    position: 'absolute',
    left: `${comp.X}pt`,
    top: `${comp.Y}pt`,
    width: `${comp.Width}pt`,
    height: `${comp.Height}pt`,
    borderStyle: borderMap[comp.BorderStyle] || 'none',
    borderWidth: currentBorderThickness ? `${currentBorderThickness}pt` : 0,
    borderColor: currentBorderColor,
    backgroundColor: currentFill,
    opacity: comp.Visible !== false ? 1 : 0,
    pointerEvents: comp.Visible !== false ? 'auto' : 'none',
    display: 'flex',
    boxSizing: 'border-box',
    overflow: 'hidden',
    ...getSelectionStyles(selected),
    zIndex: renderZIndex,
  }

  // Native input styling
  const inputStyle: any = {
    flex: 1,
    height: '100%',
    width: '100%',
    backgroundColor: 'transparent',
    color: currentColor,
    fontSize: comp.Size ? `${comp.Size}pt` : 'inherit',
    fontWeight: fontWeightMap[comp.FontWeight] || 'normal',
    fontStyle: comp.Italic ? 'italic' : 'normal',
    paddingLeft: `${comp.PaddingLeft || 0}pt`,
    paddingRight: `${comp.PaddingRight || 0}pt`,
    paddingTop: `${comp.PaddingTop || 0}pt`,
    paddingBottom: `${comp.PaddingBottom || 0}pt`,
    border: 'none',
    outline: 'none',
    cursor: isInteractive ? (comp.IsEditable ? 'text' : 'pointer') : (isPlaying ? 'default' : 'move'),
    userSelect: 'none',
    fontFamily: comp.Font || 'inherit',
  }

  // Date icon area styling
  const iconAreaStyle: any = {
    width: Math.max(comp.Height, 40), // Typically square based on height
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: comp.IconBackground,
    color: comp.IconFill,
    cursor: isInteractive ? 'pointer' : 'default',
    borderLeft: `1px solid ${currentBorderColor}`, // Divider
    flexShrink: 0,
  }

  // Action hook
  const handleWrapperClick = (e) => {
    onClick(e)
  }

  const openPicker = () => {
    if (!isInteractive) return
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

  const handleChange = (event) => {
    if (!isInteractive) return
    const nextInputValue = event.target.value
    const nextStoredValue = formatDateSelectionForStorage(nextInputValue, comp.SelectedDate)
    setLiveValue(nextInputValue)
    updateProp?.(comp.id, 'SelectedDate', nextStoredValue)
    if (comp.OnChange) executeAction(comp.OnChange, localVars, setLocalVars, notify, navigate, flatNodes, parentNode, comp)
  }

  // Intercept clicks on the icon to open the native date picker calendar
  const handleIconClick = (e) => {
    e.stopPropagation()
    if (!isInteractive) {
      if (!isPlaying) onClick(e)
      return
    }
    
    if (comp.OnSelect) executeAction(comp.OnSelect, localVars, setLocalVars, notify, navigate, flatNodes, parentNode, comp)

    openPicker()
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
        value={liveValue}
        onChange={handleChange}
        placeholder={comp.InputTextPlaceholder}
        readOnly={!isInteractive}
        disabled={isDisabledMode}
        min={comp.StartYear ? `${comp.StartYear}-01-01` : undefined}
        max={comp.EndYear ? `${comp.EndYear}-12-31` : undefined}
        onMouseDown={(e) => {
          if (isPlaying) {
            e.stopPropagation()
            return
          }
          onMouseDown(e)
        }}
        onClick={(e) => {
          if (!isPlaying) return
          e.stopPropagation()
          if (!allowsKeyboardEditing) {
            openPicker()
          }
        }}
      />
      <div 
        style={iconAreaStyle} 
        onMouseDown={handleIconClick}
      >
        <CalendarIcon size={Math.min(20, comp.Height * 0.6)} />
      </div>
    </div>
  )
}

DatePickerRenderer.propTypes = {
  comp: PropTypes.shape({
    X: PropTypes.number.isRequired,
    Y: PropTypes.number.isRequired,
    Width: PropTypes.number.isRequired,
    Height: PropTypes.number.isRequired,
    Fill: PropTypes.string,
    Color: PropTypes.string,
    Size: PropTypes.number,
    FontWeight: PropTypes.string,
    BorderStyle: PropTypes.string,
    BorderThickness: PropTypes.number,
    Visible: PropTypes.bool,
    DisplayMode: PropTypes.string,
    DefaultDate: PropTypes.string,
    SelectedDate: PropTypes.string,
    IconBackground: PropTypes.string,
    IconFill: PropTypes.string,
  }).isRequired,
  selected: PropTypes.bool,
  isPlaying: PropTypes.bool,
  localVars: PropTypes.object,
  setLocalVars: PropTypes.func,
  notify: PropTypes.func,
  navigate: PropTypes.func,
  updateProp: PropTypes.func,
  renderZIndex: PropTypes.number,
  onMouseDown: PropTypes.func.isRequired,
  onClick: PropTypes.func.isRequired,
}
