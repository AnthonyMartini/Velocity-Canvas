import { FUNCTIONS, NotificationType, Align, VerticalAlign, FontWeight, BorderStyle, DisplayMode, DateTimeFormat, Overflow, Icon, DropShadow, TextMode, TextFormat, Layout, ALL_ENUM_VALUES, ModernButtonAppearance, ModernButtonLayout, ModernButtonIconStyle, TabListAlignment, LayoutDirection, TabListAppearance, TabSize, SortOrder, coerceFormulaNumber, coerceFormulaText } from '@/features/powerapps/functions'
import { SCHEMAS } from '@/features/powerapps/schema'

/**
 * Output properties (e.g. Tab List `Selected`) are often stored as JSON object strings.
 * When walking `Control.Selected.Value`, unwrap so nested record fields resolve.
 */
function unwrapJsonRecordString(value: any): any {
  if (typeof value !== 'string') return value
  const t = value.trim()
  if (!t.startsWith('{')) return value
  try {
    const parsed = JSON.parse(t)
    if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed
  } catch {
    return value
  }
  return value
}

/**
 * Parses a formula string into an Abstract Syntax Tree (AST).
 * Handles function calls, property access (Component.Property), strings, numbers, booleans, and math operators.
 * @param {string} formula
 * @param {boolean} strict - If true, throws syntax errors instead of returning a literal.
 * @returns {object} AST node
 */
export function parseFormula(formula, strict = false) {
  if (typeof formula !== 'string') return { type: 'Literal', value: formula }
  if (formula.trim() === '') return { type: 'Literal', value: '' }
  
  let text = formula.trim()
  if (text.startsWith('=')) {
    text = text.slice(1).trim()
  }

  // Tokenizer
  const tokens: Array<{ type: string; value: any }> = []
  // Updated regex to include # for hex colors and maybe some basic logical operators
  const regex = /("[^"]*"|'[^']*')|([A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z0-9_]+)+)|([A-Za-z_][A-Za-z0-9_]*)|(#(?:[0-9a-fA-F]{3}){1,2}|#(?:[0-9a-fA-F]{4}){1,2}|#(?:[0-9a-fA-F]{8}))|([0-9]+(?:\.[0-9]+)?)|(<=|>=|<>|[()=+\-*/&,;<>!|{}\[\]:.]|(?:\r?\n)+)/g
  let match
  
  while ((match = regex.exec(text)) !== null) {
    const [full, isString, isProp, isWord, isColor, isNum, isSymbol] = match
    
    if (isString) {
      tokens.push({ type: 'String', value: full.slice(1, -1) })
    } else if (isProp) {
      tokens.push({ type: 'PropertyAccess', value: full })
    } else if (isWord) {
      const lower = full.toLowerCase()
      if (lower === 'true') tokens.push({ type: 'Boolean', value: true })
      else if (lower === 'false') tokens.push({ type: 'Boolean', value: false })
      else tokens.push({ type: 'Identifier', value: full })
    } else if (isColor) {
      // Treat hex colors as strings/literals
      tokens.push({ type: 'String', value: full })
    } else if (isNum) {
      tokens.push({ type: 'Number', value: Number(full) })
    } else if (isSymbol) {
      tokens.push({ type: 'Symbol', value: full })
    }
  }

  let currentTokenIdx = 0
  
  function peek() {
    return tokens[currentTokenIdx]
  }

  function consume() {
    return tokens[currentTokenIdx++]
  }

  // Recursive Descent Parser
  
  // parseExpression handles the lowest precedence operators (concatenation &, then math)
  function parseExpression() {
      return parseActionSequence()
  }

  function parseActionSequence() {
      let left = parseConcatenation()

      while (peek() && peek().value === ';') {
          consume() // consume ';'
          const right = parseConcatenation()
          left = { type: 'ActionSequence', left, right }
      }
      return left
  }

  function parseConcatenation() {
    let left = parseComparison()
    
    while (peek() && peek().value === '&') {
      const op = consume().value
      const right = parseComparison()
      left = { type: 'BinaryExpression', operator: op, left, right }
    }
    return left
  }

  function parseComparison() {
    let left = parseAddition()
    const comparisonOps = ['=', '<>', '>', '<', '>=', '<=']
    
    while (peek() && comparisonOps.includes(peek().value)) {
      const op = consume().value
      const right = parseAddition()
      left = { type: 'BinaryExpression', operator: op, left, right }
    }
    return left
  }

  function parseAddition() {
    let left = parseMultiplication()
    
    while (peek() && (peek().value === '+' || peek().value === '-')) {
      const op = consume().value
      const right = parseMultiplication()
      left = { type: 'BinaryExpression', operator: op, left, right }
    }
    return left
  }

  function parseMultiplication() {
    let left = parseUnary()
    
    while (peek() && (peek().value === '*' || peek().value === '/')) {
      const op = consume().value
      const right = parseUnary()
      left = { type: 'BinaryExpression', operator: op, left, right }
    }
    return left
  }

  function parseUnary() {
    if (peek() && peek().value === '!') {
      const op = consume().value
      const argument = parseUnary()
      return { type: 'UnaryExpression', operator: op, argument }
    }
    return parseAtomic()
  }

  function parseAtomic() {
    const token = consume()
    if (!token) return { type: 'Literal', value: null }

    if (token.type === 'String' || token.type === 'Number' || token.type === 'Boolean') {
      return { type: 'Literal', value: token.value }
    }
    
    if (token.type === 'PropertyAccess') {
      return { type: 'PropertyAccess', value: token.value }
    }

    // Record literal: { Key: expr, Key2: expr2 }
    if (token.type === 'Symbol' && token.value === '{') {
      const fields: Record<string, any> = {}
      while (peek() && peek().value !== '}') {
        // key can be an Identifier
        const keyToken = consume()
        if (!keyToken) break
        const fieldName = keyToken.value
        // consume ':'
        if (peek() && peek().value === ':') consume()
        fields[fieldName] = parseExpression()
        // consume optional ','
        if (peek() && peek().value === ',') consume()
      }
      if (peek() && peek().value === '}') consume() // consume '}'
      else if (strict) throw new Error("Syntax Error: Missing closing brace '}'")
      return { type: 'RecordLiteral', fields }
    }

    // Array literal: [expr, expr, ...]
    if (token.type === 'Symbol' && token.value === '[') {
      const elements: any[] = []
      if (peek() && peek().value !== ']') {
        elements.push(parseExpression())
        while (peek() && peek().value === ',') {
          consume()
          elements.push(parseExpression())
        }
      }
      if (peek() && peek().value === ']') consume() // consume ']'
      else if (strict) throw new Error("Syntax Error: Missing closing bracket ']'")
      return { type: 'ArrayLiteral', elements }
    }

    if (token.type === 'Identifier') {
      // Check if it's a function call
      if (peek() && peek().value === '(') {
        consume() // consume '('
        const args: any[] = []
        if (peek() && peek().value !== ')') {
          args.push(parseExpression())
          while (peek() && peek().value === ',') {
            consume() // consume ','
            args.push(parseExpression())
          }
        }
        if (peek() && peek().value === ')') {
            consume() // consume ')'
        } else if (strict) {
            throw new Error("Syntax Error: Missing closing parenthesis ')'")
        }
        return { type: 'FunctionCall', name: token.value, arguments: args }
      }
      // Otherwise, it's just a variable
      return { type: 'VariableAccess', name: token.value }
    }

    if (token.type === 'Symbol' && token.value === '(') {
      const expr = parseExpression()
      if (peek() && peek().value === ')') {
          consume()
      } else if (strict) {
          throw new Error("Syntax Error: Missing closing parenthesis ')'")
      }
      return expr
    }

    return { type: 'Literal', value: null }
  }

  if (tokens.length === 0 && text.length > 0) {
    return { type: 'Literal', value: formula }
  }

  try {
    const expr = parseExpression()
    if (currentTokenIdx < tokens.length) {
       if (strict) {
         throw new Error(`Syntax Error: Unexpected token '${tokens[currentTokenIdx].value}'`)
       } else {
         // If we didn't consume everything and it's not strict, 
         // it's likely just a literal string (like "Hello World")
         return { type: 'Literal', value: formula }
       }
    }
    return expr
  } catch (e) {
    if (strict) throw e
    return { type: 'Literal', value: formula } // Fallback to raw string if parsing fails
  }
}

