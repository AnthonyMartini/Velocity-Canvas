import { useState, useRef, useCallback, useEffect } from 'react'
import buttonSchema from '@schemas/button.json'
import labelSchema from '@schemas/label.json'
import containerSchema from '@schemas/container.json'
import textInputSchema from '@schemas/textInput.json'
import dropdownSchema from '@schemas/dropdown.json'

// ── Unique ID ─────────────────────────────────────────────────────────────────
let _id = 0
const uid = () => `comp_${++_id}`

// ── Schema lookup ─────────────────────────────────────────────────────────────
const SCHEMAS = { Button: buttonSchema, Label: labelSchema, Container: containerSchema, TextInput: textInputSchema, Dropdown: dropdownSchema }

// ── Name counter per type ────────────────────────────────────────────────────
const _typeCounts = {}
function nextName(type) {
  _typeCounts[type] = (_typeCounts[type] || 0) + 1
  return `${type}${_typeCounts[type]}`
}

// ── Create a fresh component from schema ─────────────────────────────────────
function createComponent(schema, overrides = {}) {
  const base = JSON.parse(JSON.stringify(schema.defaults))
  return { id: uid(), type: schema.type, name: nextName(schema.type), ...base, ...overrides }
}

// ── Create from LLM spec (merge with defaults) ────────────────────────────────
function createFromSpec(spec) {
  const schema = SCHEMAS[spec.type]
  if (!schema) return null
  const base = JSON.parse(JSON.stringify(schema.defaults))
  const { type, children, ...rest } = spec
  const processedChildren = (children || []).map(c => createFromSpec(c)).filter(Boolean)
  return { ...base, ...rest, id: uid(), type: schema.type, name: spec.name || nextName(schema.type), children: processedChildren }
}

// ──────────────────────────────────────────────────────────────────────────────
// YAML Generation
// ──────────────────────────────────────────────────────────────────────────────

/** Convert a hex color string to PA RGBA notation */
function toRgba(hex) {
  if (!hex || hex === 'transparent') return 'RGBA(0, 0, 0, 0)'
  if (hex.startsWith('rgba') || hex.startsWith('RGBA')) return hex
  const clean = hex.replace('#', '')
  if (clean.length === 3) {
    const [r, g, b] = clean.split('').map(c => parseInt(c + c, 16))
    return `RGBA(${r}, ${g}, ${b}, 1)`
  }
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  return `RGBA(${r}, ${g}, ${b}, 1)`
}

// PA enum → CSS value maps (for live canvas rendering)
const CSS_FW  = { 'FontWeight.Lighter': '300', 'FontWeight.Normal': '400', 'FontWeight.Semibold': '600', 'FontWeight.Bold': '700' }
const CSS_ALIGN = { 'Align.Left': 'left', 'Align.Center': 'center', 'Align.Right': 'right', 'Align.Justify': 'justify' }
const CSS_JUSTIFY = { 'Align.Left': 'flex-start', 'Align.Center': 'center', 'Align.Right': 'flex-end', 'Align.Justify': 'space-between' }
const CSS_VALIGN = { 'VerticalAlign.Top': 'flex-start', 'VerticalAlign.Middle': 'center', 'VerticalAlign.Bottom': 'flex-end' }

const BORDER_MAP = { None: 'BorderStyle.None', Solid: 'BorderStyle.Solid', Dashed: 'BorderStyle.Dashed', Dotted: 'BorderStyle.Dotted' }

function ind(n) { return '  '.repeat(n) }

/** Recursively convert a component tree node to PA YAML string.
 *  col = the column where the leading `- Name:` dash sits (0 for root). */
function componentToYaml(node, col = 0) {
  const sp = (n) => ' '.repeat(n)   // exact column indent
  const safeName = (s) => (s || '').replace(/[^a-zA-Z0-9]/g, '').replace(/^\d+/, '') || 'Ctrl'

  // Use explicit name if set, otherwise derive from text
  const name = node.name
    ? node.name
    : node.type === 'Container'
      ? 'Container'
      : node.type === 'Button'
        ? (safeName(node.text) || 'Button') + 'Button'
        : node.type === 'TextInput'
          ? (safeName(node.hint) || 'TextInput') + 'Input'
          : node.type === 'Dropdown'
            ? (safeName(node.defaultValue) || 'Dropdown') + 'Dropdown'
            : (safeName(node.text) || 'Label')  + 'Label'

  const controlMap = {
    Button:    'Classic/Button@2.2.0',
    Label:     'Label@2.5.1',
    Container: 'GroupContainer@1.4.0',
    TextInput: 'Classic/TextInput@2.3.2',
    Dropdown: 'Classic/DropDown@2.3.1',
  }

  const lines = []

  // Header  ── col 0: "- Name:"
  //           ── col+4: Control / Variant / Properties / Children
  //           ── col+6: property values
  lines.push(`${sp(col)}- ${name}:`)
  lines.push(`${sp(col + 4)}Control: ${controlMap[node.type]}`)
  if (node.type === 'Container') {
    lines.push(`${sp(col + 4)}Variant: ManualLayout`)
  }
  lines.push(`${sp(col + 4)}Properties:`)

  const p = (k, v) => lines.push(`${sp(col + 6)}${k}: =${v}`)

  if (node.type === 'Button') {
    p('Text', `"${node.text || 'Button'}"`)
    p('X', node.x)
    p('Y', node.y)
    p('Width', node.width)
    p('Height', node.height)
    p('Fill', toRgba(node.fill))
    p('Color', toRgba(node.color))
    p('Size', node.fontSize)
    p('FontWeight', node.fontWeight)
    p('RadiusTopLeft', node.borderRadius)
    p('RadiusTopRight', node.borderRadius)
    p('RadiusBottomLeft', node.borderRadius)
    p('RadiusBottomRight', node.borderRadius)
    p('BorderColor', toRgba(node.borderColor))
    p('BorderThickness', node.borderThickness)
    if (node.italic)   p('Italic', 'true')
    if (node.underline) p('Underline', 'true')
    if (!node.visible) p('Visible', 'false')
    if (node.disabled) p('DisplayMode', 'DisplayMode.Disabled')
  } else if (node.type === 'Label') {
    p('Text', `"${node.text || 'Label'}"`)
    p('X', node.x)
    p('Y', node.y)
    p('Width', node.width)
    p('Height', node.height)
    p('Color', toRgba(node.color))
    if (node.fill && node.fill !== 'transparent') p('Fill', toRgba(node.fill))
    p('Size', node.fontSize)
    p('FontWeight', node.fontWeight)
    p('Align', node.align)
    p('VerticalAlign', node.verticalAlign)
    if (node.italic)    p('Italic', 'true')
    if (node.underline) p('Underline', 'true')
    if (!node.visible)  p('Visible', 'false')
    if (node.paddingLeft)   p('PaddingLeft', node.paddingLeft)
    if (node.paddingRight)  p('PaddingRight', node.paddingRight)
    if (node.paddingTop)    p('PaddingTop', node.paddingTop)
    if (node.paddingBottom) p('PaddingBottom', node.paddingBottom)
  } else if (node.type === 'Container') {
    p('X', node.x)
    p('Y', node.y)
    p('Width', node.width)
    p('Height', node.height)
    if (node.fill && node.fill !== 'rgba(0,0,0,0)') p('Fill', toRgba(node.fill))
    if (node.borderStyle && node.borderStyle !== 'None') {
      p('BorderStyle', BORDER_MAP[node.borderStyle])
      p('BorderColor', toRgba(node.borderColor))
      p('BorderThickness', node.borderThickness)
    }
    if (!node.visible) p('Visible', 'false')
  } else if (node.type === 'TextInput') {
    p('X', node.x)
    p('Y', node.y)
    p('Width', node.width)
    p('Height', node.height)
    if (node.value) p('Default', `"${node.value}"`)
    if (node.hint)  p('HintText', `"${node.hint}"`)
    p('Fill', toRgba(node.fill))
    p('Color', toRgba(node.color))
    p('Size', node.fontSize)
    p('FontWeight', node.fontWeight)
    p('BorderColor', toRgba(node.borderColor))
    p('BorderThickness', node.borderThickness)
    if (!node.visible) p('Visible', 'false')
    if (node.disabled) p('DisplayMode', 'DisplayMode.Disabled')
  } else if (node.type === 'Dropdown') {
    p('X', node.x)
    p('Y', node.y)
    p('Width', node.width)
    p('Height', node.height)
    if (node.defaultValue) p('Default', `"${node.defaultValue}"`)
    if (node.items) p('Items', node.items)
    p('Fill', toRgba(node.fill))
    p('Color', toRgba(node.color))
    p('Size', node.fontSize)
    p('FontWeight', node.fontWeight)
    p('BorderColor', toRgba(node.borderColor))
    p('BorderThickness', node.borderThickness)
    if (!node.visible) p('Visible', 'false')
    if (node.disabled) p('DisplayMode', 'DisplayMode.Disabled')
  }

  // Children: dash at col+6, so child's "- Name:" starts at col+6
  if (node.type === 'Container' && node.children?.length) {
    lines.push(`${sp(col + 4)}Children:`)
    for (const child of node.children) {
      lines.push(componentToYaml(child, col + 6))
    }
  }

  return lines.join('\n')
}

