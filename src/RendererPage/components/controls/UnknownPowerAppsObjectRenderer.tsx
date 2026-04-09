import PropTypes from 'prop-types'
import { getInsetSelectionStyles } from '@/theme/theme'

function getLabelFontSize(name: string, width: number) {
  const safeWidth = Math.max(Number(width) || 0, 80)
  const length = Math.max(name.length, 10)
  return Math.max(12, Math.min(22, Math.floor((safeWidth * 0.92) / length)))
}

export default function UnknownPowerAppsObjectRenderer({
  comp,
  selected,
  isPlaying,
  onMouseDown,
  onClick,
  renderZIndex = 1,
}) {
  const displayName = `[${comp.sourceControl || 'Unknown'}]`
  const fontSize = getLabelFontSize(displayName, comp.Width)

  return (
    <div
      style={{
        position: 'absolute',
        left: `${comp.X}pt`,
        top: `${comp.Y}pt`,
        width: `${comp.Width}pt`,
        height: `${comp.Height}pt`,
        background:
          'repeating-linear-gradient(-45deg, rgba(250, 204, 21, 0.08), rgba(250, 204, 21, 0.08) 10px, rgba(250, 204, 21, 0.18) 10px, rgba(250, 204, 21, 0.18) 20px)',
        border: '2pt dotted rgba(250, 204, 21, 0.98)',
        color: '#111111',
        overflow: 'hidden',
        opacity: comp.Visible === false ? 0.4 : 1,
        cursor: isPlaying ? 'default' : 'move',
        userSelect: 'none',
        boxSizing: 'border-box',
        ...getInsetSelectionStyles(selected),
        zIndex: renderZIndex,
      }}
      onMouseDown={onMouseDown}
      onClick={onClick}
      title={`${comp.name || 'Unknown'} (${comp.sourceControl || 'unrecognized'})`}
      >
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: '90%',
            maxWidth: '90%',
            textAlign: 'center',
            transform: 'translate(-50%, -50%)',
            fontSize: `${fontSize}px`,
            lineHeight: 1.1,
            fontWeight: 800,
            letterSpacing: '0.02em',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            color: 'rgba(0, 0, 0, 0.92)',
            padding: '0 6px',
            boxSizing: 'border-box',
          }}
        >
          {displayName}
      </div>
    </div>
  )
}

UnknownPowerAppsObjectRenderer.propTypes = {
  comp: PropTypes.shape({
    X: PropTypes.number.isRequired,
    Y: PropTypes.number.isRequired,
    Width: PropTypes.number.isRequired,
    Height: PropTypes.number.isRequired,
    Visible: PropTypes.bool,
    name: PropTypes.string,
    sourceControl: PropTypes.string,
  }).isRequired,
  selected: PropTypes.bool,
  isPlaying: PropTypes.bool,
  onMouseDown: PropTypes.func.isRequired,
  onClick: PropTypes.func.isRequired,
  renderZIndex: PropTypes.number,
}
