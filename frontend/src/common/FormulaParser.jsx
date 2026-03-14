import { FUNCTIONS, NotificationType, Align, VerticalAlign, FontWeight, BorderStyle, DisplayMode, Overflow, Icon, DropShadow, TextMode, TextFormat } from '../RendererPage/Functions.jsx'

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
  const regex = /("[^"]*"|'[^']*')|([A-Za-z_][A-Za-z0-9_]*\.[A-Za-z_][A-Za-z0-9_]*)|([A-Za-z_][A-Za-z0-9_]*)|(#(?:[0-9a-fA-F]{3}){1,2}|#(?:[0-9a-fA-F]{4}){1,2}|#(?:[0-9a-fA-F]{8}))|([0-9]+(?:\.[0-9]+)?)|(<=|>=|<>|[()=+\-*/&,;<>!|])/g
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
export function evaluateAST(node, localVars = {}, flatNodes = [], visited = new Set(), parentNode = null, selfNode = null, context = {}, strict = false) {
  if (!node) return strict ? null : ""

  const handleError = (msg) => {
    if (strict) return new Error(msg) // Return Error object instead of throwing, so we can catch it or return it
    return ""
  }

  // Helper to resolve property path like "Label1.Text"
  const resolvePropertyPath = (path) => {
    if (visited.has(path)) return handleError('#CYCLE!')
    const nextVisited = new Set(visited).add(path)

    const [compName, propName] = path.split('.')
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
    else targetNode = flatNodes.find(n => n.name === compName)

    if (targetNode && targetNode[propName] !== undefined) {
      const rawVal = targetNode[propName]
      
      // If resolving from an enum, return literal value and don't re-evaluate
      const isEnum = [NotificationType, Align, VerticalAlign, FontWeight, BorderStyle, DisplayMode, Overflow, Icon, DropShadow, TextMode, TextFormat].includes(targetNode)
      if (isEnum) return rawVal

      // If the property itself is a formula, parse and evaluate it
      if (typeof rawVal === 'string') {
          const subAst = parseFormula(rawVal, strict)
          return evaluateAST(subAst, localVars, flatNodes, nextVisited, targetNode?.parent, targetNode, context, strict)
      }
      return rawVal
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

    case 'ActionSequence': {
      evaluateAST(node.left, localVars, flatNodes, visited, parentNode, selfNode, context, strict)
      return evaluateAST(node.right, localVars, flatNodes, visited, parentNode, selfNode, context, strict)
    }

    case 'BinaryExpression': {
      const left = evaluateAST(node.left, localVars, flatNodes, visited, parentNode, selfNode, context, strict)
      const right = evaluateAST(node.right, localVars, flatNodes, visited, parentNode, selfNode, context, strict)

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

      // Special case for Set() - the first argument is an identifier referring to the variable name,
      // not a variable to evaluate. So we pass the name as a string directly.
      const evaluatedArgs = []
      for (let i = 0; i < node.arguments.length; i++) {
        const argData = node.arguments[i]
        if (funcDef.name === 'Set' && i === 0) {
          if (argData.type === 'PropertyAccess') {
            return handleError(`"Set" cannot be used to update a component property. Please target a variable instead.`)
          }
          if (argData.type === 'VariableAccess') {
             // Pass the literal name of the variable instead of evaluating it
             evaluatedArgs.push(argData.name)
          } else {
             // If it's something else (like a literal or expression), evaluate it and hope for the best, 
             // though normally Set expects an identifier.
             evaluatedArgs.push(evaluateAST(argData, localVars, flatNodes, visited, parentNode, selfNode, context, strict))
          }
        } else {
          evaluatedArgs.push(evaluateAST(argData, localVars, flatNodes, visited, parentNode, selfNode, context, strict))
        }
      }

      // Invoke the function dynamically with unpacked args, passing the runtime context at the end
      const result = funcDef.function(...evaluatedArgs, context)

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
