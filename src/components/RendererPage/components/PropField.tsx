import * as React from 'react'
import FormulaInput from './FormulaInput'
import { getPropertyOptionValues, getPropertyValueType, getPropertyValidationIssue, isEventProperty, isFormulaValue, normalizeFormulaString } from '../../../common/helpers'
import { sanitizeSvgFragment } from '@/lib/content-sanitizer'

function getValidationInputClass(issue) {
  if (!issue) return ""
  if (issue.severity === 'warning') return "border-amber-400/80 ring-1 ring-amber-500/20 bg-amber-500/5"
  return "border-red/100 ring-1 ring-red/100 bg-red/5"
}

function getValidationTextClass(issue) {
  if (issue?.severity === 'warning') return "text-[10px] text-amber-300 font-medium px-1 leading-none"
  return "text-[10px] text-red/100 font-medium px-1 leading-none"
}

// ── Validated Number Input ─────────────────────────────────────────────────
function ValidatedNumberInput({
  prop,
  value,
  onChange,
  className = "",
  localVars,
  flatNodes,
  parentNode,
  selfNode,
  completionExtraIdentifiers,
}: any) {
  const [tempValue, setTempValue] = React.useState(String(value))
  const [nError, setNError] = React.useState<any>(null)
  const revertAtFocusRef = React.useRef(String(value))

  React.useEffect(() => {
    setTempValue(String(value))
    setNError(getPropertyValidationIssue(
      selfNode,
      prop || { name: "Value", type: "number" },
      String(value),
      localVars,
      flatNodes,
      parentNode
    ))
  }, [value, localVars, flatNodes, parentNode, selfNode, prop])

  const handleChange = (v) => {
    setTempValue(v)
    setNError(getPropertyValidationIssue(
      selfNode,
      prop || { name: "Value", type: "number" },
      v,
      localVars,
      flatNodes,
      parentNode
    ))
    if (v.trim().startsWith('=')) {
      onChange(normalizeFormulaString(v), { formula: true })
    }
  }

  const handleBlur = () => {
    if (tempValue.trim().startsWith('=')) {
      onChange(normalizeFormulaString(tempValue), { formula: true })
    } else {
      const n = Number(tempValue)
      if (!isNaN(n) && tempValue.trim() !== '') {
        onChange(n, { formula: false })
      } else {
        onChange(tempValue.trim(), { formula: true })
      }
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <FormulaInput
        value={tempValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={() => {
          revertAtFocusRef.current = String(value)
        }}
        hasError={!!nError}
        validationTone={nError?.severity}
        completionExtraIdentifiers={completionExtraIdentifiers}
        onKeyDown={(e: any) => {
          if (e.key === 'Enter') e.target.blur()
          if (e.key === 'Escape') {
            const snap = revertAtFocusRef.current
            setTempValue(snap)
            setNError(getPropertyValidationIssue(
              selfNode,
              prop || { name: "Value", type: "number" },
              snap,
              localVars,
              flatNodes,
              parentNode
            ))
            if (snap.trim().startsWith('=')) {
              onChange(normalizeFormulaString(snap), { formula: true })
            } else {
              const n = Number(snap)
              if (!isNaN(n) && snap.trim() !== '') {
                onChange(n, { formula: false })
              } else {
                onChange(snap.trim(), { formula: true })
              }
            }
            e.target.blur()
          }
        }}
        className={`w-full ${className} ${getValidationInputClass(nError)}`}
      />
      {nError && <span className={getValidationTextClass(nError)}>{nError.message}</span>}
    </div>
  )
}

// ── Validated Event Input ──────────────────────────────────────────────────
function ValidatedEventInput({
  prop,
  value,
  onChange,
  className = "",
  localVars,
  flatNodes,
  parentNode,
  selfNode,
  completionExtraIdentifiers,
}: any) {
  const [tempValue, setTempValue] = React.useState(String(value || ""))
  const [eError, setEError] = React.useState<any>(null)
  const revertAtFocusRef = React.useRef(String(value ?? ''))

  React.useEffect(() => {
    setTempValue(String(value || ""))
    setEError(getPropertyValidationIssue(
      selfNode,
      prop || { name: "OnSelect", type: "string" },
      String(value || ""),
      localVars,
      flatNodes,
      parentNode
    ))
  }, [value, localVars, flatNodes, parentNode, selfNode, prop])

  const handleChange = (v) => {
    setTempValue(v)
    setEError(getPropertyValidationIssue(
      selfNode,
      prop || { name: "OnSelect", type: "string" },
      v,
      localVars,
      flatNodes,
      parentNode
    ))
    onChange(v.trim())
  }

  const handleBlur = () => {
    onChange(tempValue.trim())
  }

  return (
    <div className="flex flex-col items-end gap-1 flex-1 min-w-0">
      <FormulaInput
        value={tempValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={() => {
          revertAtFocusRef.current = String(value ?? '')
        }}
        hasError={!!eError}
        validationTone={eError?.severity}
        completionExtraIdentifiers={completionExtraIdentifiers}
        onKeyDown={(e: any) => {
          if (e.key === "Enter") e.target.blur()
          if (e.key === "Escape") {
            const snap = revertAtFocusRef.current
            setTempValue(snap)
            setEError(getPropertyValidationIssue(
              selfNode,
              prop || { name: "OnSelect", type: "string" },
              snap,
              localVars,
              flatNodes,
              parentNode
            ))
            onChange(snap.trim())
            e.target.blur()
          }
        }}
        className={`w-full ${className} ${getValidationInputClass(eError)}`}
      />
      {eError && <span className={getValidationTextClass(eError)}>{eError.message}</span>}
    </div>
  )
}

// ── Validated String Input ─────────────────────────────────────────────────
function ValidatedStringInput({
  prop,
  value,
  onChange,
  className = "",
  localVars,
  flatNodes,
  parentNode,
  selfNode,
  completionExtraIdentifiers,
}: any) {
  const [tempValue, setTempValue] = React.useState(String(value || ""))
  const [sError, setSError] = React.useState<any>(null)
  const revertAtFocusRef = React.useRef(String(value ?? ''))

  React.useEffect(() => {
    setTempValue(String(value || ""))
    setSError(getPropertyValidationIssue(
      selfNode,
      prop || { name: "Text", type: "string" },
      String(value || ""),
      localVars,
      flatNodes,
      parentNode
    ))
  }, [value, localVars, flatNodes, parentNode, selfNode, prop])

  const handleChange = (v) => {
    setTempValue(v)
    setSError(getPropertyValidationIssue(
      selfNode,
      prop || { name: "Text", type: "string" },
      v,
      localVars,
      flatNodes,
      parentNode
    ))
    onChange(v.trim())
  }

  const handleBlur = () => {
    onChange(tempValue.trim())
  }

  return (
    <div className="flex flex-col items-end gap-1 flex-1 min-w-0">
      <FormulaInput
        value={tempValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={() => {
          revertAtFocusRef.current = String(value ?? '')
        }}
        hasError={!!sError}
        validationTone={sError?.severity}
        completionExtraIdentifiers={completionExtraIdentifiers}
        onKeyDown={(e: any) => {
          if (e.key === "Enter") e.target.blur()
          if (e.key === "Escape") {
            const snap = revertAtFocusRef.current
            setTempValue(snap)
            setSError(getPropertyValidationIssue(
              selfNode,
              prop || { name: "Text", type: "string" },
              snap,
              localVars,
              flatNodes,
              parentNode
            ))
            onChange(snap.trim())
            e.target.blur()
          }
        }}
        className={`w-full ${className} ${getValidationInputClass(sError)}`}
      />
      {sError && <span className={getValidationTextClass(sError)}>{sError.message}</span>}
    </div>
  )
}

function getFormulaSeedValue(prop, value) {
  if (value === undefined || value === null) return ''
  if (isFormulaValue(value)) return normalizeFormulaString(String(value))
  return String(value)
}

function getStaticResetValue(prop, value) {
  const expectedType = getPropertyValueType(prop)
  const formulaValue = normalizeFormulaString(String(value ?? ''))
  const unquotedValue =
    (formulaValue.startsWith('"') && formulaValue.endsWith('"')) ||
    (formulaValue.startsWith("'") && formulaValue.endsWith("'"))
      ? formulaValue.slice(1, -1)
      : formulaValue

  if (expectedType === 'boolean') {
    if (/^(true|false)$/i.test(formulaValue)) {
      return formulaValue.toLowerCase() === 'true'
    }
    return false
  }

  if (expectedType === 'number') {
    if (!formulaValue.trim()) return ''
    const numericValue = Number(formulaValue)
    return Number.isFinite(numericValue) ? numericValue : formulaValue
  }

  if (expectedType === 'color' || expectedType === 'enum') {
    return unquotedValue
  }

  return unquotedValue
}

function getOptionValue(option: any) {
  return typeof option === 'object' && option !== null && 'value' in option ? option.value : option
}

function getOptionLabel(prop: any, option: any, index: number) {
  if (typeof option === 'object' && option !== null && 'label' in option && option.label) {
    return option.label
  }

  const optionValue = getOptionValue(option)
  if (prop.optionLabels?.[index]) return prop.optionLabels[index]

  return String(optionValue).includes('.') ? String(optionValue).split('.').pop() : optionValue
}

function FormulaToggleButton({ onClick, children, tone = 'default' }: any) {
  const toneClassName = tone === 'danger'
    ? 'text-[9px] text-subtext/40 hover:text-red hover:bg-red/10'
    : 'text-[9px] text-subtext/60 hover:text-accent hover:bg-accent/10'

  return (
    <button
      type="button"
      onClick={onClick}
      className={`${toneClassName} px-1.5 py-0.5 rounded transition-colors`}
    >
      {children}
    </button>
  )
}

function ValidatedFormulaPropertyInput({
  prop,
  value,
  onChange,
  className = "",
  localVars,
  flatNodes,
  parentNode,
  selfNode,
  completionExtraIdentifiers,
}: any) {
  const [tempValue, setTempValue] = React.useState(normalizeFormulaString(String(value || "")))
  const [error, setError] = React.useState<any>(null)
  const revertAtFocusRef = React.useRef(normalizeFormulaString(String(value ?? '')))

  React.useEffect(() => {
    setTempValue(normalizeFormulaString(String(value || "")))
    setError(getPropertyValidationIssue(
      selfNode,
      prop,
      normalizeFormulaString(String(value || "")),
      localVars,
      flatNodes,
      parentNode
    ))
  }, [value, localVars, flatNodes, parentNode, selfNode, prop])

  const handleChange = (nextValue) => {
    const normalizedValue = normalizeFormulaString(nextValue)
    setTempValue(normalizedValue)
    setError(getPropertyValidationIssue(
      selfNode,
      prop,
      normalizedValue,
      localVars,
      flatNodes,
      parentNode
    ))
    onChange(normalizedValue, { formula: true })
  }

  const handleBlur = () => {
    onChange(normalizeFormulaString(tempValue), { formula: true })
  }

  return (
    <div className="flex flex-col gap-1">
      <FormulaInput
        value={tempValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={() => {
          revertAtFocusRef.current = normalizeFormulaString(String(value ?? ''))
        }}
        hasError={!!error}
        validationTone={error?.severity}
        completionExtraIdentifiers={completionExtraIdentifiers}
        onKeyDown={(e: any) => {
          if (e.key === "Enter") e.target.blur()
          if (e.key === "Escape") {
            const snap = revertAtFocusRef.current
            setTempValue(snap)
            setError(getPropertyValidationIssue(
              selfNode,
              prop,
              snap,
              localVars,
              flatNodes,
              parentNode
            ))
            onChange(snap, { formula: true })
            e.target.blur()
          }
        }}
        className={`w-full ${className} ${getValidationInputClass(error)}`}
      />
      {error && <span className={getValidationTextClass(error)}>{error.message}</span>}
    </div>
  )
}

export default function PropField({ prop, value, onChange, localVars = {}, flatNodes = [], parentNode = null, selfNode = null }: any) {
  const formulaCompletionIdentifiers = React.useMemo(() => {
    const names = (flatNodes || []).map((n: any) => String(n?.name || "").trim()).filter(Boolean);
    const keys = Object.keys(localVars || {});
    return [...new Set([...names, ...keys])];
  }, [flatNodes, localVars]);

  if (prop.type === 'boolean') {
    const isFormula = isFormulaValue(value, prop, selfNode)

    return (
      <div className="flex flex-col py-1.5 gap-1">
        <div className="flex items-center justify-between">
          <label className="text-xs text-subtext shrink-0">{prop.label}</label>
          {isFormula ? (
            <div className="flex items-center gap-1.5">
              <FormulaToggleButton tone="danger" onClick={() => onChange(getStaticResetValue(prop, value), { formula: false })}>
                Reset to static
              </FormulaToggleButton>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={value === true || value === 'true'}
                onChange={e => onChange(e.target.checked)}
                className="w-4 h-4 rounded border-overlay/40 text-accent focus:ring-accent"
              />
              <FormulaToggleButton onClick={() => onChange(getFormulaSeedValue(prop, value), { formula: true })}>
                Use formula
              </FormulaToggleButton>
            </div>
          )}
        </div>
        {isFormula && (
          <ValidatedFormulaPropertyInput
            prop={prop}
            value={value}
            onChange={onChange}
            className="bg-base border border-overlay/40 rounded-md px-2 py-1 text-xs text-text focus:outline-none focus:border-accent/60"
            localVars={localVars}
            flatNodes={flatNodes}
            parentNode={parentNode}
            selfNode={selfNode}
            completionExtraIdentifiers={formulaCompletionIdentifiers}
          />
        )}
      </div>
    )
  }
  if (prop.type === 'color') {
    const isFormula = isFormulaValue(value, prop, selfNode)
    const [showPopover, setShowPopover] = React.useState(false)
    const popoverRef = React.useRef<HTMLDivElement>(null)

    React.useEffect(() => {
      if (!showPopover || isFormula) return
      const handleClick = (e: any) => {
        if (popoverRef.current && !popoverRef.current.contains(e.target)) {
          setShowPopover(false)
        }
      }
      document.addEventListener('mousedown', handleClick)
      return () => document.removeEventListener('mousedown', handleClick)
    }, [showPopover, isFormula])

    React.useEffect(() => {
      if (isFormula) setShowPopover(false)
    }, [isFormula])

    const parse = (c: any) => {
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
           const toHex = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0')
           return { r, g, b, a, hex: `#${toHex(r)}${toHex(g)}${toHex(b)}` }
         }
      }
      
      return fallback 
    }

    const { r, g, b, a, hex } = parse(value)
    const isTransparent = a === 0

    return (
      <div className="flex flex-col py-1.5 border-t border-overlay/10 mt-1 relative gap-1">
        <div className="flex items-center justify-between">
          <label className="text-xs text-subtext">{prop.label}</label>
          {isFormula ? (
            <div className="flex items-center gap-1.5">
              <FormulaToggleButton tone="danger" onClick={() => onChange(getStaticResetValue(prop, value), { formula: false })}>
                Reset to static
              </FormulaToggleButton>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input type="text" value={value} onChange={e => onChange(e.target.value)}
                className="w-32 bg-base border border-overlay/40 rounded-md px-2 py-1 text-[10px] font-mono text-text focus:outline-none focus:border-accent/60 text-right"
              />
              <button
                type="button"
                onClick={() => setShowPopover(!showPopover)}
                className="relative w-6 h-6 rounded-md border border-overlay/50 shrink-0 overflow-hidden shadow-sm hover:scale-105 transition-transform cursor-pointer"
                style={{
                  backgroundColor: value,
                  backgroundImage: isTransparent ? 'repeating-conic-gradient(#aaa 0% 25%, white 0% 50%) 0 0 / 6px 6px' : 'none'
                } as any}
              />
              <FormulaToggleButton onClick={() => onChange(getFormulaSeedValue(prop, value), { formula: true })}>
                Use formula
              </FormulaToggleButton>
            </div>
          )}
        </div>

        {isFormula ? (
          <ValidatedFormulaPropertyInput
            prop={prop}
            value={value}
            onChange={onChange}
            className="bg-base border border-overlay/40 rounded-md px-2 py-1 text-xs text-text focus:outline-none focus:border-accent/60"
            localVars={localVars}
            flatNodes={flatNodes}
            parentNode={parentNode}
            selfNode={selfNode}
            completionExtraIdentifiers={formulaCompletionIdentifiers}
          />
        ) : showPopover && (
          <div ref={popoverRef} 
            className="absolute right-0 top-9 w-56 bg-surface border border-overlay/40 rounded-xl shadow-2xl shadow-black/40 z-[100] p-3 flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-text">Color Picker</span>
              <button type="button" onClick={() => setShowPopover(false)} className="text-subtext/40 hover:text-text">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path fillRule="evenodd" d="M5.47 5.47a.75.75 0 0 1 1.06 0L12 10.94l5.47-5.47a.75.75 0 1 1 1.06 1.06L13.06 12l5.47 5.47a.75.75 0 1 1-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 0 1-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" /></svg>
              </button>
            </div>

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

            <div className="grid grid-cols-4 gap-1.5">
              {[
                { label: 'R', val: r, max: 255, step: 1, key: 'r' as const },
                { label: 'G', val: g, max: 255, step: 1, key: 'g' as const },
                { label: 'B', val: b, max: 255, step: 1, key: 'b' as const },
                { label: 'A', val: a, max: 1,   step: 0.01, key: 'a' as const }
              ].map(field => (
                <div key={field.label} className="flex flex-col gap-1">
                  <span className="text-[9px] text-subtext/40 font-bold text-center">{field.label}</span>
                  <ValidatedNumberInput 
                    prop={{ name: field.key, type: "number" }}
                    value={field.val}
                    onChange={v => {
                      const update = { r, g, b, a }
                      update[field.key] = v
                      onChange(`RGBA(${update.r}, ${update.g}, ${update.b}, ${update.a})`)
                    }}
                    className="w-full bg-base border border-overlay/20 rounded p-1 text-[10px] text-center text-text focus:outline-none focus:border-accent appearance-none m-0"
                    localVars={localVars}
                    flatNodes={flatNodes}
                    parentNode={parentNode}
                    selfNode={selfNode}
                    completionExtraIdentifiers={formulaCompletionIdentifiers}
                  />
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 bg-base/50 p-2 rounded-lg border border-overlay/10">
               <button type="button" onClick={() => onChange('#ffffff')} className="w-4 h-4 rounded border border-overlay/40 bg-white cursor-pointer hover:scale-110 transition-transform" />
               <button type="button" onClick={() => onChange('#000000')} className="w-4 h-4 rounded border border-overlay/40 bg-black cursor-pointer hover:scale-110 transition-transform" />
               <button type="button" onClick={() => onChange('#0078d4')} className="w-4 h-4 rounded border border-overlay/40 bg-[#0078d4] cursor-pointer hover:scale-110 transition-transform" />
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
    const isFormula = isFormulaValue(value, prop, selfNode)
    const selectError = getPropertyValidationIssue(
      selfNode,
      prop,
      value,
      localVars,
      flatNodes,
      parentNode
    )
    return (
      <div className="flex flex-col py-1.5 gap-1">
        <div className="flex items-center justify-between gap-2">
          <label className="text-xs text-subtext shrink-0">{prop.label}</label>
          {isFormula ? (
            <div className="flex items-center gap-1.5">
              <FormulaToggleButton tone="danger" onClick={() => onChange(getStaticResetValue(prop, value), { formula: false })}>
                Reset to static
              </FormulaToggleButton>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <select value={value} onChange={e => onChange(e.target.value)}
                className="bg-base border border-overlay/40 rounded-md px-2 py-1 text-xs text-text focus:outline-none focus:border-accent/60 cursor-pointer">
                {prop.options?.map((option: any, index: number) => {
                  const optionValue = getOptionValue(option)
                  return (
                    <option key={optionValue} value={optionValue}>
                      {getOptionLabel(prop, option, index)}
                    </option>
                  )
                })}
              </select>
              <FormulaToggleButton onClick={() => onChange(getFormulaSeedValue(prop, value), { formula: true })}>
                Use formula
              </FormulaToggleButton>
            </div>
          )}
        </div>
        {!isFormula && selectError && (
          <span className={getValidationTextClass(selectError)}>
            {selectError.message}
          </span>
        )}
        {isFormula && (
          <ValidatedFormulaPropertyInput
            prop={prop}
            value={value}
            onChange={onChange}
            className="bg-base border border-overlay/40 rounded-md px-2 py-1 text-xs text-text focus:outline-none focus:border-accent/60"
            localVars={localVars}
            flatNodes={flatNodes}
            parentNode={parentNode}
            selfNode={selfNode}
            completionExtraIdentifiers={formulaCompletionIdentifiers}
          />
        )}
      </div>
    )
  }
  if (prop.type === 'icon-selector') {
    const isFormula = isFormulaValue(value, prop, selfNode)
    return (
      <div className="flex flex-col py-2 gap-2 border-t border-overlay/10 mt-1">
        <div className="flex items-center justify-between gap-2">
          <label className="text-xs font-semibold text-text">{prop.label}</label>
          {isFormula ? (
            <div className="flex items-center gap-1.5">
              <FormulaToggleButton tone="danger" onClick={() => onChange(getStaticResetValue(prop, value), { formula: false })}>
                Reset to static
              </FormulaToggleButton>
            </div>
          ) : (
            <FormulaToggleButton onClick={() => onChange(getFormulaSeedValue(prop, value), { formula: true })}>
              Use formula
            </FormulaToggleButton>
          )}
        </div>
        {isFormula ? (
          <ValidatedFormulaPropertyInput
            prop={prop}
            value={value}
            onChange={onChange}
            className="bg-base border border-overlay/40 rounded-md px-2 py-1 text-xs text-text focus:outline-none focus:border-accent/60"
            localVars={localVars}
            flatNodes={flatNodes}
            parentNode={parentNode}
            selfNode={selfNode}
            completionExtraIdentifiers={formulaCompletionIdentifiers}
          />
        ) : (
          <div className="grid grid-cols-6 gap-2 max-h-48 overflow-y-auto pr-1">
            {prop.options?.map((option: any, index: number) => {
              const optionValue = getOptionValue(option)
              const isSelected = value === optionValue
              return (
                <button
                  key={optionValue || index}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onChange(optionValue)
                  }}
                  title={getOptionLabel(prop, option, index)}
                  className={`flex items-center justify-center p-1.5 border rounded-lg transition-all duration-200 
                    ${isSelected ? 'border-accent bg-accent/10 text-accent ring-1 ring-accent/50' : 'border-overlay/20 bg-surface hover:bg-overlay/10 hover:border-overlay/40 text-subtext'}
                  `}
                  dangerouslySetInnerHTML={{ __html: sanitizeSvgFragment(option.svg) }}
                />
              )
            })}
          </div>
        )}
      </div>
    )
  }
  if (prop.type === 'number') {
    return (
      <div className="flex items-center justify-between py-1.5 gap-2">
        <label className="text-xs text-subtext shrink-0">{prop.label}</label>
        <ValidatedNumberInput
          prop={prop}
          value={value}
          onChange={onChange}
          className="w-20 bg-base border border-overlay/40 rounded-md px-2 py-1 text-xs text-text focus:outline-none focus:border-accent/60 text-right"
          localVars={localVars}
          flatNodes={flatNodes}
          parentNode={parentNode}
          selfNode={selfNode}
          completionExtraIdentifiers={formulaCompletionIdentifiers}
        />
      </div>
    )
  }

  if (prop.propertyType === 'Output') {
    return (
      <div className="flex items-center justify-between py-1.5 gap-2">
        <label className="text-xs text-subtext shrink-0">{prop.label}</label>
        <div className="flex-1 min-w-0 bg-base border border-overlay/30 rounded-md px-2 py-1 text-xs text-subtext/90 font-mono">
          <input
            type="text"
            value={value ?? ''}
            readOnly
            className="w-full bg-transparent outline-none cursor-text"
          />
        </div>
      </div>
    )
  }

  const isEvent = isEventProperty(prop)
  if (isEvent) {
    return (
      <div className="flex items-center justify-between py-1.5 gap-2">
        <label className="text-xs text-subtext shrink-0">{prop.label}</label>
        <ValidatedEventInput
          prop={prop}
          value={value}
          onChange={onChange}
          className="flex-1 min-w-0 bg-base border border-overlay/40 rounded-md px-2 py-1 text-xs text-text focus:outline-none focus:border-accent/60"
          localVars={localVars}
          flatNodes={flatNodes}
          parentNode={parentNode}
          selfNode={selfNode}
          completionExtraIdentifiers={formulaCompletionIdentifiers}
        />
      </div>
    )
  }
  return (
    <div className="flex items-center justify-between py-1.5 gap-2">
      <label className="text-xs text-subtext shrink-0">{prop.label}</label>
      <ValidatedStringInput
        prop={prop}
        value={value}
        onChange={onChange}
        className="flex-1 min-w-0 bg-base border border-overlay/40 rounded-md text-xs text-text focus-within:outline-none focus-within:border-accent/60"
        localVars={localVars}
        flatNodes={flatNodes}
        parentNode={parentNode}
        selfNode={selfNode}
        completionExtraIdentifiers={formulaCompletionIdentifiers}
      />
    </div>
  )
}
