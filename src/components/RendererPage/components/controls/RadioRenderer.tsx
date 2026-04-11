import { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { CSS_BORDER_STYLE, CSS_FW } from './cssProps'
import { executeAction } from '../../../../common/helpers'
import { getSelectionStyles } from '@/theme/theme'

function parseItems(value) {
  if (Array.isArray(value)) return value.map((item) => String(item))
  if (value && typeof value === 'object') return Object.values(value).map((item) => String(item))
  if (typeof value !== 'string') return []

  const trimmed = value.trim()
  if (!trimmed) return []

  try {
    const parsed = JSON.parse(trimmed)
    if (Array.isArray(parsed)) return parsed.map((item) => String(item))
  } catch {}

  try {
    const normalized = trimmed.replace(/'/g, '"')
    const parsed = JSON.parse(normalized)
    if (Array.isArray(parsed)) return parsed.map((item) => String(item))
  } catch {}

  return trimmed
    .replace(/^\[|\]$/g, '')
    .split(',')
    .map((item) => item.trim().replace(/^['"]|['"]$/g, ''))
    .filter(Boolean)
}

export default function RadioRenderer({ comp, selected, isPlaying, localVars, setLocalVars, notify, navigate, updateProp, flatNodes, parentNode, onMouseDown, onClick, renderZIndex = 1 }) {
  const items = parseItems(comp.Items)
  const fallbackValue = items[0] || ''
  const displayValue = String(comp.Selected ?? comp.Default ?? fallbackValue)
  const [selectedValue, setSelectedValue] = useState(displayValue)

  useEffect(() => {
    setSelectedValue(displayValue)
  }, [comp.id, displayValue])

  const disabled = comp.DisplayMode === 'DisplayMode.Disabled'
  const isHorizontal = String(comp.Layout || '').includes('Horizontal')

  const containerStyle: any = {
    position: 'absolute',
    left: `${comp.X}pt`,
    top: `${comp.Y}pt`,
    width: `${comp.Width}pt`,
    height: `${comp.Height}pt`,
    backgroundColor: comp.Fill,
    border: (comp.BorderStyle && comp.BorderStyle !== 'BorderStyle.None' && (comp.BorderThickness || 0) > 0)
      ? `${comp.BorderThickness}pt ${CSS_BORDER_STYLE[comp.BorderStyle] || 'solid'} ${comp.BorderColor}`
      : 'none',
    color: comp.Color,
    fontSize: `${comp.Size || 13}pt`,
    fontWeight: CSS_FW[comp.FontWeight] || comp.FontWeight,
    display: 'flex',
    flexDirection: isHorizontal ? 'row' : 'column',
    gap: '8pt',
    alignItems: isHorizontal ? 'center' : 'flex-start',
    alignContent: 'flex-start',
    flexWrap: isHorizontal ? 'wrap' : 'nowrap',
    boxSizing: 'border-box',
    padding: '6pt',
    opacity: comp.Visible === false ? 0.3 : (disabled ? 0.5 : 1),
    cursor: isPlaying && !disabled ? 'pointer' : (isPlaying ? 'default' : 'move'),
    userSelect: 'none',
    overflow: 'hidden',
    ...getSelectionStyles(selected),
    zIndex: renderZIndex,
    transition: 'box-shadow 0.1s, outline 0.1s',
  }

  const chooseValue = (nextValue) => {
    if (!isPlaying || disabled) return
    setSelectedValue(nextValue)
    updateProp?.(comp.id, 'Selected', nextValue)
    if (comp.OnChange) {
      executeAction(comp.OnChange, localVars, setLocalVars, notify, navigate, flatNodes, parentNode, comp)
    }
  }

  const handleContainerClick = (e) => {
    if (onClick) onClick(e)
    if (isPlaying && comp.OnSelect) {
      executeAction(comp.OnSelect, localVars, setLocalVars, notify, navigate, flatNodes, parentNode, comp)
    }
  }

  return (
    <div style={containerStyle} onMouseDown={onMouseDown} onClick={handleContainerClick}>
      {items.map((item, index) => {
        const checked = selectedValue === item
        return (
          <label
            key={`${comp.id}-${index}-${item}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6pt',
              minWidth: isHorizontal ? 'fit-content' : '100%',
              cursor: isPlaying && !disabled ? 'pointer' : 'default',
            }}
            onClick={(e) => {
              e.stopPropagation()
              chooseValue(item)
            }}
          >
            <span
              style={{
                width: `${comp.RadioSize || 18}pt`,
                height: `${comp.RadioSize || 18}pt`,
                borderRadius: '9999px',
                border: `2px solid ${comp.RadioBorderColor || comp.BorderColor || '#605e5c'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {checked && (
                <span
                  style={{
                    width: `${Math.max((comp.RadioSize || 18) / 2, 6)}pt`,
                    height: `${Math.max((comp.RadioSize || 18) / 2, 6)}pt`,
                    borderRadius: '9999px',
                    backgroundColor: comp.RadioSelectionFill,
                  }}
                />
              )}
            </span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item}</span>
          </label>
        )
      })}
    </div>
  )
}

RadioRenderer.propTypes = {
  comp: PropTypes.shape({
    id: PropTypes.string.isRequired,
    X: PropTypes.number.isRequired,
    Y: PropTypes.number.isRequired,
    Width: PropTypes.number.isRequired,
    Height: PropTypes.number.isRequired,
    Items: PropTypes.oneOfType([PropTypes.string, PropTypes.array]),
    Default: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    Selected: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    Layout: PropTypes.string,
    RadioSize: PropTypes.number,
    Fill: PropTypes.string,
    Color: PropTypes.string,
    Size: PropTypes.number,
    FontWeight: PropTypes.string,
    RadioBorderColor: PropTypes.string,
    RadioSelectionFill: PropTypes.string,
    BorderColor: PropTypes.string,
    BorderStyle: PropTypes.string,
    BorderThickness: PropTypes.number,
    DisplayMode: PropTypes.string,
    Visible: PropTypes.bool,
    OnChange: PropTypes.string,
    OnSelect: PropTypes.string,
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
