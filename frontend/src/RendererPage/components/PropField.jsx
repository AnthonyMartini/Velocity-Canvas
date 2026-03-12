import { useState, useRef, useEffect } from 'react'
import PropTypes from 'prop-types'
import FormulaInput from './FormulaInput.jsx'
import { evaluateValue, flattenTree, findParent } from '../../common/helpers.jsx'

// ── Validated Number Input ─────────────────────────────────────────────────
function ValidatedNumberInput({ value, onChange, className = "", localVars, flatNodes, parentNode, selfNode }) {
  const [tempValue, setTempValue] = useState(String(value))
  const [error, setError] = useState(null)

  useEffect(() => {
    setTempValue(String(value))
    setError(null)
  }, [value])

  const validate = (val) => {
    if (val.trim() === '') return "Required"
    
    // Evaluate the property
    const evaluated = evaluateValue(val, localVars, flatNodes, new Set(), parentNode, selfNode)
    if (evaluated === '#CYCLE!') return "Circular dependency detected"
    
    // Check for naked variables/components that didn't resolve into something meaningful
    if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(val.trim())) {
      const t = val.trim()
      const knownFuncs = ['true', 'false', 'RGBA', 'Math', 'Color']
      if (!knownFuncs.includes(t)) {
        const isVar = localVars && localVars[t] !== undefined
        const isComp = flatNodes && flatNodes.some(n => n.name === t)
        const isSelf = t.toLowerCase() === 'self' || t.toLowerCase() === 'parent'
        if (!isVar && !isComp && !isSelf) {
            return `Unresolved variable or component: ${t}`
        }
      }
    } else if (/\b[a-zA-Z_][a-zA-Z0-9_]*\.[a-zA-Z_][a-zA-Z0-9_]*\b/.test(val)) {
      // It has a property access format. If evaluateValue returned the exact string unparsed, it failed.
      if (evaluated === val.trim() && !val.trim().startsWith('"') && !val.trim().startsWith("'")) {
        return "Unresolved property"
      }
    }

    // If it's meant to be a number but evaluation resulted in a distinct non-numeric string (that isn't a pure literal)
    if (typeof evaluated === 'string' && isNaN(Number(evaluated)) && !val.trim().startsWith('"') && !val.trim().startsWith("'")) {
       // Only error if it looks like they were trying to write a property access formula
       if (/\b[a-zA-Z_][a-zA-Z0-9_]*\.[a-zA-Z_][a-zA-Z0-9_]*\b/.test(val)) {
         return "Unresolved property"
       }
       // If it's a naked word and evaluate Value spit it exactly back out, it's not a known number or variable
       if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(val.trim()) && evaluated === val.trim()) {
         return "Unresolved variable or component"
       }
    }

    const n = Number(evaluated)
    if (isNaN(n)) return "Must evaluate to a number"
    return null
  }

  const handleChange = (v) => {
    setTempValue(v)
    setError(validate(v))
  }

  const handleBlur = () => {
    // Save the input even if it has an error, so the user doesn't lose their formula.
    // The red highlight and tooltip will persist.
    if (tempValue.trim().startsWith('=')) {
      onChange(tempValue.trim())
    } else {
      const n = Number(tempValue)
      if (!isNaN(n) && tempValue.trim() !== '') {
        onChange(n)
      } else {
        onChange(tempValue.trim())
      }
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <FormulaInput
        value={tempValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={e => {
          if (e.key === 'Enter') e.target.blur()
          if (e.key === 'Escape') {
            setTempValue(String(value))
            setError(null)
            e.target.blur()
          }
        }}
        className={`w-full ${className} ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}`}
      />
      {error && <span className="text-[9px] text-red-500 leading-none">{error}</span>}
    </div>
  )
}

// ── Validated Event Input ──────────────────────────────────────────────────
function ValidatedEventInput({ value, onChange, className = "", localVars, flatNodes, parentNode, selfNode }) {
  const [tempValue, setTempValue] = useState(String(value || ""))
  const [error, setError] = useState(null)

  useEffect(() => {
    setTempValue(String(value || ""))
    setError(null)
  }, [value])

  const validate = (val) => {
    if (val.trim() === "") return null // Allow empty
    
    // Extract strings first so we don't try to resolve them as variables
    // Replace all occurrences of "..." or '...' with empty strings so they are ignored by the token splitter
    const strRemoved = val.replace(/('[^']*'|"[^"]*")/g, '')
    
    // Test a dummy evaluation to see if tokens resolve
    // match anything that looks like a variable or Component.Property
    const tokens = strRemoved.match(/[a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)?/g) || []
    
    for (const t of tokens) {
      if (t.includes('.')) {
        // We only evaluate `t` itself to see if the property path resolves
        const evaluated = evaluateValue(t, localVars, flatNodes, new Set(), parentNode, selfNode)
        // Check if evaluateValue failed. Usually #CYCLE! or the exact string.
        // Wait, evaluateValue for "Label1.Text" returns the value. 
        // If it returns "Label1.Text" it means it couldn't resolve it.
        if (evaluated === t || evaluated === '#CYCLE!') {
           return `Unresolved property: ${t}`
        }
      } else {
         // Check if it's a known function or true/false
         const knownFuncs = ['Notify', 'Navigate', 'Set', 'true', 'false', 'RGBA', 'Math', 'Color']
         if (!knownFuncs.includes(t)) {
            // Check if it's a known variable or component
            const isVar = localVars && localVars[t] !== undefined
            const isComp = flatNodes && flatNodes.some(n => n.name === t)
            const isSelf = t.toLowerCase() === 'self' || t.toLowerCase() === 'parent'
            if (!isVar && !isComp && !isSelf) {
               return `Unresolved variable or component: ${t}`
            }
         }
      }
    }

    return null
  }

  const handleChange = (v) => {
    setTempValue(v)
    setError(validate(v))
  }

  const handleBlur = () => {
    // Keep the value even if invalid so they don't lose their formula
    onChange(tempValue.trim())
  }

  return (
    <div className="flex flex-col items-end gap-1 flex-1 min-w-0">
      <FormulaInput
        value={tempValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={e => {
          if (e.key === "Enter") e.target.blur()
          if (e.key === "Escape") {
            setTempValue(String(value || ""))
            setError(null)
            e.target.blur()
          }
        }}
        className={`w-full ${className} ${error ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""}`}
      />
      {error && <span className="text-[9px] text-red-500 leading-none">{error}</span>}
    </div>
  )
}

// ── Validated String Input ─────────────────────────────────────────────────
function ValidatedStringInput({ value, onChange, className = "", localVars, flatNodes, parentNode, selfNode }) {
  const [tempValue, setTempValue] = useState(String(value || ""))
  const [error, setError] = useState(null)

  useEffect(() => {
    setTempValue(String(value || ""))
    setError(null)
  }, [value])

  const validate = (val) => {
    if (val.trim() === "") return null // Allow empty
    
    // Evaluate the property
    const evaluated = evaluateValue(val, localVars, flatNodes, new Set(), parentNode, selfNode)
    if (evaluated === '#CYCLE!') return "Circular dependency detected"
    
    // If evaluateValue returns the exact same string (and it wasn't a quoted literal),
    // it means it either fell back to returning the raw string, or it successfully evaluated to it.
    if (evaluated === val.trim() && !val.trim().startsWith('"') && !val.trim().startsWith("'")) {
       
       // If the input has no spaces and represents a single naked word, we're strict about it missing quotes.
       if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(val.trim())) {
          const t = val.trim()
          const knownFuncs = ['true', 'false', 'RGBA', 'Math', 'Color']
          if (!knownFuncs.includes(t)) {
             const isVar = localVars && localVars[t] !== undefined
             const isComp = flatNodes && flatNodes.some(n => n.name === t)
             const isSelf = t.toLowerCase() === 'self' || t.toLowerCase() === 'parent'
             if (!isVar && !isComp && !isSelf) {
                return `Unresolved variable or component: ${t}`
             }
          }
       } else {
         // If it's a more complex string, we need to see if it was trying to be a function call or concat formula.
         // If it contains typical formula symbols but evaluateValue failed to do anything with it 
         // other than return the raw string, we parse the tokens to find out what's unresolved.
         if (/[()=+,.&]/.test(val)) {
            const strRemoved = val.replace(/('[^']*'|"[^"]*")/g, '')
            const tokens = strRemoved.match(/[a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)?/g) || []
            for (const t of tokens) {
               if (t.includes('.')) {
                  const ev = evaluateValue(t, localVars, flatNodes, new Set(), parentNode, selfNode)
                  if (ev === t || ev === '#CYCLE!') return `Unresolved property: ${t}`
               } else {
                  const knownFuncs = ['Notify', 'Navigate', 'Set', 'true', 'false', 'RGBA', 'Math', 'Color']
                  if (!knownFuncs.includes(t)) {
                     const isVar = localVars && localVars[t] !== undefined
                     const isComp = flatNodes && flatNodes.some(n => n.name === t)
                     const isSelf = t.toLowerCase() === 'self' || t.toLowerCase() === 'parent'
                     if (!isVar && !isComp && !isSelf) {
                        return `Unresolved variable or component: ${t}`
                     }
                  }
               }
            }
         }
       }
    }
    
    return null
  }

  const handleChange = (v) => {
    setTempValue(v)
    setError(validate(v))
  }

  const handleBlur = () => {
    // Keep the value even if invalid so they don't lose their formula
    onChange(tempValue.trim())
  }

  return (
    <div className="flex flex-col items-end gap-1 flex-1 min-w-0">
      <FormulaInput
        value={tempValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={e => {
          if (e.key === "Enter") e.target.blur()
          if (e.key === "Escape") {
            setTempValue(String(value || ""))
            setError(null)
            e.target.blur()
          }
        }}
        className={`w-full ${className} ${error ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""}`}
      />
      {error && <span className="text-[9px] text-red-500 leading-none">{error}</span>}
    </div>
  )
}

export default function PropField({ prop, value, onChange, localVars = {}, flatNodes = [], parentNode = null, selfNode = null }) {
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
    const [showPopover, setShowPopover] = useState(false)
    const popoverRef = useRef(null)

    // Close on outside click
    useEffect(() => {
      if (!showPopover) return
      const handleClick = (e) => {
        if (popoverRef.current && !popoverRef.current.contains(e.target)) {
          setShowPopover(false)
        }
      }
      document.addEventListener('mousedown', handleClick)
      return () => document.removeEventListener('mousedown', handleClick)
    }, [showPopover])

    // Improved parsing for RGBA support
    const parse = (c) => {
      const fallback = { r: 255, g: 255, b: 255, a: 1, hex: '#ffffff' }
      if (!c || c === 'transparent') return { ...fallback, a: 0 }
      
      const valStr = String(c).trim()
      
      if (valStr.startsWith('#')) {
         const hex = valStr.slice(1)
         const r = parseInt(hex.slice(0, 2), 16) || 0
         const g = parseInt(hex.slice(2, 4), 16) || 0
         const b = parseInt(hex.slice(4, 6), 16) || 0
         return { r, g, b, a: 1, hex: valStr.slice(0, 7) }
      }
      
      if (valStr.toLowerCase().includes('rgb')) {
         const parts = valStr.match(/[\d.]+/g)
         if (parts && parts.length >= 3) {
           const r = Math.round(parseFloat(parts[0]))
           const g = Math.round(parseFloat(parts[1]))
           const b = Math.round(parseFloat(parts[2]))
           const a = parts[3] !== undefined ? parseFloat(parts[3]) : 1
           const toHex = (n) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0')
           return { r, g, b, a, hex: `#${toHex(r)}${toHex(g)}${toHex(b)}` }
         }
      }
      
      return fallback // variable or unknown string
    }

    const { r, g, b, a, hex } = parse(value)
    const isTransparent = a === 0

    return (
      <div className="flex flex-col py-1.5 border-t border-overlay/10 mt-1 relative">
        <div className="flex items-center justify-between">
          <label className="text-xs text-subtext">{prop.label}</label>
          <div className="flex items-center gap-2">
             <input type="text" value={value} onChange={e => onChange(e.target.value)}
              className="w-32 bg-base border border-overlay/40 rounded-md px-2 py-1 text-[10px] font-mono text-text focus:outline-none focus:border-accent/60 text-right" 
            />
            {/* The Swatch Toggle */}
            <button 
              onClick={() => setShowPopover(!showPopover)}
              className="relative w-6 h-6 rounded-md border border-overlay/50 shrink-0 overflow-hidden shadow-sm hover:scale-105 transition-transform cursor-pointer"
              style={{ 
                backgroundColor: value,
                backgroundImage: isTransparent ? 'repeating-conic-gradient(#aaa 0% 25%, white 0% 50%) 0 0 / 6px 6px' : 'none' 
              }}
            />
          </div>
        </div>

        {/* The Color Popover */}
        {showPopover && (
          <div ref={popoverRef} 
            className="absolute right-0 top-9 w-56 bg-surface border border-overlay/40 rounded-xl shadow-2xl shadow-black/40 z-[100] p-3 flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-text">Color Picker</span>
              <button onClick={() => setShowPopover(false)} className="text-subtext/40 hover:text-text">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path fillRule="evenodd" d="M5.47 5.47a.75.75 0 0 1 1.06 0L12 10.94l5.47-5.47a.75.75 0 1 1 1.06 1.06L13.06 12l5.47 5.47a.75.75 0 1 1-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 0 1-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" /></svg>
              </button>
            </div>

            {/* Hex Picker Box */}
            <div className="relative h-20 w-full rounded-lg border border-overlay/20 overflow-hidden shadow-inner group">
              <div 
                className="absolute inset-0 transition-colors duration-200" 
                style={{ backgroundColor: hex }} 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
              <input 
                type="color" 
                value={hex} 
                onChange={e => {
                  const { r: nr, g: ng, b: nb } = parse(e.target.value)
                  onChange(`RGBA(${nr}, ${ng}, ${nb}, ${a})`)
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/10 text-white pointer-events-none">
                <span className="text-[10px] font-bold uppercase tracking-wider">Change Color</span>
              </div>
            </div>

            {/* Opacity Slider */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-subtext/60 font-medium uppercase tracking-tight">Opacity</span>
                <span className="text-[10px] text-subtext font-mono bg-overlay/20 px-1.5 py-0.5 rounded">{Math.round(a * 100)}%</span>
              </div>
              <div className="relative h-2 w-full bg-overlay/20 rounded-full overflow-hidden">
                 <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'repeating-conic-gradient(#aaa 0% 25%, white 0% 50%) 0 0 / 4px 4px' }} />
                 <div className="absolute inset-0" style={{ background: `linear-gradient(to right, transparent, RGBA(${r}, ${g}, ${b}, 1))` }} />
                 <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.01" 
                  value={a} 
                  onChange={e => {
                    const newA = parseFloat(e.target.value)
                    onChange(`RGBA(${r}, ${g}, ${b}, ${newA})`)
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div 
                  className="absolute top-0 bottom-0 left-0 bg-accent transition-all duration-75 pointer-events-none" 
                  style={{ width: `${a * 100}%` }} 
                />
              </div>
            </div>

            {/* Precision Inputs */}
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { label: 'R', val: r, max: 255, step: 1, key: 'r' },
                { label: 'G', val: g, max: 255, step: 1, key: 'g' },
                { label: 'B', val: b, max: 255, step: 1, key: 'b' },
                { label: 'A', val: a, max: 1,   step: 0.01, key: 'a' }
              ].map(field => (
                <div key={field.label} className="flex flex-col gap-1">
                  <span className="text-[9px] text-subtext/40 font-bold text-center">{field.label}</span>
                  <ValidatedNumberInput 
                    value={field.val}
                    onChange={v => {
                      const update = { r, g, b, a }
                      update[field.key] = v
                      onChange(`RGBA(${update.r}, ${update.g}, ${update.b}, ${update.a})`)
                    }}
                    className="w-full bg-base border border-overlay/20 rounded p-1 text-[10px] text-center text-text focus:outline-none focus:border-accent appearance-none m-0"
                  />
                </div>
              ))}
            </div>

            {/* Presets/Hex Display */}
            <div className="flex items-center gap-2 bg-base/50 p-2 rounded-lg border border-overlay/10">
               <button onClick={() => onChange('#ffffff')} className="w-4 h-4 rounded border border-overlay/40 bg-white cursor-pointer hover:scale-110 transition-transform" />
               <button onClick={() => onChange('#000000')} className="w-4 h-4 rounded border border-overlay/40 bg-black cursor-pointer hover:scale-110 transition-transform" />
               <button onClick={() => onChange('#0078d4')} className="w-4 h-4 rounded border border-overlay/40 bg-[#0078d4] cursor-pointer hover:scale-110 transition-transform" />
               <div className="flex-1 text-right">
                  <span className="text-[9px] font-mono text-subtext/50 uppercase">{hex}</span>
               </div>
            </div>
          </div>
        )}
      </div>
    )
  }
  if (prop.type === 'select') {
    return (
      <div className="flex items-center justify-between py-1.5 gap-2">
        <label className="text-xs text-subtext shrink-0">{prop.label}</label>
        <select value={value} onChange={e => onChange(e.target.value)}
          className="bg-base border border-overlay/40 rounded-md px-2 py-1 text-xs text-text focus:outline-none focus:border-accent/60 cursor-pointer">
          {prop.options.map((o, i) => (
            <option key={o} value={o}>
              {prop.optionLabels ? prop.optionLabels[i] : (String(o).includes('.') ? o.split('.').pop() : o)}
            </option>
          ))}
        </select>
      </div>
    )
  }
  if (prop.type === 'icon-selector') {
    return (
      <div className="flex flex-col py-2 gap-2 border-t border-overlay/10 mt-1">
        <label className="text-xs font-semibold text-text">{prop.label}</label>
        <div className="grid grid-cols-6 gap-2 max-h-48 overflow-y-auto pr-1">
          {prop.options.map((o) => {
            const isSelected = value === o.value;
            return (
              <button
                key={o.value}
                onClick={() => onChange(o.value)}
                title={o.label}
                className={`flex items-center justify-center p-1.5 border rounded-lg transition-all duration-200 
                  ${isSelected ? 'border-accent bg-accent/10 text-accent ring-1 ring-accent/50' : 'border-overlay/20 bg-surface hover:bg-overlay/10 hover:border-overlay/40 text-subtext'}
                `}
                dangerouslySetInnerHTML={{ __html: o.svg }}
              />
            )
          })}
        </div>
      </div>
    )
  }
  if (prop.type === 'number') {
    return (
      <div className="flex items-center justify-between py-1.5 gap-2">
        <label className="text-xs text-subtext shrink-0">{prop.label}</label>
        <ValidatedNumberInput
          value={value}
          onChange={onChange}
          className="w-20 bg-base border border-overlay/40 rounded-md px-2 py-1 text-xs text-text focus:outline-none focus:border-accent/60 text-right"
          localVars={localVars}
          flatNodes={flatNodes}
          parentNode={parentNode}
          selfNode={selfNode}
        />
      </div>
    )
  }

  if (prop.type === 'string' && prop.name.startsWith('On')) {
    return (
      <div className="flex items-center justify-between py-1.5 gap-2">
        <label className="text-xs text-subtext shrink-0">{prop.label}</label>
        <ValidatedEventInput
          value={value}
          onChange={onChange}
          className="flex-1 min-w-0 bg-base border border-overlay/40 rounded-md px-2 py-1 text-xs text-text focus:outline-none focus:border-accent/60"
          localVars={localVars}
          flatNodes={flatNodes}
          parentNode={parentNode}
          selfNode={selfNode}
        />
      </div>
    )
  }
  return (
    <div className="flex items-center justify-between py-1.5 gap-2">
      <label className="text-xs text-subtext shrink-0">{prop.label}</label>
      <ValidatedStringInput
        value={value}
        onChange={onChange}
        className="flex-1 min-w-0 bg-base border border-overlay/40 rounded-md text-xs text-text focus-within:outline-none focus-within:border-accent/60"
        localVars={localVars}
        flatNodes={flatNodes}
        parentNode={parentNode}
        selfNode={selfNode}
      />
    </div>
  )
}

PropField.propTypes = {
  prop: PropTypes.shape({
    type: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    options: PropTypes.arrayOf(PropTypes.any),
    optionLabels: PropTypes.arrayOf(PropTypes.string),
  }).isRequired,
  value: PropTypes.any,
  onChange: PropTypes.func.isRequired,
}
