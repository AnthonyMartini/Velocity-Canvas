import React, { useRef } from 'react'
import PropTypes from 'prop-types'
import { evaluateValue, executeAction } from '../../../common/helpers.jsx'

export default function HtmlTextRenderer({ 
  comp, 
  selected, 
  isPlaying, 
  localVars, 
  setLocalVars, 
  notify, 
  navigate,
  flatNodes,
  parentNode,
  onMouseDown, 
  onClick 
}) {
  const contentRef = useRef(null)

  // Use evaluateValue to evaluate any formula binding for the html string
  const rawHtml = evaluateValue(comp.HtmlText, localVars, flatNodes, new Set(), parentNode)

  const isInteractive = isPlaying && comp.DisplayMode !== 'DisplayMode.Disabled' && comp.OnSelect

  // Calculate borders based on state
  let currentBorderColor = comp.BorderColor
  if (comp.DisplayMode === 'DisplayMode.Disabled' && comp.DisabledBorderColor) {
    currentBorderColor = comp.DisabledBorderColor
  } else if (comp.HoverBorderColor && comp.HoverBorderColor !== 'transparent') {
    // Basic fallback without full hover state tracking implemented per component
  }

  // Calculate fill based on state
  let currentFill = comp.Fill
  if (comp.DisplayMode === 'DisplayMode.Disabled' && comp.DisabledFill) {
    currentFill = comp.DisabledFill
  }

  const borderMap = { None: 'none', Solid: 'solid', Dashed: 'dashed', Dotted: 'dotted' }
  const fontWeightMap = {
    'FontWeight.Lighter': '300',
    'FontWeight.Normal': '400',
    'FontWeight.Semibold': '600',
    'FontWeight.Bold': '700'
  }

  // Build the styles map for the actual container
  const baseStyle = {
    position: 'absolute',
    left: comp.X,
    top: comp.Y,
    width: comp.Width,
    height: comp.Height,
    backgroundColor: currentFill,
    borderStyle: borderMap[comp.BorderStyle] || 'none',
    borderWidth: comp.BorderThickness ? `${comp.BorderThickness}px` : 0,
    borderColor: currentBorderColor,
    color: comp.Color,
    fontSize: comp.Size ? `${comp.Size}px` : 'inherit',
    fontWeight: fontWeightMap[comp.FontWeight] || 'normal',
    paddingLeft: comp.PaddingLeft || 0,
    paddingRight: comp.PaddingRight || 0,
    paddingTop: comp.PaddingTop || 0,
    paddingBottom: comp.PaddingBottom || 0,
    opacity: comp.Visible !== false ? 1 : 0,
    pointerEvents: comp.Visible !== false ? 'auto' : 'none',
    cursor: isInteractive ? 'pointer' : (isPlaying ? 'default' : 'move'), userSelect: 'none',
    overflow: 'hidden',
    boxSizing: 'border-box',
    fontFamily: comp.Font || 'inherit',
    outline: selected ? '2px solid #0078d4' : 'none',
    outlineOffset: selected ? '2px' : '0',
    boxShadow: selected ? '0 0 0 3px rgba(0,120,212,0.25)' : 'none',
    zIndex: selected ? 10 : 1,
  }


  // Action hook
  const handleClick = (e) => {
    onClick(e)
    
    // PowerApps note: "OnSelect is ignored for hyperlinks within the content"
    const targetTag = e.target.tagName?.toLowerCase()
    if (targetTag === 'a') return

    if (isPlaying && comp.OnSelect && comp.DisplayMode !== 'DisplayMode.Disabled') {
      executeAction(comp.OnSelect, localVars, setLocalVars, notify, navigate, flatNodes, parentNode, comp)
    }
  }

  return (
    <div
      id={comp.id}
      style={baseStyle}
      onMouseDown={onMouseDown}
      onClick={handleClick}
    >
      <div
        ref={contentRef}
        style={{
          width: '100%',
          height: '100%',
          wordWrap: 'break-word',
        }}
        dangerouslySetInnerHTML={{ __html: rawHtml }}
      />
    </div>
  )
}

HtmlTextRenderer.propTypes = {
  comp: PropTypes.shape({
    X: PropTypes.number.isRequired,
    Y: PropTypes.number.isRequired,
    Width: PropTypes.number.isRequired,
    Height: PropTypes.number.isRequired,
    Fill: PropTypes.string,
    Color: PropTypes.string,
    DisplayMode: PropTypes.string,
    BorderStyle: PropTypes.string,
    BorderThickness: PropTypes.number,
    BorderColor: PropTypes.string,
    HtmlText: PropTypes.string,
    Visible: PropTypes.bool,
    PaddingLeft: PropTypes.number,
    PaddingRight: PropTypes.number,
    PaddingTop: PropTypes.number,
    PaddingBottom: PropTypes.number,
    Font: PropTypes.string,
    FontWeight: PropTypes.string,
    Size: PropTypes.number,
    OnSelect: PropTypes.string,
  }).isRequired,
  selected: PropTypes.bool,
  isPlaying: PropTypes.bool,
  localVars: PropTypes.object,
  setLocalVars: PropTypes.func,
  notify: PropTypes.func,
  onMouseDown: PropTypes.func.isRequired,
  onClick: PropTypes.func.isRequired,
}
