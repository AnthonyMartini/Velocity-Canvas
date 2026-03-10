import { useState, useRef, useCallback } from 'react'
import { screenToYaml, ButtonRenderer, LabelRenderer, TextInputRenderer, DropdownRenderer, ContainerRenderer, createFromSpec } from './RendererPage'

// ── Icons ──────────────────────────────────────────────────────────────────────
const SparkleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M12 1.5a.75.75 0 0 1 .75.75V4.5a.75.75 0 0 1-1.5 0V2.25A.75.75 0 0 1 12 1.5ZM12 19.5a.75.75 0 0 1 .75.75v2.25a.75.75 0 0 1-1.5 0V20.25a.75.75 0 0 1 .75-.75ZM2.25 12a.75.75 0 0 1 .75-.75H5.25a.75.75 0 0 1 0 1.5H3A.75.75 0 0 1 2.25 12ZM19.5 12a.75.75 0 0 1 .75-.75h2.25a.75.75 0 0 1 0 1.5H20.25a.75.75 0 0 1-.75-.75ZM6.166 5.106a.75.75 0 0 1 1.06 0l1.591 1.591a.75.75 0 0 1-1.06 1.06L6.166 6.167a.75.75 0 0 1 0-1.06ZM15.182 15.183a.75.75 0 0 1 1.06 0l1.591 1.59a.75.75 0 1 1-1.06 1.061l-1.591-1.59a.75.75 0 0 1 0-1.061ZM5.106 17.835a.75.75 0 0 1 0-1.061l1.591-1.59a.75.75 0 1 1 1.06 1.06l-1.59 1.591a.75.75 0 0 1-1.061 0ZM15.183 8.818a.75.75 0 0 1 0-1.06l1.59-1.591a.75.75 0 1 1 1.061 1.06l-1.59 1.591a.75.75 0 0 1-1.061 0Z" />
  </svg>
)

const CopyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path d="M7.5 3.375c0-1.036.84-1.875 1.875-1.875h.375a3.75 3.75 0 0 1 3.75 3.75v1.875C13.5 8.161 14.34 9 15.375 9h1.875A3.75 3.75 0 0 1 21 12.75v3.375C21 17.16 20.16 18 19.125 18h-9.75A1.875 1.875 0 0 1 7.5 16.125V3.375Z" />
    <path d="M15 5.25a5.23 5.23 0 0 0-1.279-3.434 9.768 9.768 0 0 1 6.963 6.963A5.23 5.23 0 0 0 17.25 7.5h-1.875A.375.375 0 0 1 15 7.125V5.25ZM4.875 6H6v10.125A3.375 3.375 0 0 0 9.375 19.5H16.5v1.125c0 1.035-.84 1.875-1.875 1.875h-9.75A1.875 1.875 0 0 1 3 20.625V7.875C3 6.839 3.84 6 4.875 6Z" />
  </svg>
)

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 0 1 .208 1.04l-9 13.5a.75.75 0 0 1-1.154.114l-6-6a.75.75 0 0 1 1.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 0 1 1.04-.208Z" clipRule="evenodd" />
  </svg>
)

const SendIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M3.478 2.405a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.405Z" />
  </svg>
)

const EXAMPLE_PROMPTS = [
  "A dark mode navigation bar with a logo on the left and 4 nav buttons on the right",
  "A login form card with email input, password input, and a submit button",
  "A dashboard stat card showing '1,284' users with a blue accent and subtle icon",
  "A mobile-style bottom tab bar with 5 icons: Home, Search, Create, Alerts, Profile",
  "A hero banner with a large headline, subtitle text, and a CTA button",
]

