import React from 'react'
import { parseFormula, evaluateAST } from './FormulaParser'
import { ALL_ENUM_VALUES } from '../components/RendererPage/Functions'
import { SCHEMAS } from '../components/RendererPage/constants'
import { mergePreservedPowerAppsYaml } from '@/lib/powerapps-import'

const PROPERTY_DEF_CACHE = new Map()

function getPropertyDefsForType(type) {
  if (!type) return []
  if (PROPERTY_DEF_CACHE.has(type)) return PROPERTY_DEF_CACHE.get(type)

  const schema = SCHEMAS?.[type]
  const propertyDefs = schema?.groups
    ? schema.groups.reduce((acc, group) => acc.concat(group.properties || []), [])
    : (schema?.properties || [])

  PROPERTY_DEF_CACHE.set(type, propertyDefs)
  return propertyDefs
}

export function normalizeFormulaString(value) {
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  return trimmed.startsWith('=') ? trimmed.slice(1).trim() : trimmed
}

function getFormulaFlag(node, propDef) {
  const propKey = propDef?.key || propDef?.name
  if (!propKey || !node?._formulaProps || typeof node._formulaProps !== 'object') return false
  return node._formulaProps[propKey] === true
}

function looksLikeFormulaExpression(value, propDef: any = null) {
  const normalized = normalizeFormulaString(value)
  if (typeof normalized !== 'string' || !normalized) return false

  if (
    propDef?.type === 'color' &&
    /^(RGBA|ColorValue)\([^()]*\)$/i.test(normalized)
  ) {
    return false
  }

  if (
    (/^".*"$/.test(normalized) || /^'.*'$/.test(normalized)) ||
    /^-?\d+(?:\.\d+)?$/.test(normalized) ||
    /^(true|false)$/i.test(normalized) ||
    /^#(?:[0-9a-fA-F]{3,8})$/.test(normalized) ||
    /^[A-Z][A-Za-z0-9_]*\.[A-Z][A-Za-z0-9_]*$/.test(normalized)
  ) {
    return false
  }

  return (
    /[()&+\-*/<>=;,[\]{}:]/.test(normalized) ||
    /^(Parent|Self|ThisItem|ThisRecord)\./.test(normalized) ||
    /^[A-Za-z_][A-Za-z0-9_]*\s*\(/.test(normalized) ||
    /^[A-Za-z_][A-Za-z0-9_]*\.[A-Za-z0-9_]+/.test(normalized)
  )
}

export function isFormulaValue(value, propDef: any = null, node: any = null) {
  if (typeof value !== 'string') return false
  if (value.trim().startsWith('=')) return true
  if (getFormulaFlag(node, propDef)) return true
  return looksLikeFormulaExpression(value, propDef)
}

export function isEventProperty(propDef) {
  return (
    propDef?.propertyType === 'Event' ||
    propDef?.type === 'event' ||
    ((propDef?.type === 'string' || propDef?.type === 'text') && propDef?.name?.startsWith('On')) ||
    propDef?.key?.startsWith('On')
  )
}

export function getPropertyOptionValues(propDef) {
  if (!Array.isArray(propDef?.options)) return []
  return propDef.options
    .map((opt: any) => (typeof opt === 'object' && opt !== null && 'value' in opt ? opt.value : opt))
    .filter((value: any) => value !== undefined && value !== null)
}

export function getPropertyValueType(propDef) {
  if (isEventProperty(propDef)) return 'event'
  if (getPropertyOptionValues(propDef).length > 0) return 'enum'

  switch (propDef?.type) {
    case 'number':
      return 'number'
    case 'boolean':
      return 'boolean'
    case 'color':
      return 'color'
    case 'table':
      return 'table'
    default:
      return 'text'
  }
}

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
  if (/^[A-Z][A-Za-z0-9]+:/.test(trimmed)) {
    const colonIndex = line.indexOf(':')
    const key = line.substring(0, colonIndex)
    const val = line.substring(colonIndex + 1)
    return (
      <div key={index}>
        <span className="text-blue-200/80">{key}</span>
        <span className="text-subtext/50">:</span>
        <span className="text-green-300/80">{val}</span>
      </div>
    )
  }

  return <div key={index} className="text-text/80">{line}</div>
}

