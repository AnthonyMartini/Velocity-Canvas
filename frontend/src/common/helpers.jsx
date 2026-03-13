import { parseFormula, evaluateAST } from './FormulaParser.jsx'

/**
 * Copies `text` to the clipboard.
 * Falls back to the execCommand approach if the Clipboard API isn't available.
 *
 * @param {string} text
 */
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    const el = document.createElement('textarea')
    el.value = text
    document.body.appendChild(el)
    el.select()
    document.execCommand('copy')
    document.body.removeChild(el)
  }
}

/**
 * Returns a syntax-highlighted JSX element for a single PA YAML output line.
 *
 * @param {string} line   - The raw line string
 * @param {number} index  - Line index (used as React key)
 * @returns {JSX.Element}
 */
export function highlightYamlLine(line, index) {
  const trimmed = line.trimStart()

  if (trimmed.startsWith('-') && trimmed.endsWith(':')) {
    return <div key={index} className="text-violet-300 font-semibold">{line}</div>
  }
  if (/^Control:/.test(trimmed)) {
    return <div key={index} className="text-blue-300">{line}</div>
  }
  if (/^Properties:|^Children:/.test(trimmed)) {
    return <div key={index} className="text-accent/70 font-semibold">{line}</div>
  }
  if (/^[A-Z][A-Za-z]+:/.test(trimmed)) {
    const [, val] = line.split(/:\s*=?/)
    return (
      <div key={index}>
        <span className="text-blue-200/80">{line.split(':')[0]}</span>
        <span className="text-subtext/50">: </span>
        <span className="text-green-300/80">={val?.trim()}</span>
      </div>
    )
  }

  return <div key={index} className="text-text/80">{line}</div>
}

// ──────────────────────────────────────────────────────────────────────────────
// Tree Helpers (Immutable Node Operations)
// ──────────────────────────────────────────────────────────────────────────────

let _id = 0
export const uid = () => `comp_${++_id}`

