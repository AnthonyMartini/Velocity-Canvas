import { useState, useRef, useCallback, useEffect } from 'react'
import PropTypes from 'prop-types'
import { ButtonRenderer, LabelRenderer, TextInputRenderer, DropdownRenderer, ContainerRenderer, GalleryRenderer,  CheckboxRenderer,
  RectangleRenderer,
  IconRenderer,
  HtmlTextRenderer,
  DatePickerRenderer,
  ComboBoxRenderer,
} from '../components/controls/index.jsx'
import { SCHEMAS } from './constants.jsx'
import PropField from './components/PropField.jsx'
import ChatMessage from './components/ChatMessage.jsx'
import LayerRow from './components/LayerRow.jsx'
import { uid, nextName, createComponent, createFromSpec, componentToYaml, screenToYaml } from './helpers.jsx'
import { findNode, updateNode, removeNode, insertNode, flattenTree, findParent, isDescendant, handleDropLogic, highlightYamlLine } from '../common/helpers.jsx'
import { TYPE_ICONS, TYPE_COLORS } from '../common/constants.jsx'

// ── Code Pane ─────────────────────────────────────────────────────────────────
function CodePane({ node, tree, isTweaking, setIsTweaking, tweakInput, setTweakInput, handleTweakSubmit, tweakLoading, tweakOriginalNode }) {
  const [copied, setCopied] = useState(false)
  
  // App nodes have no YAML preview. Screen nodes show a full Screens: document.
  const yaml = (() => {
    if (!node) return screenToYaml(tree)
    if (node.type === 'App') return null // No YAML for the App node
    if (node.type === 'Screen') {
      // Wrap the single screen as a full Screens: document
      const screenBody = componentToYaml(node, 2)
      return `Screens:\n${screenBody}`
    }
    return componentToYaml(node)
  })()

  const handleCopy = () => {
    if (!yaml) return
    navigator.clipboard.writeText(yaml).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    })
  }

  // Basic token coloring
  const highlighted = yaml
    ? yaml.split('\n').map((line, i) => highlightYamlLine(line, i))
    : null

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

      {/* Code area */}
      <div className="flex-1 overflow-auto p-4 font-mono text-[11px] whitespace-pre">
        {highlighted ?? (
          <span className="text-subtext/30 italic">Select a Screen or component to view YAML</span>
        )}
      </div>
    </div>
  )
}

CodePane.propTypes = {
  node: PropTypes.object, // Can be null for screen mode
  tree: PropTypes.array.isRequired,
  isTweaking: PropTypes.bool.isRequired,
  setIsTweaking: PropTypes.func.isRequired,
  tweakInput: PropTypes.string.isRequired,
  setTweakInput: PropTypes.func.isRequired,
  handleTweakSubmit: PropTypes.func.isRequired,
  tweakLoading: PropTypes.bool.isRequired,
  tweakOriginalNode: PropTypes.object,
}

