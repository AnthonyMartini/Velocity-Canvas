import React, { useRef } from 'react'
import PropTypes from 'prop-types'
import { evaluateValue, executeAction } from '../../common/helpers.jsx'

export default function HtmlTextRenderer({ 
  comp, 
  selected, 
  isPlaying, 
  localVars, 
  setLocalVars, 
  notify, 
  onMouseDown, 
  onClick 
}) {
  const contentRef = useRef(null)

  // Use evaluateValue to evaluate any formula binding for the html string
  const rawHtml = evaluateValue(comp.HtmlText, localVars)

  const isInteractive = isPlaying && !comp.disabled && comp.OnSelect

  // Calculate borders based on state
  let currentBorderColor = comp.borderColor
  if (comp.disabled && comp.disabledBorderColor) {
    currentBorderColor = comp.disabledBorderColor
  } else if (comp.hoverBorderColor && comp.hoverBorderColor !== 'transparent') {
    // Basic fallback without full hover state tracking implemented per component
    // If exact hover states are needed later, we could track it locally.
  }

  // Calculate fill based on state
  let currentFill = comp.fill
  if (comp.disabled && comp.disabledFill) {
    currentFill = comp.disabledFill
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
    left: comp.x,
    top: comp.y,
    width: comp.width,
    height: comp.height,
    backgroundColor: currentFill,
    borderStyle: borderMap[comp.borderStyle] || 'none',
    borderWidth: comp.borderThickness ? `${comp.borderThickness}px` : 0,
    borderColor: currentBorderColor,
    color: comp.color,
    fontSize: comp.fontSize ? `${comp.fontSize}px` : 'inherit',
    fontWeight: fontWeightMap[comp.fontWeight] || 'normal',
    paddingLeft: comp.paddingLeft || 0,
    paddingRight: comp.paddingRight || 0,
    paddingTop: comp.paddingTop || 0,
    paddingBottom: comp.paddingBottom || 0,
    opacity: comp.visible !== false ? 1 : 0,
    pointerEvents: comp.visible !== false ? 'auto' : 'none',
    cursor: isInteractive ? 'pointer' : 'default',
    overflow: 'hidden', // AutoHeight logic dictates clipping anything beyond bounds
    boxSizing: 'border-box',
    fontFamily: comp.font || 'inherit',
    outline: selected ? '2px solid #0078d4' : 'none',
    outlineOffset: selected ? '2px' : '0',
    boxShadow: selected ? '0 0 0 3px rgba(0,120,212,0.25)' : 'none',
    zIndex: selected ? 10 : 1,
  }

  // Apply AutoHeight Logic
  if (comp.AutoHeight) {
    baseStyle.height = 'auto'
    baseStyle.maxHeight = '7680px'
  }

  // Action hook
  const handleClick = (e) => {
    onClick(e)
    
    // PowerApps note: "OnSelect is ignored for hyperlinks within the content"
    const targetTag = e.target.tagName?.toLowerCase()
    if (targetTag === 'a') return

    if (isPlaying && comp.OnSelect && !comp.disabled) {
      executeAction(comp.OnSelect, localVars, setLocalVars, notify)
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
  comp: PropTypes.object.isRequired,
  selected: PropTypes.bool,
  isPlaying: PropTypes.bool,
  localVars: PropTypes.object,
  setLocalVars: PropTypes.func,
  notify: PropTypes.func,
  onMouseDown: PropTypes.func.isRequired,
  onClick: PropTypes.func.isRequired,
}
