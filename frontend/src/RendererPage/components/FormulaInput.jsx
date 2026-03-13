import { useState, useRef } from 'react'
import Editor from 'react-simple-code-editor'
import { FUNCTIONS } from '../Functions.jsx'

export default function FormulaInput({ value, onChange, onBlur, className = "", placeholder = "", onKeyDown, hasError }) {
  const [isFocused, setIsFocused] = useState(false)
  const editorRef = useRef(null)

  // Parse the formula string into an array of JSX nodes with syntax highlighting
  const renderHighlightedFormula = (text) => {
    if (!text) return null

    const tokenRegex = /("[^"]*"|'[^']*')|([A-Za-z_][A-Za-z0-9_]*\.[A-Za-z_][A-Za-z0-9_]*)|([A-Za-z_][A-Za-z0-9_]*)(?=\s*\()|([A-Z][A-Za-z0-9_]*)|(\W+)/g
    
    const tokens = []
    let match
    let lastIndex = 0

    while ((match = tokenRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        tokens.push({ text: text.substring(lastIndex, match.index), type: 'normal' })
      }

      const [fullMatch, isString, isCompProp, isFunc, isVar, isSymbol] = match
      
      let type = 'normal'
      if (isString) type = 'string'
      else if (isCompProp) type = 'compProp'
      else if (isFunc) type = 'function'
      else if (isVar) {
        const isKnownFunc = FUNCTIONS.some(f => f.name.toLowerCase() === fullMatch.toLowerCase())
        type = isKnownFunc ? 'function' : 'variable'
      }
      else if (isSymbol) type = 'symbol'

      tokens.push({ text: fullMatch, type })
      lastIndex = tokenRegex.lastIndex
    }

    if (lastIndex < text.length) {
      tokens.push({ text: text.substring(lastIndex), type: 'normal' })
    }

    return tokens.map((t, i) => {
      if (t.type === 'string') return <span key={i} className="text-green-400">{t.text}</span>
      if (t.type === 'compProp') {
        const [comp, prop] = t.text.split('.')
        return (
          <span key={i}>
            <span className="text-pink-400">{comp}</span>
            <span className="text-subtext">.</span>
            <span className="text-purple-400">{prop}</span>
          </span>
        )
      }
      if (t.type === 'function') return <span key={i} className="text-accent">{t.text}</span>
      if (t.type === 'variable') {
         if (t.text === 'True' || t.text === 'False') return <span key={i} className="text-orange-400">{t.text}</span>
         return <span key={i} className="text-blue-400">{t.text}</span>
      }
      if (t.type === 'symbol') return <span key={i} className="text-subtext/70">{t.text}</span>
      
      return <span key={i} className="text-text">{t.text}</span>
    })
  }

  // react-simple-code-editor expects to render HTML blocks.
  // We can just return a react fragment inside the highlight function
  const highlight = (code) => {
    return <>{renderHighlightedFormula(code)}</>
  }
  
  // Custom styles for the Editor to integrate seamlessly into our Props panel
  const sharedStyle = {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    fontSize: '0.75rem', /* text-xs */
    lineHeight: '1.25rem',
    minHeight: '28px', // Equivalent to py-1 on h-full
  }

  return (
    <div 
      className={`relative flex flex-col font-mono bg-base overflow-hidden transition-colors duration-200 border rounded-md ${
        hasError 
          ? 'border-red/100 bg-red-500/5 ring-1 ring-red-500/20' 
          : (isFocused ? 'border-accent/60 ring-1 ring-accent/20' : 'border-overlay/40')
      } ${className}`}
      onKeyDown={onKeyDown}
    >
      <Editor
        ref={editorRef}
        value={String(value || '')}
        onValueChange={onChange}
        highlight={highlight}
        padding={4} /* Equivalent to approx px-1 py-1 */
        onBlur={(e) => {
          setIsFocused(false)
          if (onBlur) onBlur(e)
        }}
        onFocus={() => setIsFocused(true)}
        textareaClassName="focus:outline-none placeholder-subtext/40"
        tabSize={2}
        insertSpaces={true}
        className="w-full text-xs"
        style={sharedStyle}
      />
      {!value && placeholder && !isFocused && (
        <div className="absolute inset-0 px-2 flex items-center pointer-events-none text-xs text-subtext/40">
          {placeholder}
        </div>
      )}
    </div>
  )
}