// ──────────────────────────────────────────────────────────────────────────────
// Main Page
// ──────────────────────────────────────────────────────────────────────────────
export default function RendererPage() {
  const [canvasW, setCanvasW] = useState(1366)
  const [canvasH, setCanvasH] = useState(768)
  const [canvasWInput, setCanvasWInput] = useState('1366')
  const [canvasHInput, setCanvasHInput] = useState('768')
  const [tree, setTree] = useState([
    {
      id: 'app_root',
      type: 'App',
      name: 'App',
      children: [
        {
          id: 'screen_1',
          type: 'Screen',
          name: 'Screen1',
          fill: 'RGBA(255, 255, 255, 1)',
          children: []
        }
      ]
    }
  ])           // component tree
  const [selectedIds, setSelectedIds] = useState([]) // Array of selected component IDs
  const [dragOverId, setDragOverId] = useState(null)
  const [collapsedIds, setCollapsedIds] = useState(new Set()) // Container collapse state
  const [zoom, setZoom] = useState(1) // Canvas zoom level
  const [showCodePane, setShowCodePane] = useState(false) // Toggle visibility of the YAML CodePane
  const [chatImage, setChatImage] = useState(null)
  const fileInputRef = useRef(null)

  // Drag-to-select state
  const [selectionBox, setSelectionBox] = useState(null)

  // AI Tweak state
  const [tweakOriginalNode, setTweakOriginalNode] = useState(null)
  const [isTweaking, setIsTweaking] = useState(false)
  const [tweakInput, setTweakInput] = useState('')
  const [tweakLoading, setTweakLoading] = useState(false)

  // History state for Undo/Redo
  const [history, setHistory] = useState([[...tree]]) // Initialize with default tree
  const [historyIndex, setHistoryIndex] = useState(0)

  // Function to save a new state to history
  const saveHistory = useCallback((newTree) => {
    setHistory(prev => {
      // If we are not at the end of the history, slice off the future states
      const newHistory = prev.slice(0, historyIndex + 1)
      newHistory.push(newTree)
      return newHistory
    })
    setHistoryIndex(prev => prev + 1)
    setTree(newTree)
  }, [historyIndex])

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1
      setHistoryIndex(prevIndex)
      setTree(history[prevIndex])
      setSelectedIds([])
      setDragOverId(null)
    }
  }, [history, historyIndex])

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1
      setHistoryIndex(nextIndex)
      setTree(history[nextIndex])
      setSelectedIds([])
      setDragOverId(null)
    }
  }, [history, historyIndex])

  // ── Delete selected ─────────────────────────────────────────────────────────
  const deleteSelected = useCallback(() => {
    if (!selectedIds.length) return
    setTree(prev => { 
      let nextTree = prev
      for (const id of selectedIds) {
        nextTree = removeNode(nextTree, id)[0]
      }
      saveHistory(nextTree)
      return nextTree 
    })
    setSelectedIds([])
  }, [selectedIds, saveHistory])

  // Preview mode
  const [isPlaying, setIsPlaying] = useState(false)

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Zoom hotkeys
      if (e.ctrlKey || e.metaKey) {
        if (e.key === '=' || e.key === '+') {
          e.preventDefault()
          setZoom(z => Math.min(3, z + 0.1))
          return
        }
        if (e.key === '-') {
          e.preventDefault()
          setZoom(z => Math.max(0.25, z - 0.1))
          return
        }
      }

      // Don't trigger if typing in an input/textarea
      if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
        return
      }
      
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') {
          if (e.shiftKey) {
            e.preventDefault()
            redo()
          } else {
            e.preventDefault()
            undo()
          }
        } else if (e.key === 'y') {
          e.preventDefault()
          redo()
        }
      } else {
        // Unmodified tool hotkeys
        if (e.key.toLowerCase() === 'v') setActiveTool('cursor')
        if (e.key.toLowerCase() === 'h') setActiveTool('pan')
        if (e.key === 'Escape' && isPlaying) { setIsPlaying(false); setSelectedIds([]) }
      }
      
      // Delete selected node when pressing Delete or Backspace
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.length > 0 && !isTweaking) {
        e.preventDefault()
        deleteSelected()
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo, selectedIds, saveHistory, isTweaking, deleteSelected, isPlaying])

  // Chat state
  const [chatOpen, setChatOpen] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', content: 'Hi! Tell me what to add — e.g. "Add a container with a title label and a submit button inside it."', added: 0 }
  ])
  const [chatLoading, setChatLoading] = useState(false)
  
  // Grid State
  const [showGrid, setShowGrid] = useState(false)
  const [activeTool, setActiveTool] = useState('cursor') // 'cursor' | 'pan'

  // PowerFx State
  const [localVars, setLocalVars] = useState({})
  const [notification, setNotification] = useState(null) // { message: string, id: number }

  const handleNotify = useCallback((msg) => {
    const id = Date.now()
    setNotification({ message: msg, id })
    setTimeout(() => {
      setNotification(prev => (prev?.id === id ? null : prev))
    }, 4000)
  }, [])

  // Local Data pane
  const [showLocalData, setShowLocalData] = useState(false)
  const [localDataTab, setLocalDataTab] = useState('variables') // 'variables' | 'collections'
  
  const chatEndRef = useRef(null)
  const chatInputRef = useRef(null)

  const dragRef = useRef(null)
  const resizeRef = useRef(null)
  const selectionBoxRef = useRef(null)
  const panRef = useRef(null)
  const canvasSizeRef = useRef({ w: 1366, h: 768 })

  // Auto-scroll to center of padded canvas on initial load
  const [initialScrollDone, setInitialScrollDone] = useState(false)
  useEffect(() => {
    if (!initialScrollDone) {
      const wrapper = document.getElementById('canvas-scroll-wrapper')
      // Wait until the wrapper has actual scrollWidth (meaning content has rendered)
      if (wrapper && wrapper.scrollWidth > wrapper.clientWidth) {
        wrapper.scrollLeft = (wrapper.scrollWidth - wrapper.clientWidth) / 2
        wrapper.scrollTop = (wrapper.scrollHeight - wrapper.clientHeight) / 2
        setInitialScrollDone(true)
      }
    }
  }, [initialScrollDone, canvasW, canvasH])

  // Derived
  const selectedNode = selectedIds.length === 1 ? findNode(tree, selectedIds[0]) : null
  const schema = selectedNode ? SCHEMAS[selectedNode.type] : null
  const flatNodes = flattenTree(tree, collapsedIds)
  const totalCount = flattenTree(tree, new Set()).length // Total count shouldn't hide skipped nodes

  const activeScreenNode = useCallback(() => {
    const screens = tree[0]?.type === 'App' ? (tree[0]?.children || []) : []
    if (!screens.length) return null
    if (selectedIds.length > 0) {
      const sId = selectedIds[0]
      for (const s of screens) {
        if (s.id === sId || isDescendant(tree, sId, s.id)) return s
      }
    }
    return screens[0]
  }, [tree, selectedIds])()

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
    let parentId = null
    if (selectedNode?.type === 'Container') {
      parentId = selectedNode.id
    } else if (selectedNode?.type === 'Screen') {
      parentId = selectedNode.id
    } else {
      // Component is selected — use the active screen (which follows the selection)
      parentId = activeScreenNode?.id || null
    }
    
    const offset = totalCount * 16
    const comp = createComponent(sch, {
      x: 20,
      y: 20 + offset,
    })
    
    setTree(prev => {
      const next = insertNode(prev, comp, parentId)
      saveHistory(next)
      return next
    })
    setSelectedIds([comp.id])
  }, [selectedNode, activeScreenNode, totalCount, saveHistory])

  // ── Add a new Screen ────────────────────────────────────────────────────────
  const addScreen = useCallback(() => {
    const comp = {
      id: uid(),
      type: 'Screen',
      name: nextName('Screen'),
      fill: 'RGBA(255, 255, 255, 1)',
      children: []
    }
    
    setTree(prev => {
      // Insert into the root 'App'
      const appRootId = prev[0]?.id
      if (!appRootId) return prev
      const next = insertNode(prev, comp, appRootId)
      saveHistory(next)
      return next
    })
    setSelectedIds([comp.id])
    // Un-collapse App node to show the new screen
    setCollapsedIds(prev => {
      const next = new Set(prev)
      next.delete(tree[0]?.id)
      return next
    })
  }, [saveHistory, tree])

  // ── Update a property on selected node ─────────────────────────────────────
  const updateProp = useCallback((id, key, val) => {
    setTree(prev => {
      const next = updateNode(prev, id, () => ({ [key]: val }))
      // Debounce history saving for text inputs and numbers to avoid creating too many history states, but for now we'll just save every change
      // Alternatively, we save after a short delay or blur, but let's just save.
      saveHistory(next)
      return next
    })
  }, [saveHistory])

  // ── Drag state ──────────────────────────────────────────────────────────────
  const handleMouseDown = useCallback((e, id) => {
    if (isPlaying) return // In preview mode — no drag/select
    if (activeTool === 'pan' || e.button === 2) return // Don't interact with components while panning

    e.stopPropagation()
    // Don't preventDefault here to allow text selection inside TextInput
    
    // Check if shift is held for multi-select
    let newSelectedIds = [...selectedIds]
    if (e.shiftKey) {
      if (newSelectedIds.includes(id)) {
        newSelectedIds = newSelectedIds.filter(i => i !== id)
      } else {
        newSelectedIds.push(id)
      }
    } else {
      // If the clicked node is already part of the selection, do not clear selection.
      // This allows dragging the whole group.
      if (!newSelectedIds.includes(id)) {
        newSelectedIds = [id]
      }
    }
    setSelectedIds(newSelectedIds)
    
    dragRef.current = {
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      nodes: newSelectedIds.map(sid => {
        const n = findNode(tree, sid)
        return { id: sid, startX: n?.x || 0, startY: n?.y || 0 }
      }).filter(n => n.startX !== undefined) // filter out nodes that might not immediately be found
    }
  }, [tree, selectedIds, isPlaying])

  // Keep canvas size ref in sync
  useEffect(() => { canvasSizeRef.current = { w: canvasW, h: canvasH } }, [canvasW, canvasH])

  const zoomRef = useRef(1)
  useEffect(() => { zoomRef.current = zoom }, [zoom])

  useEffect(() => {
    const onMove = (e) => {
      // ── Panning ─────────────────────────────────────────────────────────────
      if (panRef.current) {
        const { startMouseX, startMouseY, startScrollX, startScrollY } = panRef.current
        const dx = e.clientX - startMouseX
        const dy = e.clientY - startMouseY
        
        const wrapper = document.getElementById('canvas-scroll-wrapper')
        if (wrapper) {
          wrapper.scrollLeft = startScrollX - dx
          wrapper.scrollTop = startScrollY - dy
        }
        return
      }

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
      if (dragRef.current && dragRef.current.nodes?.length) {
        const { startMouseX, startMouseY, nodes } = dragRef.current
        
        // Calculate scaled delta
        const pxRatio = 1 / zoomRef.current
        const dx = (e.clientX - startMouseX) * pxRatio
        const dy = (e.clientY - startMouseY) * pxRatio

        // Find drop container visual feedback (using the primary dragged node for drop logic check)
        const elements = document.elementsFromPoint(e.clientX, e.clientY)
        let hoveredContainerId = null
        for (const el of elements) {
          const cId = el.getAttribute('data-container-id')
          if (cId && !nodes.find(n => n.id === cId)) {
            hoveredContainerId = cId
            break
          }
        }
        setDragOverId(hoveredContainerId)

        setTree(prev => {
          let nextTree = prev
          for (const draggedNode of nodes) {
            nextTree = updateNode(nextTree, draggedNode.id, () => ({
              x: draggedNode.startX + dx,
              y: draggedNode.startY + dy,
            }))
          }
          return nextTree
        })
        return
      }

      // ── Marquee Selection Move ──────────────────────────────────────────────
      if (selectionBoxRef.current) {
        const rootCanvas = document.getElementById('canvas-root')
        if (rootCanvas) {
          const rect = rootCanvas.getBoundingClientRect()
          const pxRatio = 1 / zoomRef.current
          const currentX = (e.clientX - rect.left) * pxRatio
          const currentY = (e.clientY - rect.top) * pxRatio
          // console.log('Marquee moving:', currentX, currentY)
          selectionBoxRef.current.currentX = currentX
          selectionBoxRef.current.currentY = currentY
          setSelectionBox({ ...selectionBoxRef.current })
        }
      }
    }
    
    const onUp = (e) => { 
      // ── Pan end ─────────────────────────────────────────────────────────────
      if (panRef.current) {
        panRef.current = null
        document.body.style.cursor = ''
        return
      }

      // ── Resize end ──────────────────────────────────────────────────────────
      if (resizeRef.current) {
        resizeRef.current = null
        document.body.style.cursor = ''
        return
      }

      // ── Marquee Selection End ───────────────────────────────────────────────
      if (selectionBoxRef.current) {
        // Calculate bounding box in canvas coordinates
        const { startX, startY, currentX, currentY } = selectionBoxRef.current
        const boxLeft = Math.min(startX, currentX)
        const boxTop = Math.min(startY, currentY)
        const boxRight = Math.max(startX, currentX)
        const boxBottom = Math.max(startY, currentY)
        
        // Find all intersecting nodes
        const intersectingIds = []
        
        // Helper to check intersection of two rects
        const doIntersect = (r1, r2) => {
          return !(r2.left > r1.right || r2.right < r1.left || r2.top > r1.bottom || r2.bottom < r1.top)
        }

        const selBoxRect = { left: boxLeft, top: boxTop, right: boxRight, bottom: boxBottom }

        const findIntersectingNodes = (nodes) => {
          for (const node of nodes) {
            const nodeRect = { left: node.x, top: node.y, right: node.x + node.width, bottom: node.y + node.height }
            if (doIntersect(selBoxRect, nodeRect)) {
              intersectingIds.push(node.id)
            }
            if (node.children?.length) {
              findIntersectingNodes(node.children)
            }
          }
        }
        
        if (activeScreenNode?.children) {
          findIntersectingNodes(activeScreenNode.children)
        }
        
        // Update selection (don't clear if Shift is held)
        if (e.shiftKey) {
          const newSelected = new Set(selectedIds)
          for (const id of intersectingIds) {
            if (newSelected.has(id)) newSelected.delete(id)
            else newSelected.add(id)
          }
          setSelectedIds(Array.from(newSelected))
        } else {
          setSelectedIds(intersectingIds)
        }
        
        selectionBoxRef.current = null
        setSelectionBox(null)
        return
      }

      // ── Drag end ────────────────────────────────────────────────────────────
      if (!dragRef.current || !dragRef.current.nodes?.length) return
      
      const draggedNodes = dragRef.current.nodes
      const primaryDragId = draggedNodes[0].id
      
      // Handle Drop Into Container
      const elements = document.elementsFromPoint(e.clientX, e.clientY)
      let targetContainerId = null
      for (const el of elements) {
        const cId = el.getAttribute('data-container-id')
        if (cId && !draggedNodes.find(n => n.id === cId)) {
          targetContainerId = cId
          break
        }
      }
      
      dragRef.current = null 
      setDragOverId(null)
      
      if (targetContainerId && draggedNodes.length === 1) {
        // Drop logic is safest when dragging a single node. 
        // We only apply container dropping for single node drags to avoid complex nesting issues.
        setTree(prev => {
          const next = handleDropLogic(prev, primaryDragId, targetContainerId)
          if (next !== prev) saveHistory(next)
          return next
        })
      } else {
        // Just dragged to empty space (or dragged multiple nodes), tree was updated during onMove.
        // We need to trigger saveHistory with the current tree.
        setTree(prev => {
          saveHistory(prev)
          return prev
        })
      }
    }
    
    window.addEventListener('mousemove', onMove, { passive: false })
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [tree, saveHistory, selectedIds])

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
        if (selectedIds.length > 0) {
          const nodesToCopy = selectedIds.map(id => findNode(tree, id)).filter(Boolean)
          if (nodesToCopy.length > 0) {
            clipboardRef.current = nodesToCopy
          }
        }
      }

      // Paste: Ctrl+V / Cmd+V
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        if (clipboardRef.current && clipboardRef.current.length > 0) {
          // Deep clone helper to ensure fresh IDs and names
          const cloneNode = (node) => {
            const newNode = { ...node, id: uid(), name: nextName(node.type), x: node.x + 20, y: node.y + 20 }
            if (node.children) {
              newNode.children = node.children.map(cloneNode)
            }
            return newNode
          }

          setTree(prev => {
            let nextTree = prev
            const newSelectedIds = []
            
            for (const copiedNode of clipboardRef.current) {
              const pastedNode = cloneNode(copiedNode)
              
              const targetParentId = selectedIds.length === 1 
              ? (findNode(prev, selectedIds[0])?.type === 'Container' ? selectedIds[0] : (findParent(prev, selectedIds[0])?.id || null))
              : null

              nextTree = insertNode(nextTree, pastedNode, targetParentId)
              newSelectedIds.push(pastedNode.id)
            }
            
            setTimeout(() => setSelectedIds(newSelectedIds), 10)
            return nextTree
          })
        }
      }

    // Delete/Backspace
    if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.length > 0) {
      deleteSelected()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [tree, selectedIds, deleteSelected])

  // ── Canvas size commit ──────────────────────────────────────────────────────
  const commitCanvasSize = () => {
    const w = parseInt(canvasWInput, 10), h = parseInt(canvasHInput, 10)
    if (!isNaN(w) && w > 0) setCanvasW(w)
    if (!isNaN(h) && h > 0) setCanvasH(h)
  }

  // ── AI Component Tweaking ───────────────────────────────────────────────────
  const handleTweakSubmit = useCallback(async () => {
    const msg = tweakInput.trim()
    if (!msg || selectedIds.length !== 1 || tweakLoading) return
    
    const selectedId = selectedIds[0]
    // Save original state if not already saved (allows multiple sequential tweaks before confirming)
    const currentNode = findNode(tree, selectedId)
    if (!currentNode) return
    if (!tweakOriginalNode) {
      setTweakOriginalNode(JSON.parse(JSON.stringify(currentNode)))
    }

    setTweakLoading(true)
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/tweak-component`, {
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

      // Update the tree with the new component
      if (modifiedComponent && modifiedComponent.id === selectedId) {
        setTree(prev => {
          const nextTree = updateNode(prev, selectedId, () => modifiedComponent)
          saveHistory(nextTree)
          return nextTree
        })
        setTweakInput('')
        setIsTweaking(false)
        setTweakOriginalNode(null)
      }

    } catch (err) {
      alert(`Tweak failed: ${err.message}`)
    } finally {
      setTweakLoading(false)
    }
  }, [tweakInput, selectedIds, tweakLoading, tree, canvasW, canvasH, tweakOriginalNode, saveHistory])

  const confirmTweak = useCallback(() => {
    setTweakOriginalNode(null)
    setIsTweaking(false)
    setTweakInput('')
  }, [])

  const undoTweak = useCallback(() => {
    if (tweakOriginalNode) {
      setTree(prev => {
        const nextTree = updateNode(prev, tweakOriginalNode.id, () => tweakOriginalNode)
        saveHistory(nextTree)
        return nextTree
      })
      setTweakOriginalNode(null)
      setIsTweaking(false)
      setTweakInput('')
    }
  }, [tweakOriginalNode, saveHistory])

  // Clear tweak state if selection changes
  useEffect(() => {
    if (selectedIds.length === 1 && tweakOriginalNode && selectedIds[0] !== tweakOriginalNode.id) {
      confirmTweak() // Auto-confirm if you click away
    } else if (selectedIds.length !== 1 && tweakOriginalNode) {
      confirmTweak() // Auto-confirm if multiple or no items are selected
    }
  }, [selectedIds, tweakOriginalNode, confirmTweak])

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
      canvas_components: activeScreenNode?.children || [],
      canvas_width: canvasW,
      canvas_height: canvasH,
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
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/renderer-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.detail || `Error ${res.status}`) }
      const data = await res.json()

      setChatLoading(false)

      if (data.components_to_add?.length || data.components_to_update?.length || data.components_to_remove?.length) {
        setTree(prev => {
          let nextTree = prev
          // 1. Removals
          if (data.components_to_remove?.length) {
            data.components_to_remove.forEach(rId => {
              const [t] = removeNode(nextTree, rId)
              nextTree = t
            })
          }
          // 2. Updates
          if (data.components_to_update?.length) {
            data.components_to_update.forEach(u => {
              if (u.id) {
                const { id, ...changes } = u
                // prevent id changes
                nextTree = updateNode(nextTree, id, () => changes)
              }
            })
          }
          // 3. Additions
          if (data.components_to_add?.length) {
            data.components_to_add.forEach(spec => {
              const comp = createFromSpec(spec)
              if (comp) nextTree = insertNode(nextTree, comp, spec.parentId || activeScreenNode?.id)
            })
          }

          saveHistory(nextTree)
          return nextTree
        })
      }

      let lastId = null // Re-initialize lastId for setting selection
      if (data.components_to_add?.length) {
        lastId = data.components_to_add[data.components_to_add.length - 1].id
      } else if (data.components_to_update?.length) {
        lastId = data.components_to_update[data.components_to_update.length - 1].id
      }

      if (lastId) setTimeout(() => setSelectedIds([lastId]), 10)

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
  }, [chatInput, chatImage, chatLoading, tree, canvasW, canvasH, saveHistory, activeScreenNode])

  // ── Shared child event handlers ─────────────────────────────────────────────
  const handleChildMouseDown = useCallback((e, id) => handleMouseDown(e, id), [handleMouseDown])
  
  // Also need to handle click on children for selection when not dragging
  const handleChildClick = useCallback((e) => {
    e.stopPropagation()
    // handleMouseDown already handles selection. We don't want to double trigger here.
  }, [])

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
        {/* Toolbar Left */}
        <div className="flex items-center">
          {/* Play / Pause Button */}
          <button
            onClick={() => {
              setIsPlaying(p => !p)
              setSelectedIds([])
            }}
            title={isPlaying ? 'Stop Preview (Esc)' : 'Preview App'}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all mr-3 ${
              isPlaying
                ? 'bg-green-500/20 text-green-300 border border-green-500/40 shadow-inner'
                : 'bg-surface/50 text-subtext/80 hover:bg-surface border border-overlay/30 hover:text-text'
            }`}
          >
            {isPlaying ? (
              <>
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 0 1 .75-.75H9a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H7.5a.75.75 0 0 1-.75-.75V5.25Zm7.5 0A.75.75 0 0 1 15 4.5h1.5a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H15a.75.75 0 0 1-.75-.75V5.25Z" clipRule="evenodd" />
                </svg>
                Stop
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path fillRule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" />
                </svg>
                Play
              </>
            )}
          </button>

          {/* Tool Selector */}
          <div className="flex items-center bg-surface/50 border border-overlay/40 rounded-lg p-0.5 mr-3">
            <button
              onClick={() => setActiveTool('cursor')}
              className={`p-1.5 px-2 rounded flex items-center justify-center transition-colors text-xs ${activeTool === 'cursor' ? 'bg-overlay/60 text-text' : 'text-subtext hover:text-text hover:bg-overlay/40'}`}
              title="Cursor Tool (V)"
            >
              <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
                <path d="M13 13l6 6" />
              </svg>
              Cursor
            </button>
            <button
              onClick={() => setActiveTool('pan')}
              className={`p-1.5 px-2 rounded flex items-center justify-center transition-colors text-xs ${activeTool === 'pan' ? 'bg-overlay/60 text-text' : 'text-subtext hover:text-text hover:bg-overlay/40'}`}
              title="Pan Tool (H)"
            >
              <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5.42 9.42L8 12c-2.58 2.58-5.17 5.17-5.17 5.17M18.58 14.58L16 12c2.58-2.58 5.17-5.17 5.17-5.17M9.42 5.42L12 8c2.58-2.58 5.17-5.17 5.17-5.17M14.58 18.58L12 16c-2.58 2.58-5.17 5.17-5.17 5.17" />
                <path d="M12 8v8M8 12h8" />
              </svg>
              Pan
            </button>
          </div>

          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all mr-3 ${showGrid ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30 shadow-inner' : 'bg-surface/50 text-subtext/80 hover:bg-surface border border-overlay/30 hover:text-text'
              }`}
          >
            <span className="text-[13px]">#</span>
            Grid
          </button>
          
          <button
            onClick={() => setChatOpen(!chatOpen)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all mr-3 ${chatOpen ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30 shadow-inner' : 'bg-surface/50 text-subtext/80 hover:bg-surface border border-overlay/30 hover:text-text'
              }`}
          >
            <span className="text-[13px]">{chatOpen ? '✨' : '🤖'}</span>
            AI Assistant
          </button>
          
          <button
            onClick={() => setShowCodePane(!showCodePane)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all mr-3 ${showCodePane ? 'bg-accent/20 text-accent border border-accent/30 shadow-inner' : 'bg-surface/50 text-subtext/80 hover:bg-surface border border-overlay/30 hover:text-text'
              }`}
          >
            <span className="text-[13px]">💻</span>
            YAML Code
          </button>

          <button
            onClick={() => {
              setShowLocalData(v => !v)
              setSelectedIds([])
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all mr-3 ${showLocalData ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-inner' : 'bg-surface/50 text-subtext/80 hover:bg-surface border border-overlay/30 hover:text-text'
              }`}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7Zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5Z" />
            </svg>
            Local Data
          </button>

          {/* Undo / Redo Buttons */}
          <div className="flex items-center gap-1 bg-surface/50 border border-overlay/40 rounded-lg p-0.5 divide-x divide-overlay/40 mr-4">
            <button
              onClick={undo}
              disabled={historyIndex === 0}
              title="Undo (Ctrl+Z)"
              className={`p-1.5 rounded flex items-center justify-center transition-colors ${historyIndex > 0 ? 'text-subtext hover:text-text hover:bg-overlay/60' : 'text-subtext/30 cursor-not-allowed'}`}
            >
              <svg className="w-4 h-4 text-inherit" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 7v6h6" />
                <path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13" />
              </svg>
            </button>
            <button
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
              title="Redo (Ctrl+Y)"
              className={`p-1.5 rounded flex items-center justify-center transition-colors ${historyIndex < history.length - 1 ? 'text-subtext hover:text-text hover:bg-overlay/60' : 'text-subtext/30 cursor-not-allowed'}`}
            >
              <svg className="w-4 h-4 text-inherit" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 7v6h-6" />
                <path d="M3 17a9 9 0 019-9 9 9 0 016 2.3l3 2.7" />
              </svg>
            </button>
          </div>

          <div className="h-4 w-px bg-overlay/30 mr-4" />
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
          {selectedIds.length > 0 && (
            <button onClick={deleteSelected}
              className="flex items-center gap-1.5 text-xs text-red/70 hover:text-red border border-red/20 hover:border-red/40 hover:bg-red/5 px-3 py-1.5 rounded-lg transition-all duration-150 cursor-pointer">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path fillRule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 0 1 3.878.512.75.75 0 1 1-.256 1.478l-.209-.035-1.005 13.07a3 3 0 0 1-2.991 2.77H8.084a3 3 0 0 1-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 0 1-.256-1.478A48.567 48.567 0 0 1 7.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 0 1 3.369 0c1.603.051 2.815 1.387 2.815 2.951Zm-6.136-1.452a51.196 51.196 0 0 1 3.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 0 0-6 0v-.113c0-.794.609-1.428 1.364-1.452Zm-.355 5.945a.75.75 0 1 0-1.5.058l.347 9a.75.75 0 1 0 1.499-.058l-.346-9Zm5.48.058a.75.75 0 1 0-1.498-.058l-.347 9a.75.75 0 0 0 1.5.058l.345-9Z" clipRule="evenodd" />
              </svg>
              Delete
            </button>
          )}
          <button
            onClick={() => {
              const defaultTree = [
                {
                  id: 'app_root',
                  type: 'App',
                  name: 'App',
                  children: [
                    {
                      id: 'screen_1',
                      type: 'Screen',
                      name: 'Screen1',
                      fill: 'RGBA(255, 255, 255, 1)',
                      children: []
                    }
                  ]
                }
              ]
              setTree(defaultTree)
              setHistory([defaultTree])
              setHistoryIndex(0)
              setSelectedIds([])
            }}
            className="px-3 py-1.5 rounded-lg bg-surface/50 border border-overlay/40 text-subtext/70 text-xs font-medium hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 transition-all ml-4"
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left Toolbar */}
        <div className="w-52 shrink-0 border-r border-overlay/30 bg-surface/20 flex flex-col overflow-hidden">
          <div className="max-h-[50%] flex flex-col overflow-hidden border-b border-overlay/20">
            <p className="text-[10px] font-semibold text-subtext/60 uppercase tracking-widest px-3 pt-3 pb-2 shrink-0">
              {selectedNode?.type === 'Container' ? 'Add To Container' : 'Add Component'}
            </p>
            <div className="overflow-y-auto flex-1 px-3 pb-3">
              <div className="flex flex-col gap-1.5">
              {[
                { schema: SCHEMAS.Button, label: 'Button' },
                { schema: SCHEMAS.Label, label: 'Label' },
                { schema: SCHEMAS.TextInput, label: 'TextInput' },
                { schema: SCHEMAS.Dropdown, label: 'Dropdown' },
                { schema: SCHEMAS.Checkbox, label: 'Checkbox' },
                { schema: SCHEMAS.Rectangle, label: 'Rectangle' },
                { schema: SCHEMAS.Icon, label: 'Icon' },
                { schema: SCHEMAS.HtmlText, label: 'HtmlText' },
                { schema: SCHEMAS.DatePicker, label: 'DatePicker' },
                { schema: SCHEMAS.ComboBox, label: 'ComboBox' },
                { schema: SCHEMAS.Container, label: 'Container' },
                { schema: SCHEMAS.Gallery, label: 'Gallery' },
              ].map(({ schema: sch, label }) => {
                const Icon = TYPE_ICONS[label]
                const color = TYPE_COLORS[label]
                return (
                  <button key={label} onClick={() => !isPlaying && addComponent(sch)}
                    disabled={isPlaying}
                    className={`flex items-center gap-2 w-full text-left border text-xs px-3 py-2.5 rounded-lg transition-all duration-150 ${
                      isPlaying
                        ? 'bg-base/30 border-overlay/15 text-subtext/30 cursor-not-allowed'
                        : 'bg-base/60 border-overlay/30 hover:border-accent/50 hover:bg-accent/5 hover:text-accent text-subtext cursor-pointer'
                    }`}>
                    <span className={`w-6 h-6 rounded ${color} flex items-center justify-center shrink-0 shadow-sm text-white ${isPlaying ? 'opacity-40' : ''}`}>
                      {Icon && <Icon className="w-3.5 h-3.5" />}
                    </span>
                    <span className="font-medium">{label}</span>
                  </button>
                )
              })}
              </div>{/* end button list */}
            </div>{/* end scrollable */}
            {selectedNode?.type === 'Container' && (
              <p className="text-[10px] text-accent/70 mt-2 text-center">
                Adding inside selected container
              </p>
            )}
          </div>

          {/* Layers */}
          <div className="p-2 border-b border-overlay/30 bg-surface flex items-center justify-between">
          <span className="text-xs font-medium text-text px-2">Layers</span>
          {tree.length > 0 && (
            <button onClick={() => setCollapsedIds(new Set())} className="text-[10px] text-accent/80 hover:text-accent font-medium px-2 py-1 rounded hover:bg-accent/10 transition-colors">
              Expand All
            </button>
          )}
        </div>
        <div className="p-3 overflow-y-auto w-48 shrink-0 pb-16 space-y-0.5">
          {flatNodes.map(({ _depth, ...node }) => (
            <LayerRow
              key={node.id}
              node={node}
              selectedIds={selectedIds}
              onSelect={(e, id) => {
                let newSelectedIds = [...selectedIds]
                if (e.shiftKey) {
                  if (newSelectedIds.includes(id)) {
                    newSelectedIds = newSelectedIds.filter(i => i !== id)
                  } else {
                    newSelectedIds.push(id)
                  }
                } else {
                  newSelectedIds = [id]
                }
                setSelectedIds(newSelectedIds)
              }}
              depth={_depth}
              isCollapsed={collapsedIds.has(node.id)}
              toggleCollapse={toggleCollapse}
            />
          ))}
          {tree.length === 0 && <div className="text-xs text-subtext/40 italic px-2 py-4">Canvas is empty</div>}
          <div className="pt-2 px-1">
            <button 
              onClick={addScreen}
              className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg border border-dashed border-overlay/40 text-subtext/80 hover:text-text hover:border-accent/40 hover:bg-accent/5 transition-colors text-xs font-medium"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              Add Screen
            </button>
          </div>
        </div>
      </div>    {/* Center: Canvas + Chat */}
        <div className="flex-1 bg-[#1e1e2e] relative overflow-hidden">
          <div
            id="canvas-scroll-wrapper"
            className={`absolute inset-0 overflow-auto bg-[#f0f0f0] ${activeTool === 'pan' ? 'cursor-grab' : ''}`}
            style={{ backgroundImage: 'radial-gradient(circle, #bbb 1px, transparent 1px)', backgroundSize: '20px 20px' }}
            onContextMenu={(e) => {
              // Prevent browser context menu so we can right-click pan smoothly
              e.preventDefault()
            }}
            onMouseDown={(e) => {
              if (isPlaying) return // In preview mode, don't intercept canvas clicks
              const wrapper = e.currentTarget
              
              // Handle Panning (Right Click OR Pan Tool active)
              if (activeTool === 'pan' || e.button === 2) {
                e.preventDefault() // prevent text selection while panning
                document.body.style.cursor = 'grabbing'
                panRef.current = {
                  startMouseX: e.clientX,
                  startMouseY: e.clientY,
                  startScrollX: wrapper.scrollLeft,
                  startScrollY: wrapper.scrollTop
                }
                return
              }

              // Handle Marquee Selection (Left Click only)
              if (e.button !== 0) return; // Only allow left-clicks for marquee selection
              const isBg = e.target.id === 'canvas-scroll-wrapper' || e.target.id === 'canvas-padding-wrapper' || e.target.id === 'canvas-root'
              if (isBg) {
                // console.log('--- MOUSE DOWN ON bg ---', e.target.id)
                if (!e.shiftKey) setSelectedIds([])
                const canvasEl = document.getElementById('canvas-root')
                if (!canvasEl) return
                const rect = canvasEl.getBoundingClientRect()
                const pxRatio = 1 / zoom
                const startX = (e.clientX - rect.left) * pxRatio
                const startY = (e.clientY - rect.top) * pxRatio
                // console.log('Setting selectionBox start', { startX, startY })
                const box = { startX, startY, currentX: startX, currentY: startY }
                selectionBoxRef.current = box
                setSelectionBox(box)
              } else {
                // console.log('--- MOUSE DOWN on NON-bg ---', e.target.id, e.target.className)
              }
            }}
          >
            <div id="canvas-padding-wrapper" className="inline-block transition-transform duration-200" style={{ padding: '50vh 50vw', transform: `scale(${zoom})`, transformOrigin: 'center' }}>
              <div
                className="relative shrink-0"
                style={{ width: canvasW, height: canvasH, backgroundColor: activeScreenNode?.fill || 'white', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.05)' }}
                data-container-id={activeScreenNode?.id || 'root'}
                id="canvas-root"
                onDragOver={e => { e.preventDefault(); setDragOverId('_canvas') }}
                onDrop={e => { e.preventDefault(); setDragOverId(null) }}
              >
                {/* Global Toast Notification inside Canvas */}
                {notification && (
                  <div className="absolute top-4 left-4 right-4 z-50 animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-none">
                    <div className="bg-surface border border-overlay/40 shadow-xl shadow-black/20 rounded-xl px-4 py-2 flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                        <svg className="w-3.5 h-3.5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </svg>
                      </div>
                      <p className="text-xs font-medium text-text">{notification.message}</p>
                    </div>
                  </div>
                )}
                {showGrid && (
                  <svg className="absolute inset-0 pointer-events-none w-full h-full text-blue-400 opacity-20 z-0">
                    {[1, 2, 3, 4, 5, 6, 7].map(i => (
                      <g key={i}>
                        <line x1={0} y1={(canvasH / 8) * i} x2={canvasW} y2={(canvasH / 8) * i} stroke="currentColor" strokeWidth="1" strokeDasharray="4 2" />
                        <line x1={(canvasW / 8) * i} y1={0} x2={(canvasW / 8) * i} y2={canvasH} stroke="currentColor" strokeWidth="1" strokeDasharray="4 2" />
                      </g>
                    ))}
                  </svg>
                )}
                {(!activeScreenNode || activeScreenNode.children?.length === 0) && (
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
                {(activeScreenNode?.children || []).map(comp => {
                  const isSelected = selectedIds.includes(comp.id)
                  const sharedProps = {
                    comp, selected: isSelected, isPlaying,
                    localVars, setLocalVars, notify: handleNotify,
                    onMouseDown: (e) => {
                      if (comp.type === 'App') return // Prevent interacting with App node
                      handleMouseDown(e, comp.id)
                    },
                    onClick: (e) => { 
                      e.stopPropagation(); 
                      if (isPlaying || comp.type === 'App') return; // Cannot select App or when playing
                      setSelectedIds([comp.id]) 
                    },
                  }
                  if (comp.type === 'Button') return <ButtonRenderer key={comp.id} {...sharedProps} />
                  if (comp.type === 'Label') return <LabelRenderer key={comp.id} {...sharedProps} />
                  if (comp.type === 'TextInput') return <TextInputRenderer key={comp.id} {...sharedProps} />
                  if (comp.type === 'Dropdown') return <DropdownRenderer key={comp.id} {...sharedProps} />
                  if (comp.type === 'Container') return (
                    <ContainerRenderer key={comp.id} {...sharedProps}
                      selectedIds={selectedIds}
                      onChildMouseDown={handleChildMouseDown}
                      onChildClick={handleChildClick}
                      onDropInto={handleDropInto}
                      dragOverId={dragOverId}
                      setDragOverId={setDragOverId}
                    />
                  )
                  if (comp.type === 'Gallery') return (
                    <GalleryRenderer key={comp.id} {...sharedProps}
                      selectedIds={selectedIds}
                      onChildMouseDown={handleChildMouseDown}
                      onChildClick={handleChildClick}
                      onDropInto={handleDropInto}
                      dragOverId={dragOverId}
                      setDragOverId={setDragOverId}
                    />
                  )
                  if (comp.type === 'Checkbox') return (
                    <CheckboxRenderer key={comp.id} {...sharedProps} />
                  )
                  if (comp.type === 'Rectangle') return (
                    <RectangleRenderer key={comp.id} {...sharedProps} />
                  )
                  if (comp.type === 'Icon') {
                    // Inject the raw SVG string from the schema mapping so it displays accurately in Canvas
                    const schemaOptionVal = SCHEMAS.Icon.properties.find(p => p.key === 'icon').options.find(o => o.value === comp.icon)
                    const svgString = schemaOptionVal ? schemaOptionVal.svg : null
                    return <IconRenderer key={comp.id} {...sharedProps} comp={{...comp, _svg: svgString}} />
                  }
                  if (comp.type === 'HtmlText') return (
                    <HtmlTextRenderer key={comp.id} {...sharedProps} />
                  )
                  if (comp.type === 'DatePicker') return (
                    <DatePickerRenderer key={comp.id} {...sharedProps} />
                  )
                  if (comp.type === 'ComboBox') return (
                    <ComboBoxRenderer key={comp.id} {...sharedProps} />
                  )
                  return null
                })}

                {/* Marquee Selection Box */}
                {selectionBox && (() => {
                  const left = Math.min(selectionBox.startX, selectionBox.currentX)
                  const top = Math.min(selectionBox.startY, selectionBox.currentY)
                  const width = Math.abs(selectionBox.startX - selectionBox.currentX)
                  const height = Math.abs(selectionBox.startY - selectionBox.currentY)
                  return (
                    <div
                      style={{
                        position: 'absolute',
                        left, top, width, height,
                        border: '1px solid #0078d4',
                        backgroundColor: 'rgba(0, 120, 212, 0.1)',
                        zIndex: 10000,
                        pointerEvents: 'none'
                      }}
                    />
                  )
                })()}

                {/* Resize handles for selected root-level component */}
                {/* Resize handles — hidden in preview mode */}
                {selectedNode && selectedIds.length === 1 && !isPlaying && (() => {
                  const comp = (activeScreenNode?.children || []).find(c => c.id === selectedNode.id)
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
          </div>

          {/* Zoom Controls */}
          <div className={`absolute right-6 flex items-center bg-surface/90 backdrop-blur-md border border-overlay/30 shadow-md shadow-black/10 rounded-lg overflow-hidden z-40 transition-all duration-300 ${chatOpen ? 'bottom-[260px]' : 'bottom-6'}`}>
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


          {/* AI Chat Panel */}
          <div className={`absolute bottom-0 left-0 w-full z-50 border-t border-overlay/30 bg-base/95 backdrop-blur-md flex flex-col transition-all duration-300 ease-in-out overflow-hidden shadow-[0_-10px_40px_rgba(0,0,0,0.3)] ${chatOpen ? 'h-60' : 'h-0'}`}>
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
                  placeholder="Describe what to build — or paste a screenshot"
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
        {showCodePane && (
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
        )}

        {/* Right Panel: Local Data OR Properties */}
        {showLocalData ? (
          <div className="w-64 shrink-0 border-l border-overlay/30 bg-surface/20 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-overlay/20 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-xs font-semibold text-text">Local Data</span>
              </div>
              <button
                onClick={() => setShowLocalData(false)}
                className="text-subtext/40 hover:text-subtext transition-colors duration-150 cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 0 1 1.06 0L12 10.94l5.47-5.47a.75.75 0 1 1 1.06 1.06L13.06 12l5.47 5.47a.75.75 0 1 1-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 0 1-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            {/* Tabs */}
            <div className="flex border-b border-overlay/20 shrink-0">
              {['variables', 'collections'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setLocalDataTab(tab)}
                  className={`flex-1 py-2 text-xs font-medium capitalize transition-colors ${
                    localDataTab === tab
                      ? 'text-emerald-300 border-b-2 border-emerald-400 bg-emerald-500/5'
                      : 'text-subtext/60 hover:text-text hover:bg-overlay/10'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
            {/* Tab Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {localDataTab === 'variables' ? (
                Object.keys(localVars).length > 0 ? (
                  <div className="flex-1 overflow-y-auto w-full">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-surface/50 border-b border-overlay/20 sticky top-0 z-10">
                        <tr>
                          <th className="px-4 py-2 text-[11px] font-semibold text-subtext/70 uppercase tracking-wide">Variable</th>
                          <th className="px-4 py-2 text-[11px] font-semibold text-subtext/70 uppercase tracking-wide">Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-overlay/10">
                        {Object.entries(localVars).map(([key, val]) => (
                          <tr key={key} className="hover:bg-overlay/5 transition-colors">
                            <td className="px-4 py-2.5 text-xs text-text border-r border-overlay/5 font-medium whitespace-nowrap overflow-hidden text-ellipsis max-w-[100px]" title={key}>{key}</td>
                            <td className="px-4 py-2.5 text-xs font-mono text-emerald-400 bg-emerald-500/5 whitespace-nowrap overflow-hidden text-ellipsis max-w-[120px]" title={String(val)}>{String(val)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
                    <div className="w-12 h-12 rounded-xl bg-overlay/20 flex items-center justify-center mb-3">
                      <svg className="w-6 h-6 text-subtext/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 0-6.23-.693L5 14.5m14.8.8 1.402 1.402c1.232 1.232.15 3.338-1.55 3.338H5.35c-1.7 0-2.783-2.106-1.55-3.338L5 14.5" />
                      </svg>
                    </div>
                    <p className="text-subtext/40 text-[11px] leading-relaxed">
                      No variables yet.<br/>Use <code className="bg-overlay/20 px-1 py-0.5 rounded text-subtext/70 font-mono">Set(VarName, "Value")</code> in a component's OnSelect property.
                    </p>
                  </div>
                )
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
                  <div className="w-12 h-12 rounded-xl bg-overlay/20 flex items-center justify-center mb-3">
                    <svg className="w-6 h-6 text-subtext/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
                    </svg>
                  </div>
                  <p className="text-subtext/40 text-xs">
                    No collections yet.
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="w-64 shrink-0 border-l border-overlay/30 bg-surface/20 flex flex-col overflow-hidden">
            {selectedNode && schema ? (
              <>
                <div className="px-4 py-3 border-b border-overlay/20 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] bg-accent/15 text-accent border border-accent/25 px-2 py-0.5 rounded-full font-medium">
                      {schema.control}
                    </span>
                    <button 
                      onClick={() => setIsTweaking(!isTweaking)}
                      className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors border ${
                        isTweaking || tweakOriginalNode ? 'bg-violet-500/20 text-violet-300 border-violet-500/40' : 'bg-surface/50 text-subtext/70 border-overlay/40 hover:text-accent hover:border-accent/40'
                      }`}
                    >
                      ✨ Tweak
                    </button>
                  </div>
                  
                  {isTweaking && !tweakOriginalNode && (
                    <div className="flex flex-col gap-2 p-2.5 bg-violet-500/10 border border-violet-500/20 rounded-lg animate-in fade-in zoom-in-95 duration-200">
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

                  {tweakOriginalNode && (
                    <div className="flex items-center justify-between p-2.5 bg-violet-500/10 border border-violet-500/30 rounded-lg animate-in fade-in zoom-in-95 duration-200">
                      <span className="text-[11px] font-medium text-violet-200">Review tweaks</span>
                      <div className="flex items-center gap-1.5">
                        <button onClick={undoTweak}
                          className="text-[10px] px-2 py-1 rounded-md border border-overlay/40 hover:bg-red/10 hover:text-red hover:border-red/40 text-subtext transition-colors">
                          Undo
                        </button>
                        <button onClick={confirmTweak}
                          className="text-[10px] px-2 py-1 rounded-md bg-violet-500 hover:bg-violet-600 text-white font-medium transition-colors">
                          Keep
                        </button>
                      </div>
                    </div>
                  )}

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
                      {' · '}Select this container then click &quot;Add Component&quot; to add children.
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
        )}
      </div>
    </div>
  )
}

export {
  screenToYaml,
  componentToYaml,
  ButtonRenderer,
  LabelRenderer,
  TextInputRenderer,
  DropdownRenderer,
  ContainerRenderer,
  GalleryRenderer,
  CheckboxRenderer,
  RectangleRenderer,
  IconRenderer,
  createFromSpec
}
