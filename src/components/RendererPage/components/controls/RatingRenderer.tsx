import { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { CSS_BORDER_STYLE } from './cssProps'
import { executeAction } from '../../../../common/helpers'
import { getSelectionStyles } from '@/theme/theme'
import { normalizeLiteralString } from './modernControlUtils'

function Star({ filled, color = '#f59e0b' }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={filled ? color : 'none'} stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )
}

function asBoolean(value: any) {
  if (value === true || value === false) return value
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (normalized === 'true') return true
    if (normalized === 'false') return false
  }
  return Boolean(value)
}

export default function RatingRenderer({
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
  const [value, setValue] = useState(Number(comp.Value ?? comp.Default ?? 0))
  const max = Math.max(1, Number(comp.Max ?? 5))
  const isDisabledMode = comp.DisplayMode === 'DisplayMode.Disabled'
  const isViewMode = comp.DisplayMode === 'DisplayMode.View'
  const showValue = asBoolean(comp.ShowValue)
  const isInteractive = isPlaying && !isDisabledMode && !isViewMode && !asBoolean(comp.ReadOnly)

  useEffect(() => {
    setValue(Number(comp.Reset ? comp.Default : (comp.Value ?? comp.Default ?? 0)))
  }, [comp.id, comp.Value, comp.Default, comp.Reset])

  return (
    <div
      onMouseDown={onMouseDown}
      onClick={(event) => {
        onClick(event)
        if (isPlaying && comp.OnSelect) {
          executeAction(comp.OnSelect, localVars, setLocalVars, notify, navigate, flatNodes, parentNode, comp)
        }
      }}
      title={normalizeLiteralString(comp.Tooltip)}
      style={{
        position: 'absolute',
        left: `${comp.X}pt`,
        top: `${comp.Y}pt`,
        width: `${comp.Width}pt`,
        height: `${comp.Height}pt`,
        display: 'flex',
        alignItems: 'center',
        gap: '6pt',
        padding: '4pt 6pt',
        boxSizing: 'border-box',
        border: `${comp.BorderThickness || 0}pt ${CSS_BORDER_STYLE[comp.BorderStyle] || 'solid'} ${comp.BorderColor || 'transparent'}`,
        backgroundColor: comp.Fill,
        opacity: comp.Visible === false ? 0.3 : (isDisabledMode ? 0.58 : 1),
        userSelect: 'none',
        cursor: isInteractive ? 'pointer' : (isPlaying ? 'default' : 'move'),
        ...getSelectionStyles(selected, 'default'),
        zIndex: renderZIndex,
      }}
    >
      {Array.from({ length: max }).map((_, index) => {
        const nextValue = index + 1
        return (
          <button
            key={nextValue}
            type="button"
            aria-label={`Rate ${nextValue}`}
            disabled={!isInteractive}
            onMouseDown={(event) => {
              event.stopPropagation()
            }}
            onClick={(event) => {
              event.stopPropagation()
              if (!isInteractive) return
              setValue(nextValue)
              updateProp?.(comp.id, 'Value', nextValue)
              if (comp.OnChange) {
                executeAction(comp.OnChange, localVars, setLocalVars, notify, navigate, flatNodes, parentNode, comp)
              }
            }}
            style={{
              border: 'none',
              background: 'transparent',
              padding: 0,
              cursor: isInteractive ? 'pointer' : 'default',
            }}
          >
            <Star filled={nextValue <= value} color={comp.RatingFill || '#f59e0b'} />
          </button>
        )
      })}
      {showValue && (
        <span style={{ marginLeft: '6pt', fontSize: '12pt', color: comp.RatingFill || '#f59e0b', minWidth: '20pt' }}>
          {value}
        </span>
      )}
    </div>
  )
}

RatingRenderer.propTypes = {
  comp: PropTypes.shape({
    id: PropTypes.string.isRequired,
    X: PropTypes.number.isRequired,
    Y: PropTypes.number.isRequired,
    Width: PropTypes.number.isRequired,
    Height: PropTypes.number.isRequired,
    BorderColor: PropTypes.string,
    BorderStyle: PropTypes.string,
    BorderThickness: PropTypes.number,
    Default: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    DisplayMode: PropTypes.string,
    Fill: PropTypes.string,
    Max: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    OnChange: PropTypes.string,
    OnSelect: PropTypes.string,
    RatingFill: PropTypes.string,
    ReadOnly: PropTypes.bool,
    Reset: PropTypes.bool,
    ShowValue: PropTypes.bool,
    Tooltip: PropTypes.string,
    Value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
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
