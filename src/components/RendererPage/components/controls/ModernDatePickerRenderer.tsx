import { useEffect, useRef, useState } from 'react'
import PropTypes from 'prop-types'
import { CSS_FW } from './cssProps'
import { executeAction } from '../../../../common/helpers'
import { formatDateSelectionForStorage, toDateInputValue } from '@/features/powerapps/date-values'
import { getSelectionStyles, themeVars } from '@/theme/theme'
import { normalizeLiteralString, resolveModernPalette, toRgba } from './modernControlUtils'

const CalendarIcon = ({ color = 'currentColor' }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
)

export default function ModernDatePickerRenderer({
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
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [value, setValue] = useState(toDateInputValue(comp.SelectedDate))
  const [isFocused, setIsFocused] = useState(false)
  const isDisabledMode = comp.DisplayMode === 'DisplayMode.Disabled'
  const isViewMode = comp.DisplayMode === 'DisplayMode.View'
  const isInteractive = isPlaying && !isDisabledMode && !isViewMode && comp.IsEditable !== false
  const validationState = normalizeLiteralString(comp.ValidationState, 'none').toLowerCase()
  const { palette, lighter30, lighter10 } = resolveModernPalette(comp, canvasTheme)
  const borderColor = validationState === 'error'
    ? '#d13438'
    : (isFocused ? palette : lighter10)

  useEffect(() => {
    setValue(toDateInputValue(comp.SelectedDate))
  }, [comp.id, comp.SelectedDate])

  const openPicker = () => {
    if (!isInteractive) return
    if (inputRef.current && typeof inputRef.current.showPicker === 'function') {
      try {
        inputRef.current.showPicker()
      } catch {
        inputRef.current.focus()
      }
    } else {
      inputRef.current?.focus()
    }
  }

  return (
    <div
      onMouseDown={onMouseDown}
      onClick={onClick}
      style={{
        position: 'absolute',
        left: `${comp.X}pt`,
        top: `${comp.Y}pt`,
        width: `${comp.Width}pt`,
        height: `${comp.Height}pt`,
        display: 'flex',
        alignItems: 'stretch',
        borderRadius: '10pt',
        border: `1pt solid ${isDisabledMode ? toRgba(borderColor, 0.4) : borderColor}`,
        backgroundColor: isDisabledMode ? lighter30 : '#ffffff',
        boxShadow: isFocused ? `0 0 0 3px ${toRgba(palette, 0.14)}` : `0 1px 2px ${toRgba(palette, 0.08)}`,
        opacity: comp.Visible === false ? 0.3 : 1,
        userSelect: isPlaying ? 'auto' : 'none',
        cursor: isInteractive ? 'pointer' : (isPlaying ? 'default' : 'move'),
        transition: 'border-color 0.12s, box-shadow 0.12s',
        ...getSelectionStyles(selected, 'default'),
        zIndex: renderZIndex,
      }}
    >
      <input
        ref={inputRef}
        type="date"
        value={value}
        min={normalizeLiteralString(comp.StartDate) || undefined}
        max={normalizeLiteralString(comp.EndDate) || undefined}
        readOnly={!isInteractive}
        disabled={isPlaying && isDisabledMode}
        aria-label={normalizeLiteralString(comp.AccessibleLabel) || 'Date picker'}
        placeholder={normalizeLiteralString(comp.PlaceHolder)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onChange={(event) => {
          const nextInputValue = event.target.value
          const nextStoredValue = formatDateSelectionForStorage(nextInputValue, comp.SelectedDate)
          setValue(nextInputValue)
          updateProp?.(comp.id, 'SelectedDate', nextStoredValue)
          if (comp.OnChange) {
            executeAction(comp.OnChange, localVars, setLocalVars, notify, navigate, flatNodes, parentNode, comp)
          }
        }}
        onMouseDown={(event) => {
          if (isPlaying) event.stopPropagation()
        }}
        onClick={(event) => {
          if (isPlaying) event.stopPropagation()
        }}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          outline: 'none',
          borderRadius: 'inherit',
          padding: '0 12pt',
          background: 'transparent',
          color: isDisabledMode ? toRgba(comp.FontColor || '#1b1a19', 0.58) : (comp.FontColor || '#1b1a19'),
          fontFamily: comp.Font || canvasTheme?.Font || themeVars.fonts.sans,
          fontSize: `${comp.FontSize || 14}pt`,
          fontWeight: CSS_FW[comp.FontWeight] || comp.FontWeight || '400',
          fontStyle: comp.FontItalic ? 'italic' : 'normal',
          textDecoration: [
            comp.FontUnderline ? 'underline' : '',
            comp.FontStrikethrough ? 'line-through' : '',
          ].filter(Boolean).join(' ') || 'none',
        }}
      />
      <button
        type="button"
        onMouseDown={(event) => {
          event.stopPropagation()
          if (!isPlaying) onMouseDown(event)
        }}
        onClick={(event) => {
          event.stopPropagation()
          openPicker()
        }}
        style={{
          width: '40pt',
          border: 'none',
          borderLeft: `1px solid ${toRgba(borderColor, 0.4)}`,
          background: 'transparent',
          color: palette,
          cursor: isInteractive ? 'pointer' : 'default',
          flexShrink: 0,
        }}
      >
        <CalendarIcon color={palette} />
      </button>
    </div>
  )
}

ModernDatePickerRenderer.propTypes = {
  comp: PropTypes.shape({
    id: PropTypes.string.isRequired,
    X: PropTypes.number.isRequired,
    Y: PropTypes.number.isRequired,
    Width: PropTypes.number.isRequired,
    Height: PropTypes.number.isRequired,
    AccessibleLabel: PropTypes.string,
    BasePaletteColor: PropTypes.string,
    DisplayMode: PropTypes.string,
    EndDate: PropTypes.string,
    Font: PropTypes.string,
    FontColor: PropTypes.string,
    FontItalic: PropTypes.bool,
    FontSize: PropTypes.number,
    FontStrikethrough: PropTypes.bool,
    FontUnderline: PropTypes.bool,
    FontWeight: PropTypes.string,
    IsEditable: PropTypes.bool,
    OnChange: PropTypes.string,
    PlaceHolder: PropTypes.string,
    SelectedDate: PropTypes.string,
    StartDate: PropTypes.string,
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
