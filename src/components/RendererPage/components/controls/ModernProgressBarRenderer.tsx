import PropTypes from 'prop-types'
import { executeAction } from '../../../../common/helpers'
import { getSelectionStyles } from '@/theme/theme'
import { clamp, normalizeLiteralString, resolveModernPalette } from './modernControlUtils'

function resolveProgressColor(progressColor: string, palette: string) {
  const normalized = normalizeLiteralString(progressColor, 'brand').toLowerCase()
  if (normalized.includes('error')) return '#d13438'
  if (normalized.includes('warning')) return '#f59e0b'
  if (normalized.includes('success')) return '#2d8a34'
  return palette
}

export default function ModernProgressBarRenderer({
  comp,
  selected,
  isPlaying,
  localVars,
  setLocalVars,
  notify,
  navigate,
  flatNodes,
  parentNode,
  canvasTheme,
  onMouseDown,
  onClick,
  renderZIndex = 1,
}) {
  const isDisabledMode = comp.DisplayMode === 'DisplayMode.Disabled'
  const { palette, lighter30 } = resolveModernPalette(comp, canvasTheme)
  const rawMax = Number(comp.Max ?? 100)
  const max = Number.isFinite(rawMax) ? Math.max(1, rawMax) : 100
  const rawValue = Number(comp.Value ?? 0)
  const value = clamp(Number.isFinite(rawValue) ? rawValue : 0, 0, max)
  const percent = (value / max) * 100
  const shape = normalizeLiteralString(comp.Shape, 'rounded').toLowerCase()
  const thickness = normalizeLiteralString(comp.Thickness, 'medium').toLowerCase()
  const progressColor = resolveProgressColor(comp.ProgressColor, palette)
  const trackRadius = shape.includes('square') ? '6pt' : '999px'
  const barHeight = thickness.includes('large') ? '10pt' : '6pt'

  const handleClick = (event: any) => {
    onClick(event)
    if (isPlaying && comp.OnChange) {
      executeAction(comp.OnChange, localVars, setLocalVars, notify, navigate, flatNodes, parentNode, comp)
    }
  }

  return (
    <div
      onMouseDown={onMouseDown}
      onClick={handleClick}
      style={{
        position: 'absolute',
        left: `${comp.X}pt`,
        top: `${comp.Y}pt`,
        width: `${comp.Width}pt`,
        height: `${comp.Height}pt`,
        display: 'flex',
        alignItems: 'center',
        cursor: isPlaying ? 'default' : 'move',
        opacity: comp.Visible === false ? 0.3 : (isDisabledMode ? 0.56 : 1),
        userSelect: 'none',
        ...getSelectionStyles(selected, 'default'),
        zIndex: renderZIndex,
      }}
      aria-label={normalizeLiteralString(comp.AccessibleLabel) || 'Progress bar'}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: barHeight,
          borderRadius: trackRadius,
          backgroundColor: lighter30,
          overflow: 'hidden',
        }}
      >
        {comp.Indeterminate ? (
          <div
            className="vc-progress-indeterminate"
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: '-35%',
              width: '35%',
              borderRadius: trackRadius,
              backgroundColor: palette,
            }}
          />
        ) : (
          <div
            style={{
              width: `${percent}%`,
              height: '100%',
              borderRadius: trackRadius,
              backgroundColor: progressColor,
              transition: 'width 0.16s ease',
            }}
          />
        )}
      </div>
    </div>
  )
}

ModernProgressBarRenderer.propTypes = {
  comp: PropTypes.shape({
    X: PropTypes.number.isRequired,
    Y: PropTypes.number.isRequired,
    Width: PropTypes.number.isRequired,
    Height: PropTypes.number.isRequired,
    AccessibleLabel: PropTypes.string,
    BasePaletteColor: PropTypes.string,
    DisplayMode: PropTypes.string,
    Indeterminate: PropTypes.bool,
    Max: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    OnChange: PropTypes.string,
    ProgressColor: PropTypes.string,
    Shape: PropTypes.string,
    Thickness: PropTypes.string,
    Value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    Visible: PropTypes.bool,
  }).isRequired,
  selected: PropTypes.bool,
  isPlaying: PropTypes.bool,
  localVars: PropTypes.object,
  setLocalVars: PropTypes.func,
  notify: PropTypes.func,
  navigate: PropTypes.func,
  flatNodes: PropTypes.array,
  parentNode: PropTypes.object,
  canvasTheme: PropTypes.object,
  renderZIndex: PropTypes.number,
  onMouseDown: PropTypes.func.isRequired,
  onClick: PropTypes.func.isRequired,
}