// ──────────────────────────────────────────────────────────────────────────────
// Tree Helpers (Immutable Node Operations)
// ──────────────────────────────────────────────────────────────────────────────

export const uid = () => `comp_${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36)}`

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
    if (n.id === id) {
      const updates = updater(n) || {}
      return { ...n, ...mergePreservedPowerAppsYaml(n, updates) }
    }
    if (n.children?.length) return { ...n, children: updateNode(n.children, id, updater) }
    return n
  })
}

/** Remove a node from the tree, return [newTree, removedNode] */
export function removeNode(nodes, id) {
  let removed: any = null
  const next: any[] = []
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
  if (!parentId) return [...nodes, node] // Append so it's drawn last (on top)
  return nodes.map(n => {
    if (n.id === parentId) {
      if (node.type === 'Screen' && n.type === 'App') {
        return { ...n, children: [node, ...(n.children || [])] }
      }
      return { ...n, children: [...(n.children || []), node] } 
    }
    if (n.children?.length) return { ...n, children: insertNode(n.children, node, parentId) }
    return n
  })
}

/** Flatten tree to a list (for layers panel) with depth info */
export function flattenTree(nodes, collapsedIds: Set<any> = new Set(), depth = 0) {
  const result: any[] = []
  // Iterate backwards so the front-most (last in array) appears at the top of the list
  for (let i = nodes.length - 1; i >= 0; i--) {
    const n = nodes[i]
    result.push({ ...n, _depth: depth })
    if (n.children?.length && !collapsedIds.has(n.id)) {
      result.push(...flattenTree(n.children, collapsedIds, depth + 1))
    }
  }
  return result
}

export function countComponentNodes(node) {
  if (!node || typeof node !== 'object') return 0

  let count = node.type && node.type !== 'App' && node.type !== 'Screen' ? 1 : 0
  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      count += countComponentNodes(child)
    }
  }

  return count
}

export function buildTreeMetadata(tree) {
  const nodeById = new Map()
  const parentById = new Map()
  const screenById = new Map()
  const componentCountByScreenId = new Map()

  const walk = (nodes, parent: any = null, screen: any = null) => {
    for (const node of nodes || []) {
      nodeById.set(node.id, node)
      parentById.set(node.id, parent)

      const nextScreen = node.type === 'Screen' ? node : screen
      if (node.type === 'Screen' && !componentCountByScreenId.has(node.id)) {
        componentCountByScreenId.set(node.id, 0)
      }
      if (nextScreen) {
        screenById.set(node.id, nextScreen)
      }
      if (nextScreen && node.type !== 'App' && node.type !== 'Screen') {
        componentCountByScreenId.set(
          nextScreen.id,
          (componentCountByScreenId.get(nextScreen.id) || 0) + 1
        )
      }

      if (node.children?.length) {
        walk(node.children, node, nextScreen)
      }
    }
  }

  walk(tree)

  return {
    nodeById,
    parentById,
    screenById,
    componentCountByScreenId,
  }
}