/** Find a node anywhere in the tree by id */
export function findNode(nodes, id) {
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
export function updateNode(nodes, id, updater) {
  return nodes.map(n => {
    if (n.id === id) return { ...n, ...updater(n) }
    if (n.children?.length) return { ...n, children: updateNode(n.children, id, updater) }
    return n
  })
}

/** Remove a node from the tree, return [newTree, removedNode] */
export function removeNode(nodes, id) {
  let removed = null
  const next = []
  for (const n of nodes) {
    if (n.id === id) {
      if (n.type === 'App') {
        // Cannot delete root App node
        next.push(n)
        continue
      }
      removed = n
      continue
    }
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
export function insertNode(nodes, node, parentId) {
  if (!parentId) return [...nodes, node]
  return nodes.map(n => {
    if (n.id === parentId) return { ...n, children: [...(n.children || []), node] }
    if (n.children?.length) return { ...n, children: insertNode(n.children, node, parentId) }
    return n
  })
}

/** Flatten tree to a list (for layers panel) with depth info */
export function flattenTree(nodes, collapsedIds = new Set(), depth = 0) {
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
export function findParent(nodes, id, parent = null) {
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
export function isDescendant(nodes, targetId, ancestorId) {
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
export function handleDropLogic(prevTree, dragId, targetContainerId) {
  if (dragId === targetContainerId) return prevTree
  
  // Block dragging into App root directly (must go into a screen)
  if (targetContainerId) {
    const targetNode = findNode(prevTree, targetContainerId)
    if (targetNode?.type === 'App') return prevTree
  }
  
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
    const placed = { ...removed, X: Math.max(0, removed.X), Y: Math.max(0, removed.Y) }
    return insertNode(without, placed, null)
  } else {
    const targetNode = findNode(prevTree, targetContainerId)
    if (targetNode?.type === 'Screen') {
      const placed = { ...removed, X: Math.max(0, removed.X), Y: Math.max(0, removed.Y) }
      return insertNode(without, placed, targetContainerId)
    }
    // Place slightly offset inside the new container
    const placed = { ...removed, X: 10, Y: 10 }
    return insertNode(without, placed, targetContainerId)
  }
}

/**
 * Generates a unique name for a component, appending _1, _2, etc.
 * @param {string} baseName - The starting name (e.g. "Logo")
 * @param {string[]} existingNames - List of all names currently in the tree
 */
export function getNextAvailableName(baseName, existingNames) {
  // Regex to match "Name" and optionally "_N" or just a number (for backward compatibility)
  // We prioritize the _N pattern requested by the user.
  const match = baseName.match(/^(.*?)(?:_(\d+))?$/)
  const nameWithoutSuffix = match[1]
  
  let counter = 1
  // If the baseName itself already has a _N suffix, we start incrementing from there
  if (match[2]) {
    counter = parseInt(match[2], 10) + 1
  }

  let newName = `${nameWithoutSuffix}_${counter}`
  while (existingNames.includes(newName)) {
    counter++
    newName = `${nameWithoutSuffix}_${counter}`
  }
  
  return newName
}

/**
 * Calculates the absolute (canvas-root) position of a node by summing parent offsets.
 * @param {Array} tree - The full tree
 * @param {string} nodeId - Target node ID
 * @param {Array} flatNodes - Flat array for resolving formulas
 * @param {Object} localVars - Vars for resolving formulas
 * @returns {{x: number, y: number}}
 */
export function getNodeAbsolutePosition(tree, nodeId, flatNodes = [], localVars = {}) {
  let x = 0, y = 0
  let currentId = nodeId
  
  while (currentId) {
    const node = findNode(tree, currentId)
    if (!node) break
    const parent = findParent(tree, currentId)
    
    // Resolve node properties (including X and Y formulas)
    const resolvedNode = resolveProperties(node, localVars, flatNodes, parent);

    // Screens and App usually have x,y=0 or are the root, 
    // but we add whatever offsets they have.
    x += (resolvedNode.X || 0)
    y += (resolvedNode.Y || 0)
    
    // If it's a Screen or App, stop there (absolute coordinate space ends at Screen)
    if (node.type === 'Screen' || node.type === 'App') break
    
    currentId = parent?.id
  }
  
  return { x, y }
}

// ──────────────────────────────────────────────────────────────────────────────
// PowerFx Mini-Evaluator Helpers
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Resolves all properties for a single component, evaluating formulas.
 * Ignores structural properties and events.
 * Coerces into numbers if the target schema property is a number.
 */
export function resolveProperties(comp, localVars, flatNodes, parentNode = null) {
  const skipProps = new Set(['id', 'type', 'name', 'children', 'Fill', 'Color', 'BorderColor', 'Image']) // Added some styling ones if needed, but we can evaluate colors too. Actually, restrict to evaluating everything except structural.
  
  const resolved = { ...comp }
  for (const key of Object.keys(comp)) {
    if (key === 'id' || key === 'type' || key === 'name' || key === 'children' || key.startsWith('On')) {
      continue
    }

    const val = comp[key]
    if (typeof val === 'string') {
      const ast = parseFormula(val)
      const evaluated = evaluateAST(ast, localVars, flatNodes, new Set(), parentNode, comp)
      
      // Basic heuristic: if it looks like a number and isn't "#CYCLE!", parse it
      // to support numeric properties like Width, Height, X, Y
      if (evaluated !== '#CYCLE!' && typeof evaluated === 'string' && !isNaN(Number(evaluated)) && evaluated.trim() !== '') {
         resolved[key] = Number(evaluated)
      } else {
         resolved[key] = evaluated
      }
    }
  }
  return resolved
}

/**
 * Executes a semi-colon separated string of actions, currently supporting Set(), Notify(), and Navigate().
 * @param {string} formula
 * @param {object} localVars - Current global variables dictionary
 * @param {function} setLocalVars - State setter for localVars
 * @param {function} notify - Function to trigger a toast: (msg) => void
 * @param {function} navigate - Function to trigger a screen change: (screenName) => void
 * @param {array} flatNodes - The full flat array of nodes for property lookup
 * @param {object} parentNode - The direct parent of the triggering component
 */
export function executeAction(formula, localVars, setLocalVars, notify, navigate, flatNodes = [], parentNode = null, selfNode = null) {
  if (!formula || typeof formula !== 'string') return

  let trimmedFormula = formula.trim()
  if (trimmedFormula.startsWith('=')) {
    trimmedFormula = trimmedFormula.slice(1).trim()
  }

  // Set up the context for the evaluator
  const context = { notify, navigate, setVariable: setLocalVars }

  // We can just parse the formula and execute it directly, because the AST evaluator 
  // supports ActionSequence and FunctionCall execution natively now.
  let varsChanged = false

  // Wrap the setLocalVars in the context so we can track if it was called
  context.setVariable = (varName, value) => {
      setLocalVars(prev => ({...prev, [varName]: value}))
      varsChanged = true
  }

  const ast = parseFormula(trimmedFormula)
  evaluateAST(ast, localVars, flatNodes, new Set(), parentNode, selfNode, context)
}