export default function GeneratorPage() {
  const [prompt, setPrompt] = useState('')
  const [tree, setTree] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)
  const [charCount, setCharCount] = useState(0)
  const textareaRef = useRef(null)

  const handlePromptChange = useCallback((e) => {
    setPrompt(e.target.value)
    setCharCount(e.target.value.length)
  }, [])

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim() || isLoading) return
    setIsLoading(true)
    setError(null)
    setTree([])
    setCopied(false)

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/renderer-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: prompt.trim(),
          canvas_width: 1366,
          canvas_height: 768,
          canvas_components: []
        }),
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.detail || `Server error: ${response.status}`)
      }

      const data = await response.json()
      const newTree = (data.components_to_add || []).map(createFromSpec).filter(Boolean)
      setTree(newTree)
    } catch (err) {
      setError(err.message || 'An unexpected error occurred.')
    } finally {
      setIsLoading(false)
    }
  }, [prompt, isLoading])

  const handleKeyDown = useCallback((e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      handleGenerate()
    }
  }, [handleGenerate])

  const handleCopy = useCallback(async () => {
    if (!yamlOutput) return
    try {
      await navigator.clipboard.writeText(yamlOutput)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      const el = document.createElement('textarea')
      el.value = yamlOutput
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }, [tree])

  const handleExampleClick = useCallback((ex) => {
    setPrompt(ex)
    setCharCount(ex.length)
    textareaRef.current?.focus()
  }, [])

  const yamlOutput = tree.length > 0 ? screenToYaml(tree) : ''
  const lineCount = yamlOutput ? yamlOutput.split('\n').length : 0

  return (
    <main className="flex-1 max-w-[1600px] mx-auto w-full px-6 py-8 flex flex-col gap-8">

      {/* Hero Tagline */}
      <div className="text-center animate-fade-in">
        <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">
          Describe your UI. <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-accent-dark">Get Power Apps YAML.</span>
        </h2>
        <p className="text-subtext text-sm max-w-xl mx-auto">
          Type a plain-English description of any canvas app component and receive production-ready pa.yaml — ready to paste directly into Canvas Studio.
        </p>
      </div>

      {/* Prompt Section */}
      <div className="bg-surface/50 border border-overlay/30 rounded-2xl p-6 animate-slide-up shadow-xl shadow-black/20">
        <label className="block text-sm font-semibold text-text mb-3 flex items-center gap-2">
          <SparkleIcon />
          Describe your component
        </label>

        <div className="relative">
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={handlePromptChange}
            onKeyDown={handleKeyDown}
            placeholder="e.g. A dark mode navigation bar with a logo on the left and 4 nav buttons on the right, using a purple accent color..."
            rows={4}
            className="w-full bg-base border border-overlay/50 rounded-xl px-4 py-3 text-text placeholder:text-subtext/50 focus:outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/10 resize-none transition-all duration-200 text-sm leading-relaxed"
          />
          <div className="absolute bottom-3 right-3 flex items-center gap-2">
            <span className={`text-xs ${charCount > 800 ? 'text-yellow' : 'text-subtext/50'}`}>{charCount}</span>
          </div>
        </div>

        <p className="text-xs text-subtext/60 mt-2 ml-1">
          Press <kbd className="px-1.5 py-0.5 rounded bg-overlay/50 text-subtext font-mono text-[10px]">Ctrl+Enter</kbd> to generate
        </p>

        {/* Example Prompts */}
        <div className="mt-4">
          <p className="text-xs font-medium text-subtext mb-2">Try an example:</p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_PROMPTS.map((ex, i) => (
              <button
                key={i}
                onClick={() => handleExampleClick(ex)}
                className="text-xs bg-base border border-overlay/50 hover:border-accent/50 hover:text-accent text-subtext rounded-lg px-3 py-1.5 transition-all duration-150 hover:bg-accent/5 cursor-pointer"
              >
                {ex.length > 42 ? ex.slice(0, 42) + '…' : ex}
              </button>
            ))}
          </div>
        </div>

        {/* Generate Button */}
        <div className="mt-5 flex justify-end">
          <button
            onClick={handleGenerate}
            disabled={!prompt.trim() || isLoading}
            className="flex items-center gap-2.5 bg-gradient-to-r from-accent to-accent-dark text-base font-semibold px-6 py-2.5 rounded-xl shadow-lg shadow-accent/25 hover:shadow-accent/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:shadow-none cursor-pointer"
          >
            {isLoading ? (
              <>
                <svg className="w-4 h-4 animate-spin-slow" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Generating…
              </>
            ) : (
              <>
                <SendIcon />
                Generate YAML
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red/10 border border-red/30 rounded-xl px-5 py-4 flex items-start gap-3 animate-slide-up">
          <svg className="w-5 h-5 text-red mt-0.5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
            <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="text-red font-semibold text-sm">Generation Failed</p>
            <p className="text-red/80 text-xs mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Output Section */}
      {tree.length > 0 && (
        <div className="animate-slide-up flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-semibold text-text">Generation Complete</h3>
              <span className="text-xs text-subtext bg-surface/70 border border-overlay/40 px-2 py-0.5 rounded-full">
                {tree.length} components
              </span>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-green animate-pulse" />
                <span className="text-xs text-green font-medium">Ready</span>
              </div>
            </div>

            <button
              onClick={handleCopy}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-medium text-sm transition-all duration-200 cursor-pointer
                ${copied
                  ? 'bg-green/15 border-green/40 text-green'
                  : 'bg-surface/60 border-overlay/50 text-subtext hover:text-accent hover:border-accent/50 hover:bg-accent/5'
                }`}
            >
              {copied ? <CheckIcon /> : <CopyIcon />}
              {copied ? 'Copied!' : 'Copy YAML to Power Apps'}
            </button>
          </div>

          <div className="bg-accent/5 border border-accent/20 rounded-xl px-4 py-3 pb-[14px] flex items-center gap-3">
            <svg className="w-4 h-4 text-accent shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm8.706-1.442c1.146-.573 2.437.463 2.126 1.706l-.709 2.836.042-.02a.75.75 0 0 1 .67 1.34l-.04.022c-1.147.573-2.438-.463-2.127-1.706l.71-2.836-.042.02a.75.75 0 1 1-.671-1.34l.041-.022ZM12 9a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd" />
            </svg>
            <p className="text-accent text-xs">
              Review the visual preview on the left. Once satisfied, copy the YAML string from the right and paste it directly into Canvas Studio (<kbd className="px-1 py-px rounded bg-white/20">Ctrl+V</kbd>).
            </p>
          </div>

          <div className="flex flex-col lg:flex-row gap-6">
            {/* Visual Preview Window */}
            <div className="flex-1 bg-surface border border-overlay/40 rounded-2xl overflow-hidden shadow-2xl shadow-black/30 flex flex-col min-w-0">
              <div className="flex items-center gap-1.5 px-4 py-3 border-b border-overlay/30 bg-surface/40">
                <div className="w-2.5 h-2.5 rounded-full bg-red/70" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow/70" />
                <div className="w-2.5 h-2.5 rounded-full bg-green/70" />
                <span className="ml-2 text-subtext/60 text-[11px] font-medium tracking-wide uppercase">Visual Preview</span>
              </div>
              <div className="relative bg-[#f0f0f0] overflow-hidden flex-1 min-h-[500px] flex items-center justify-center relative overflow-hidden">
                 <div 
                   style={{ width: 1366, height: 768, transform: 'scale(auto)', zoom: 0.5 }}
                   className="relative bg-white shadow-2xl origin-center"
                 >
                  {tree.map(comp => {
                    const sharedProps = {
                      comp, selected: false,
                      onMouseDown: (e) => e.preventDefault(),
                      onClick: (e) => e.preventDefault(),
                    }
                    if (comp.type === 'Button') return <ButtonRenderer key={comp.id} {...sharedProps} />
                    if (comp.type === 'Label') return <LabelRenderer key={comp.id} {...sharedProps} />
                    if (comp.type === 'TextInput') return <TextInputRenderer key={comp.id} {...sharedProps} />
                    if (comp.type === 'Dropdown') return <DropdownRenderer key={comp.id} {...sharedProps} />
                    if (comp.type === 'Container') return (
                      <ContainerRenderer key={comp.id} {...sharedProps}
                        selectedIds={[]}
                        onChildMouseDown={(e)=>e.preventDefault()}
                        onChildClick={(e)=>e.preventDefault()}
                        onDropInto={()=>{}}
                        dragOverId={null}
                        setDragOverId={()=>{}}
                      />
                    )
                    return null
                  })}
                 </div>
              </div>
            </div>

            {/* YAML Code Pane */}
            <div className="w-full lg:w-[480px] shrink-0 bg-[#1a1b2e] border border-overlay/40 rounded-2xl overflow-hidden shadow-2xl shadow-black/30 flex flex-col">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-overlay/30 bg-surface/40">
                <div className="flex items-center gap-1.5">
                  <span className="text-violet-300 text-[11px] font-mono whitespace-nowrap overflow-hidden text-ellipsis">pa.yaml</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-subtext/40">{lineCount} lines</span>
                  <button
                    onClick={handleCopy}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-medium transition-colors cursor-pointer ${
                      copied ? 'bg-green/20 text-green' : 'bg-overlay/20 text-subtext hover:bg-accent/20 hover:text-accent'
                    }`}
                  >
                    {copied ? <CheckIcon /> : <CopyIcon />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              <div className="overflow-auto max-h-[500px] flex flex-1">
                <div className="shrink-0 select-none border-r border-overlay/20 bg-surface/20 px-3 py-4 text-right">
                  {yamlOutput.split('\n').map((_, i) => (
                    <div key={i} className="text-subtext/30 text-[10px] font-mono leading-[1.7]">
                      {i + 1}
                    </div>
                  ))}
                </div>
                <pre className="flex-1 p-4 code-output text-text/90 overflow-x-auto whitespace-pre text-[11px] leading-[1.7]">
                  <code>
                    {yamlOutput.split('\n').map((line, i) => {
                      let className = 'text-text/80'
                      const trimmed = line.trimStart()
                      if (trimmed.startsWith('-') && trimmed.endsWith(':')) className = 'text-violet-300 font-semibold'
                      else if (/^Control:/.test(trimmed)) className = 'text-blue-300'
                      else if (/^Properties:|^Children:/.test(trimmed)) className = 'text-accent/70 font-semibold'
                      else if (/^[A-Z][A-Za-z]+:/.test(trimmed)) {
                        const [, val] = line.split(/:\s*=?/)
                        return (
                          <div key={i}>
                            <span className="text-blue-200/80">{line.split(':')[0]}</span>
                            <span className="text-subtext/50">: </span>
                            <span className="text-green-300/80">={val?.trim()}</span>
                          </div>
                        )
                      }
                      return <div key={i} className={className}>{line}</div>
                    })}
                  </code>
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {tree.length === 0 && !isLoading && !error && (
        <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-surface/50 border border-overlay/30 flex items-center justify-center mb-4 shadow-inner">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8 text-subtext/40">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" />
            </svg>
          </div>
          <p className="text-subtext/60 text-sm">Your generated YAML will appear here</p>
          <p className="text-subtext/40 text-xs mt-1">Describe a component above and hit Generate</p>
        </div>
      )}
    </main>
  )
}