/** Find the direct parent container of a node, or null if at root */
export function findParent(nodes, id, parent: any = null) {
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
 * Reorders a node within its parent's sibling list.
 * direction: 'up' (one step to front), 'down' (one step to back), 'front' (top of stack), 'back' (bottom of stack)
 */
export function reorderNode(nodes, id, direction) {
  const index = nodes.findIndex(n => n.id === id)
  if (index !== -1) {
    const newNodes = [...nodes]
    const node = newNodes.splice(index, 1)[0]
    if (direction === 'up') {
      newNodes.splice(Math.min(nodes.length - 1, index + 1), 0, node)
    } else if (direction === 'down') {
      newNodes.splice(Math.max(0, index - 1), 0, node)
    } else if (direction === 'front') {
      newNodes.push(node)
    } else if (direction === 'back') {
      newNodes.unshift(node)
    }
    return newNodes
  }
  return nodes.map(n => {
    if (n.children?.length) return { ...n, children: reorderNode(n.children, id, direction) }
    return n
  })
}

/**
 * Generates a unique name for a component, appending _1, _2, etc.
 * @param {string} baseName - The starting name (e.g. "Logo")
 * @param {string[]} existingNames - List of all names currently in the tree
 */
export function getNextAvailableName(baseName, existingNames) {
  const normalizedBaseName = String(baseName || '').trim() || 'Component'
  const takenNames = new Set(
    (existingNames || [])
      .map(name => String(name || '').trim().toLowerCase())
      .filter(Boolean)
  )

  // Regex to match "Name" and optionally "_N" or just a number (for backward compatibility)
  // We prioritize the _N pattern requested by the user.
  const match = normalizedBaseName.match(/^(.*?)(?:_(\d+))?$/)
  const nameWithoutSuffix = match?.[1] || normalizedBaseName

  let counter = 1
  // If the baseName itself already has a _N suffix, we start incrementing from there
  if (match?.[2]) {
    counter = parseInt(match[2], 10) + 1
  }

  let newName = `${nameWithoutSuffix}_${counter}`
  while (takenNames.has(newName.toLowerCase())) {
    counter++
    newName = `${nameWithoutSuffix}_${counter}`
  }

  return newName
}

export function ensureUniqueNodeNames(node, existingNames: any[] = []) {
  if (!node || typeof node !== 'object') return node

  const reservedNames = [...(existingNames || [])]

  const reserveUniqueName = (candidateName, fallbackName = 'Component') => {
    const normalizedName = String(candidateName || '').trim() || fallbackName
    const takenNames = new Set(reservedNames.map(name => String(name || '').trim().toLowerCase()).filter(Boolean))
    const nextName = takenNames.has(normalizedName.toLowerCase())
      ? getNextAvailableName(normalizedName, reservedNames)
      : normalizedName

    reservedNames.push(nextName)
    return nextName
  }

  const walk = (currentNode) => {
    if (!currentNode || typeof currentNode !== 'object') return currentNode

    const uniqueName = reserveUniqueName(currentNode.name, currentNode.type || 'Component')
    const nextNode = { ...currentNode, name: uniqueName }

    if (Array.isArray(currentNode.children)) {
      nextNode.children = currentNode.children.map(child => walk(child))
    }

    return nextNode
  }

  return walk(node)
}

export function ensureUniqueNodeListNames(nodes, existingNames: any[] = []) {
  if (!Array.isArray(nodes)) return nodes

  const reservedNames = [...(existingNames || [])]
  return nodes.map(node => {
    const uniqueNode = ensureUniqueNodeNames(node, reservedNames)
    const uniqueNames = flattenTree([uniqueNode]).map(n => n.name)
    reservedNames.push(...uniqueNames)
    return uniqueNode
  })
}

/**
 * Calculates the absolute (canvas-root) position of a node by summing parent offsets.
 * @param {Array} tree - The full tree
 * @param {string} nodeId - Target node ID
 * @param {Array} flatNodes - Flat array for resolving formulas
 * @param {Object} localVars - Vars for resolving formulas
 * @returns {{x: number, y: number}}
 */
export function getNodeAbsolutePosition(tree, nodeId, flatNodes: any[] = [], localVars = {}, treeMeta: any = null) {
  let x = 0, y = 0
  let currentId = nodeId
  
  while (currentId) {
    const node = treeMeta?.nodeById?.get(currentId) || findNode(tree, currentId)
    if (!node) break
    const parent = treeMeta?.parentById?.get(currentId) ?? findParent(tree, currentId)
    
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
export function resolveProperties(comp, localVars, flatNodes, parentNode: any = null) {
  const resolved = { ...comp }
  const propertyDefs = getPropertyDefsForType(comp?.type)
  const propertyDefByKey = new Map<string, any>(propertyDefs.map((property: any) => [property.key || property.name, property]))

  for (const key of Object.keys(comp)) {
    if (key === 'id' || key === 'type' || key === 'name' || key === 'children' || key === 'sourceControl' || key.startsWith('_') || key.startsWith('On')) {
      continue
    }

    const propDef = propertyDefByKey.get(key)
    if (propDef?.propertyType === 'Output') {
      continue
    }

    const val = comp[key]
    if (typeof val === 'string' && val.trim() !== '') {
      const ast = parseFormula(val)
      const evaluated = evaluateAST(ast, localVars, flatNodes, new Set<string>(), parentNode, comp)
      
      // Basic heuristic: if it looks like a number and isn't "#CYCLE!", parse it
      // to support numeric properties like Width, Height, X, Y
      if (evaluated !== '#CYCLE!' && evaluated !== null && evaluated !== undefined) {
        if (typeof evaluated === 'string' && !isNaN(Number(evaluated)) && evaluated.trim() !== '') {
           resolved[key] = Number(evaluated)
        } else {
           resolved[key] = evaluated
        }
      }
    }
  }
  return resolved
}

/**
 * Validates a single property on a component, mimicking the logic in PropField.
 * Returns an error string or null if valid.
 */
export function validateProperty(node, propDef, value, localVars, flatNodes, parentNode: any = null, options: any = null) {
  if (value === undefined || value === null) return null
  const valStr = String(value)
  const expectedType = getPropertyValueType(propDef)
  const isEvent = expectedType === 'event'

  if (valStr.trim() === '') {
    if (expectedType === 'number') return "Required"
    return null
  }

  if (!isEvent && (propDef.type === 'string' || propDef.type === 'text') && valStr.includes("'")) {
    return 'Single quotes are not allowed in text properties. Use double quotes instead.'
  }
  
  try {
    const controlNames = options?.controlNames || null
    const screens = options?.screens || null
    const ast = parseFormula(valStr, true)
    const context: any = {
      isControl: (name: any) => controlNames ? controlNames.has(name) : flatNodes.some((n: any) => n.name === name),
      screens: screens || flatNodes.filter((n: any) => n.type === 'Screen'),
      isActionContext: isEvent
    }

    const evaluated = evaluateAST(ast, localVars, flatNodes, new Set<string>(), parentNode, node, context, true)

    if (evaluated instanceof Error) return evaluated.message

    if (!isEvent && ast.type === 'ActionSequence') {
      return "Actions cannot be used in property formulas"
    }

    if (expectedType === 'number') {
      const n = Number(evaluated)
      if (isNaN(n)) return "Must evaluate to a number"
    }

    if (expectedType === 'boolean') {
      if (typeof evaluated !== 'boolean') return "Must evaluate to a boolean"
    }

    // 'table' type accepts arrays, objects, or strings — no further type check needed
    if (expectedType === 'table') {
      return null
    }

    if (expectedType === 'enum') {
      const validValues = getPropertyOptionValues(propDef)
      if (!validValues.includes(evaluated)) {
        return `Invalid enum value. Expected one of: ${validValues.slice(0, 3).join(', ')}${validValues.length > 3 ? '...' : ''}`
      }
    }

    if (expectedType === 'color') {
      if (typeof evaluated !== 'string' || ALL_ENUM_VALUES.has(evaluated)) {
        return "Must evaluate to a color value"
      }
    }

    if (expectedType === 'text') {

      if (typeof evaluated === 'string' && ALL_ENUM_VALUES.has(evaluated)) {
        return "Enum values cannot be used in text properties"
      }
      // Arrays come from Table() / [...] expressions — don't flag them as text errors.
      // They only appear in table-typed properties like Gallery.Items.
      if (Array.isArray(evaluated)) return null
      if (evaluated !== null && evaluated !== undefined && typeof evaluated !== 'string') {
        return "Must evaluate to a text value"
      }
    }

    // Additional check: If the value looks like a formula (e.g. contains a function call pattern)
    // but evaluateAST returned the raw string because it failed to resolve but wasn't caught by strict mode,
    // we should flag it if it's identical to the input and looks like a typo.
    // However, strict mode evaluateAST *should* return an Error for unresolved functions now.
    // So this check mainly ensures that if it returns an Error object, we catch it.
    if (evaluated && typeof evaluated === 'object' && evaluated instanceof Error) {
       return evaluated.message;
    }

  } catch (e) {
    return e.message
  }

  return null
}

/**
 * Gets all property validation errors in the app.
 * Returns an array of: { nodeId, nodeName, path, propName, error }
 */
export function getAllAppErrors(tree, localVars, schemas, options: any = {}) {
  const { flatNodes: providedFlatNodes = null, treeMeta = null } = options
  const errors: any[] = []
  const flatNodes = providedFlatNodes || flattenTree(tree, new Set<string>())
  const parentById = treeMeta?.parentById || null
  const screenById = treeMeta?.screenById || null
  const validationContext = {
    controlNames: new Set(flatNodes.map((n: any) => n.name).filter(Boolean)),
    screens: flatNodes.filter((n: any) => n.type === 'Screen'),
  }

  // Walk the tree
  for (const node of flatNodes) {
    // App and Screen nodes can also have properties (like Screen.Fill)
    const schema = schemas[node.type]
    if (!schema) continue

    const parentNode = parentById?.get(node.id) ?? findParent(tree, node.id)
    
    // Attempt to find the screen name for the path
    let screenName = 'App'
    if (node.type === 'Screen') {
      screenName = node.name
    } else {
      const screenNode = screenById?.get(node.id) || flatNodes.find(n => n.type === 'Screen' && isDescendant(tree, node.id, n.id))
      if (screenNode) screenName = screenNode.name
    }

    // Check all properties defined in the schema
    const allProps = getPropertyDefsForType(node.type)

    for (const propDef of allProps) {
      const propKey = propDef.key || propDef.name
      
      // Skip structural and computed internal props
      if (['id', 'type', 'name', 'children'].includes(propKey)) continue
      if (propDef.propertyType === 'Output') continue
      
      const value = node[propKey]
      
      // We validate anything that has a value or is explicitly in the schema
      if (value !== undefined && value !== null) {
         const error = validateProperty(node, propDef, value, localVars, flatNodes, parentNode, validationContext)
         if (error) {
           errors.push({
             nodeId: node.id,
             nodeName: node.name,
             path: `${screenName}${node.type !== 'Screen' ? '.' + node.name : ''}.${propKey}`,
             propName: propKey,
             error: error
           })
         }
      }
    }
  }

  return errors
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
export function executeAction(formula, localVars, setLocalVars, notify, navigate, flatNodes: any[] = [], parentNode: any = null, selfNode: any = null) {
  if (!formula || typeof formula !== 'string') return

  const trimmedFormula = normalizeFormulaString(formula)

  // Set up the context for the evaluator
  const context: any = { notify, navigate, setVariable: setLocalVars, screens: flatNodes.filter((n: any) => n.type === 'Screen'), isActionContext: true }

  // We can just parse the formula and execute it directly, because the AST evaluator 
  // supports ActionSequence and FunctionCall execution natively now.
  // Wrap the setLocalVars in the context so we can track if it was called
  context.setVariable = (varName, value) => {
      setLocalVars(prev => ({...prev, [varName]: value}))
  }

  const ast = parseFormula(trimmedFormula)
    evaluateAST(ast, localVars, flatNodes, new Set<string>(), parentNode, selfNode, context)
}