// ── Screen-level YAML renderer ───────────────────────────────────────────────
function screenToYaml(tree, canvasW, canvasH) {
  if (!tree?.length) return '# Empty canvas — add components to get started'
  return tree.map(node => componentToYaml(node, 0)).join('\n')
}

// ── Code Pane ─────────────────────────────────────────────────────────────────
function CodePane({ node, tree, canvasW, canvasH, isTweaking, setIsTweaking, tweakInput, setTweakInput, handleTweakSubmit, tweakLoading, tweakOriginalNode }) {
  const [copied, setCopied] = useState(false)
  const yaml = node ? componentToYaml(node) : screenToYaml(tree, canvasW, canvasH)
  const isScreenMode = !node

  const handleCopy = () => {
    navigator.clipboard.writeText(yaml).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    })
  }

  // Basic token coloring
  const highlighted = yaml
    .split('\n')
    .map((line, i) => {
      let className = 'text-text/80'
      const trimmed = line.trimStart()
      if (trimmed.startsWith('-') && trimmed.endsWith(':')) className = 'text-violet-300 font-semibold'
      else if (/^Control:/.test(trimmed)) className = 'text-blue-300'
      else if (/^Properties:|^Children:/.test(trimmed)) className = 'text-accent/70 font-semibold'
      else if (/^[A-Z][A-Za-z]+:/.test(trimmed)) {
        const [, val] = line.split(/:\s*=?/)
        return (
          <div key={i} className="leading-5">
            <span className="text-blue-200/80">{line.split(':')[0]}</span>
            <span className="text-subtext/50">: </span>
            <span className="text-green-300/80">={val?.trim()}</span>
          </div>
        )
      }
      return <div key={i} className={`leading-5 ${className}`}>{line}</div>
    })

  return (
    <div className="w-72 shrink-0 border-l border-overlay/30 bg-[#1a1b2e] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-overlay/20 bg-surface/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-violet-400" />
          <span className="text-xs font-semibold text-text">PA YAML</span>
          {node
            ? <span className="text-[10px] text-subtext/50 bg-overlay/30 px-1.5 py-0.5 rounded-full">{node.type}</span>
            : <span className="text-[10px] text-violet-300/80 bg-violet-500/10 border border-violet-500/20 px-1.5 py-0.5 rounded-full">Screen</span>
          }
          {node && (
            <button 
              onClick={() => setIsTweaking(!isTweaking)}
              className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors border ml-1 ${
                isTweaking || tweakOriginalNode ? 'bg-violet-500/20 text-violet-300 border-violet-500/40' : 'bg-surface/50 text-subtext/70 border-overlay/40 hover:text-accent hover:border-accent/40'
              }`}
            >
              ✨ Tweak
            </button>
          )}
        </div>
        <button
          onClick={handleCopy}
          className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border transition-all duration-200 cursor-pointer
            ${copied
              ? 'bg-green/15 border-green/30 text-green'
              : 'bg-base/60 border-overlay/40 text-subtext hover:border-accent/50 hover:text-accent'
            }`}
        >
          {copied ? (
            <>
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 0 1 .208 1.04l-9 13.5a.75.75 0 0 1-1.154.114l-6-6a.75.75 0 0 1 1.06-1.06l5.353 5.353 8.493-12.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7.5 3.375c0-1.036.84-1.875 1.875-1.875h.375a3.75 3.75 0 0 1 3.75 3.75v1.875C13.5 8.161 14.34 9 15.375 9h1.875A3.75 3.75 0 0 1 21 12.75v3.375C21 17.16 20.16 18 19.125 18h-9.75A1.875 1.875 0 0 1 7.5 16.125V3.375Z" />
                <path d="M15 5.25a5.23 5.23 0 0 0-1.279-3.434 9.768 9.768 0 0 1 6.963 6.963A5.23 5.23 0 0 0 17.25 7.5h-1.875A.375.375 0 0 1 15 7.125V5.25ZM4.875 6H6v10.125A3.375 3.375 0 0 0 9.375 19.5H16.5v1.125c0 1.035-.84 1.875-1.875 1.875h-9.75A1.875 1.875 0 0 1 3 20.625V7.875C3 6.839 3.84 6 4.875 6Z" />
              </svg>
              Copy
            </>
          )}
        </button>
      </div>

      {/* AI Tweak Input Box */}
      {isTweaking && node && (
        <div className="flex flex-col gap-2 p-2.5 mx-3 mt-3 bg-violet-500/10 border border-violet-500/20 rounded-lg animate-in fade-in zoom-in-95 duration-200 shrink-0">
          <p className="text-[10px] text-violet-300/80 font-medium">What should AI change about this component?</p>
          <div className="flex gap-1.5">
            <input 
              type="text" 
              value={tweakInput}
              onChange={e => setTweakInput(e.target.value)}
              onKeyDown={e => {
                e.stopPropagation() // prevent delete/copy hotkeys while typing
                if (e.key === 'Enter') handleTweakSubmit()
              }}
              autoFocus
              placeholder="e.g. make text red and bold"
              className="flex-1 min-w-0 bg-base border border-violet-500/30 rounded px-2 py-1 text-xs text-text placeholder:text-subtext/40 focus:outline-none focus:border-violet-500"
            />
            <button 
              onClick={handleTweakSubmit}
              disabled={tweakLoading || !tweakInput.trim()}
              className="w-6 h-6 rounded bg-violet-500 text-white flex items-center justify-center shrink-0 disabled:opacity-50"
            >
              {tweakLoading ? (
                <div className="w-2.5 h-2.5 rounded-full border border-white border-t-transparent animate-spin" />
              ) : (
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M3.478 2.405a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.405Z" /></svg>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Code area */}
      <div className="flex-1 overflow-auto p-4 font-mono text-[11px] whitespace-pre">
        {highlighted}
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// Tree helpers
// ──────────────────────────────────────────────────────────────────────────────

/** Find a node anywhere in the tree by id */
function findNode(nodes, id) {
  for (const n of nodes) {
    if (n.id === id) return n
    if (n.children?.length) {
      const found = findNode(n.children, id)
      if (found) return found
    }
  }
  return null
}

/** Update a node in the tree, returning a new tree */
function updateNode(nodes, id, updater) {
  return nodes.map(n => {
    if (n.id === id) return { ...n, ...updater(n) }
    if (n.children?.length) return { ...n, children: updateNode(n.children, id, updater) }
    return n
  })
}

/** Remove a node from the tree, return [newTree, removedNode] */
function removeNode(nodes, id) {
  let removed = null
  const next = []
  for (const n of nodes) {
    if (n.id === id) { removed = n; continue }
    if (n.children?.length) {
      const [newChildren, r] = removeNode(n.children, id)
      if (r) removed = r
      next.push({ ...n, children: newChildren })
    } else {
      next.push(n)
    }
  }
  return [next, removed]
}

/** Insert a node as a child of parentId (or at root if parentId is null) */
function insertNode(nodes, node, parentId) {
  if (!parentId) return [...nodes, node]
  return nodes.map(n => {
    if (n.id === parentId) return { ...n, children: [...(n.children || []), node] }
    if (n.children?.length) return { ...n, children: insertNode(n.children, node, parentId) }
    return n
  })
}

/** Flatten tree to a list (for layers panel) with depth info */
function flattenTree(nodes, collapsedIds = new Set(), depth = 0) {
  const result = []
  for (const n of nodes) {
    result.push({ ...n, _depth: depth })
    if (n.children?.length && !collapsedIds.has(n.id)) {
      result.push(...flattenTree(n.children, collapsedIds, depth + 1))
    }
  }
  return result
}

/** Find the direct parent container of a node, or null if at root */
function findParent(nodes, id, parent = null) {
  for (const n of nodes) {
    if (n.id === id) return parent
    if (n.children?.length) {
      const found = findParent(n.children, id, n)
      if (found !== undefined) return found
    }
  }
  return undefined // not found in this branch
}

/** Check if targetId is inside ancestorId's tree */
function isDescendant(nodes, targetId, ancestorId) {
  const ancestor = findNode(nodes, ancestorId)
  if (!ancestor) return false
  const check = (node) => {
    if (node.id === targetId) return true
    if (node.children) return node.children.some(check)
    return false
  }
  return check(ancestor)
}

/** Performs the logical tree update for dropping a node into a new container */
function handleDropLogic(prevTree, dragId, targetContainerId) {
  if (dragId === targetContainerId) return prevTree
  // Block dragging a container into itself or its own children
  if (targetContainerId !== 'root' && isDescendant(prevTree, targetContainerId, dragId)) {
    return prevTree
  }
  // Check if it's already in this container natively
  const currentParentId = findParent(prevTree, dragId)?.id || 'root'
  if (currentParentId === targetContainerId) return prevTree

  const [without, removed] = removeNode(prevTree, dragId)
  if (!removed) return prevTree
  
  if (targetContainerId === 'root') {
    const placed = { ...removed, x: Math.max(0, removed.x), y: Math.max(0, removed.y) }
    return insertNode(without, placed, null)
  } else {
    // Place slightly offset inside the new container
    const placed = { ...removed, x: 10, y: 10 }
    return insertNode(without, placed, targetContainerId)
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Sub-renderers
// ──────────────────────────────────────────────────────────────────────────────

function ButtonRenderer({ comp, selected, onMouseDown, onClick }) {
  const style = {
    position: 'absolute',
    left: comp.x, top: comp.y, width: comp.width, height: comp.height,
    backgroundColor: comp.fill,
    color: comp.color,
    fontSize: comp.fontSize,
    fontWeight: CSS_FW[comp.fontWeight] || comp.fontWeight,
    fontStyle: comp.italic ? 'italic' : 'normal',
    textDecoration: comp.underline ? 'underline' : 'none',
    borderRadius: comp.borderRadius,
    border: `${comp.borderThickness}px solid ${comp.borderColor}`,
    opacity: comp.visible ? 1 : 0.3,
    cursor: 'move', userSelect: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxSizing: 'border-box',
    outline: selected ? '2px solid #0078d4' : 'none',
    outlineOffset: selected ? '2px' : '0',
    boxShadow: selected ? '0 0 0 3px rgba(0,120,212,0.25)' : '0 1px 3px rgba(0,0,0,0.15)',
    transition: 'box-shadow 0.1s, outline 0.1s',
    zIndex: selected ? 10 : 1,
  }
  return (
    <button style={style} onMouseDown={onMouseDown} onClick={onClick} disabled={comp.disabled}>
      {comp.text}
    </button>
  )
}

function LabelRenderer({ comp, selected, onMouseDown, onClick }) {
  const style = {
    position: 'absolute',
    left: comp.x, top: comp.y, width: comp.width, height: comp.height,
    backgroundColor: comp.fill === 'transparent' ? 'transparent' : comp.fill,
    color: comp.color,
    fontSize: comp.fontSize,
    fontWeight: CSS_FW[comp.fontWeight] || comp.fontWeight,
    fontStyle: comp.italic ? 'italic' : 'normal',
    textDecoration: comp.underline ? 'underline' : 'none',
    textAlign: CSS_ALIGN[comp.align] || comp.align,
    opacity: comp.visible ? 1 : 0.3,
    cursor: 'move', userSelect: 'none',
    display: 'flex', 
    alignItems: CSS_VALIGN[comp.verticalAlign] || 'center',
    justifyContent: CSS_JUSTIFY[comp.align] || 'flex-start',
    boxSizing: 'border-box',
    paddingLeft: comp.paddingLeft, paddingRight: comp.paddingRight,
    paddingTop: comp.paddingTop, paddingBottom: comp.paddingBottom,
    outline: selected ? '2px solid #0078d4' : '1px dashed rgba(0,0,0,0.15)',
    outlineOffset: selected ? '2px' : '0',
    boxShadow: selected ? '0 0 0 3px rgba(0,120,212,0.25)' : 'none',
    overflow: 'hidden', zIndex: selected ? 10 : 1,
    lineHeight: comp.lineHeight,
    transition: 'box-shadow 0.1s, outline 0.1s',
  }
  return (
    <div style={style} onMouseDown={onMouseDown} onClick={onClick}>{comp.text}</div>
  )
}

// ── TextInput Renderer ────────────────────────────────────────────────────────
function TextInputRenderer({ comp, selected, onMouseDown, onClick }) {
  const style = {
    position: 'absolute',
    left: comp.x, top: comp.y, width: comp.width, height: comp.height,
    backgroundColor: comp.fill,
    color: comp.color,
    fontSize: comp.fontSize,
    fontWeight: CSS_FW[comp.fontWeight] || comp.fontWeight,
    border: `${comp.borderThickness}px solid ${comp.borderColor}`,
    borderRadius: 2,
    opacity: comp.visible ? 1 : 0.3,
    cursor: 'move', userSelect: 'none',
    display: 'flex', alignItems: 'center',
    paddingLeft: 8, paddingRight: 8,
    boxSizing: 'border-box',
    outline: selected ? '2px solid #0078d4' : 'none',
    outlineOffset: selected ? '2px' : '0',
    boxShadow: selected ? '0 0 0 3px rgba(0,120,212,0.25)' : 'none',
    zIndex: selected ? 10 : 1,
    transition: 'box-shadow 0.1s, outline 0.1s',
  }
  return (
    <div style={style} onMouseDown={onMouseDown} onClick={onClick}>
      {comp.value
        ? <span>{comp.value}</span>
        : <span style={{ color: '#aaa', fontStyle: 'italic' }}>{comp.hint}</span>
      }
    </div>
  )
}

// ── Dropdown Renderer ────────────────────────────────────────────────────────
function DropdownRenderer({ comp, selected, onMouseDown, onClick }) {
  const style = {
    position: 'absolute',
    left: comp.x, top: comp.y, width: comp.width, height: comp.height,
    backgroundColor: comp.fill,
    color: comp.color,
    fontSize: comp.fontSize,
    fontWeight: CSS_FW[comp.fontWeight] || comp.fontWeight,
    border: `${comp.borderThickness}px solid ${comp.borderColor}`,
    borderRadius: 2,
    opacity: comp.visible ? 1 : 0.3,
    cursor: 'move', userSelect: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    paddingLeft: 10, paddingRight: 8,
    boxSizing: 'border-box',
    outline: selected ? '2px solid #0078d4' : 'none',
    outlineOffset: selected ? '2px' : '0',
    boxShadow: selected ? '0 0 0 3px rgba(0,120,212,0.25)' : 'none',
    zIndex: selected ? 10 : 1,
    transition: 'box-shadow 0.1s, outline 0.1s',
  }
  return (
    <div style={style} onMouseDown={onMouseDown} onClick={onClick}>
      <span className="truncate">{comp.defaultValue || (comp.items?.includes('[') ? JSON.parse(comp.items)[0] : 'Dropdown')}</span>
      <svg className="w-4 h-4 text-subtext/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
    </div>
  )
}

// ── Recursive Container Renderer ─────────────────────────────────────────────
function ContainerRenderer({ comp, selected, selectedId, onMouseDown, onClick, onChildMouseDown, onChildClick, onDropInto, dragOverId, setDragOverId }) {
  const borderMap = { None: 'none', Solid: 'solid', Dashed: 'dashed', Dotted: 'dotted' }
  const isDragOver = dragOverId === comp.id

  const style = {
    position: 'absolute',
    left: comp.x, top: comp.y, width: comp.width, height: comp.height,
    backgroundColor: comp.fill === 'rgba(0,0,0,0)' || comp.fill === 'transparent' ? 'rgba(0,0,0,0)' : comp.fill,
    border: comp.borderStyle === 'None'
      ? '1px dashed rgba(0,0,0,0.12)'
      : `${comp.borderThickness}px ${borderMap[comp.borderStyle] || 'solid'} ${comp.borderColor}`,
    opacity: comp.visible ? 1 : 0.3,
    cursor: 'move', userSelect: 'none',
    boxSizing: 'border-box',
    outline: selected ? '2px solid #0078d4' : 'none',
    outlineOffset: selected ? '2px' : '0',
    boxShadow: selected
      ? '0 0 0 3px rgba(0,120,212,0.25)'
      : isDragOver
        ? 'inset 0 0 0 2px #0078d4'
        : 'none',
    transition: 'box-shadow 0.12s',
    zIndex: selected ? 10 : 1,
  }

  return (
    <div
      style={style}
      data-container-id={comp.id}
      onMouseDown={onMouseDown}
      onClick={onClick}
      onDragOver={e => { e.preventDefault(); e.stopPropagation(); setDragOverId(comp.id) }}
      onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOverId(null) }}
      onDrop={e => { e.preventDefault(); e.stopPropagation(); onDropInto(comp.id); setDragOverId(null) }}
    >
      {/* Container label badge */}
      {!comp.children?.length && (
        <div style={{ position: 'absolute', top: 4, left: 6, fontSize: 10, color: 'rgba(0,0,0,0.25)', pointerEvents: 'none', userSelect: 'none' }}>
          Container
        </div>
      )}

      {/* Drag-over highlight overlay */}
      {isDragOver && (
        <div style={{
          position: 'absolute', inset: 0, background: 'rgba(0,120,212,0.06)',
          border: '2px dashed #0078d4', borderRadius: 2, pointerEvents: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 11, color: '#0078d4', fontWeight: 600 }}>Drop here</span>
        </div>
      )}

      {/* Children */}
      {comp.children?.map(child => {
        const isChildSelected = child.id === selectedId
        const childProps = {
          comp: child,
          selected: isChildSelected,
          selectedId,
          onMouseDown: (e) => { e.stopPropagation(); onChildMouseDown(e, child.id) },
          onClick: (e) => { e.stopPropagation(); onChildClick(child.id) },
        }
        if (child.type === 'Button') return <ButtonRenderer key={child.id} {...childProps} />
        if (child.type === 'Label') return <LabelRenderer key={child.id} {...childProps} />
        if (child.type === 'TextInput') return <TextInputRenderer key={child.id} {...childProps} />
        if (child.type === 'Dropdown') return <DropdownRenderer key={child.id} {...childProps} />
        if (child.type === 'Container') return (
          <ContainerRenderer
            key={child.id} {...childProps}
            onChildMouseDown={onChildMouseDown}
            onChildClick={onChildClick}
            onDropInto={onDropInto}
            dragOverId={dragOverId}
            setDragOverId={setDragOverId}
          />
        )
        return null
      })}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// Property Field
// ──────────────────────────────────────────────────────────────────────────────
function PropField({ prop, value, onChange }) {
  if (prop.type === 'boolean') {
    return (
      <div className="flex items-center justify-between py-1.5">
        <label className="text-xs text-subtext">{prop.label}</label>
        <button onClick={() => onChange(!value)}
          className={`relative w-9 h-5 rounded-full transition-colors duration-200 focus:outline-none cursor-pointer ${value ? 'bg-accent' : 'bg-overlay'}`}>
          <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200 ${value ? 'translate-x-4' : 'translate-x-0'}`} />
        </button>
      </div>
    )
  }
  if (prop.type === 'color') {
    // Determine the hex value for the color picker (it requires #RRGGBB)
    // If it's transparent, we default the picker itself to #ffffff, but keep the input value as 'transparent'
    const isTransparent = value === 'transparent' || value === 'rgba(0,0,0,0)'
    let hexValue = '#ffffff'
    if (!isTransparent && value && value.startsWith('#')) {
      hexValue = value.slice(0, 7) // Ensure 6-char hex with #
    }

    return (
      <div className="flex items-center justify-between py-1.5 gap-2">
        <label className="text-xs text-subtext shrink-0">{prop.label}</label>
        <div className="flex items-center gap-1.5">
          <div className="relative w-5 h-5 rounded border border-overlay/50 shrink-0 overflow-hidden"
            style={{ 
              backgroundColor: isTransparent ? 'transparent' : value, 
              backgroundImage: isTransparent ? 'repeating-conic-gradient(#aaa 0% 25%, white 0% 50%) 0 0 / 8px 8px' : 'none' 
            }}
          >
            <input 
              type="color" 
              value={hexValue} 
              onChange={e => onChange(e.target.value)}
              className="absolute -inset-2 w-[200%] h-[200%] opacity-0 cursor-pointer"
              title="Pick a color"
            />
          </div>
          <input type="text" value={value} onChange={e => onChange(e.target.value)}
            className="w-24 bg-base border border-overlay/40 rounded-md px-2 py-1 text-xs text-text focus:outline-none focus:border-accent/60 text-right" 
          />
        </div>
      </div>
    )
  }
  if (prop.type === 'select') {
    return (
      <div className="flex items-center justify-between py-1.5 gap-2">
        <label className="text-xs text-subtext shrink-0">{prop.label}</label>
        <select value={value} onChange={e => onChange(e.target.value)}
          className="bg-base border border-overlay/40 rounded-md px-2 py-1 text-xs text-text focus:outline-none focus:border-accent/60 cursor-pointer">
          {prop.options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
    )
  }
  if (prop.type === 'number') {
    return (
      <div className="flex items-center justify-between py-1.5 gap-2">
        <label className="text-xs text-subtext shrink-0">{prop.label}</label>
        <input type="number" value={value} onChange={e => onChange(Number(e.target.value))}
          className="w-20 bg-base border border-overlay/40 rounded-md px-2 py-1 text-xs text-text focus:outline-none focus:border-accent/60 text-right" />
      </div>
    )
  }
  return (
    <div className="flex items-center justify-between py-1.5 gap-2">
      <label className="text-xs text-subtext shrink-0">{prop.label}</label>
      <input type="text" value={value} onChange={e => onChange(e.target.value)}
        className="flex-1 min-w-0 bg-base border border-overlay/40 rounded-md px-2 py-1 text-xs text-text focus:outline-none focus:border-accent/60" />
    </div>
  )
}

// ── Chat Message ──────────────────────────────────────────────────────────────
function ChatMessage({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] rounded-xl px-3 py-2 text-xs leading-relaxed
        ${isUser ? 'bg-accent/20 text-text border border-accent/20' : 'bg-surface border border-overlay/40 text-text'}`}>
        {msg.image && (
          <div className="mb-2 w-full flex justify-end">
            <img src={msg.image} alt="User upload" className="max-h-32 rounded-lg border border-overlay/30 object-contain bg-base/50 shadow-sm" />
          </div>
        )}
        {msg.content}
        <div className="flex gap-2 mt-1">
          {msg.added > 0 && (
            <span className="text-[10px] text-green/80 font-medium tracking-wide">
              +{msg.added} added
            </span>
          )}
          {msg.mods > 0 && (
            <span className="text-[10px] text-blue-400 font-medium tracking-wide">
              ~{msg.mods} modified
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Layer Row ──────────────────────────────────────────────────────────────────
const TYPE_COLORS = { Button: 'bg-[#0078d4]', Label: 'bg-subtext', Container: 'bg-violet-400', TextInput: 'bg-emerald-500', Dropdown: 'bg-amber-500' }
const TYPE_ICONS = {
  Button: <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor"><path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 0 0-5.25 5.25v3a3 3 0 0 0-3 3v6.75a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3V12.75a3 3 0 0 0-3-3v-3c0-2.9-2.35-5.25-5.25-5.25Zm3.75 8.25v-3a3.75 3.75 0 1 0-7.5 0v3h7.5Z" clipRule="evenodd" /></svg>,
  Label: <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor"><path fillRule="evenodd" d="M14.447 3.026a.75.75 0 0 1 .527.921l-4.5 16.5a.75.75 0 0 1-1.448-.394l4.5-16.5a.75.75 0 0 1 .921-.527Z" clipRule="evenodd" /></svg>,
  Container: <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor"><path d="M2 3a1 1 0 0 1 1-1h18a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3Zm0 9a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-8Zm11-1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-6Z" /></svg>,
  TextInput: <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor"><path fillRule="evenodd" d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0 0 16.5 9h-1.875a1.875 1.875 0 0 1-1.875-1.875V5.25A3.75 3.75 0 0 0 9 1.5H5.625ZM7.5 15a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5A.75.75 0 0 1 7.5 15Zm.75 2.25a.75.75 0 0 0 0 1.5H12a.75.75 0 0 0 0-1.5H8.25Z" clipRule="evenodd" /></svg>,
  Dropdown: <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor"><path fillRule="evenodd" d="M12.53 16.28a.75.75 0 0 1-1.06 0l-7.5-7.5a.75.75 0 0 1 1.06-1.06L12 14.69l6.97-6.97a.75.75 0 1 1 1.06 1.06l-7.5 7.5Z" clipRule="evenodd" /></svg>,
}

function LayerRow({ node, selectedId, onSelect, depth, isCollapsed, toggleCollapse }) {
  const hasChildren = node.type === 'Container' && node.children?.length > 0
  
  return (
    <div 
      className={`flex items-center gap-1.5 w-full text-left text-xs px-2 py-1.5 rounded-lg transition-all duration-100 ${
        selectedId === node.id
          ? 'bg-accent/15 text-accent border border-accent/30'
          : 'text-subtext hover:bg-overlay/30 border border-transparent'
      }`}
      style={{ paddingLeft: `${8 + depth * 14}px` }}
    >
      {/* Collapse/Expand Toggle */}
      <div className="w-4 h-4 flex items-center justify-center shrink-0">
        {hasChildren && (
          <button 
            onClick={(e) => { e.stopPropagation(); toggleCollapse(node.id); }}
            className="w-full h-full flex items-center justify-center rounded hover:bg-overlay/40 text-subtext/40 hover:text-subtext transition-colors"
          >
            <svg 
              className={`w-3 h-3 transition-transform duration-200 ${isCollapsed ? '-rotate-90' : 'rotate-0'}`} 
              viewBox="0 0 24 24" fill="currentColor"
            >
              <path fillRule="evenodd" d="M12.53 16.28a.75.75 0 0 1-1.06 0l-7.5-7.5a.75.75 0 0 1 1.06-1.06L12 14.69l6.97-6.97a.75.75 0 1 1 1.06 1.06l-7.5 7.5Z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>

      <button 
        onClick={() => onSelect(node.id)}
        className="flex-1 flex items-center gap-1.5 truncate cursor-pointer"
      >
        <span className={`w-4 h-4 rounded flex items-center justify-center shrink-0 text-white ${TYPE_COLORS[node.type] || 'bg-overlay'}`}>
          {TYPE_ICONS[node.type]}
        </span>
        <span className="truncate">{node.name || (node.type === 'Container' ? 'Container' : (node.text || node.type))}</span>
        <span className="ml-auto text-subtext/30 text-[10px] shrink-0">{node.type}</span>
      </button>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// Main Page
// ──────────────────────────────────────────────────────────────────────────────
export default function RendererPage() {
  const [canvasW, setCanvasW] = useState(1300)
  const [canvasH, setCanvasH] = useState(750)
  const [canvasWInput, setCanvasWInput] = useState('1300')
  const [canvasHInput, setCanvasHInput] = useState('750')
  const [tree, setTree] = useState([])           // component tree
  const [selectedId, setSelectedId] = useState(null)
  const [dragOverId, setDragOverId] = useState(null)
  const [collapsedIds, setCollapsedIds] = useState(new Set()) // Container collapse state
  const [zoom, setZoom] = useState(1) // Canvas zoom level
  const [chatImage, setChatImage] = useState(null)
  const fileInputRef = useRef(null)

  // AI Tweak state
  const [tweakOriginalNode, setTweakOriginalNode] = useState(null)
  const [isTweaking, setIsTweaking] = useState(false)
  const [tweakInput, setTweakInput] = useState('')
  const [tweakLoading, setTweakLoading] = useState(false)

  // Chat state
  const [chatOpen, setChatOpen] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', content: 'Hi! Tell me what to add — e.g. "Add a container with a title label and a submit button inside it."', added: 0 }
  ])
  const [chatLoading, setChatLoading] = useState(false)
  const chatEndRef = useRef(null)
  const chatInputRef = useRef(null)

  const dragRef = useRef(null)
  const resizeRef = useRef(null)
  const canvasSizeRef = useRef({ w: 1300, h: 750 })

  // Derived
  const selectedNode = selectedId ? findNode(tree, selectedId) : null
  const schema = selectedNode ? SCHEMAS[selectedNode.type] : null
  const flatNodes = flattenTree(tree, collapsedIds)
  const totalCount = flattenTree(tree, new Set()).length // Total count shouldn't hide skipped nodes

  const toggleCollapse = useCallback((id) => {
    setCollapsedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  // Auto-scroll chat
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [chatMessages])
  useEffect(() => { if (chatOpen) setTimeout(() => chatInputRef.current?.focus(), 150) }, [chatOpen])

  // ── Add component to root or into selected container ──────────────────────
  const addComponent = useCallback((sch) => {
    const parentId = selectedNode?.type === 'Container' ? selectedNode.id : null
    const offset = totalCount * 16
    const comp = createComponent(sch, {
      x: parentId ? 20 : 60 + offset,
      y: parentId ? 20 + offset : 60 + offset,
    })
    setTree(prev => insertNode(prev, comp, parentId))
    setSelectedId(comp.id)
  }, [selectedNode, totalCount])

  // ── Update a property on selected node ─────────────────────────────────────
  const updateProp = useCallback((id, key, val) => {
    setTree(prev => updateNode(prev, id, n => ({ [key]: val })))
  }, [])

  // ── Delete selected ─────────────────────────────────────────────────────────
  const deleteSelected = useCallback(() => {
    if (!selectedId) return
    setTree(prev => { const [t] = removeNode(prev, selectedId); return t })
    setSelectedId(null)
  }, [selectedId])

  // ── Drag state ──────────────────────────────────────────────────────────────
  const handleMouseDown = useCallback((e, id) => {
    e.stopPropagation()
    e.preventDefault()
    setSelectedId(id)
    const node = findNode(tree, id)
    if (!node) return
    dragRef.current = {
      id, startMouseX: e.clientX, startMouseY: e.clientY,
      startX: node.x, startY: node.y,
    }
  }, [tree])

  // Keep canvas size ref in sync
  useEffect(() => { canvasSizeRef.current = { w: canvasW, h: canvasH } }, [canvasW, canvasH])

  const zoomRef = useRef(1)
  useEffect(() => { zoomRef.current = zoom }, [zoom])

  useEffect(() => {
    const onMove = (e) => {
      // ── Resize mode ──────────────────────────────────────────────────────────
      if (resizeRef.current) {
        const { id, dir, startMouseX, startMouseY, startX, startY, startW, startH } = resizeRef.current
        const pxRatio = 1 / zoomRef.current
        const dx = (e.clientX - startMouseX) * pxRatio
        const dy = (e.clientY - startMouseY) * pxRatio
        setTree(prev => updateNode(prev, id, () => {
          let newX = startX, newY = startY, newW = startW, newH = startH
          if (dir.includes('e')) newW = Math.max(20, startW + dx)
          if (dir.includes('s')) newH = Math.max(20, startH + dy)
          if (dir.includes('w')) { newW = Math.max(20, startW - dx); newX = startX + startW - newW }
          if (dir.includes('n')) { newH = Math.max(20, startH - dy); newY = startY + startH - newH }
          return { x: Math.round(newX), y: Math.round(newY), width: Math.round(newW), height: Math.round(newH) }
        }))
        return
      }

      // ── Drag move ────────────────────────────────────────────────────────────
      if (!dragRef.current) return
      const { id, startMouseX, startMouseY, startX, startY } = dragRef.current
      
      // Calculate scaled delta
      const pxRatio = 1 / zoomRef.current
      const dx = (e.clientX - startMouseX) * pxRatio
      const dy = (e.clientY - startMouseY) * pxRatio

      // Find drop container visual feedback
      const elements = document.elementsFromPoint(e.clientX, e.clientY)
      let hoveredContainerId = null
      for (const el of elements) {
        const cId = el.getAttribute('data-container-id')
        if (cId && cId !== id) {
          hoveredContainerId = cId
          break
        }
      }
      setDragOverId(hoveredContainerId)

      setTree(prev => {
        const node = findNode(prev, id)
        if (!node) return prev
        // Allow dragging outside parent bounds so it can be dropped elsewhere
        return updateNode(prev, id, () => ({
          x: startX + dx,
          y: startY + dy,
        }))
      })
    }
    
    const onUp = (e) => { 
      // ── Resize end ──────────────────────────────────────────────────────────
      if (resizeRef.current) {
        resizeRef.current = null
        document.body.style.cursor = ''
        return
      }

      // ── Drag end ────────────────────────────────────────────────────────────
      if (!dragRef.current) return
      const dragId = dragRef.current.id
      
      // Handle Drop Into Container
      const elements = document.elementsFromPoint(e.clientX, e.clientY)
      let targetContainerId = null
      for (const el of elements) {
        const cId = el.getAttribute('data-container-id')
        if (cId && cId !== dragId) {
          targetContainerId = cId
          break
        }
      }
      
      dragRef.current = null 
      setDragOverId(null)
      
      if (targetContainerId) {
        // Call a function we'll define to handle dropping
        setTree(prev => handleDropLogic(prev, dragId, targetContainerId))
      }
    }
    
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [])

  // ── Drop logic ──────────────────────────────────────────────────────────────
  const handleDropInto = useCallback((targetContainerId) => {
    if (!dragRef.current) return
    const dragId = dragRef.current.id
    setTree(prev => handleDropLogic(prev, dragId, targetContainerId))
  }, [])

  // ── Resize handle mousedown ─────────────────────────────────────────────────
  const handleResizeMouseDown = useCallback((e, id, dir) => {
    e.stopPropagation()
    e.preventDefault()
    const node = findNode(tree, id)
    if (!node) return
    resizeRef.current = {
      id, dir,
      startMouseX: e.clientX, startMouseY: e.clientY,
      startX: node.x, startY: node.y,
      startW: node.width, startH: node.height,
    }
    // Set a global cursor while resizing
    const cursorMap = { n:'n-resize', s:'s-resize', e:'e-resize', w:'w-resize', ne:'ne-resize', nw:'nw-resize', se:'se-resize', sw:'sw-resize' }
    document.body.style.cursor = cursorMap[dir] || 'default'
  }, [tree])

  // ── Keyboard shortcuts ──────────────────────────────────────────────────────
  const clipboardRef = useRef(null)

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger if typing in an input
      const tag = document.activeElement?.tagName
      const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
      if (inInput) return

      // Copy: Ctrl+C / Cmd+C
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        if (selectedId) {
          const selectedNode = findNode(tree, selectedId)
          if (selectedNode) {
            clipboardRef.current = selectedNode
          }
        }
      }

      // Paste: Ctrl+V / Cmd+V
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        if (clipboardRef.current) {
          // Deep clone helper to ensure fresh IDs and names
          const cloneNode = (node) => {
            const newNode = { ...node, id: uid(), name: nextName(node.type), x: node.x + 20, y: node.y + 20 }
            if (node.children) {
              newNode.children = node.children.map(cloneNode)
            }
            return newNode
          }

          const pastedNode = cloneNode(clipboardRef.current)

          setTree(prev => {
            // Find where to paste: if a Container is selected, inside it. Else, inside its parent.
            const sNode = selectedId ? findNode(prev, selectedId) : null
            const targetParentId = sNode?.type === 'Container' 
              ? selectedId 
              : (findParent(prev, selectedId)?.id || null)

            return insertNode(prev, pastedNode, targetParentId)
          })
          setSelectedId(pastedNode.id)
        }
      }

      // Delete/Backspace
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        deleteSelected()
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [tree, selectedId, deleteSelected])

  // ── Canvas size commit ──────────────────────────────────────────────────────
  const commitCanvasSize = () => {
    const w = parseInt(canvasWInput, 10), h = parseInt(canvasHInput, 10)
    if (!isNaN(w) && w > 0) setCanvasW(w)
    if (!isNaN(h) && h > 0) setCanvasH(h)
  }

  // ── AI Component Tweaking ───────────────────────────────────────────────────
  const handleTweakSubmit = useCallback(async () => {
    const msg = tweakInput.trim()
    if (!msg || !selectedId || tweakLoading) return
    
    // Save original state if not already saved (allows multiple sequential tweaks before confirming)
    const currentNode = findNode(tree, selectedId)
    if (!currentNode) return
    if (!tweakOriginalNode) {
      setTweakOriginalNode(JSON.parse(JSON.stringify(currentNode)))
    }

    setTweakLoading(true)
    try {
      const res = await fetch('http://localhost:8000/tweak-component', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: msg,
          component: currentNode,
          canvas_width: canvasW,
          canvas_height: canvasH,
        }),
      })
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.detail || `Error ${res.status}`) }
      
      const modifiedComponent = await res.json()
      
      // Update the tree with the new component data (merge keeping children structure mostly intact unless AI changed it)
      setTree(prev => updateNode(prev, selectedId, () => modifiedComponent))
      setTweakInput('')
      setIsTweaking(false)
      
    } catch (err) {
      alert(`Tweak failed: ${err.message}`)
    } finally {
      setTweakLoading(false)
    }
  }, [tweakInput, selectedId, tweakLoading, tree, canvasW, canvasH, tweakOriginalNode])

  const confirmTweak = useCallback(() => {
    setTweakOriginalNode(null)
    setIsTweaking(false)
    setTweakInput('')
  }, [])

  const undoTweak = useCallback(() => {
    if (tweakOriginalNode) {
      setTree(prev => updateNode(prev, tweakOriginalNode.id, () => tweakOriginalNode))
      setTweakOriginalNode(null)
      setIsTweaking(false)
      setTweakInput('')
    }
  }, [tweakOriginalNode])

  // Clear tweak state if selection changes
  useEffect(() => {
    if (selectedId && tweakOriginalNode && selectedId !== tweakOriginalNode.id) {
      confirmTweak() // Auto-confirm if you click away
    }
  }, [selectedId, tweakOriginalNode, confirmTweak])

  // ── Image compression helper ─────────────────────────────────────────────
  const compressImageDataUrl = (dataUrl, callback) => {
    const img = new Image()
    img.onload = () => {
      let { width, height } = img
      const maxDim = 1024
      if (width > maxDim || height > maxDim) {
        if (width > height) { height = Math.round(height * (maxDim / width)); width = maxDim }
        else { width = Math.round(width * (maxDim / height)); height = maxDim }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width; canvas.height = height
      canvas.getContext('2d').drawImage(img, 0, 0, width, height)
      callback(canvas.toDataURL('image/jpeg', 0.8))
    }
    img.src = dataUrl
  }

  // ── LLM Chat ────────────────────────────────────────────────────────────────
  const handleChatSubmit = useCallback(async () => {
    const msg = chatInput.trim()
    if ((!msg && !chatImage) || chatLoading) return
    setChatInput('')
    
    const imagePayload = chatImage
    setChatImage(null)

    setChatMessages(prev => [...prev, { role: 'user', content: msg, added: 0, image: imagePayload }])
    setChatLoading(true)

    const payload = {
      message: msg || "See attached image.",
      canvas_components: tree,
      canvas_width: canvasW, canvas_height: canvasH,
    }

    if (imagePayload) {
      const [header, base64] = imagePayload.split(',')
      const mimeMatch = header.match(/:(.*?);/)
      if (mimeMatch) {
         payload.image_mime_type = mimeMatch[1]
         payload.image_data = base64
      }
    }

    try {
      const res = await fetch('http://localhost:8000/renderer-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.detail || `Error ${res.status}`) }
      const data = await res.json()
      
      let lastId = null
      setTree(prev => {
        let nextTree = [...prev]
        
        // 1. Removals
        const removes = data.components_to_remove || []
        for (const rId of removes) {
          nextTree = removeNode(nextTree, rId)[0]
        }
        
        // 2. Updates
        const updates = data.components_to_update || []
        for (const update of updates) {
          if (!update.id) continue
          const { id, ...changes } = update
          nextTree = updateNode(nextTree, id, comp => ({ ...comp, ...changes }))
          lastId = id
        }
        
        // 3. Additions
        const adds = data.components_to_add || []
        for (const spec of adds) {
          const { parentId, ...rest } = spec
          const newComp = createFromSpec(rest)
          if (newComp) {
            nextTree = insertNode(nextTree, newComp, parentId)
            lastId = newComp.id
          }
        }
        
        return nextTree
      })

      if (lastId) setTimeout(() => setSelectedId(lastId), 10)

      const addsCount = (data.components_to_add || []).length
      const modsCount = (data.components_to_update || []).length + (data.components_to_remove || []).length
      
      setChatMessages(prev => [...prev, { 
        role: 'assistant', 
        content: data.reply || 'Done!', 
        added: addsCount,
        mods: modsCount
      }])
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: `⚠️ ${err.message}`, added: 0 }])
    } finally {
      setChatLoading(false)
    }
  }, [chatInput, chatImage, chatLoading, tree, canvasW, canvasH])

  // ── Shared child event handlers ─────────────────────────────────────────────
  const handleChildMouseDown = useCallback((e, id) => handleMouseDown(e, id), [handleMouseDown])
  const handleChildClick = useCallback((id) => setSelectedId(id), [])

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col flex-1 overflow-hidden">

      {/* Top Bar */}
      <div className="flex items-center gap-4 px-5 py-2.5 border-b border-overlay/30 bg-surface/30 shrink-0">
        <span className="text-xs font-semibold text-subtext uppercase tracking-wider">Canvas</span>
        <div className="flex items-center gap-2">
          <label className="text-xs text-subtext">W</label>
          <input type="number" value={canvasWInput} onChange={e => setCanvasWInput(e.target.value)}
            onBlur={commitCanvasSize} onKeyDown={e => e.key === 'Enter' && commitCanvasSize()}
            className="w-20 bg-base border border-overlay/40 rounded-md px-2 py-1 text-xs text-text focus:outline-none focus:border-accent/60 text-right" />
          <span className="text-subtext/40 text-xs">×</span>
          <label className="text-xs text-subtext">H</label>
          <input type="number" value={canvasHInput} onChange={e => setCanvasHInput(e.target.value)}
            onBlur={commitCanvasSize} onKeyDown={e => e.key === 'Enter' && commitCanvasSize()}
            className="w-20 bg-base border border-overlay/40 rounded-md px-2 py-1 text-xs text-text focus:outline-none focus:border-accent/60 text-right" />
          <span className="text-xs text-subtext/40">px</span>
        </div>
        <div className="flex items-center gap-1.5 ml-2">
          <div className="w-1.5 h-1.5 rounded-full bg-overlay" />
          <span className="text-xs text-subtext/50">{totalCount} component{totalCount !== 1 ? 's' : ''}</span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => setChatOpen(o => !o)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200 cursor-pointer
              ${chatOpen ? 'bg-violet-500/20 border-violet-500/40 text-violet-300' : 'bg-base border-overlay/40 text-subtext hover:border-accent/50 hover:text-accent hover:bg-accent/5'}`}>
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path fillRule="evenodd" d="M4.848 2.771A49.144 49.144 0 0 1 12 2.25c2.43 0 4.817.178 7.152.52 1.978.292 3.348 2.024 3.348 3.97v6.02c0 1.946-1.37 3.678-3.348 3.97a48.901 48.901 0 0 1-3.476.383.39.39 0 0 0-.297.17l-2.755 4.133a.75.75 0 0 1-1.248 0l-2.755-4.133a.39.39 0 0 0-.297-.17 48.9 48.9 0 0 1-3.476-.384c-1.978-.29-3.348-2.024-3.348-3.97V6.741c0-1.946 1.37-3.68 3.348-3.97Z" clipRule="evenodd" />
            </svg>
            AI Chat
            {chatLoading && <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />}
          </button>
          {selectedId && (
            <button onClick={deleteSelected}
              className="flex items-center gap-1.5 text-xs text-red/70 hover:text-red border border-red/20 hover:border-red/40 hover:bg-red/5 px-3 py-1.5 rounded-lg transition-all duration-150 cursor-pointer">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path fillRule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 0 1 3.878.512.75.75 0 1 1-.256 1.478l-.209-.035-1.005 13.07a3 3 0 0 1-2.991 2.77H8.084a3 3 0 0 1-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 0 1-.256-1.478A48.567 48.567 0 0 1 7.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 0 1 3.369 0c1.603.051 2.815 1.387 2.815 2.951Zm-6.136-1.452a51.196 51.196 0 0 1 3.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 0 0-6 0v-.113c0-.794.609-1.428 1.364-1.452Zm-.355 5.945a.75.75 0 1 0-1.5.058l.347 9a.75.75 0 1 0 1.499-.058l-.346-9Zm5.48.058a.75.75 0 1 0-1.498-.058l-.347 9a.75.75 0 0 0 1.5.058l.345-9Z" clipRule="evenodd" />
              </svg>
              Delete
            </button>
          )}
          <button onClick={() => { setTree([]); setSelectedId(null) }}
            className="text-xs text-subtext/60 hover:text-subtext border border-overlay/30 hover:border-overlay/60 px-3 py-1.5 rounded-lg transition-all duration-150 cursor-pointer">
            Clear All
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left Toolbar */}
        <div className="w-52 shrink-0 border-r border-overlay/30 bg-surface/20 flex flex-col overflow-hidden">
          <div className="p-3 border-b border-overlay/20">
            <p className="text-[10px] font-semibold text-subtext/60 uppercase tracking-widest mb-2">
              {selectedNode?.type === 'Container' ? 'Add To Container' : 'Add Component'}
            </p>
            <div className="flex flex-col gap-1.5">
              {[
                { schema: buttonSchema, color: 'bg-[#0078d4]', label: 'Button' },
                { schema: labelSchema, color: 'bg-overlay', label: 'Label' },
                { schema: textInputSchema, color: 'bg-emerald-500', label: 'TextInput' },
                { schema: dropdownSchema, color: 'bg-amber-500', label: 'Dropdown' },
                { schema: containerSchema, color: 'bg-violet-500', label: 'Container' },
              ].map(({ schema: sch, color, label }) => (
                <button key={label} onClick={() => addComponent(sch)}
                  className="flex items-center gap-2 w-full text-left bg-base/60 border border-overlay/30 hover:border-accent/50 hover:bg-accent/5 hover:text-accent text-subtext text-xs px-3 py-2.5 rounded-lg transition-all duration-150 cursor-pointer">
                  <span className={`w-6 h-6 rounded ${color} flex items-center justify-center shrink-0 shadow-sm text-white`}>
                    {TYPE_ICONS[label]}
                  </span>
                  <span className="font-medium">{label}</span>
                </button>
              ))}
            </div>
            {selectedNode?.type === 'Container' && (
              <p className="text-[10px] text-accent/70 mt-2 text-center">
                Adding inside selected container
              </p>
            )}
          </div>

          {/* Layers */}
          <div className="flex-1 overflow-y-auto p-3">
            <p className="text-[10px] font-semibold text-subtext/60 uppercase tracking-widest mb-2">Layers</p>
            {flatNodes.length === 0 ? (
              <p className="text-subtext/30 text-xs text-center mt-8">No components yet</p>
            ) : (
              <div className="flex flex-col gap-0.5">
                {flatNodes.map(node => (
                  <LayerRow 
                    key={node.id} 
                    node={node} 
                    selectedId={selectedId} 
                    onSelect={setSelectedId} 
                    depth={node._depth} 
                    isCollapsed={collapsedIds.has(node.id)}
                    toggleCollapse={toggleCollapse}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Center: Canvas + Chat */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Canvas */}
          <div
            className="flex-1 overflow-auto bg-[#f0f0f0] relative"
            style={{ backgroundImage: 'radial-gradient(circle, #bbb 1px, transparent 1px)', backgroundSize: '20px 20px' }}
            onClick={() => setSelectedId(null)}
          >
            <div className="p-12 min-h-full min-w-full flex items-start justify-center transition-transform duration-200" style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}>
              <div
                className="relative bg-white shrink-0 origin-top"
                style={{ width: canvasW, height: canvasH, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.05)' }}
                data-container-id="root"
                onClick={() => setSelectedId(null)}
                onDragOver={e => { e.preventDefault(); setDragOverId('_canvas') }}
                onDrop={e => { e.preventDefault(); setDragOverId(null) }}
              >
                {tree.length === 0 && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center mb-3">
                      <svg className="w-7 h-7 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                    </div>
                    <p className="text-gray-300 text-sm font-medium">Add components from the left panel or chat</p>
                    <p className="text-gray-200 text-xs mt-1">{canvasW} × {canvasH}</p>
                  </div>
                )}
                {tree.map(comp => {
                  const isSelected = comp.id === selectedId
                  const sharedProps = {
                    comp, selected: isSelected,
                    onMouseDown: (e) => handleMouseDown(e, comp.id),
                    onClick: (e) => { e.stopPropagation(); setSelectedId(comp.id) },
                  }
                  if (comp.type === 'Button') return <ButtonRenderer key={comp.id} {...sharedProps} />
                  if (comp.type === 'Label') return <LabelRenderer key={comp.id} {...sharedProps} />
                  if (comp.type === 'TextInput') return <TextInputRenderer key={comp.id} {...sharedProps} />
                  if (comp.type === 'Dropdown') return <DropdownRenderer key={comp.id} {...sharedProps} />
                  if (comp.type === 'Container') return (
                    <ContainerRenderer key={comp.id} {...sharedProps}
                      selectedId={selectedId}
                      onChildMouseDown={handleChildMouseDown}
                      onChildClick={handleChildClick}
                      onDropInto={handleDropInto}
                      dragOverId={dragOverId}
                      setDragOverId={setDragOverId}
                    />
                  )
                  return null
                })}
                {/* Resize handles for selected root-level component */}
                {selectedNode && (() => {
                  const comp = tree.find(c => c.id === selectedNode.id)
                  if (!comp) return null
                  const { x, y, width: w, height: h } = comp
                  const handles = [
                    { dir: 'nw', style: { left: x - 5, top: y - 5, cursor: 'nw-resize' } },
                    { dir: 'n',  style: { left: x + w/2 - 5, top: y - 5, cursor: 'n-resize' } },
                    { dir: 'ne', style: { left: x + w - 5, top: y - 5, cursor: 'ne-resize' } },
                    { dir: 'e',  style: { left: x + w - 5, top: y + h/2 - 5, cursor: 'e-resize' } },
                    { dir: 'se', style: { left: x + w - 5, top: y + h - 5, cursor: 'se-resize' } },
                    { dir: 's',  style: { left: x + w/2 - 5, top: y + h - 5, cursor: 's-resize' } },
                    { dir: 'sw', style: { left: x - 5, top: y + h - 5, cursor: 'sw-resize' } },
                    { dir: 'w',  style: { left: x - 5, top: y + h/2 - 5, cursor: 'w-resize' } },
                  ]
                  return handles.map(({ dir, style }) => (
                    <div
                      key={dir}
                      data-resize-handle="true"
                      style={{ ...style, position: 'absolute', width: 10, height: 10, zIndex: 9999 }}
                      className="rounded-sm bg-white border-2 border-[#0078d4] shadow-sm hover:bg-blue-100 transition-colors"
                      onMouseDown={e => handleResizeMouseDown(e, comp.id, dir)}
                    />
                  ))
                })()}
              </div>
            </div>

            {/* Zoom Controls */}
            <div className="absolute bottom-6 right-6 flex items-center bg-surface/90 backdrop-blur-md border border-overlay/30 shadow-md shadow-black/10 rounded-lg overflow-hidden z-40">
              <button 
                onClick={(e) => { e.stopPropagation(); setZoom(z => Math.max(0.25, z - 0.1)); }}
                className="p-2 text-subtext hover:bg-overlay/10 hover:text-text transition-colors"
                title="Zoom Out"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              </button>
              <div className="px-2 py-1 text-xs font-medium text-subtext/80 min-w-12 text-center border-x border-overlay/20 cursor-default select-none" onClick={e => e.stopPropagation()}>
                {Math.round(zoom * 100)}%
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); setZoom(z => Math.min(3, z + 0.1)); }}
                className="p-2 text-subtext hover:bg-overlay/10 hover:text-text transition-colors"
                title="Zoom In"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              </button>
            </div>

            {/* Confirm / Undo Tweak Banner */}
            {tweakOriginalNode && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-surface/90 backdrop-blur-md border border-accent/40 shadow-lg shadow-black/20 rounded-full px-4 py-2 flex items-center gap-4 z-50 animate-in slide-in-from-bottom-4">
                <span className="text-xs font-medium text-text">Review AI changes</span>
                <div className="flex items-center gap-2">
                  <button onClick={undoTweak}
                    className="text-xs px-3 py-1.5 rounded-full border border-overlay/40 hover:bg-red/10 hover:text-red hover:border-red/40 text-subtext transition-colors">
                    Undo
                  </button>
                  <button onClick={confirmTweak}
                    className="text-xs px-3 py-1.5 rounded-full bg-accent hover:bg-accent/80 text-white font-medium transition-colors">
                    Looks Good
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* AI Chat Panel */}
          <div className={`shrink-0 border-t border-overlay/30 bg-base/95 backdrop-blur-md flex flex-col transition-all duration-300 ease-in-out overflow-hidden ${chatOpen ? 'h-60' : 'h-0'}`}>
            <div className="flex items-center justify-between px-4 py-2 border-b border-overlay/20 bg-surface/40 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-violet-500 to-accent flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path fillRule="evenodd" d="M8.25 2.25A.75.75 0 0 1 9 3v.75h2.25V3a.75.75 0 0 1 1.5 0v.75H15V3a.75.75 0 0 1 1.5 0v.75h.75a3 3 0 0 1 3 3v.75H21A.75.75 0 0 1 21 9h-.75v2.25H21a.75.75 0 0 1 0 1.5h-.75V15H21a.75.75 0 0 1 0 1.5h-.75v.75a3 3 0 0 1-3 3h-.75V21a.75.75 0 0 1-1.5 0v-.75h-2.25V21a.75.75 0 0 1-1.5 0v-.75H9V21a.75.75 0 0 1-1.5 0v-.75h-.75a3 3 0 0 1-3-3v-.75H3A.75.75 0 0 1 3 15h.75v-2.25H3a.75.75 0 0 1 0-1.5h.75V9H3a.75.75 0 0 1 0-1.5h.75v-.75a3 3 0 0 1 3-3h.75V3a.75.75 0 0 1 .75-.75ZM6 6.75A.75.75 0 0 1 6.75 6h10.5a.75.75 0 0 1 .75.75v10.5a.75.75 0 0 1-.75.75H6.75a.75.75 0 0 1-.75-.75V6.75Z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-xs font-semibold text-text">AI Canvas Assistant</span>
                <span className="text-[10px] text-subtext/50 bg-overlay/30 px-1.5 py-0.5 rounded-full">Gemini 2.5 Flash</span>
              </div>
              <button onClick={() => setChatOpen(false)}
                className="text-subtext/40 hover:text-subtext transition-colors duration-150 cursor-pointer">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 0 1 1.06 0L12 10.94l5.47-5.47a.75.75 0 1 1 1.06 1.06L13.06 12l5.47 5.47a.75.75 0 1 1-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 0 1-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
              {chatMessages.map((msg, i) => <ChatMessage key={i} msg={msg} />)}
              {chatLoading && (
                <div className="flex gap-2 items-center">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-accent flex items-center justify-center text-[10px] font-bold text-white shrink-0">AI</div>
                  <div className="bg-surface border border-overlay/40 rounded-xl px-3 py-2 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <div className="border-t border-overlay/20 bg-surface/20 shrink-0 flex flex-col p-3 gap-2">
              {chatImage && (
                <div className="relative inline-block w-fit ml-2 group">
                  <img src={chatImage} alt="Chat upload" className="h-16 w-auto rounded-lg border border-overlay/30 object-contain bg-base/50 shadow-sm" />
                  <button onClick={() => setChatImage(null)} className="absolute -top-2 -right-2 w-5 h-5 bg-red-500/90 text-white rounded-full flex items-center justify-center text-[10px] hover:bg-red-500 hover:scale-110 shadow-md transition-all cursor-pointer opacity-0 group-hover:opacity-100">
                    ✕
                  </button>
                </div>
              )}
              <div className="flex items-center gap-2">
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={e => {
                  const file = e.target.files[0]
                  if (file) {
                    const reader = new FileReader()
                    reader.onload = (ev) => compressImageDataUrl(ev.target.result, setChatImage)
                    reader.readAsDataURL(file)
                  }
                  e.target.value = ''
                }} />
                
                <button onClick={() => fileInputRef.current?.click()} className="w-9 h-9 flex items-center justify-center rounded-xl text-subtext/60 bg-base hover:text-accent hover:border-accent/40 border border-overlay/40 transition-colors shadow-sm cursor-pointer shrink-0" title="Attach image">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                </button>
                
                <input ref={chatInputRef} type="text" value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleChatSubmit()}
                  onPaste={e => {
                    const items = e.clipboardData?.items
                    if (!items) return
                    for (const item of items) {
                      if (item.type.startsWith('image/')) {
                        e.preventDefault()
                        const file = item.getAsFile()
                        if (!file) return
                        const reader = new FileReader()
                        reader.onload = (ev) => compressImageDataUrl(ev.target.result, setChatImage)
                        reader.readAsDataURL(file)
                        return
                      }
                    }
                  }}
                  placeholder='Describe what to build — or paste a screenshot'
                  className="flex-1 bg-base border border-overlay/40 rounded-xl px-4 h-9 text-xs text-text placeholder:text-subtext/40 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all shadow-sm" />
                <button onClick={handleChatSubmit} disabled={(!chatInput.trim() && !chatImage) || chatLoading}
                  className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-accent flex items-center justify-center shrink-0 shadow-md shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-105 active:scale-95 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 cursor-pointer">
                  <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3.478 2.405a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.405Z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Code Pane */}
        <CodePane 
          node={selectedNode}
          tree={tree}
          canvasW={canvasW}
          canvasH={canvasH}
          isTweaking={isTweaking}
          setIsTweaking={setIsTweaking}
          tweakInput={tweakInput}
          setTweakInput={setTweakInput}
          handleTweakSubmit={handleTweakSubmit}
          tweakLoading={tweakLoading}
          tweakOriginalNode={tweakOriginalNode}
        />

        {/* Right Properties Panel */}
        <div className="w-64 shrink-0 border-l border-overlay/30 bg-surface/20 flex flex-col overflow-hidden">
          {selectedNode && schema ? (
            <>
              <div className="px-4 py-3 border-b border-overlay/20 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] bg-accent/15 text-accent border border-accent/25 px-2 py-0.5 rounded-full font-medium">
                    {schema.control}
                  </span>
                </div>
                
                <input
                  type="text"
                  value={selectedNode.name || ''}
                  onChange={e => updateProp(selectedNode.id, 'name', e.target.value)}
                  placeholder="Component name"
                  className="w-full bg-base border border-overlay/40 rounded-lg px-2.5 py-1.5 text-xs text-text font-semibold focus:outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/20 transition-all"
                />
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-2">
                {selectedNode.type === 'Container' && (
                  <p className="text-[10px] text-subtext/50 mb-2 bg-overlay/20 rounded-lg px-2 py-1.5">
                    {selectedNode.children?.length ?? 0} child component{(selectedNode.children?.length ?? 0) !== 1 ? 's' : ''}
                    {' · '}Select this container then click "Add Component" to add children.
                  </p>
                )}
                <div className="divide-y divide-overlay/20">
                  {schema.properties.map(prop => (
                    <PropField key={prop.key} prop={prop} value={selectedNode[prop.key]}
                      onChange={val => updateProp(selectedNode.id, prop.key, val)} />
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 text-center px-6">
              <div className="w-12 h-12 rounded-xl bg-overlay/30 flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-subtext/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
                </svg>
              </div>
              <p className="text-subtext/50 text-xs">Select a component to edit its properties</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
