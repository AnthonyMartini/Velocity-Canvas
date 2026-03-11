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
    const placed = { ...removed, x: Math.max(0, removed.x), y: Math.max(0, removed.y) }
    return insertNode(without, placed, null)
  } else {
    const targetNode = findNode(prevTree, targetContainerId)
    if (targetNode?.type === 'Screen') {
      const placed = { ...removed, x: Math.max(0, removed.x), y: Math.max(0, removed.y) }
      return insertNode(without, placed, targetContainerId)
    }
    // Place slightly offset inside the new container
    const placed = { ...removed, x: 10, y: 10 }
    return insertNode(without, placed, targetContainerId)
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// PowerFx Mini-Evaluator Helpers
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Evaluates a string value.
 * If strictly quoted (e.g. "Hello" or ="Hello"), it returns the inner string literal.
 * Otherwise, it treats the string as a variable name and looks it up in localVars.
 */
export function evaluateValue(expression, localVars = {}) {
  if (typeof expression !== 'string') return expression
  let trimmed = expression.trim()
  if (!trimmed) return ''

  // If it starts with '=', it's a PowerFx formula, strip it
  if (trimmed.startsWith('=')) {
    trimmed = trimmed.slice(1).trim()
  }
  
  // Check if it's a quoted literal (support both double and single quotes)
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || 
      (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    // Return stripped quotes
    return trimmed.slice(1, -1)
  }
  
  // Otherwise, if it was an evaluated formula (or looks like a variable), resolve it
  // For backwards compatibility, if it doesn't start with = and isn't in localVars, return itself
  if (localVars[trimmed] !== undefined) return localVars[trimmed]
  
  return trimmed // fallback for raw text without =
}

/**
 * Executes a semi-colon separated string of actions, currently supporting Set() and Notify().
 * @param {string} formula
 * @param {object} localVars - Current global variables dictionary
 * @param {function} setLocalVars - State setter for localVars
 * @param {function} notify - Function to trigger a toast (msg) => void
 */
export function executeAction(formula, localVars, setLocalVars, notify) {
  if (!formula || typeof formula !== 'string') return

  // Split by semi-colons, though a naive split might break strings containing semi-colons.
  // We'll do a simple split and trim for this prototype.
  const statements = formula.split(';').map(s => s.trim()).filter(Boolean)

  const newlySetVars = { ...localVars }
  let varsChanged = false

  for (const statement of statements) {
    if (statement.startsWith('Set(') && statement.endsWith(')')) {
      // Parse Set(VarName, Value)
      const argsStr = statement.slice(4, -1).trim() // e.g. 'VarName, "Hello"'
      // Naive split by first comma
      const commaIdx = argsStr.indexOf(',')
      if (commaIdx > -1) {
        const varName = argsStr.slice(0, commaIdx).trim()
        const valExpr = argsStr.slice(commaIdx + 1).trim()
        
        // Evaluate the second argument, which might be a literal string or another variable reference
        const val = evaluateValue(valExpr, newlySetVars)
        newlySetVars[varName] = val
        varsChanged = true
      }
    } else if (statement.startsWith('Notify(') && statement.endsWith(')')) {
      // Parse Notify("Message")
      const msgExpr = statement.slice(7, -1).trim()
      const msg = evaluateValue(msgExpr, newlySetVars)
      if (notify && typeof notify === 'function') {
        notify(msg)
      }
    }
  }

  // Update React state if Set() was called
  if (varsChanged && typeof setLocalVars === 'function') {
    setLocalVars(newlySetVars)
  }
}
