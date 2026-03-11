import { evaluateValue } from '../../common/helpers.jsx'

export default function RectangleRenderer({ comp, selected, isPlaying, localVars, onMouseDown, onClick }) {
  const handleContainerClick = (e) => {
    if (onClick) onClick(e)
  }

  const borderStyleMap = {
    'BorderStyle.Solid': 'solid',
    'BorderStyle.Dashed': 'dashed',
    'BorderStyle.Dotted': 'dotted',
    'BorderStyle.None': 'none'
  }

  const containerStyle = {
    position: 'absolute',
    left: comp.x,
    top: comp.y,
    width: comp.width,
    height: comp.height,
    backgroundColor: comp.fill,
    border: comp.borderStyle && comp.borderStyle !== 'BorderStyle.None'
      ? `${comp.borderThickness || 0}px ${borderStyleMap[comp.borderStyle] || 'solid'} ${comp.borderColor || 'transparent'}`
      : 'none',
    opacity: comp.visible === false ? 0 : (comp.disabled ? 0.5 : 1),
    cursor: isPlaying && !comp.disabled ? 'pointer' : 'default',
    pointerEvents: (comp.disabled && isPlaying) ? 'none' : 'auto',
    boxShadow: selected ? '0 0 0 2px #0078d4 inset' : 'none',
    boxSizing: 'border-box'
  }

  return (
    <div style={containerStyle} onMouseDown={onMouseDown} onClick={handleContainerClick} />
  )
}
