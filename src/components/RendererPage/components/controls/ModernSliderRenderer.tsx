import { useEffect, useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import { executeAction } from '../../../../common/helpers'
import { getSelectionStyles } from '@/theme/theme'
import { clamp, resolveModernPalette, toRgba } from './modernControlUtils'

export default function ModernSliderRenderer({
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
  const min = Number.isFinite(Number(comp.Min)) ? Number(comp.Min) : 0
  const max = Number.isFinite(Number(comp.Max)) ? Number(comp.Max) : 100
  const initialValue = clamp(
    Number.isFinite(Number(comp.Value)) ? Number(comp.Value) : min,
    min,
    Math.max(min, max)
  )
  const [value, setValue] = useState(initialValue)
  const isDisabledMode = comp.DisplayMode === 'DisplayMode.Disabled'
  const isViewMode = comp.DisplayMode === 'DisplayMode.View'
  const isInteractive = isPlaying && !isDisabledMode && !isViewMode
  const isVertical = comp.Layout === 'Layout.Vertical'
  const { palette, lighter20 } = resolveModernPalette(comp, canvasTheme)

  useEffect(() => {
    setValue(initialValue)
  }, [initialValue, comp.id])

  const percent = useMemo(() => {
    if (max <= min) return 0
    return ((value - min) / (max - min)) * 100
  }, [max, min, value])

  const handleChange = (event: any) => {
    const nextValue = Number(event.target.value)
    setValue(nextValue)
    if (!isInteractive) return
    updateProp?.(comp.id, 'Value', nextValue)
    if (comp.OnChange) {
      executeAction(comp.OnChange, localVars, setLocalVars, notify, navigate, flatNodes, parentNode, comp)
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
        alignItems: 'center',
        justifyContent: isVertical ? 'center' : 'stretch',
        padding: isVertical ? '8pt 0' : '0 8pt',
        boxSizing: 'border-box',
        cursor: isInteractive ? 'pointer' : (isPlaying ? 'default' : 'move'),
        opacity: comp.Visible === false ? 0.3 : (isDisabledMode ? 0.56 : 1),
        userSelect: 'none',
        ...getSelectionStyles(selected, 'default'),
        zIndex: renderZIndex,
      }}
    >
      <div
        style={{
          position: 'relative',
          width: isVertical ? '24pt' : '100%',
          height: isVertical ? '100%' : '24pt',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: isVertical ? '0 auto 0 50%' : '50% 0 auto 0',
            width: isVertical ? '4pt' : '100%',
            height: isVertical ? '100%' : '4pt',
            transform: isVertical ? 'translateX(-50%)' : 'translateY(-50%)',
            borderRadius: '999px',
            background: isVertical
              ? `linear-gradient(to top, ${palette} 0%, ${palette} ${percent}%, ${lighter20} ${percent}%, ${lighter20} 100%)`
              : `linear-gradient(to right, ${palette} 0%, ${palette} ${percent}%, ${lighter20} ${percent}%, ${lighter20} 100%)`,
          }}
        />
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          disabled={!isInteractive}
          aria-label={comp.AccessibleLabel || 'Slider'}
          onChange={handleChange}
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
          style={{
            width: isVertical ? `${comp.Height}pt` : '100%',
            height: isVertical ? '24pt' : '100%',
            margin: 0,
            accentColor: palette,
            background: 'transparent',
            transform: isVertical ? 'rotate(-90deg)' : 'none',
            cursor: isInteractive ? 'pointer' : 'default',
          }}
        />
      </div>
      <span
        style={{
          position: 'absolute',
          right: isVertical ? '2pt' : '8pt',
          top: isVertical ? '4pt' : '50%',
          transform: isVertical ? 'none' : 'translateY(-50%)',
          fontSize: `${Math.max(11, (comp.Size || 14) - 2)}pt`,
          fontVariantNumeric: 'tabular-nums',
          color: toRgba(palette, 0.82),
        }}
      >
        {value}
      </span>
    </div>
  )
}

ModernSliderRenderer.propTypes = {
  comp: PropTypes.shape({
    id: PropTypes.string.isRequired,
    X: PropTypes.number.isRequired,
    Y: PropTypes.number.isRequired,
    Width: PropTypes.number.isRequired,
    Height: PropTypes.number.isRequired,
    AccessibleLabel: PropTypes.string,
    BasePaletteColor: PropTypes.string,
    DisplayMode: PropTypes.string,
    Layout: PropTypes.string,
    Max: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    Min: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    OnChange: PropTypes.string,
    Size: PropTypes.number,
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
  canvasTheme: PropTypes.object,
  renderZIndex: PropTypes.number,
  onMouseDown: PropTypes.func.isRequired,
  onClick: PropTypes.func.isRequired,
}
