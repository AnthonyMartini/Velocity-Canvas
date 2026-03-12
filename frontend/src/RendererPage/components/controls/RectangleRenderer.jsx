import PropTypes from 'prop-types'
import { evaluateValue, executeAction } from '../../../common/helpers.jsx'

export default function RectangleRenderer({ 
  comp, selected, isPlaying, localVars, setLocalVars, notify, navigate, flatNodes, parentNode, onMouseDown, onClick 
}) {
  const handleContainerClick = (e) => {
    if (onClick) onClick(e)
    if (isPlaying && comp.OnSelect) {
      executeAction(comp.OnSelect, localVars, setLocalVars, notify, navigate, flatNodes, parentNode, comp)
    }
  }

  const borderStyleMap = {
    'BorderStyle.Solid': 'solid',
    'BorderStyle.Dashed': 'dashed',
    'BorderStyle.Dotted': 'dotted',
    'BorderStyle.None': 'none'
  }

  const containerStyle = {
    position: 'absolute',
    left: comp.X,
    top: comp.Y,
    width: comp.Width,
    height: comp.Height,
    backgroundColor: comp.Fill,
    border: comp.BorderStyle && comp.BorderStyle !== 'BorderStyle.None'
      ? `${comp.BorderThickness || 0}px ${borderStyleMap[comp.BorderStyle] || 'solid'} ${comp.BorderColor || 'transparent'}`
      : 'none',
    opacity: comp.Visible === false ? 0 : (comp.DisplayMode === 'DisplayMode.Disabled' ? 0.5 : 1),
    cursor: isPlaying ? (comp.DisplayMode === 'DisplayMode.Disabled' ? 'default' : 'pointer') : 'move',
    userSelect: 'none',
    boxShadow: selected ? '0 0 0 2px #0078d4 inset' : 'none',
    boxSizing: 'border-box'
  }

  return (
    <div style={containerStyle} onMouseDown={onMouseDown} onClick={handleContainerClick} />
  )
}

RectangleRenderer.propTypes = {
  comp: PropTypes.shape({
    X: PropTypes.number.isRequired,
    Y: PropTypes.number.isRequired,
    Width: PropTypes.number.isRequired,
    Height: PropTypes.number.isRequired,
    Fill: PropTypes.string,
    BorderStyle: PropTypes.string,
    BorderThickness: PropTypes.number,
    BorderColor: PropTypes.string,
    Visible: PropTypes.bool,
    DisplayMode: PropTypes.string,
  }).isRequired,
  selected: PropTypes.bool,
  isPlaying: PropTypes.bool,
  localVars: PropTypes.object,
  onMouseDown: PropTypes.func.isRequired,
  onClick: PropTypes.func.isRequired,
}