/**
 * Evaluates an AST node against the current environment.
 * @param {object} node AST Node
 * @param {object} localVars Variables dictionary
 * @param {Array} flatNodes Array of components
 * @param {Set} visited For cycle detection
 * @param {object} parentNode Parent component reference
 * @param {object} selfNode The component evaluating the formula
 * @param {object} context Global execution context (notify, navigate, setVariable)
 * @param {boolean} strict If true, throws errors instead of swallowing them.
 * @returns {any} Result of evaluation
 */
export function evaluateAST(
  node,
  localVars = {},
  flatNodes: any[] = [],
  visited = new Set<string>(),
  parentNode: any = null,
  selfNode: any = null,
  context: any = {},
  strict = false,
) {
  if (!node) return strict ? null : ""
  const hasLocalVar = (name) => Object.prototype.hasOwnProperty.call(localVars, name)
  const looksLikePropertyPath = (value: any) =>
    typeof value === 'string' && /^[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z0-9_]+)+$/.test(value.trim())

  const handleError = (msg) => {
    if (strict) return new Error(msg) // Return Error object instead of throwing, so we can catch it or return it
    return ""
  }

  const findNodeByName = (name: string) => flatNodes.find(n => (n?.name || '').toLowerCase() === String(name || '').toLowerCase())
  const FORMULA_ENUMS = [NotificationType, Align, VerticalAlign, FontWeight, BorderStyle, DisplayMode, DateTimeFormat, Overflow, Icon, DropShadow, TextMode, TextFormat, Layout, ModernButtonAppearance, ModernButtonLayout, ModernButtonIconStyle, TabListAlignment, LayoutDirection, TabListAppearance, TabSize, SortOrder]
  const getPropertyValue = (targetNode: any, propertyName: string) => {
    if (!targetNode || !propertyName) return undefined
    if (targetNode[propertyName] !== undefined) return targetNode[propertyName]

    const matchingKey = Object.keys(targetNode).find(key => key.toLowerCase() === propertyName.toLowerCase())
    return matchingKey ? targetNode[matchingKey] : undefined
  }
  const getSchemaPropertyDef = (targetNode: any, propertyName: string) => {
    const schema = SCHEMAS?.[targetNode?.type]
    const properties = schema?.groups
      ? schema.groups.reduce((acc, group) => acc.concat(group.properties || []), [])
      : (schema?.properties || [])

    return properties.find((property: any) => {
      const key = property.key || property.name
      return String(key || '').toLowerCase() === String(propertyName || '').toLowerCase()
    })
  }
  const isFormulaTable = (value: any) => Array.isArray(value)
  const ensureFormulaTable = (value: any, functionName: string) => {
    if (!isFormulaTable(value)) {
      return { status: 'error', message: `${functionName} requires a table argument` }
    }
    return { status: 'success', value }
  }
  const compareFormulaValues = (left: any, right: any) => {
    if (left == null && right == null) return 0
    if (left == null) return -1
    if (right == null) return 1

    const leftNumber = coerceFormulaNumber(left)
    const rightNumber = coerceFormulaNumber(right)
    if (leftNumber.status === 'success' && rightNumber.status === 'success') {
      return leftNumber.value - rightNumber.value
    }

    const leftText = coerceFormulaText(left)
    const rightText = coerceFormulaText(right)
    if (leftText.status === 'success' && rightText.status === 'success') {
      return leftText.value.localeCompare(rightText.value, undefined, { sensitivity: 'base', numeric: true })
    }

    return String(left).localeCompare(String(right), undefined, { sensitivity: 'base', numeric: true })
  }
  const resolveSortOrder = (value: any, functionName: string) => {
    if (value == null || value === '') return { status: 'success', value: 1 }
    if (typeof value === 'boolean') return { status: 'success', value: value ? 1 : -1 }
    const raw = String(value).trim()
    if (!raw) return { status: 'success', value: 1 }
    if (raw === SortOrder.Ascending || /^ascending$/i.test(raw) || raw === '1') return { status: 'success', value: 1 }
    if (raw === SortOrder.Descending || /^descending$/i.test(raw) || raw === '-1') return { status: 'success', value: -1 }
    return { status: 'error', message: `${functionName} requires SortOrder.Ascending or SortOrder.Descending` }
  }
  const evaluateSortOrderNode = (argNode: any, functionName: string) => {
    if (!argNode) return { status: 'success', value: 1 }
    if (argNode.type === 'VariableAccess') {
      const raw = String(argNode.name || '')
      if (/^(Ascending|Descending)$/i.test(raw)) {
        return resolveSortOrder(`SortOrder.${raw[0].toUpperCase()}${raw.slice(1).toLowerCase()}`, functionName)
      }
    }
    if (argNode.type === 'PropertyAccess') {
      const raw = String(argNode.value || '')
      if (/^SortOrder\.(Ascending|Descending)$/i.test(raw)) {
        return resolveSortOrder(raw, functionName)
      }
    }

    const evaluated = evaluateAST(argNode, localVars, flatNodes, visited, parentNode, selfNode, context, strict)
    if (evaluated instanceof Error) return evaluated
    return resolveSortOrder(evaluated, functionName)
  }
  const extractColumnNameArg = (argNode: any) => {
    if (!argNode) return null
    if (argNode.type === 'String') return String(argNode.value || '')
    if (argNode.type === 'Literal' && typeof argNode.value === 'string') return String(argNode.value || '')
    if (argNode.type === 'VariableAccess') return String(argNode.name || '')
    if (argNode.type === 'PropertyAccess') {
      const parts = String(argNode.value || '').split('.').filter(Boolean)
      return parts.length ? parts[parts.length - 1] : null
    }
    return null
  }
  const evaluateInRecordScope = (exprNode: any, record: any) => {
    const scopedLocalVars = {
      ...localVars,
      ...(record && typeof record === 'object' && !Array.isArray(record) ? record : {}),
      ThisItem: record,
      ThisRecord: record,
    }
    return evaluateAST(exprNode, scopedLocalVars, flatNodes, new Set<string>(), parentNode, selfNode, context, strict)
  }
  const getValueByColumnName = (record: any, columnName: string) => {
    if (!record || typeof record !== 'object' || Array.isArray(record)) return undefined
    if (record[columnName] !== undefined) return record[columnName]
    const matchingKey = Object.keys(record).find(key => key.toLowerCase() === String(columnName || '').toLowerCase())
    return matchingKey ? record[matchingKey] : undefined
  }
  const hasRecordShape = (value: any) =>
    !!value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length > 0
  const inferFirstRecordFromTableAst = (astNode: any): any => {
    if (!astNode || typeof astNode !== 'object') return null

    if (astNode.type === 'RecordLiteral') {
      const recordValue = evaluateAST(astNode, localVars, flatNodes, new Set<string>(), parentNode, selfNode, context, false)
      return hasRecordShape(recordValue) ? recordValue : null
    }

    if (astNode.type === 'ArrayLiteral') {
      return astNode.elements?.length ? inferFirstRecordFromTableAst(astNode.elements[0]) : null
    }

    if (astNode.type === 'FunctionCall') {
      const name = String(astNode.name || '').toLowerCase()
      if (name === 'table') {
        return astNode.arguments?.length ? inferFirstRecordFromTableAst(astNode.arguments[0]) : null
      }
      if (['sort', 'sortbycolumns', 'filter', 'search', 'firstn', 'lastn'].includes(name)) {
        return astNode.arguments?.length ? inferFirstRecordFromTableAst(astNode.arguments[0]) : null
      }
      if (name === 'first' || name === 'last' || name === 'lookup') {
        return astNode.arguments?.length ? inferFirstRecordFromTableAst(astNode.arguments[0]) : null
      }
    }

    return null
  }
  const resolveGalleryPreviewRecord = (galleryNode: any) => {
    if (!galleryNode?.Items) return null

    try {
      const itemsAst = parseFormula(String(galleryNode.Items))
      const itemsResult = evaluateAST(itemsAst, localVars, flatNodes, new Set<string>(), null, galleryNode, {}, false)
      const firstRecord: any =
        Array.isArray(itemsResult) && itemsResult.length > 0 ? itemsResult[0]
        : hasRecordShape(itemsResult) ? itemsResult
        : null

      if (hasRecordShape(firstRecord)) {
        return firstRecord
      }

      const inferredRecord = inferFirstRecordFromTableAst(itemsAst)
      if (hasRecordShape(inferredRecord)) {
        return inferredRecord
      }
    } catch {
      // Fail gracefully and let callers decide how to handle missing preview rows.
    }

    return null
  }
  const resolveCurrentItemRecord = () => {
    const item = localVars['ThisItem'] ?? localVars['ThisRecord']
    if (hasRecordShape(item)) {
      return item
    }

    const hasDescendant = (children, targetId) =>
      !!children?.some(c => c.id === targetId || hasDescendant(c.children, targetId))

    const galleryNode =
      parentNode?.type === 'Gallery' ? parentNode
      : flatNodes.find(n => n.type === 'Gallery' && hasDescendant(n.children, selfNode?.id))

    const previewRecord = resolveGalleryPreviewRecord(galleryNode)
    if (previewRecord) return previewRecord

    return null
  }

  // Helper to resolve property path like "Label1.Text"
  const resolvePropertyPath = (path) => {
    // Helper to find the parent of a node in the flat list
    const findParentNode = (nodeId: string) => {
      return flatNodes.find(n => n.children?.some((c: any) => c.id === nodeId))
    }

    const segments = String(path || '').split('.').filter(Boolean)
    const compName = segments[0]
    const propName = segments[1]
    const remainingParts = segments.slice(1)
    if (!compName || remainingParts.length === 0) return handleError(`Invalid property path: ${path}`)

    const getValueFromPath = (target: any, parts: string[]) => {
      let current = target
      for (const part of parts) {
        if (current == null) return undefined
        current = unwrapJsonRecordString(current)
        current = getPropertyValue(current, part)
      }
      return current
    }

    // Cycle detection: Resolve relative keywords to absolute component names
    // so that "Parent.Width" at different levels are tracked as distinct paths.
    let absolutePath = path
    if (compName.toLowerCase() === 'parent' && parentNode) absolutePath = `${parentNode.name}.${remainingParts.join('.')}`
    else if (compName.toLowerCase() === 'self' && selfNode) absolutePath = `${selfNode.name}.${remainingParts.join('.')}`

    if (visited.has(absolutePath)) return handleError('#CYCLE!')
    const nextVisited = new Set(visited).add(absolutePath)

    let targetNode: any = null
    let targetIsLocalVarRecord = false
    if (compName.toLowerCase() === 'parent') targetNode = parentNode
    else if (compName.toLowerCase() === 'self') targetNode = selfNode
    else if (compName === 'NotificationType') targetNode = NotificationType
    else if (compName === 'Align') targetNode = Align
    else if (compName === 'VerticalAlign') targetNode = VerticalAlign
    else if (compName === 'FontWeight') targetNode = FontWeight
    else if (compName === 'BorderStyle') targetNode = BorderStyle
    else if (compName === 'DisplayMode') targetNode = DisplayMode
    else if (compName === 'DateTimeFormat') targetNode = DateTimeFormat
    else if (compName === 'Overflow') targetNode = Overflow
    else if (compName === 'Icon') targetNode = Icon
    else if (compName === 'DropShadow') targetNode = DropShadow
    else if (compName === 'TextMode') targetNode = TextMode
    else if (compName === 'TextFormat') targetNode = TextFormat
    else if (compName === 'Layout') targetNode = Layout
    else if (compName === 'SortOrder') targetNode = SortOrder
    else if (compName === 'ThisItem' || compName === 'ThisRecord') {
      const itemRecord = resolveCurrentItemRecord()
      if (itemRecord && typeof itemRecord === 'object' && !Array.isArray(itemRecord)) {
        const itemValue = getValueFromPath(itemRecord, remainingParts)
        if (itemValue !== undefined) return itemValue

        const matchingKey = Object.keys(itemRecord).find(
          key => key.toLowerCase() === String(propName || '').toLowerCase()
        )
        if (matchingKey) {
          return itemRecord[matchingKey]
        }

        const cols = Object.keys(itemRecord).join(', ')
        return handleError(`"${propName}" is not a column in ThisItem. Available: ${cols || '(none)'}`)
      }

      // No gallery row record could be resolved yet. Return blank in runtime mode and
      // surface a validation error only in strict mode when we truly know the column is absent.
      return strict ? handleError(`Unresolved property: ${path}`) : ''
    }

    // Allow other localVars entries that are plain objects. If the variable exists
    // but hasn't been initialized with a record yet, treat property reads as blank.
    else if (hasLocalVar(compName)) {
      const localVarValue = localVars[compName]
      if (localVarValue === '' || localVarValue === null || localVarValue === undefined) {
        return ''
      }
      if (typeof localVarValue === 'object' && !Array.isArray(localVarValue)) {
        targetNode = localVarValue
        targetIsLocalVarRecord = true
      } else if (!strict) {
        return ''
      } else {
        return handleError(`"${compName}" does not contain properties`)
      }
    }
    else targetNode = findNodeByName(compName)

    if (!targetNode && ALL_ENUM_VALUES.has(path)) return path

    if (targetNode) {
      // Tab List `Selected` is often blank until the user interacts; runtime falls back to `Default`.
      // Without this, `tab_nav_1.Selected.Value` fails validation and strict evaluation.
      let lookupNode = targetNode
      if (targetNode.type === 'ModernTabList') {
        const selectedVal = getPropertyValue(targetNode, 'Selected')
        const selectedUnset =
          selectedVal === undefined ||
          selectedVal === null ||
          (typeof selectedVal === 'string' && selectedVal.trim() === '')
        if (selectedUnset) {
          const defaultVal = getPropertyValue(targetNode, 'Default')
          const defaultOk =
            defaultVal !== undefined &&
            defaultVal !== null &&
            !(typeof defaultVal === 'string' && defaultVal.trim() === '')
          if (defaultOk) {
            lookupNode = { ...targetNode, Selected: defaultVal }
          }
        }
      }

      let rawVal =
        remainingParts.length === 1
          ? getPropertyValue(lookupNode, propName)
          : getValueFromPath(lookupNode, remainingParts)
      const targetPropDef = getSchemaPropertyDef(targetNode, propName)

      // Provide implicit fallbacks for Screen/App dimensions if not explicitly set
      if (rawVal === undefined && (targetNode.type === 'Screen' || targetNode.type === 'App')) {
        if (propName === 'Width') rawVal = 1366
        else if (propName === 'Height') rawVal = 768
      }

      // Special Gallery Template dimension logic.
      // In Power Apps, gallery children can read template dimensions even though
      // those are not explicit editable properties in the control schema.
      if (targetNode.type === 'Gallery' && remainingParts.length === 1 && (propName === 'Width' || propName === 'Height' || propName === 'TemplateWidth' || propName === 'TemplateHeight')) {
        const isVertical = targetNode.Variant ? targetNode.Variant.includes('Vertical') : true
        if (isVertical && propName === 'Height') {
          rawVal = targetNode.TemplateSize || 100
        } else if (!isVertical && propName === 'Width') {
          rawVal = targetNode.TemplateSize || 100
        } else if (isVertical && propName === 'TemplateHeight') {
          rawVal = targetNode.TemplateSize || 100
        } else if (isVertical && propName === 'TemplateWidth') {
          rawVal = getPropertyValue(targetNode, 'Width') ?? 0
        } else if (!isVertical && propName === 'TemplateWidth') {
          rawVal = targetNode.TemplateSize || 100
        } else if (!isVertical && propName === 'TemplateHeight') {
          rawVal = getPropertyValue(targetNode, 'Height') ?? 0
        }
      }

      if (rawVal !== undefined) {
        // If resolving from an enum, return literal value and don't re-evaluate
        const isEnum = FORMULA_ENUMS.includes(targetNode)
        if (isEnum) return rawVal

        // If the property itself is a formula, parse and evaluate it
        if (remainingParts.length > 1 || targetPropDef?.propertyType === 'Output') {
          return rawVal
        }

        if (typeof rawVal === 'string') {
            if (targetIsLocalVarRecord) return rawVal
            const subAst = parseFormula(rawVal, strict)
            const resolvedParent = findParentNode(targetNode.id)
            return evaluateAST(subAst, localVars, flatNodes, nextVisited, resolvedParent, targetNode, context, strict)
        }
        return rawVal
      }
    }
    
    // In non-strict mode, failing to resolve a property just returns the path as a string literal
    if (!strict) return path
    return handleError(`Unresolved property: ${path}`)
  }

  switch (node.type) {
    case 'Literal':
      // If a Literal was generated due to falling back from a parsing failed formula,
      // its value is the raw format (like `Label1.Text` or `Hello`).
      // In strict mode, an explicit formula starting with `=` that fails to parse will throw.
      // But if it wasn't explicit, or we're in non-strict mode, we just return the raw string.
      if (typeof node.value === 'string' && !strict) {
         // Attempt one last time to resolve as property/variable just in case it was a single token
         if (looksLikePropertyPath(node.value)) {
            const pathRes = resolvePropertyPath(node.value)
            if (!(pathRes instanceof Error)) return pathRes
         }
         if (hasLocalVar(node.value)) return localVars[node.value]
      }
      return node.value
    
    case 'Boolean':
    case 'Number':
    case 'String':
      return node.value

    case 'VariableAccess': {
      if (hasLocalVar(node.name)) return localVars[node.name]
      if (node.name.toLowerCase() === 'self') return selfNode
      if (node.name.toLowerCase() === 'parent') return parentNode
      if (node.name.toLowerCase() === 'thisitem' || node.name.toLowerCase() === 'thisrecord') {
        return resolveCurrentItemRecord() ?? ''
      }
      
      // We don't want to return the actual component node object because it crashes React when rendered.
      // If it's used in a context that requires a component (like Navigate), returning the string name is preferred anyway.
      const compNode = findNodeByName(node.name)
      if (compNode && strict) return compNode
      if (compNode && !strict) return node.name

      // Implicitly resolve known enum keys (e.g. typing "Add" instead of "Icon.Add")
      const implicitEnums = [Icon, Align, VerticalAlign, FontWeight, BorderStyle, DisplayMode, DateTimeFormat, Overflow, DropShadow, TextMode, TextFormat, Layout, NotificationType, ModernButtonAppearance, ModernButtonLayout, ModernButtonIconStyle, TabListAlignment, LayoutDirection, TabListAppearance, TabSize, SortOrder]
      for (const enumObj of implicitEnums) {
          if (enumObj[node.name] !== undefined) return enumObj[node.name]
      }
      
      // In non-strict mode (normal rendering), an unknown token should return blank
      // EXCEPT for single identifiers which might be unquoted literals like colors (white, red, etc)
      if (!strict) {
          const nameLower = node.name.toLowerCase()
          const colorKeywords = [
            'white', 'black', 'red', 'blue', 'green', 'yellow', 'orange', 'purple', 
            'pink', 'gray', 'grey', 'silver', 'gold', 'brown', 'transparent', 'cyan', 'magenta'
          ]
          if (colorKeywords.includes(nameLower)) return node.name
          return ""
      }
      return handleError(`Unresolved variable or component: ${node.name}`)
    }
    
    case 'PropertyAccess':
      return resolvePropertyPath(node.value)

    case 'RecordLiteral': {
      const record: Record<string, any> = {}
      for (const [key, fieldAst] of Object.entries(node.fields)) {
        const val = evaluateAST(fieldAst, localVars, flatNodes, visited, parentNode, selfNode, context, strict)
        if (val instanceof Error) return val
        record[key] = val
      }
      return record
    }

    case 'ArrayLiteral': {
      const elements: any[] = []
      for (const el of node.elements) {
        const val = evaluateAST(el, localVars, flatNodes, visited, parentNode, selfNode, context, strict)
        if (val instanceof Error) return val
        elements.push(val)
      }
      return elements
    }

    case 'ActionSequence': {
      const left = evaluateAST(node.left, localVars, flatNodes, visited, parentNode, selfNode, context, strict)
      if (left instanceof Error) return left
      return evaluateAST(node.right, localVars, flatNodes, visited, parentNode, selfNode, context, strict)
    }

    case 'BinaryExpression': {
      const left = evaluateAST(node.left, localVars, flatNodes, visited, parentNode, selfNode, context, strict)
      if (left instanceof Error) return left
      const right = evaluateAST(node.right, localVars, flatNodes, visited, parentNode, selfNode, context, strict)
      if (right instanceof Error) return right


      let res: any = null
      switch (node.operator) {
        case '+': {
          const leftNumber = coerceFormulaNumber(left)
          if (leftNumber.status !== 'success') return handleError(leftNumber.message)
          const rightNumber = coerceFormulaNumber(right)
          if (rightNumber.status !== 'success') return handleError(rightNumber.message)
          res = leftNumber.value + rightNumber.value
          break
        }
        case '-': {
          const leftNumber = coerceFormulaNumber(left)
          if (leftNumber.status !== 'success') return handleError(leftNumber.message)
          const rightNumber = coerceFormulaNumber(right)
          if (rightNumber.status !== 'success') return handleError(rightNumber.message)
          res = leftNumber.value - rightNumber.value
          break
        }
        case '*': {
          const leftNumber = coerceFormulaNumber(left)
          if (leftNumber.status !== 'success') return handleError(leftNumber.message)
          const rightNumber = coerceFormulaNumber(right)
          if (rightNumber.status !== 'success') return handleError(rightNumber.message)
          res = leftNumber.value * rightNumber.value
          break
        }
        case '/': {
          const leftNumber = coerceFormulaNumber(left)
          if (leftNumber.status !== 'success') return handleError(leftNumber.message)
          const rightNumber = coerceFormulaNumber(right)
          if (rightNumber.status !== 'success') return handleError(rightNumber.message)
          res = leftNumber.value / rightNumber.value
          break
        }
        case '&': {
          const leftText = coerceFormulaText(left)
          if (leftText.status !== 'success') return handleError(leftText.message)
          const rightText = coerceFormulaText(right)
          if (rightText.status !== 'success') return handleError(rightText.message)
          res = leftText.value + rightText.value
          break
        }
        case '=': res = left == right; break
        case '<>': res = left != right; break
        case '>': res = left > right; break
        case '<': res = left < right; break
        case '>=': res = left >= right; break
        case '<=': res = left <= right; break
        default: res = null
      }
      if (!strict) {
          if (res === null || res === undefined || (typeof res === 'number' && isNaN(res))) return ""
      }
      return res
    }

    case 'UnaryExpression': {
      const arg = evaluateAST(node.argument, localVars, flatNodes, visited, parentNode, selfNode, context, strict)
      if (arg instanceof Error) return arg

      if (node.operator === '!') {
        if (typeof arg !== 'boolean') {
          return handleError('Logical negation requires a boolean value')
        }
        return !arg
      }
      return null
    }

    case 'FunctionCall': {
      const functionNameLower = String(node.name || '').toLowerCase()

      if (functionNameLower === 'with') {
        if (node.arguments.length < 2) {
          return handleError('With requires a record and a formula')
        }
        const scopeRecord = evaluateAST(node.arguments[0], localVars, flatNodes, visited, parentNode, selfNode, context, strict)
        if (scopeRecord instanceof Error) return scopeRecord
        if (!scopeRecord || typeof scopeRecord !== 'object' || Array.isArray(scopeRecord)) {
          return handleError('With requires a record as its first argument')
        }

        const scopedLocalVars = {
          ...localVars,
          ...scopeRecord,
          ThisRecord: scopeRecord,
          ThisItem: scopeRecord,
        }
        return evaluateAST(node.arguments[1], scopedLocalVars, flatNodes, visited, parentNode, selfNode, context, strict)
      }

      if (functionNameLower === 'filter') {
        if (node.arguments.length < 2) {
          return handleError('Filter requires a table and at least one formula')
        }
        const tableValue = evaluateAST(node.arguments[0], localVars, flatNodes, visited, parentNode, selfNode, context, strict)
        if (tableValue instanceof Error) return tableValue
        const normalizedTable = ensureFormulaTable(tableValue, 'Filter')
        if (normalizedTable.status === 'error') return handleError(normalizedTable.message)

        const filteredRows = normalizedTable.value.filter((record: any) => {
          for (const predicateNode of node.arguments.slice(1)) {
            const predicateResult = evaluateInRecordScope(predicateNode, record)
            if (predicateResult instanceof Error) return false
            if (typeof predicateResult !== 'boolean') return false
            if (!predicateResult) return false
          }
          return true
        })
        return filteredRows
      }

      if (functionNameLower === 'lookup') {
        if (node.arguments.length < 2) {
          return handleError('LookUp requires a table and a formula')
        }
        const tableValue = evaluateAST(node.arguments[0], localVars, flatNodes, visited, parentNode, selfNode, context, strict)
        if (tableValue instanceof Error) return tableValue
        const normalizedTable = ensureFormulaTable(tableValue, 'LookUp')
        if (normalizedTable.status === 'error') return handleError(normalizedTable.message)

        const match = normalizedTable.value.find((record: any) => {
          const predicateResult = evaluateInRecordScope(node.arguments[1], record)
          return !(predicateResult instanceof Error) && predicateResult === true
        })
        if (!match) return null
        if (node.arguments.length < 3) return match
        return evaluateInRecordScope(node.arguments[2], match)
      }

      if (functionNameLower === 'search') {
        if (node.arguments.length < 3) {
          return handleError('Search requires a table, search text, and at least one column name')
        }
        const tableValue = evaluateAST(node.arguments[0], localVars, flatNodes, visited, parentNode, selfNode, context, strict)
        if (tableValue instanceof Error) return tableValue
        const normalizedTable = ensureFormulaTable(tableValue, 'Search')
        if (normalizedTable.status === 'error') return handleError(normalizedTable.message)

        const searchTextValue = evaluateAST(node.arguments[1], localVars, flatNodes, visited, parentNode, selfNode, context, strict)
        if (searchTextValue instanceof Error) return searchTextValue
        const searchText = coerceFormulaText(searchTextValue)
        if (searchText.status !== 'success') return handleError('Search requires text-compatible search text')
        const needle = searchText.value.toLowerCase()
        if (!needle) return normalizedTable.value

        const columnNames = node.arguments.slice(2).map(extractColumnNameArg).filter(Boolean) as string[]
        if (!columnNames.length) return handleError('Search requires at least one valid column name')

        return normalizedTable.value.filter((record: any) =>
          columnNames.some((columnName) => {
            const cellValue = getValueByColumnName(record, columnName)
            const cellText = coerceFormulaText(cellValue)
            return cellText.status === 'success' && cellText.value.toLowerCase().includes(needle)
          })
        )
      }

      if (functionNameLower === 'sort') {
        if (node.arguments.length < 2) {
          return handleError('Sort requires a table and a formula')
        }
        const tableValue = evaluateAST(node.arguments[0], localVars, flatNodes, visited, parentNode, selfNode, context, strict)
        if (tableValue instanceof Error) return tableValue
        const normalizedTable = ensureFormulaTable(tableValue, 'Sort')
        if (normalizedTable.status === 'error') return handleError(normalizedTable.message)

        const direction = node.arguments[2]
          ? evaluateSortOrderNode(node.arguments[2], 'Sort')
          : { status: 'success', value: 1 }
        if (direction instanceof Error) return direction
        if (direction.status === 'error') return handleError(direction.message)

        const sorted = [...normalizedTable.value].sort((leftRecord: any, rightRecord: any) => {
          const leftValue = evaluateInRecordScope(node.arguments[1], leftRecord)
          const rightValue = evaluateInRecordScope(node.arguments[1], rightRecord)
          if (leftValue instanceof Error || rightValue instanceof Error) return 0
          return compareFormulaValues(leftValue, rightValue) * direction.value
        })
        return sorted
      }

      if (functionNameLower === 'sortbycolumns') {
        if (node.arguments.length < 2) {
          return handleError('SortByColumns requires a table and at least one column name')
        }
        const tableValue = evaluateAST(node.arguments[0], localVars, flatNodes, visited, parentNode, selfNode, context, strict)
        if (tableValue instanceof Error) return tableValue
        const normalizedTable = ensureFormulaTable(tableValue, 'SortByColumns')
        if (normalizedTable.status === 'error') return handleError(normalizedTable.message)

        const sortSpecs: Array<{ columnName: string; direction: number }> = []
        let argIndex = 1
        while (argIndex < node.arguments.length) {
          const columnName = extractColumnNameArg(node.arguments[argIndex])
          if (!columnName) return handleError('SortByColumns requires valid column names')

          let directionValue = 1
          const nextArg = node.arguments[argIndex + 1]
          const direction = nextArg ? evaluateSortOrderNode(nextArg, 'SortByColumns') : { status: 'success', value: 1 }
          if (direction instanceof Error) return direction
          if (nextArg && direction.status === 'success') {
            directionValue = direction.value
            argIndex += 2
          } else {
            argIndex += 1
          }

          sortSpecs.push({ columnName, direction: directionValue })
        }

        const sorted = [...normalizedTable.value].sort((leftRecord: any, rightRecord: any) => {
          for (const spec of sortSpecs) {
            const comparison = compareFormulaValues(
              getValueByColumnName(leftRecord, spec.columnName),
              getValueByColumnName(rightRecord, spec.columnName),
            )
            if (comparison !== 0) return comparison * spec.direction
          }
          return 0
        })
        return sorted
      }

      const funcDef = FUNCTIONS.find(f => f.name.toLowerCase() === node.name.toLowerCase())
      
      // If it's a native JS Math function for instance
      if (!funcDef && node.name.startsWith('Math.')) {
         return null
      }

      if (!funcDef) {
         if (!strict) return ""
         return handleError(`Unresolved function: ${node.name}`)
      }

      if (funcDef.type === 'event' && !context.isActionContext) {
         if (strict) return handleError(`Behavior function '${funcDef.name}' cannot be used in a property formula`)
         return ""
      }

      // Special case for Set() - the first argument is an identifier referring to the variable name,
      // not a variable to evaluate. So we pass the name as a string directly.
      const evaluatedArgs: any[] = []
      for (let i = 0; i < node.arguments.length; i++) {
        const argData = node.arguments[i]
        let val: any
        if (funcDef.name === 'Set' && i === 0) {
          if (argData.type === 'PropertyAccess') {
            return handleError(`"Set" cannot be used to update a component property. Please target a variable instead.`)
          }
          if (argData.type === 'VariableAccess') {
             // Pass the literal name of the variable instead of evaluating it
             val = argData.name
          } else {
             // If it's something else (like a literal or expression), evaluate it and hope for the best, 
             // though normally Set expects an identifier.
             val = evaluateAST(argData, localVars, flatNodes, visited, parentNode, selfNode, context, strict)
          }
        } else {
          val = evaluateAST(argData, localVars, flatNodes, visited, parentNode, selfNode, context, strict)
        }
        if (val instanceof Error) return val
        evaluatedArgs.push(val)
      }

      // Invoke the function dynamically with unpacked args, passing the runtime context at the end
      const result = (funcDef.function as any)(...evaluatedArgs, context)

      const finalRes = (result && result.status) 
        ? (result.status === "error" ? handleError(result.message) : result.message)
        : result

      if (finalRes instanceof Error) return finalRes

      if (!strict && (finalRes === null || finalRes === undefined)) return ""
      return finalRes
    }

    default:
      return null
  }
}
