import { FUNCTIONS, NotificationType, Align, VerticalAlign, FontWeight, BorderStyle, DisplayMode, Overflow, Icon, DropShadow, TextMode, TextFormat, Layout, ALL_ENUM_VALUES } from '../RendererPage/Functions'

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
  const tokens = []
  // Updated regex to include # for hex colors and maybe some basic logical operators
  const regex = /("[^"]*"|'[^']*')|([A-Za-z_][A-Za-z0-9_]*\.[A-Za-z0-9_]+)|([A-Za-z_][A-Za-z0-9_]*)|(#(?:[0-9a-fA-F]{3}){1,2}|#(?:[0-9a-fA-F]{4}){1,2}|#(?:[0-9a-fA-F]{8}))|([0-9]+(?:\.[0-9]+)?)|(<=|>=|<>|[()=+\-*/&,;<>!|{}\[\]:.]|(?:\r?\n)+)/g
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
        const args = []
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
export function evaluateAST(node, localVars = {}, flatNodes = [], visited = new Set(), parentNode = null, selfNode = null, context: any = {}, strict = false) {
  if (!node) return strict ? null : ""

  const handleError = (msg) => {
    if (strict) return new Error(msg) // Return Error object instead of throwing, so we can catch it or return it
    return ""
  }

  // Helper to resolve property path like "Label1.Text"
  const resolvePropertyPath = (path) => {
    // Helper to find the parent of a node in the flat list
    const findParentNode = (nodeId: string) => {
      return flatNodes.find(n => n.children?.some((c: any) => c.id === nodeId))
    }

    const [compName, propName] = path.split('.')

    // Cycle detection: Resolve relative keywords to absolute component names
    // so that "Parent.Width" at different levels are tracked as distinct paths.
    let absolutePath = path
    if (compName.toLowerCase() === 'parent' && parentNode) absolutePath = `${parentNode.name}.${propName}`
    else if (compName.toLowerCase() === 'self' && selfNode) absolutePath = `${selfNode.name}.${propName}`

    if (visited.has(absolutePath)) return handleError('#CYCLE!')
    const nextVisited = new Set(visited).add(absolutePath)

    let targetNode = null
    if (compName.toLowerCase() === 'parent') targetNode = parentNode
    else if (compName.toLowerCase() === 'self') targetNode = selfNode
    else if (compName === 'NotificationType') targetNode = NotificationType
    else if (compName === 'Align') targetNode = Align
    else if (compName === 'VerticalAlign') targetNode = VerticalAlign
    else if (compName === 'FontWeight') targetNode = FontWeight
    else if (compName === 'BorderStyle') targetNode = BorderStyle
    else if (compName === 'DisplayMode') targetNode = DisplayMode
    else if (compName === 'Overflow') targetNode = Overflow
    else if (compName === 'Icon') targetNode = Icon
    else if (compName === 'DropShadow') targetNode = DropShadow
    else if (compName === 'TextMode') targetNode = TextMode
    else if (compName === 'TextFormat') targetNode = TextFormat
    else if (compName === 'Layout') targetNode = Layout
    else if (compName === 'ThisItem') {
      const item = localVars['ThisItem']

      // ── Runtime: GalleryRenderer injected ThisItem for this row ───────────
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        return propName in item ? item[propName] : ''
      }

      // ── Validation time: ThisItem not in localVars yet.
      //    Find the nearest Gallery ancestor and evaluate its Items formula so we
      //    know which columns actually exist.
      const hasDescendant = (children, targetId) =>
        !!children?.some(c => c.id === targetId || hasDescendant(c.children, targetId))

      const galleryNode =
        parentNode?.type === 'Gallery' ? parentNode
        : flatNodes.find(n => n.type === 'Gallery' && hasDescendant(n.children, selfNode?.id))

      if (galleryNode?.Items) {
        try {
          // Evaluate Items non-strictly so partial formulas fail gracefully
          const itemsAst = parseFormula(String(galleryNode.Items))
          const itemsResult = evaluateAST(itemsAst, localVars, flatNodes, new Set(), null, galleryNode, {}, false)
          const firstRecord: any =
            Array.isArray(itemsResult) && itemsResult.length > 0 ? itemsResult[0]
            : (itemsResult && typeof itemsResult === 'object' && !Array.isArray(itemsResult)) ? itemsResult
            : null

          if (firstRecord && typeof firstRecord === 'object') {
            if (propName in firstRecord) {
              // Known column — return its value as a type hint for validation
              return firstRecord[propName] !== undefined ? firstRecord[propName] : ''
            }
            const cols = Object.keys(firstRecord).join(', ')
            return handleError(`"${propName}" is not a column in ThisItem. Available: ${cols || '(none)'}`)
          }
        } catch {
          // Items formula failed to evaluate — fall through to placeholder
        }
      }

      // No gallery context found — return placeholder (safe, no error)
      return ''
    }

    // Allow other localVars entries that are plain objects
    else if (localVars[compName] !== undefined && typeof localVars[compName] === 'object' && !Array.isArray(localVars[compName])) targetNode = localVars[compName]
    else targetNode = flatNodes.find(n => n.name === compName)

    if (!targetNode && ALL_ENUM_VALUES.has(path)) return path

    if (targetNode) {
      let rawVal = targetNode[propName]

      // Provide implicit fallbacks for Screen/App dimensions if not explicitly set
      if (rawVal === undefined && (targetNode.type === 'Screen' || targetNode.type === 'App')) {
        if (propName === 'Width') rawVal = 1366
        else if (propName === 'Height') rawVal = 768
      }

      // Special Gallery Template dimension logic
      // In Power Apps, Parent.Height in a vertical gallery is the TemplateSize, not the Gallery Height.
      if (targetNode.type === 'Gallery' && (propName === 'Width' || propName === 'Height')) {
        const isVertical = targetNode.Variant ? targetNode.Variant.includes('Vertical') : true
        if (isVertical && propName === 'Height') {
          rawVal = targetNode.TemplateSize || 100
        } else if (!isVertical && propName === 'Width') {
          rawVal = targetNode.TemplateSize || 100
        }
      }

      if (rawVal !== undefined) {
        // If resolving from an enum, return literal value and don't re-evaluate
        const isEnum = [NotificationType, Align, VerticalAlign, FontWeight, BorderStyle, DisplayMode, Overflow, Icon, DropShadow, TextMode, TextFormat].includes(targetNode)
        if (isEnum) return rawVal

        // If the property itself is a formula, parse and evaluate it
        if (typeof rawVal === 'string') {
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
         if (node.value.includes('.')) {
            const pathRes = resolvePropertyPath(node.value)
            if (!(pathRes instanceof Error)) return pathRes
         }
         if (localVars[node.value] !== undefined) return localVars[node.value]
      }
      return node.value
    
    case 'Boolean':
    case 'Number':
    case 'String':
      return node.value

    case 'VariableAccess': {
      if (localVars[node.name] !== undefined) return localVars[node.name]
      if (node.name.toLowerCase() === 'self') return selfNode
      if (node.name.toLowerCase() === 'parent') return parentNode
      
      // We don't want to return the actual component node object because it crashes React when rendered.
      // If it's used in a context that requires a component (like Navigate), returning the string name is preferred anyway.
      const compNode = flatNodes.find(n => n.name === node.name)
      if (compNode && strict) return compNode
      if (compNode && !strict) return node.name
      
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
      const elements = []
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


      let res = null
      switch (node.operator) {
        case '+': res = Number(left) + Number(right); break
        case '-': res = Number(left) - Number(right); break
        case '*': res = Number(left) * Number(right); break
        case '/': res = Number(left) / Number(right); break
        case '&': res = String(left === null ? '' : left) + String(right === null ? '' : right); break
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
        return !arg
      }
      return null
    }

    case 'FunctionCall': {
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
      const evaluatedArgs = []
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
