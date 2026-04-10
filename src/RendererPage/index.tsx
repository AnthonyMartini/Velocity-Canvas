"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import NextImage from 'next/image'
import PropTypes from 'prop-types'
import logo from '@/assets/logo.png'
import { ButtonRenderer, LabelRenderer, TextInputRenderer, DropdownRenderer, ContainerRenderer, GalleryRenderer,  CheckboxRenderer,
  ModernButtonRenderer,
  ModernDropdownRenderer,
  ModernCheckboxRenderer,
  ModernComboBoxRenderer,
  ModernProgressBarRenderer,
  ModernSliderRenderer,
  ModernSpinnerRenderer,
  ModernTextRenderer,
  ModernTextInputRenderer,
  ModernToggleRenderer,
  LinkRenderer,
  NumberInputRenderer,
  ModernDatePickerRenderer,
  RichTextEditorRenderer,
  RatingRenderer,
  RectangleRenderer,
  IconRenderer,
  HtmlTextRenderer,
  DatePickerRenderer,
  ComboBoxRenderer,
  ToggleRenderer,
  RadioRenderer,
  SliderRenderer,
  UnknownPowerAppsObjectRenderer,
} from './components/controls'
import { SCHEMAS } from './constants'
import PropField from './components/PropField'
import ChatMessage from './components/ChatMessage'
import LayerRow from './components/LayerRow'
import { resolveSampleTextDeep } from './components/controls/sampleText'
import { parseFormula, evaluateAST } from '../common/FormulaParser'
import { uid, nextName, createComponent, createFromSpec, componentToYaml, screenToYaml, extractVariables } from './helpers'
import { findNode, updateNode, removeNode, insertNode, reorderNode, flattenTree, findParent, isDescendant, handleDropLogic, highlightYamlLine, resolveProperties, getNextAvailableName, ensureUniqueNodeNames, ensureUniqueNodeListNames, getNodeAbsolutePosition, getAllAppErrors } from '../common/helpers'
import { TYPE_ICONS, TYPE_COLORS } from '../common/constants'
import { appTheme, themeVars } from '@/theme/theme'
import { createDefaultCanvasThemeState, getActiveCanvasThemeDefinition, normalizeCanvasThemeState, resolveCanvasTheme } from '@/theme/canvasTheme'
import { looksLikePowerAppsYaml, parsePowerAppsYaml } from '@/lib/powerapps-import'
const DEFAULT_AI_LOADING_MESSAGE = 'Generating your layout changes...'
const CANVAS_ZOOM_BASE = 0.9
const createInitialChatMessages = () => ([
  { role: 'assistant', content: 'Hi! Tell me what to add Ã¢â‚¬â€ e.g. "Add a container with a title label and a submit button inside it."', added: 0 }
])
const RENDERER_CHAT_MODEL_OPTIONS = [
  { value: 'gemini-3-flash-preview', label: '3-flash-preview - 5 credits' },
  { value: 'gemini-3.1-pro-preview', label: '3.1-pro-preview - 10 credits' },
] as const
const DEFAULT_RENDERER_CHAT_MODEL = RENDERER_CHAT_MODEL_OPTIONS[0].value
const INTERNAL_COMPONENT_CLIPBOARD_PREFIX = '__VELOCITY_CANVAS_COMPONENTS__:'
const COMPONENT_LIBRARY_GROUPS = [
  {
    key: 'input',
    label: 'Input',
    types: ['Button', 'TextInput', 'Dropdown', 'Checkbox', 'DatePicker', 'ComboBox', 'Toggle', 'Radio', 'Slider', 'RichTextEditor', 'Rating'],
  },
  {
    key: 'output',
    label: 'Output',
    types: ['Label', 'HtmlText'],
  },
  {
    key: 'display',
    label: 'Display',
    types: ['Container', 'Gallery', 'Rectangle', 'Icon'],
  },
  {
    key: 'modern',
    label: 'Modern',
    types: ['ModernButton', 'ModernDropdown', 'ModernCheckbox', 'ModernComboBox', 'ModernProgressBar', 'ModernSlider', 'ModernSpinner', 'ModernText', 'ModernTextInput', 'ModernToggle', 'Link', 'NumberInput', 'ModernDatePicker'],
  },
] as const
const AI_REQUEST_SUMMARY_KEYS = new Set([
  'id',
  'type',
  'name',
  'X',
  'Y',
  'Width',
  'Height',
  'Text',
  'Fill',
  'Color',
  'Appearance',
  'BasePaletteColor',
  'BorderRadius',
  'Size',
  'Font',
  'FontColor',
  'FontSize',
  'FontWeight',
  'Align',
  'VerticalAlign',
  'DisplayMode',
  'Visible',
  'Icon',
  'IconStyle',
  'LayoutMode',
  'Layout',
])

function compactNodeForAIRequest(node, { summaryOnly = false, childLimit = 0 } = {}) {
  if (!node || typeof node !== 'object') return null

  const out: any = {}

  for (const [key, value] of Object.entries(node)) {
    if (value == null || key.startsWith('_') || typeof value === 'function') continue

    if (key === 'children') {
      if (!Array.isArray(value) || value.length === 0 || childLimit <= 0) continue
      out.children = value.slice(0, childLimit).map(child => compactNodeForAIRequest(child, { summaryOnly: true }))
      out.childCount = value.length
      continue
    }

    if (Array.isArray(value)) {
      if (summaryOnly || value.length === 0) continue
      if (value.every(item => item == null || ['string', 'number', 'boolean'].includes(typeof item))) {
        out[key] = value.slice(0, 12)
      }
      continue
    }

    if (typeof value === 'object') continue
    if (summaryOnly && !AI_REQUEST_SUMMARY_KEYS.has(key)) continue

    out[key] = value
  }

  return out
}

function serializeCopiedNodes(nodes) {
  return `${INTERNAL_COMPONENT_CLIPBOARD_PREFIX}${JSON.stringify(nodes)}`
}

function deserializeCopiedNodes(text) {
  if (typeof text !== 'string' || !text.startsWith(INTERNAL_COMPONENT_CLIPBOARD_PREFIX)) {
    return null
  }

  try {
    const parsed = JSON.parse(text.slice(INTERNAL_COMPONENT_CLIPBOARD_PREFIX.length))
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

async function consumeAIResponse(res, options: any = {}) {
  const { onStatus, onPatch, onReply } = options
  const contentType = res.headers.get('content-type') || ''
  if (!contentType.includes('text/event-stream')) {
    return { mode: 'legacy' as const, data: await res.json() }
  }

  const reader = res.body?.getReader()
  if (!reader) {
    throw new Error('Streaming response not available')
  }

  const decoder = new TextDecoder()
  let buffer = ''
  let finalResult = null
  let didStreamPatches = false
  let didComplete = false
  const streamed = {
    reply: '',
    added: 0,
    mods: 0,
    lastId: null,
  }

  const processEvent = (rawEvent) => {
    if (!rawEvent.trim()) return

    let eventName = 'message'
    const dataLines = []

    rawEvent.split(/\r?\n/).forEach(line => {
      if (line.startsWith('event:')) eventName = line.slice(6).trim()
      if (line.startsWith('data:')) dataLines.push(line.slice(5).trim())
    })

    const rawPayload = dataLines.join('\n')
    const payload = rawPayload ? JSON.parse(rawPayload) : null

    if (eventName === 'status' && payload?.message) {
      onStatus?.(payload.message)
      return
    }

    if (eventName === 'error') {
      throw new Error(payload?.error || 'AI request failed')
    }

    if (eventName === 'reply') {
      streamed.reply = payload?.text || streamed.reply || 'Done!'
      onReply?.(streamed.reply)
      return
    }

    if (eventName === 'patch' && payload?.op) {
      didStreamPatches = true
      onPatch?.(payload)

      if (payload.op === 'add') {
        streamed.added += 1
        streamed.lastId = payload?.component?.id || streamed.lastId
      } else if (payload.op === 'update') {
        streamed.mods += 1
        streamed.lastId = payload?.id || streamed.lastId
      } else if (payload.op === 'remove' || payload.op === 'reparent') {
        streamed.mods += 1
        streamed.lastId = payload?.id || streamed.lastId
      }
      return
    }

    if (eventName === 'done') {
      didComplete = true
      if (!streamed.reply && payload?.reply) streamed.reply = payload.reply
      return
    }

    if (eventName === 'result') {
      finalResult = payload
    }
  }

  while (true) {
    const { value, done } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })

    let boundary = buffer.indexOf('\n\n')
    while (boundary !== -1) {
      const eventBlock = buffer.slice(0, boundary)
      buffer = buffer.slice(boundary + 2)
      processEvent(eventBlock)
      boundary = buffer.indexOf('\n\n')
    }
  }

  if (buffer.trim()) {
    processEvent(buffer.trim())
  }

  if (finalResult == null) {
    if (didStreamPatches || didComplete) {
      return {
        mode: 'stream' as const,
        ...streamed,
        reply: streamed.reply || 'Done!'
      }
    }
    throw new Error('No AI result returned')
  }

  return { mode: 'legacy' as const, data: finalResult }
}

// â”€â”€ Live-Validating Name Input â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function NameInput({ initialValue, checkDuplicate, onCommit }) {
  const [val, setVal] = useState(initialValue)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { setVal(initialValue); setError(null) }, [initialValue])

  const handleChange = (e) => {
    const v = (e.target as any).value
    setVal(v)
    setError(checkDuplicate(v))
  }

  const handleCommit = () => {
    if (error || !val.trim()) {
      setVal(initialValue)
      setError(null)
    } else {
      onCommit(val.trim())
    }
  }

  return (
    <div>
      <input
        type="text"
        value={val}
        onChange={handleChange}
        onBlur={handleCommit}
        onKeyDown={e => {
          if (e.key === 'Enter') (e.target as any).blur()
          if (e.key === 'Escape') {
            setVal(initialValue)
            setError(null);
            (e.target as any).blur()
          }
        }}
        placeholder="Component name"
        className={`w-full bg-base border rounded-lg px-2.5 py-1.5 text-xs text-text font-semibold focus:outline-none focus:ring-1 transition-all ${
          error
            ? 'border-red/100 ring-1 ring-red-500/20 bg-red-500/5 focus:ring-red-500/30'
            : 'border-overlay/40 focus:border-accent/60 focus:ring-accent/20'
        }`}
      />
      {error && <p className="text-[10px] text-red/100 font-medium mt-1">{error}</p>}
    </div>
  )
}

// ── Errors Pane ───────────────────────────────────────────────────────────────────────────────────
function ErrorCard({ err, onSelectNode }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = (e) => {
    e.stopPropagation()
    const text = `${err.path}\n${err.error}`
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    })
  }

  return (
    <div
      onClick={() => onSelectNode(err.nodeId)}
      className="group flex flex-col gap-1.5 p-3 rounded-lg border border-red/20 bg-red/5 hover:bg-red/10 hover:border-red/40 transition-colors cursor-pointer"
    >
      <div className="flex items-center justify-between overflow-hidden gap-2">
        <span className="text-[11px] font-mono text-red-300 font-semibold truncate flex-1" title={err.path}>{err.path}</span>
        <span className="text-[10px] shrink-0 px-1.5 py-0.5 rounded bg-black/20 text-subtext/60 group-hover:text-text transition-colors">Select &rarr;</span>
      </div>
      <p className="text-[11px] text-red-200 leading-relaxed">{err.error}</p>
      <div className="flex justify-end mt-0.5">
        <button
          onClick={handleCopy}
          title="Copy error to clipboard"
          className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border transition-all duration-200 cursor-pointer ${
            copied
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
              : 'bg-black/20 border-transparent text-subtext/50 hover:border-red/30 hover:text-red-300'
          }`}
        >
          {copied ? (
            <>
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 0 1 .208 1.04l-9 13.5a.75.75 0 0 1-1.154.114l-6-6a.75.75 0 0 1 1.06-1.06l5.353 5.353 8.493-12.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7.5 3.375c0-1.036.84-1.875 1.875-1.875h.375a3.75 3.75 0 0 1 3.75 3.75v1.875C13.5 8.161 14.34 9 15.375 9h1.875A3.75 3.75 0 0 1 21 12.75v3.375C21 17.16 20.16 18 19.125 18h-9.75A1.875 1.875 0 0 1 7.5 16.125V3.375Z" />
                <path d="M15 5.25a5.23 5.23 0 0 0-1.279-3.434 9.768 9.768 0 0 1 6.963 6.963A5.23 5.23 0 0 0 17.25 7.5h-1.875A.375.375 0 0 1 15 7.125V5.25ZM4.875 6H6v10.125A3.375 3.375 0 0 0 9.375 19.5H16.5v1.125c0 1.035-.84 1.875-1.875 1.875h-9.75A1.875 1.875 0 0 1 3 20.625V7.875C3 6.839 3.84 6 4.875 6Z" />
              </svg>
              Copy
            </>
          )}
        </button>
      </div>
    </div>
  )
}

function ErrorsPane({ errors, onSelectNode, width = 320, onClose }) {
  return (
    <div style={{ width, backgroundColor: themeVars.colors.panel }} className="shrink-0 border-l border-overlay/30 flex flex-col overflow-hidden relative">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-overlay/20 bg-surface/30 shrink-0">
        <div className="absolute right-5 z-10 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-400" />
          <span className="text-xs font-semibold text-text">Validation Errors</span>
          <span className="text-[10px] text-white bg-red/80 px-1.5 py-0.5 rounded-full">{errors.length}</span>
        </div>
        <button
          onClick={onClose}
          className="text-subtext/40 hover:text-subtext transition-colors duration-150 cursor-pointer p-1"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 0 1 1.06 0L12 10.94l5.47-5.47a.75.75 0 1 1 1.06 1.06L13.06 12l5.47 5.47a.75.75 0 1 1-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 0 1-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* Errors list */}
      <div className="flex-1 overflow-auto p-4 flex flex-col gap-3">
        {errors.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-subtext/40 gap-2">
            <svg className="w-8 h-8 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs italic">No errors found. Great job!</span>
          </div>
        ) : (
          errors.map((err, i) => (
            <ErrorCard key={i} err={err} onSelectNode={onSelectNode} />
          ))
        )}
      </div>
    </div>
  )
}

function RendererSwitch({ comp, sharedProps }) {
  if (comp.type === 'Button') return <ButtonRenderer key={comp.id} {...sharedProps} />
  if (comp.type === 'ModernButton') return <ModernButtonRenderer key={comp.id} {...sharedProps} />
  if (comp.type === 'ModernDropdown') return <ModernDropdownRenderer key={comp.id} {...sharedProps} />
  if (comp.type === 'ModernCheckbox') return <ModernCheckboxRenderer key={comp.id} {...sharedProps} />
  if (comp.type === 'ModernComboBox') return <ModernComboBoxRenderer key={comp.id} {...sharedProps} />
  if (comp.type === 'ModernProgressBar') return <ModernProgressBarRenderer key={comp.id} {...sharedProps} />
  if (comp.type === 'ModernSlider') return <ModernSliderRenderer key={comp.id} {...sharedProps} />
  if (comp.type === 'ModernSpinner') return <ModernSpinnerRenderer key={comp.id} {...sharedProps} />
  if (comp.type === 'ModernText') return <ModernTextRenderer key={comp.id} {...sharedProps} />
  if (comp.type === 'ModernTextInput') return <ModernTextInputRenderer key={comp.id} {...sharedProps} />
  if (comp.type === 'ModernToggle') return <ModernToggleRenderer key={comp.id} {...sharedProps} />
  if (comp.type === 'Link') return <LinkRenderer key={comp.id} {...sharedProps} />
  if (comp.type === 'NumberInput') return <NumberInputRenderer key={comp.id} {...sharedProps} />
  if (comp.type === 'ModernDatePicker') return <ModernDatePickerRenderer key={comp.id} {...sharedProps} />
  if (comp.type === 'RichTextEditor') return <RichTextEditorRenderer key={comp.id} {...sharedProps} />
  if (comp.type === 'Rating') return <RatingRenderer key={comp.id} {...sharedProps} />
  if (comp.type === 'Label') return <LabelRenderer key={comp.id} {...sharedProps} />
  if (comp.type === 'TextInput') return <TextInputRenderer key={comp.id} {...sharedProps} />
  if (comp.type === 'Dropdown') return <DropdownRenderer key={comp.id} {...sharedProps} />
  if (comp.type === 'Container') return (
    <ContainerRenderer key={comp.id} {...sharedProps}
      selectedIds={sharedProps.selectedIds || []}
      onChildMouseDown={sharedProps.onChildMouseDown}
      onChildClick={sharedProps.onChildClick}
      onDropInto={sharedProps.onDropInto}
      dragOverId={sharedProps.dragOverId}
      setDragOverId={sharedProps.setDragOverId}
    />
  )
  if (comp.type === 'Gallery') return (
    <GalleryRenderer key={comp.id} {...sharedProps}
      selectedIds={sharedProps.selectedIds || []}
      onChildMouseDown={sharedProps.onChildMouseDown}
      onChildClick={sharedProps.onChildClick}
      onDropInto={sharedProps.onDropInto}
      dragOverId={sharedProps.dragOverId}
      setDragOverId={sharedProps.setDragOverId}
    />
  )
  if (comp.type === 'Checkbox') return (
    <CheckboxRenderer key={comp.id} {...sharedProps} />
  )
  if (comp.type === 'Rectangle') return (
    <RectangleRenderer key={comp.id} {...sharedProps} />
  )
  if (comp.type === 'Icon') {
    // Inject the raw SVG string if available
    return <IconRenderer key={comp.id} {...sharedProps} />
  }
  if (comp.type === 'HtmlText') return (
    <HtmlTextRenderer key={comp.id} {...sharedProps} />
  )
  if (comp.type === 'DatePicker') return (
    <DatePickerRenderer key={comp.id} {...sharedProps} />
  )
  if (comp.type === 'ComboBox') return (
    <ComboBoxRenderer key={comp.id} {...sharedProps} />
  )
  if (comp.type === 'Toggle') return (
    <ToggleRenderer key={comp.id} {...sharedProps} />
  )
  if (comp.type === 'Radio') return (
    <RadioRenderer key={comp.id} {...sharedProps} />
  )
  if (comp.type === 'Slider') return (
    <SliderRenderer key={comp.id} {...sharedProps} />
  )
  if (comp.type === 'UnknownPowerAppsObject') return (
    <UnknownPowerAppsObjectRenderer key={comp.id} {...sharedProps} />
  )
  return null
}

function AppLoadingOverlay({ isVisible, onCancel, message }) {
  if (!isVisible) return null;
  return (
    <div className="fixed inset-0 z-[100001] flex items-center justify-center animate-in fade-in duration-300">
      <div className="absolute inset-0 backdrop-blur-[1px]" style={{ backgroundColor: themeVars.colors.panelScrim }} />
      <div className="relative border border-violet-500/30 rounded-3xl p-8 shadow-2xl flex flex-col items-center gap-6 max-w-sm w-full mx-4" style={{ backgroundColor: themeVars.colors.panel }}>
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-violet-500/20 border-t-violet-500 animate-spin" />
          <div className="absolute inset-0 pointer-events-none text-transparent">
            <NextImage
              src={logo}
              alt="Velocity Canvas"
              width={40}
              height={40}
              className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 object-contain"
              priority
            />
            <span className="text-xl">âœ¨</span>
          </div>
        </div>
        <div className="text-center">
          <h3 className="text-lg font-bold text-white mb-1">AI at work</h3>
          <p className="text-sm text-subtext/60">{message || DEFAULT_AI_LOADING_MESSAGE}</p>
        </div>
        <button 
          onClick={onCancel}
          className="w-full py-3 rounded-2xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-bold border border-red-500/20 transition-all cursor-pointer active:scale-95"
        >
          Cancel Request
        </button>
      </div>
    </div>
  )
}

function FloatingTweakBar({ node, isTweaking, setIsTweaking, tweakInput, setTweakInput, handleTweakSubmit, tweakLoading, tweakOriginalNode, confirmTweak, undoTweak, handleReorder, deleteSelected }) {
  if (!node) return null;

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] flex flex-col items-center gap-2 pointer-events-none">
      <div className="pointer-events-auto backdrop-blur-xl border border-overlay/40 rounded-2xl shadow-2xl p-1.5 flex items-center gap-2 animate-in fade-in slide-in-from-top-4 duration-500" style={{ backgroundColor: 'color-mix(in srgb, var(--vc-color-panel) 80%, transparent)' }}>
        {/* Layer Actions */}
        <div className="flex items-center gap-0.5 bg-overlay/10 rounded-xl p-0.5 border border-overlay/20">
          <button onClick={() => handleReorder(node.id, 'back')} title="Send to Back" className="w-7 h-7 flex items-center justify-center text-subtext/60 hover:text-accent hover:bg-accent/10 rounded-lg transition-colors cursor-pointer">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M7 13l5 5 5-5M7 6l5 5 5-5"/></svg>
          </button>
          <button onClick={() => handleReorder(node.id, 'down')} title="Move Backward" className="w-7 h-7 flex items-center justify-center text-subtext/60 hover:text-accent hover:bg-accent/10 rounded-lg transition-colors cursor-pointer">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 9l-7 7-7-7"/></svg>
          </button>
          <button onClick={() => handleReorder(node.id, 'up')} title="Move Forward" className="w-7 h-7 flex items-center justify-center text-subtext/60 hover:text-accent hover:bg-accent/10 rounded-lg transition-colors cursor-pointer">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 15l7-7 7 7"/></svg>
          </button>
          <button onClick={() => handleReorder(node.id, 'front')} title="Bring to Front" className="w-7 h-7 flex items-center justify-center text-subtext/60 hover:text-accent hover:bg-accent/10 rounded-lg transition-colors cursor-pointer">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17 11l-5-5-5 5M17 18l-5-5-5 5"/></svg>
          </button>
        </div>
        <div className="w-px h-6 bg-overlay/20 mx-1" />

        <button
          onClick={deleteSelected}
          title="Delete selected component"
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-red-500/10 text-red-300 transition-all hover:bg-red-500/20 hover:text-red-200 cursor-pointer"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path fillRule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 0 1 3.878.512.75.75 0 1 1-.256 1.478l-.209-.035-1.005 13.07a3 3 0 0 1-2.991 2.77H8.084a3 3 0 0 1-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 0 1-.256-1.478A48.567 48.567 0 0 1 7.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 0 1 3.369 0c1.603.051 2.815 1.387 2.815 2.951Zm-6.136-1.452a51.196 51.196 0 0 1 3.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 0 0-6 0v-.113c0-.794.609-1.428 1.364-1.452Zm-.355 5.945a.75.75 0 1 0-1.5.058l.347 9a.75.75 0 1 0 1.499-.058l-.346-9Zm5.48.058a.75.75 0 1 0-1.498-.058l-.347 9a.75.75 0 0 0 1.5.058l.345-9Z" clipRule="evenodd" />
          </svg>
        </button>

        <button 
          onClick={() => setIsTweaking(!isTweaking)}
          style={isTweaking ? {
            backgroundImage: themeVars.gradients.askAi,
            boxShadow: `0 12px 28px ${appTheme.editor.askAi.glow}, inset 0 1px 0 ${appTheme.editor.askAi.insetHighlight}, inset 0 -1px 0 ${appTheme.editor.askAi.insetShadow}`,
          } : undefined}
          className={`flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 rounded-xl transition-all duration-300 border shadow-sm cursor-pointer ${
            isTweaking 
              ? 'text-white border-white/10 ring-2 ring-accent/25' 
              : 'bg-surface/60 text-subtext/90 border-overlay/40 hover:text-white hover:border-accent/30 active:scale-95'
          }`}
        >
          <span className="text-sm">✨</span>
          Tweak with AI - 1 credit
        </button>
      </div>

      {isTweaking && (
        <div className="pointer-events-auto w-[320px] backdrop-blur-2xl border border-violet-500/30 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300" style={{ backgroundColor: 'color-mix(in srgb, var(--vc-color-panel) 90%, transparent)' }}>
          <div className="p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-violet-300 uppercase tracking-wider">AI Styling Tweak - 1 credit</span>
              <button onClick={() => setIsTweaking(false)} className="text-subtext/40 hover:text-subtext transition-colors cursor-pointer">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path fillRule="evenodd" d="M5.47 5.47a.75.75 0 0 1 1.06 0L12 10.94l5.47-5.47a.75.75 0 1 1 1.06 1.06L13.06 12l5.47 5.47a.75.75 0 1 1-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 0 1-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" /></svg>
              </button>
            </div>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={tweakInput}
                onChange={e => setTweakInput(e.target.value)}
                onKeyDown={e => {
                  e.stopPropagation()
                  if (e.key === 'Enter') handleTweakSubmit()
                  if (e.key === 'Escape') setIsTweaking(false)
                }}
                autoFocus
                placeholder="e.g. bold red text with soft shadow"
                className="flex-1 bg-surface border border-violet-500/20 rounded-xl px-3 py-2 text-xs text-text placeholder:text-subtext/40 focus:outline-none focus:border-violet-500/50 transition-all"
              />
              <button 
                onClick={handleTweakSubmit}
                disabled={tweakLoading || !tweakInput.trim()}
                className="w-9 h-9 rounded-xl bg-violet-500 text-white flex items-center justify-center shrink-0 disabled:opacity-40 shadow-lg shadow-violet-500/25 hover:bg-violet-600 transition-colors cursor-pointer"
              >
                {tweakLoading ? (
                  <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M3.478 2.405a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.405Z" /></svg>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// â”€â”€ Code Pane â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function CodePane({ node, tree, canvasTheme, globalErrors, notify, isTweaking, setIsTweaking, tweakInput, setTweakInput, handleTweakSubmit, tweakLoading, tweakOriginalNode, width, onClose }) {
  const [copied, setCopied] = useState(false)
  
  // App nodes have no YAML preview. Screen nodes show a full Screens: document.
  const yaml = (() => {
    if (!node || node.type === 'App') return screenToYaml(tree, canvasTheme)
    if (node.type === 'Screen') {
      return screenToYaml(tree, canvasTheme, [node])
    }
    return componentToYaml(node)
  })()

  const handleCopy = () => {
    // Prevent copying if there are validation errors in the selected node (or whole screen if none selected)
    const hasErrors = node 
      ? globalErrors.some(err => err.nodeId === node.id || isDescendant(tree, err.nodeId, node.id))
      : globalErrors.length > 0;

    if (hasErrors) {
      notify("Cannot copy YAML with validation errors. Please fix them in the Errors pane first.", "Error");
      return;
    }

    navigator.clipboard.writeText(yaml).then(() => {
      notify('Power Apps YAML copied to clipboard.', 'Success')
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    })
  }

  // Basic token coloring
  const highlighted = yaml
    ? yaml.split('\n').map((line, i) => highlightYamlLine(line, i))
    : null

  return (
    <div style={{ width, backgroundColor: themeVars.colors.panel }} className="shrink-0 border-l border-overlay/30 flex flex-col overflow-hidden relative">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-overlay/20 bg-surface/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-violet-400" />
          <span className="text-xs font-semibold text-text">PA YAML</span>
          {node
            ? <span className="text-[10px] text-subtext/50 bg-overlay/30 px-1.5 py-0.5 rounded-full">{node.type}</span>
            : <span className="text-[10px] text-violet-300/80 bg-violet-500/10 border border-violet-500/20 px-1.5 py-0.5 rounded-full">Screen</span>
          }
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleCopy}
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border transition-all duration-200 cursor-pointer
              ${copied
                ? 'bg-green/15 border-green/30 text-green'
                : 'bg-base/60 border-overlay/40 text-subtext hover:border-accent/50 hover:text-accent'
              }`}
          >
            {copied ? (
              <>
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                  <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 0 1 .208 1.04l-9 13.5a.75.75 0 0 1-1.154.114l-6-6a.75.75 0 0 1 1.06-1.06l5.353 5.353 8.493-12.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
                </svg>
                <span className="hidden sm:inline">Copied!</span>
              </>
            ) : (
              <>
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7.5 3.375c0-1.036.84-1.875 1.875-1.875h.375a3.75 3.75 0 0 1 3.75 3.75v1.875C13.5 8.161 14.34 9 15.375 9h1.875A3.75 3.75 0 0 1 21 12.75v3.375C21 17.16 20.16 18 19.125 18h-9.75A1.875 1.875 0 0 1 7.5 16.125V3.375Z" />
                  <path d="M15 5.25a5.23 5.23 0 0 0-1.279-3.434 9.768 9.768 0 0 1 6.963 6.963A5.23 5.23 0 0 0 17.25 7.5h-1.875A.375.375 0 0 1 15 7.125V5.25ZM4.875 6H6v10.125A3.375 3.375 0 0 0 9.375 19.5H16.5v1.125c0 1.035-.84 1.875-1.875 1.875h-9.75A1.875 1.875 0 0 1 3 20.625V7.875C3 6.839 3.84 6 4.875 6Z" />
                </svg>
                <span className="hidden sm:inline">Copy</span>
              </>
            )}
          </button>
          <button
            onClick={onClose}
            className="text-subtext/40 hover:text-subtext transition-colors duration-150 cursor-pointer p-1"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 0 1 1.06 0L12 10.94l5.47-5.47a.75.75 1 1 1.06 1.06L13.06 12l5.47 5.47a.75.75 0 1 1-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 0 1-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      {/* Code area */}
      <div className="flex-1 overflow-auto pl-0 pr-1 py-4 font-mono text-[11px]">
        {highlighted ? (
          highlighted.map((lineElement, i) => (
            <div key={i} className="flex gap-3 group hover:bg-white/5 transition-colors">
              <span className="w-8 shrink-0 text-right text-subtext/20 select-none group-hover:text-subtext/40 transition-colors pt-[1px]">
                {i + 1}
              </span>
              <div className="flex-1 whitespace-pre-wrap break-words overflow-visible">
                {lineElement}
              </div>
            </div>
          ))
        ) : (
          <span className="text-subtext/30 italic">Select a Screen or component to view YAML</span>
        )}
      </div>
    </div>
  )
}

CodePane.propTypes = {
  node: PropTypes.object, // Can be null for screen mode
  tree: PropTypes.array.isRequired,
  globalErrors: PropTypes.array.isRequired,
  notify: PropTypes.func.isRequired,
  isTweaking: PropTypes.bool.isRequired,
  setIsTweaking: PropTypes.func.isRequired,
  tweakInput: PropTypes.string.isRequired,
  setTweakInput: PropTypes.func.isRequired,
  handleTweakSubmit: PropTypes.func.isRequired,
  tweakLoading: PropTypes.bool.isRequired,
  tweakOriginalNode: PropTypes.object,
}

const TOUR_STEPS = [
  {
    target: '#top-menu',
    title: 'Welcome to Velocity Canvas!',
    content: 'This is your workspace for building Power Apps visually. Let\'s take a quick tour of the features.'
  },
  {
    target: '#left-toolbar',
    title: 'Component Library',
    content: 'Add buttons, labels, containers, and more to your canvas with a single click.'
  },
  {
    target: '#layers-panel',
    title: 'Layers & Screens',
    content: 'Manage your app hierarchy here. Organize components into screens and containers.'
  },
  {
    target: '#canvas-root',
    title: 'The Design Canvas',
    content: 'Drag, resize, and arrange your components exactly how you want them to appear in your app.'
  },
  {
    target: '#chat-panel-trigger',
    title: 'AI Assistant',
    content: 'Need help? Ask the AI to build screens, tweak styles, or explain PowerFx logic for you.'
  },
  {
    target: '#yaml-trigger',
    title: 'Ready-to-use YAML',
    content: 'View and copy the generated Power Apps YAML at any time to import into your real app.'
  },
  {
    target: '#props-panel',
    title: 'Property Editor',
    content: 'Fine-tune your components here. Change colors, sizes, borders, and even add PowerFx logic.'
  }
]

function TourOverlay({ step, onNext, onBack, onFinish }) {
  const [rect, setRect] = useState(null)

  useEffect(() => {
    const updateRect = () => {
      const el = document.querySelector(step.target)
      if (el) {
        setRect(el.getBoundingClientRect())
      } else {
        console.warn(`Tour target not found: ${step.target}`)
        // Fallback or skip if target missing? For now, just log.
      }
    }
    updateRect()
    window.addEventListener('resize', updateRect)
    window.addEventListener('scroll', updateRect, true)
    return () => {
      window.removeEventListener('resize', updateRect)
      window.removeEventListener('scroll', updateRect, true)
    }
  }, [step])

  if (!rect) return null

  const margin = 8
  const r = {
    top: rect.top - margin,
    left: rect.left - margin,
    width: rect.width + margin * 2,
    height: rect.height + margin * 2,
    bottom: rect.bottom + margin,
    right: rect.right + margin
  }

  // Backdrop common style
  const backdropBase = {
    position: 'fixed',
    backgroundColor: themeVars.colors.panelScrim,
    zIndex: 99998,
    transition: 'all 0.3s ease-in-out'
  } as any

  // Position popup in the center of the screen
  const popupStyle = {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '320px',
    backgroundColor: themeVars.colors.panel,
    border: `1px solid ${appTheme.editor.tour.popupBorder}`,
    borderRadius: '20px',
    padding: '24px',
    color: themeVars.colors.white,
    zIndex: 100001,
    boxShadow: themeVars.shadows.floatingPanel,
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
  } as any

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, pointerEvents: 'none' } as any}>
      {/* Click Shield: Blocks all interaction with the app */}
      <div 
        style={{ 
          position: 'fixed', 
          inset: 0, 
          zIndex: 99997, 
          backgroundColor: 'transparent', 
          pointerEvents: 'auto',
          cursor: 'default'
        } as any} 
        onClick={(e) => e.stopPropagation()}
      />

      {/* Top backdrop */}
      <div style={{ ...backdropBase, top: 0, left: 0, right: 0, height: Math.max(0, r.top) }} />
      {/* Bottom backdrop */}
      <div style={{ ...backdropBase, top: r.bottom, left: 0, right: 0, bottom: 0 }} />
      {/* Left backdrop */}
      <div style={{ ...backdropBase, top: Math.max(0, r.top), height: r.height, left: 0, width: Math.max(0, r.left) }} />
      {/* Right backdrop */}
      <div style={{ ...backdropBase, top: Math.max(0, r.top), height: r.height, left: r.right, right: 0 }} />

      {/* Spotlight Border */}
      <div style={{ 
        position: 'fixed', 
        top: r.top, 
        left: r.left, 
        width: r.width, 
        height: r.height, 
        border: `2px solid ${appTheme.colors.white}`, 
        borderRadius: '12px', 
        zIndex: 99999, 
        pointerEvents: 'none',
        transition: 'all 0.3s ease-in-out',
        boxShadow: themeVars.shadows.spotlight
      } as any} />
      
      <div style={{ ...popupStyle, pointerEvents: 'auto' }}>
        {/* Close Button */}
        <button 
          onClick={onFinish}
          className="absolute top-4 right-4 text-subtext/40 hover:text-white transition-colors cursor-pointer"
          title="Exit Tutorial"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 0 1 1.06 0L12 10.94l5.47-5.47a.75.75 0 1 1 1.06 1.06L13.06 12l5.47 5.47a.75.75 0 1 1-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 0 1-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
          </svg>
        </button>

        <h3 className="text-sm font-bold mb-2 text-accent pr-8">{step.title}</h3>
        <p className="text-xs text-subtext/80 mb-6 leading-relaxed">{step.content}</p>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-subtext/40 font-mono">
            {TOUR_STEPS.indexOf(step) + 1} / {TOUR_STEPS.length}
          </span>
          <div className="flex gap-2">
            {TOUR_STEPS.indexOf(step) > 0 && (
              <button 
                onClick={onBack}
                className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-overlay/20 hover:bg-overlay/40 text-subtext transition-colors cursor-pointer"
              >
                Back
              </button>
            )}
            <button 
              onClick={TOUR_STEPS.indexOf(step) === TOUR_STEPS.length - 1 ? onFinish : onNext}
              className="px-4 py-1.5 rounded-lg text-[10px] font-bold bg-accent hover:bg-accent-hover text-white transition-all shadow-lg shadow-accent/20 cursor-pointer"
            >
              {TOUR_STEPS.indexOf(step) === TOUR_STEPS.length - 1 ? 'Finish' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Main Page
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function RendererPage({ user, onCreditDeduction, activeProject, setActiveProject }: { user: any, onCreditDeduction?: () => void, activeProject: any, setActiveProject: (p: any) => void }) {
  const [isSaving, setIsSaving] = useState(false)
  const [lastSavedState, setLastSavedState] = useState('')
  const [canvasW, setCanvasW] = useState(1366)
  const [canvasH, setCanvasH] = useState(768)
  const [canvasWInput, setCanvasWInput] = useState('1366')
  const [canvasHInput, setCanvasHInput] = useState('768')
  const [canvasTheme, setCanvasTheme] = useState<any>(() => createDefaultCanvasThemeState())
  
  const [tree, setTree] = useState([
    {
      id: 'app_root',
      type: 'App',
      name: 'App',
      children: [
        {
          id: 'screen_1',
          type: 'Screen',
          name: 'Screen1',
          Fill: appTheme.controlDefaults.Screen.Fill,
          children: []
        }
      ]
    }
  ])           // component tree
  const [selectedIds, setSelectedIds] = useState([]) // Array of selected component IDs
  const [dragOverId, setDragOverId] = useState(null)
  const [collapsedIds, setCollapsedIds] = useState(new Set()) // Container collapse state
  const [zoom, setZoom] = useState(1) // User-facing zoom level (100% baseline)
  const [showCodePane, setShowCodePane] = useState(false) // Toggle visibility of the YAML CodePane
  const [showErrorsPane, setShowErrorsPane] = useState(false) // Toggle visibility of the Errors Pane
  const [showPropertiesPane, setShowPropertiesPane] = useState(false) // Toggle visibility of Properties Pane
  const [showMobilePaneMenu, setShowMobilePaneMenu] = useState(false)
  const showLayerNames = true // Always show layer names/full size
  const componentLibraryGroups = useMemo(() => {
    return COMPONENT_LIBRARY_GROUPS
      .map(group => ({
        ...group,
        items: group.types
          .map(type => [type, SCHEMAS[type]] as const)
          .filter(([, schema]) => Boolean(schema)),
      }))
      .filter(group => group.items.length > 0)
  }, [])

  const [chatOpen, setChatOpen] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', content: 'Hi! Tell me what to add â€” e.g. "Add a container with a title label and a submit button inside it."', added: 0 }
  ])
  const [chatModel, setChatModel] = useState<string>(DEFAULT_RENDERER_CHAT_MODEL)
  const [chatLoading, setChatLoading] = useState(false)
  const [chatImage, setChatImage] = useState(null)
  const fileInputRef = useRef(null)

  // Tour State
  const [isTourActive, setIsTourActive] = useState(false)
  const [currentTourStep, setCurrentTourStep] = useState(0)

  // Drag-to-select state
  const [selectionBox, setSelectionBox] = useState(null)

  // AI Tweak state
  const [tweakOriginalNode, setTweakOriginalNode] = useState(null)
  const [isTweaking, setIsTweaking] = useState(false)
  const [tweakInput, setTweakInput] = useState('')
  const [tweakLoading, setTweakLoading] = useState(false)
  const [aiLoadingMessage, setAiLoadingMessage] = useState(DEFAULT_AI_LOADING_MESSAGE)

  // Abort Controllers for AI
  const chatAbortControllerRef = useRef<AbortController | null>(null)
  const tweakAbortControllerRef = useRef<AbortController | null>(null)

  const handleCancelAI = useCallback(() => {
    if (chatAbortControllerRef.current) {
      chatAbortControllerRef.current.abort()
      chatAbortControllerRef.current = null
    }
    if (tweakAbortControllerRef.current) {
      tweakAbortControllerRef.current.abort()
      tweakAbortControllerRef.current = null
    }
    setChatLoading(false)
    setTweakLoading(false)
    setAiLoadingMessage(DEFAULT_AI_LOADING_MESSAGE)
  }, [])

  const handleClearChat = useCallback(() => {
    if (chatAbortControllerRef.current) {
      chatAbortControllerRef.current.abort()
      chatAbortControllerRef.current = null
    }
    setChatLoading(false)
    setAiLoadingMessage(DEFAULT_AI_LOADING_MESSAGE)
    setChatMessages(createInitialChatMessages())
    setChatInput('')
    setChatImage(null)
  }, [])
  
  // Sidebar/Pane Resizing state
  const [rightWidth, setRightWidth] = useState(320)
  const [chatHeight, setChatHeight] = useState(240)
  const [codeWidth, setCodeWidth] = useState(384)
  const paneResizeRef = useRef(null)

  // History state for Undo/Redo
  const [historyState, setHistoryState] = useState({
    items: [[...tree]],
    index: 0
  })
  const treeRef = useRef(tree)
  const activeScreenIdRef = useRef<string | null>(null)
  // Tracks which project id we last fully initialized, so metadata-only
  // updates (theme/name) don't re-trigger a full state reset and clear selection.
  const loadedProjectIdRef = useRef<string | null | undefined>(undefined)

  const [snapLines, setSnapLines] = useState([]) // Active grid lines [{x?, y?, orientation}]

  // Function to save a new state to history
  const saveHistory = useCallback((newTree) => {
    if (!Array.isArray(newTree)) return
    setHistoryState(prev => {
      // Don't save duplicate states (e.g., clicking without dragging pushes the exact same tree)
      const currentTreeString = JSON.stringify(prev.items[prev.index]);
      const newTreeString = JSON.stringify(newTree);
      if (currentTreeString === newTreeString) return prev;

      // If we are not at the end of the history, slice off the future states
      const newItems = prev.items.slice(0, prev.index + 1)
      newItems.push(JSON.parse(newTreeString)) // Deep clone to prevent mutations
      return {
        items: newItems,
        index: newItems.length - 1
      }
    })
  }, [])

  const undo = useCallback(() => {
    setHistoryState(prev => {
      if (prev.index > 0) {
        const nextIndex = prev.index - 1
        const nextTree = prev.items[nextIndex]
        if (Array.isArray(nextTree)) {
          setTree(nextTree)
          return { ...prev, index: nextIndex }
        }
      }
      return prev
    })
    setSelectedIds([])
    setDragOverId(null)
  }, [])

  const redo = useCallback(() => {
    setHistoryState(prev => {
      if (prev.index < prev.items.length - 1) {
        const nextIndex = prev.index + 1
        const nextTree = prev.items[nextIndex]
        if (Array.isArray(nextTree)) {
          setTree(nextTree)
          return { ...prev, index: nextIndex }
        }
      }
      return prev
    })
    setSelectedIds([])
    setDragOverId(null)
  }, [])

  // â”€â”€ Delete selected â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const deleteSelected = useCallback(() => {
    if (!selectedIds.length) return
    setTree(prev => { 
      let nextTree = prev
      for (const id of selectedIds) {
        nextTree = removeNode(nextTree, id)[0]
      }
      saveHistory(nextTree)
      return nextTree 
    })
    setSelectedIds([])
  }, [selectedIds, saveHistory])

  // Preview mode
  const [isPlaying, setIsPlaying] = useState(false)
  const [isAltPressed, setIsAltPressed] = useState(false)
  const effectiveIsPlaying = isPlaying || isAltPressed

  // â”€â”€ Global App State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [localVars, setLocalVars] = useState<Record<string, any>>({}) // { varName: value }
  const [notification, setNotification] = useState(null) // { message, id, timer }
  const normalizedCanvasTheme = useMemo(() => normalizeCanvasThemeState(canvasTheme), [canvasTheme])
  const activeCanvasTheme = useMemo(() => getActiveCanvasThemeDefinition(normalizedCanvasTheme), [normalizedCanvasTheme])
  const resolvedCanvasTheme = useMemo(() => resolveCanvasTheme(normalizedCanvasTheme), [normalizedCanvasTheme])
  const runtimeLocalVars = useMemo(() => ({
    ...localVars,
    App: {
      Theme: resolvedCanvasTheme,
    },
  }), [localVars, resolvedCanvasTheme])
  const serializedProjectState = useMemo(
    () => JSON.stringify({ tree, canvasW, canvasH, canvasTheme: normalizedCanvasTheme }),
    [tree, canvasW, canvasH, normalizedCanvasTheme]
  )

  // Auto-extract and sync variables from the tree into localVars
  useEffect(() => {
    const extractedNames = extractVariables(tree) as string[]
    
    setLocalVars(prev => {
      let changed = false
      const nextVars = { ...prev }
      
      // Add newly referenced variables
      for (const name of extractedNames) {
        if (!(name in nextVars)) {
          nextVars[name] = "" // Initialize to blank string
          changed = true
        }
      }
      
      // Remove variables that are no longer referenced anywhere in the tree
      for (const existing of Object.keys(nextVars)) {
        if (!extractedNames.includes(existing)) {
          delete nextVars[existing]
          changed = true
        }
      }

      return changed ? nextVars : prev
    })
  }, [tree])

  // Custom notify function exposes an API similar to Notify() function
  const notify = useCallback((message, type = 'Information') => {
    setNotification(prev => {
      // Clear previous timeout if any
      if (prev?.timer) clearTimeout(prev.timer)
      const timer = setTimeout(() => setNotification(null), 3000)
      return { message, type, timer }
    })
  }, [])

  const copySelectedToClipboard = useCallback(async () => {
    if (selectedIds.length <= 0) return false
    const nodesToCopy = selectedIds.map(id => findNode(treeRef.current, id)).filter(Boolean)
    if (nodesToCopy.length <= 0) return false
    clipboardRef.current = nodesToCopy
    try {
      await navigator.clipboard.writeText(serializeCopiedNodes(nodesToCopy))
    } catch {
      // Keep the in-memory clipboard as a fallback if browser clipboard access is blocked.
    }
    return true
  }, [selectedIds])

  const pasteCopiedNodes = useCallback((sourceNodes) => {
    if (!Array.isArray(sourceNodes) || sourceNodes.length <= 0) return false
    const baseTree = treeRef.current
    const allNamesInTree = flattenTree(baseTree).map(n => n.name)

    const cloneNode = (node, shouldShift = false) => {
      const newName = getNextAvailableName(node.name, allNamesInTree)
      allNamesInTree.push(newName)

      const newNode = { ...node, id: uid(), name: newName }

      if (shouldShift && typeof node.X === 'number' && typeof node.Y === 'number') {
        newNode.X = node.X + 20
        newNode.Y = node.Y + 20
      }

      if (node.children) {
        newNode.children = node.children.map(c => cloneNode(c, false))
      }
      return newNode
    }

    let nextTree = baseTree
    const newSelectedIds = []

    for (const copiedNode of sourceNodes) {
      const pastedNode = cloneNode(copiedNode, true)

      const sNode = selectedIds.length === 1 ? findNode(baseTree, selectedIds[0]) : null
      const isContainerType = (type) => ['Container', 'Gallery', 'Screen'].includes(type)

      let targetParentId = null

      if (copiedNode.type === 'Screen') {
        targetParentId = 'app_root'
      } else if (sNode) {
        if (isContainerType(sNode.type)) {
          targetParentId = sNode.id
        } else {
          const parent = findParent(baseTree, sNode.id)
          if (parent && parent.type !== 'App') {
            targetParentId = parent.id
          }
        }
      }

      if (!targetParentId && copiedNode.type !== 'Screen') {
        targetParentId = activeScreenIdRef.current
      }

      nextTree = insertNode(nextTree, pastedNode, targetParentId)
      newSelectedIds.push(pastedNode.id)
    }

    treeRef.current = nextTree
    setTree(nextTree)
    saveHistory(nextTree)
    if (newSelectedIds.length > 0) {
      setTimeout(() => setSelectedIds(newSelectedIds), 10)
    }
    return true
  }, [saveHistory, selectedIds])

  const pasteInternalClipboard = useCallback(() => {
    return pasteCopiedNodes(clipboardRef.current)
  }, [pasteCopiedNodes])

  const importPowerAppsYamlText = useCallback((text) => {
    if (!looksLikePowerAppsYaml(text)) return false

    try {
      const parsed = parsePowerAppsYaml(text)
      const importedSpecs = [...parsed.screens, ...parsed.components]

      if (importedSpecs.length === 0) {
        notify('No Power Apps screens or controls were found in the pasted YAML.', 'Error')
        return true
      }

      const baseTree = treeRef.current
      let nextTree = baseTree
      const existingIds = new Set(flattenTree(baseTree).map(n => n.id))
      const existingNames = flattenTree(baseTree).map(n => n.name)
      const newSelectedIds = []
      let firstImportedScreenId = null
      let importedNodeCount = 0

      const selectedSingleNode = selectedIds.length === 1 ? findNode(baseTree, selectedIds[0]) : null
      const isContainerType = (type) => ['Container', 'Gallery', 'Screen'].includes(type)

      const resolveTargetParentId = (node) => {
        if (node.type === 'Screen') return baseTree[0]?.id || 'app_root'

        if (selectedSingleNode) {
          if (isContainerType(selectedSingleNode.type)) return selectedSingleNode.id

          const parent = findParent(baseTree, selectedSingleNode.id)
          if (parent && parent.type !== 'App') return parent.id
        }

        return activeScreenIdRef.current
      }

      for (const spec of importedSpecs) {
        const importedNode = createFromSpec(spec, existingIds)
        if (!importedNode) continue

        const uniqueNode = ensureUniqueNodeNames(importedNode, existingNames)
        existingNames.push(...flattenTree([uniqueNode]).map(n => n.name))

        nextTree = insertNode(nextTree, uniqueNode, resolveTargetParentId(uniqueNode))
        newSelectedIds.push(uniqueNode.id)
        importedNodeCount += 1

        if (!firstImportedScreenId && uniqueNode.type === 'Screen') {
          firstImportedScreenId = uniqueNode.id
        }
      }

      if (importedNodeCount === 0) {
        notify('The pasted YAML was recognized, but none of its nodes could be imported safely.', 'Error')
        return true
      }

      treeRef.current = nextTree
      setTree(nextTree)
      saveHistory(nextTree)

      if (newSelectedIds.length > 0) {
        setTimeout(() => {
          setSelectedIds(newSelectedIds)
          if (firstImportedScreenId) setActiveScreenId(firstImportedScreenId)
        }, 0)
      }

      const importedLabel = importedNodeCount === 1 ? 'object' : 'objects'
      const placeholderSuffix = parsed.opaqueNodeCount > 0
        ? ` ${parsed.opaqueNodeCount} unrecognized ${parsed.opaqueNodeCount === 1 ? 'node was' : 'nodes were'} preserved as placeholders.`
        : ''
      notify(`Imported ${importedNodeCount} Power Apps ${importedLabel}.${placeholderSuffix}`, 'Success')
      return true
    } catch (error) {
      console.error('Failed to import Power Apps YAML:', error)
      notify('Failed to import pasted Power Apps YAML.', 'Error')
      return true
    }
  }, [notify, saveHistory, selectedIds])

  // Clear chat when project is closed
  useEffect(() => {
    if (!activeProject) {
      setChatMessages([
        { role: 'assistant', content: 'Hi! Tell me what to add â€” e.g. "Add a container with a title label and a submit button inside it."', added: 0 }
      ])
      setChatImage(null)
      setChatInput('')
    }
  }, [activeProject])

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Zoom hotkeys
      if (e.ctrlKey || e.metaKey) {
        if (e.key === '=' || e.key === '+') {
          e.preventDefault()
          setZoom(z => Math.min(3, z + 0.1))
          return
        }
        if (e.key === '-') {
          e.preventDefault()
          setZoom(z => Math.max(0.25, z - 0.1))
          return
        }
      }

      // Don't trigger if typing in an input/textarea
      if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
        return
      }
      
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') {
          if (e.shiftKey) {
            e.preventDefault()
            redo()
          } else {
            e.preventDefault()
            undo()
          }
        } else if (e.key === 'y') {
          e.preventDefault()
          redo()
        }
      } else {
        if (e.key === 'Escape' && effectiveIsPlaying) { setIsPlaying(false); setSelectedIds([]) }
      }
      
      // Temporary "Play" mode with Alt
      if (e.key === 'Alt') {
        const tag = document.activeElement?.tagName
        const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
        if (!inInput) {
          e.preventDefault()
          setIsAltPressed(true)
        }
      }
      
      // Delete selected node when pressing Delete or Backspace
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.length > 0 && !isTweaking) {
        if (!effectiveIsPlaying) {
          e.preventDefault()
          deleteSelected()
        }
      }
    }

    const handleKeyUp = (e) => {
      if (e.key === 'Alt') {
        setIsAltPressed(false)
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [undo, redo, selectedIds, saveHistory, isTweaking, deleteSelected, effectiveIsPlaying])

  // Grid State

  // Local Data pane
  const [showLocalData, setShowLocalData] = useState(false)
  
  const chatEndRef = useRef(null)
  const chatInputRef = useRef(null)
  const mobilePaneMenuRef = useRef<HTMLDivElement | null>(null)

  const dragRef = useRef(null)
  const resizeRef = useRef(null)
  const selectionBoxRef = useRef(null)
  const panRef = useRef(null)
  const spacePanRef = useRef(false)
  const canvasSizeRef = useRef({ w: 1366, h: 768 })

  // Synchronize state when activeProject changes
  useEffect(() => {
    if (activeProject === 'new' || (typeof activeProject === 'object' && activeProject?.isNew)) {
      const projectName = typeof activeProject === 'object' ? activeProject.name : 'Untitled Project';
      const blankTree = [{
        id: 'app_root',
        type: 'App',
        name: projectName,
        children: [{ id: 'screen_1', type: 'Screen', name: 'Screen1', Fill: appTheme.controlDefaults.Screen.Fill, children: [] }]
      }];
      setTree(blankTree);
      setCanvasW(1366);
      setCanvasH(768);
      setCanvasWInput('1366');
      setCanvasHInput('768');
      setHistoryState({ items: [blankTree], index: 0 });
      setSelectedIds([]);
      setActiveScreenId(blankTree[0]?.children?.[0]?.id || null);
      setCollapsedIds(new Set());
      setLocalVars({});
      const nextCanvasTheme = createDefaultCanvasThemeState()
      setCanvasTheme(nextCanvasTheme)
      setLastSavedState(JSON.stringify({ tree: blankTree, canvasW: 1366, canvasH: 768, canvasTheme: nextCanvasTheme }));

      // If it was the temporary `{name, isNew}` object, finalize it into a proper project state
      if (typeof activeProject === 'object' && activeProject?.isNew) {
        setActiveProject({ name: projectName, tree: blankTree, canvasW: 1366, canvasH: 768, canvasTheme: nextCanvasTheme });
      }
    } else if (activeProject && typeof activeProject === 'object') {
      // Skip full re-initialization for metadata-only updates on the current project.
      const incomingId = activeProject.id ?? null
      if (loadedProjectIdRef.current !== undefined && loadedProjectIdRef.current === incomingId) return
      loadedProjectIdRef.current = incomingId
      const savedTree = activeProject.tree?.length ? activeProject.tree : [{
        id: 'app_root',
        type: 'App',
        name: activeProject.name || 'App',
        children: [{ id: 'screen_1', type: 'Screen', name: 'Screen1', Fill: appTheme.controlDefaults.Screen.Fill, children: [] }]
      }];
      setTree(savedTree);
      const loadedW = activeProject.canvasW || 1366;
      const loadedH = activeProject.canvasH || 768;
      if (activeProject.canvasW) { setCanvasW(loadedW); setCanvasWInput(String(loadedW)); }
      if (activeProject.canvasH) { setCanvasH(loadedH); setCanvasHInput(String(loadedH)); }
      setHistoryState({ items: [savedTree], index: 0 });
      setSelectedIds([]);
      setActiveScreenId(savedTree[0]?.children?.[0]?.id || null);
      setCollapsedIds(new Set());
      const loadedTheme = normalizeCanvasThemeState(activeProject.canvasTheme)
      setCanvasTheme(loadedTheme)
      setLastSavedState(JSON.stringify({ tree: savedTree, canvasW: loadedW, canvasH: loadedH, canvasTheme: loadedTheme }));
    }
  }, [activeProject]);

  const saveProjectToCloud = useCallback(async ({ showSuccessToast = true } = {}) => {
    try {
      setIsSaving(true);
      const payload = {
        projectId: typeof activeProject === 'object' ? activeProject.id : null,
        name: typeof activeProject === 'object' ? activeProject.name : 'Untitled Project',
        tree,
        canvasW,
        canvasH,
        canvasTheme: normalizedCanvasTheme,
      };
      
      const idToken = await user.getIdToken();
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      
      if (showSuccessToast) {
        notify('Project saved to cloud!', 'Success');
      }
      setLastSavedState(serializedProjectState);
      
      // Update activeProject with the new ID so future queries act as 'updates'
      if (activeProject === 'new' || !activeProject?.id) {
        loadedProjectIdRef.current = data.projectId // keep guard in sync so the sync effect doesn't re-init
        setActiveProject({ ...payload, id: data.projectId });
      }

      return true;
    } catch (err: any) {
      notify(err.message, 'Error');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [activeProject, tree, canvasW, canvasH, normalizedCanvasTheme, serializedProjectState, user, notify, setActiveProject]);

  const handleSaveProject = useCallback(async () => {
    await saveProjectToCloud({ showSuccessToast: true });
  }, [saveProjectToCloud]);

  const hasUnsavedChanges = useMemo(() => {
    return serializedProjectState !== lastSavedState;
  }, [serializedProjectState, lastSavedState]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges) return
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  const handleExitProject = useCallback(async () => {
    if (!hasUnsavedChanges) {
      setActiveProject(null)
      return
    }

    const shouldSave = window.confirm('You have unsaved changes. Click OK to save before leaving, or Cancel to choose whether to discard them.')
    if (shouldSave) {
      const didSave = await saveProjectToCloud({ showSuccessToast: true })
      if (didSave) {
        setActiveProject(null)
      }
      return
    }

    const shouldDiscard = window.confirm('Discard unsaved changes and leave this project?')
    if (shouldDiscard) {
      setActiveProject(null)
    }
  }, [hasUnsavedChanges, saveProjectToCloud, setActiveProject]);

  // Auto-scroll to center of padded canvas on initial load
  const [initialScrollDone, setInitialScrollDone] = useState(false)
  
  useEffect(() => {
    if (activeProject) setInitialScrollDone(false)
  }, [activeProject])

  useEffect(() => {
    if (!initialScrollDone) {
      const wrapper = document.getElementById('canvas-scroll-wrapper')
      if (wrapper && wrapper.scrollWidth > wrapper.clientWidth) {
        wrapper.scrollLeft = (wrapper.scrollWidth - wrapper.clientWidth) / 2
        wrapper.scrollTop = (wrapper.scrollHeight - wrapper.clientHeight) / 2
        setInitialScrollDone(true)
      }
    }
  }, [initialScrollDone, canvasW, canvasH, activeProject])

  // Derived
  const selectedNode = selectedIds.length === 1 ? findNode(tree, selectedIds[0]) : null
  const schema = selectedNode ? SCHEMAS[selectedNode.type] : null
  const isAppSelected = selectedNode?.type === 'App'
  const projectDisplayName = typeof activeProject === 'object' && activeProject?.name
    ? activeProject.name
    : tree[0]?.name || 'Untitled Project'
  const screenCount = tree[0]?.children?.length || 0
  const flatNodes = flattenTree(tree, collapsedIds)
  const fullFlatNodes = flattenTree(tree, new Set())
  const totalCount = fullFlatNodes.length // Total count shouldn't hide skipped nodes

  const globalErrors = useMemo(() => {
    return getAllAppErrors(tree, runtimeLocalVars, SCHEMAS)
  }, [tree, runtimeLocalVars])

  // Sticky active screen â€” only changes when the selection moves to a different screen.
  // Deselecting (empty selectedIds) keeps the last active screen.
  const [activeScreenId, setActiveScreenId] = useState(() => {
    const screens = tree[0]?.type === 'App' ? (tree[0]?.children || []) : []
    return screens[0]?.id || null
  })

  const getScreenIdForNode = useCallback((nodeId, sourceTree = tree) => {
    if (!nodeId) return null
    const screens = sourceTree[0]?.type === 'App' ? (sourceTree[0]?.children || []) : []
    for (const s of screens) {
      if (s.id === nodeId || isDescendant(sourceTree, nodeId, s.id)) {
        return s.id
      }
    }
    return null
  }, [tree])

  useEffect(() => {
    if (selectedIds.length === 0) return // Don't change screen on deselect
    const nextScreenId = getScreenIdForNode(selectedIds[0], tree)
    if (nextScreenId) setActiveScreenId(nextScreenId)
  }, [selectedIds, tree, getScreenIdForNode])

  useEffect(() => {
    const screens = tree[0]?.type === 'App' ? (tree[0]?.children || []) : []
    if (screens.length === 0) {
      setActiveScreenId(null)
      return
    }
    if (activeScreenId && screens.some(s => s.id === activeScreenId)) return
    setActiveScreenId(getScreenIdForNode(selectedIds[0], tree) || screens[0]?.id || null)
  }, [tree, activeScreenId, selectedIds, getScreenIdForNode])

  // Automatically switch from Variables pane back to Properties when a component is selected
  useEffect(() => {
    if (selectedIds.length > 0 && showLocalData) {
      setShowLocalData(false)
    }
  }, [selectedIds, showLocalData])

  useEffect(() => {
    if (!showMobilePaneMenu) return

    const handlePointerDown = (event) => {
      if (!mobilePaneMenuRef.current?.contains(event.target as Node)) {
        setShowMobilePaneMenu(false)
      }
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setShowMobilePaneMenu(false)
      }
    }

    const handleResize = () => {
      if (window.innerWidth >= 1280) {
        setShowMobilePaneMenu(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('resize', handleResize)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('resize', handleResize)
    }
  }, [showMobilePaneMenu])

  const toggleErrorsPane = useCallback(() => {
    setShowErrorsPane(prev => {
      const next = !prev
      if (next) {
        setShowPropertiesPane(false)
        setShowLocalData(false)
      }
      return next
    })
    setShowMobilePaneMenu(false)
  }, [])

  const togglePropertiesPane = useCallback(() => {
    setShowPropertiesPane(prev => {
      const next = !prev
      if (next) {
        setShowLocalData(false)
        setShowErrorsPane(false)
      }
      return next
    })
    setShowMobilePaneMenu(false)
  }, [])

  const toggleVariablesPane = useCallback(() => {
    setShowLocalData(prev => {
      const next = !prev
      if (next) {
        setShowPropertiesPane(false)
        setShowErrorsPane(false)
      }
      return next
    })
    setSelectedIds([])
    setShowMobilePaneMenu(false)
  }, [])

  // Always re-derive the node from the tree so name/fill changes are reflected live
  const activeScreenNode = findNode(tree, activeScreenId)
  const visibleCanvasErrors = useMemo(() => {
    if (!activeScreenId) return []
    return globalErrors.filter(err => getScreenIdForNode(err.nodeId) === activeScreenId)
  }, [globalErrors, getScreenIdForNode, activeScreenId])
  const activeScreenComponentCount = useMemo(() => {
    if (!activeScreenNode) return 0;
    return flattenTree(activeScreenNode.children || [], new Set()).length;
  }, [activeScreenNode]);
  useEffect(() => { treeRef.current = tree }, [tree])
  useEffect(() => { activeScreenIdRef.current = activeScreenId }, [activeScreenId])

  // Sync canvas dimensions to all Screen nodes
  useEffect(() => {
    setTree(prev => {
      let changed = false
      const updateScreens = (nodes) => {
        return nodes.map(node => {
          let nextNode = node
          if (node.type === 'Screen') {
            if (node.Width !== canvasW || node.Height !== canvasH) {
              nextNode = { ...node, Width: canvasW, Height: canvasH }
              changed = true
            }
          }
          if (node.children) {
            const nextChildren = updateScreens(node.children)
            if (nextChildren !== node.children) {
              nextNode = { ...nextNode, children: nextChildren }
              changed = true
            }
          }
          return nextNode
        })
      }
      const nextTree = updateScreens(prev)
      return changed ? nextTree : prev
    })
  }, [canvasW, canvasH])

  const toggleCollapse = useCallback((id) => {
    setCollapsedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  // Auto-scroll chat
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [chatMessages])
  useEffect(() => { if (chatOpen) setTimeout(() => chatInputRef.current?.focus(), 150) }, [chatOpen])

  // â”€â”€ Add component to root or into selected container â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const addComponent = useCallback((sch) => {
    let targetParent = activeScreenNode
    let isGallery = false

    if (selectedNode?.type === 'Container' || selectedNode?.type === 'Gallery' || selectedNode?.type === 'Screen') {
      targetParent = selectedNode
      isGallery = selectedNode.type === 'Gallery'
    } else if (selectedNode) {
      const parent = findParent(tree, selectedNode.id)
      if (parent && (parent.type === 'Container' || parent.type === 'Gallery' || parent.type === 'Screen')) {
        targetParent = parent
        isGallery = parent.type === 'Gallery'
      }
    }

    const parentId = targetParent?.id || null
    const siblingCount = targetParent?.children?.length || 0
    const baseInset = targetParent?.type === 'Container' ? 16 : 20
    const offset = siblingCount * 16
    const compId = uid()
    const comp = createComponent(sch, {
      id: compId,
      X: isGallery ? 0 : baseInset,
      Y: isGallery ? 0 : baseInset + offset,
    })
    
    setTree(prev => {
      const currentNames = flattenTree(prev).map(n => n.name)
      const uniqueComp = ensureUniqueNodeNames(comp, currentNames)
      const next = insertNode(prev, uniqueComp, parentId)
      saveHistory(next)
      return next
    })
    setSelectedIds([compId])
  }, [selectedNode, activeScreenNode, tree, saveHistory])

  // â”€â”€ Add a new Screen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const addScreen = useCallback(() => {
    const compId = uid()
    const comp = {
      id: compId,
      type: 'Screen',
      name: nextName('Screen'),
      Fill: appTheme.controlDefaults.Screen.Fill,
      children: []
    }
    
    setTree(prev => {
      // Insert into the root 'App'
      const appRootId = prev[0]?.id
      if (!appRootId) return prev
      const currentNames = flattenTree(prev).map(n => n.name)
      const uniqueComp = ensureUniqueNodeNames(comp, currentNames)
      const next = insertNode(prev, uniqueComp, appRootId)
      saveHistory(next)
      return next
    })
    setActiveScreenId(compId)
    setSelectedIds([compId])
    // Un-collapse App node to show the new screen
    setCollapsedIds(prev => {
      const next = new Set(prev)
      next.delete(tree[0]?.id)
      return next
    })
  }, [saveHistory, tree])

  // â”€â”€ Update a property on selected node â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const updateProp = useCallback((id, key, val) => {
    setTree(prev => {
      const next = updateNode(prev, id, () => ({ [key]: val }))
      // Debounce history saving for text inputs and numbers to avoid creating too many history states, but for now we'll just save every change
      // Alternatively, we save after a short delay or blur, but let's just save.
      saveHistory(next)
      return next
    })
  }, [saveHistory])

  const updateAppName = useCallback((val) => {
    const nextName = val.trim()
    if (!nextName) return

    setTree(prev => {
      const appId = prev[0]?.id
      if (!appId) return prev
      const next = updateNode(prev, appId, () => ({ name: nextName }))
      saveHistory(next)
      return next
    })

    setActiveProject(prev => typeof prev === 'object' ? { ...prev, name: nextName } : prev)
  }, [saveHistory, setActiveProject])

  const canvasThemeRef = useRef(canvasTheme)
  useEffect(() => { canvasThemeRef.current = canvasTheme }, [canvasTheme])

  const updateCanvasThemeState = useCallback((updater) => {
    const normalizedPrev = normalizeCanvasThemeState(canvasThemeRef.current)
    const nextThemeState = normalizeCanvasThemeState(updater(normalizedPrev))
    // Update both states as independent top-level calls â€” never nest setState
    // inside another setState updater (causes "update while rendering" error).
    setCanvasTheme(nextThemeState)
    setActiveProject(current => typeof current === 'object' ? { ...current, canvasTheme: nextThemeState } : current)
  }, [setActiveProject])

  const updateActiveCanvasThemeField = useCallback((field, value) => {
    updateCanvasThemeState(prev => {
      const activeName = prev.activeThemeName
      return {
        ...prev,
        themes: {
          ...prev.themes,
          [activeName]: {
            ...prev.themes[activeName],
            [field]: value,
          },
        },
      }
    })
  }, [updateCanvasThemeState])

  const updateActiveCanvasThemeName = useCallback((rawValue) => {
    updateCanvasThemeState(prev => {
      const currentName = prev.activeThemeName
      const requestedName = String(rawValue ?? '').trim() || currentName
      const existingEntries = Object.entries(prev.themes).filter(([name]) => name !== currentName)

      let uniqueName = requestedName
      let suffix = 2
      const existingNames = new Set(existingEntries.map(([name]) => name.toLowerCase()))
      while (existingNames.has(uniqueName.toLowerCase())) {
        uniqueName = `${requestedName} ${suffix}`
        suffix += 1
      }

      const activeDefinition = prev.themes[currentName]
      return {
        activeThemeName: uniqueName,
        themes: {
          ...Object.fromEntries(existingEntries),
          [uniqueName]: activeDefinition,
        },
      }
    })
  }, [updateCanvasThemeState])

  // â”€â”€ Reorder a node in z-space â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleReorder = useCallback((id, direction) => {
    setTree(prev => {
      const next = reorderNode(prev, id, direction)
      saveHistory(next)
      return next
    })
  }, [saveHistory])

  const applyRendererChatPatch = useCallback((patch) => {
    if (!patch?.op) return

    setTree(prev => {
      let nextTree = prev

      if (patch.op === 'remove' && patch.id) {
        nextTree = removeNode(nextTree, patch.id)[0]
      } else if (patch.op === 'reparent' && patch.id && patch.newParentId) {
        nextTree = handleDropLogic(nextTree, patch.id, patch.newParentId)
      } else if (patch.op === 'update' && patch.id && patch.changes) {
        const changes = resolveSampleTextDeep({ ...patch.changes })
        if (changes.name) {
          const currentNames = flattenTree(nextTree).filter(n => n.id !== patch.id).map(n => n.name)
          if (currentNames.some(name => String(name || '').trim().toLowerCase() === String(changes.name || '').trim().toLowerCase())) {
            changes.name = getNextAvailableName(changes.name, currentNames)
          }
        }
        if (Array.isArray(changes.children)) {
          const existingTreeWithoutCurrentNode = removeNode(nextTree, patch.id)[0]
          const currentNames = flattenTree(existingTreeWithoutCurrentNode).map(n => n.name)
          changes.children = ensureUniqueNodeListNames(changes.children, currentNames)
        }
        nextTree = updateNode(nextTree, patch.id, () => changes)
      } else if (patch.op === 'add' && patch.component) {
        const allIds = new Set(flattenTree(nextTree).map(n => n.id))
        const comp = createFromSpec(patch.component, allIds)
        if (comp) {
          const currentNames = flattenTree(nextTree).map(n => n.name)
          const uniqueComp = ensureUniqueNodeNames(comp, currentNames)
          const requestedParentId = patch.parentId || patch.component.parentId || null
          const requestedParentNode = requestedParentId ? findNode(nextTree, requestedParentId) : null
          const parentId =
            !requestedParentId ||
            requestedParentId === 'screen' ||
            requestedParentId === 'root' ||
            (requestedParentNode?.type === 'Screen' && requestedParentId !== activeScreenIdRef.current)
              ? activeScreenIdRef.current
              : requestedParentId
          nextTree = insertNode(nextTree, uniqueComp, parentId)
        }
      }

      treeRef.current = nextTree
      return nextTree
    })
  }, [])

  // â”€â”€ Snap Lines state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€


  // â”€â”€ Drag state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleMouseDown = useCallback((e, id) => {
    if (effectiveIsPlaying) return // In preview mode â€” no drag/select
    if (e.button === 2) return // Don't interact with components while right-clicking

    e.stopPropagation()
    // Don't preventDefault here to allow text selection inside TextInput
    
    // Check if shift is held for multi-select
    let newSelectedIds = [...selectedIds]
    if (e.shiftKey) {
      if (newSelectedIds.includes(id)) {
        newSelectedIds = newSelectedIds.filter(i => i !== id)
      } else {
        newSelectedIds.push(id)
      }
    } else {
      // If the clicked node is already part of the selection, do not clear selection.
      // This allows dragging the whole group.
      if (!newSelectedIds.includes(id)) {
        newSelectedIds = [id]
      }
    }
    setSelectedIds(newSelectedIds)
    setShowErrorsPane(false)
    
    const parent = findParent(tree, id)
    const limitW = (parent && parent.type !== 'App') ? (parent.Width || 800) : canvasW
    const limitH = (parent && parent.type !== 'App') ? (parent.Height || 600) : canvasH

    dragRef.current = {
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      parentGridLinesX: [limitW * 0.25, limitW * 0.5, limitW * 0.75],
      parentGridLinesY: [limitH * 0.25, limitH * 0.5, limitH * 0.75],
      nodes: newSelectedIds.map(sid => {
        const n = findNode(tree, sid)
        if (!n) return null
        const parent = findParent(tree, sid)
        const rn = resolveProperties(n, runtimeLocalVars, fullFlatNodes, parent)
        return { 
          id: sid, 
          startX: rn.X || 0, 
          startY: rn.Y || 0,
          width: rn.Width || 100, // Defaults in case they are missing, though shouldn't happen
          height: rn.Height || 40 
        }
      }).filter(Boolean)
    }
  }, [tree, selectedIds, isPlaying, localVars, fullFlatNodes, canvasW, canvasH])

  // Keep canvas size ref in sync
  useEffect(() => { canvasSizeRef.current = { w: canvasW, h: canvasH } }, [canvasW, canvasH])

  const effectiveZoom = zoom * CANVAS_ZOOM_BASE
  const zoomRef = useRef(effectiveZoom)
  useEffect(() => { zoomRef.current = effectiveZoom }, [effectiveZoom])

  useEffect(() => {
    const onMove = (e) => {
      // â”€â”€ Pane Resizing â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      if (paneResizeRef.current) {
        const { side, startMouseX, startMouseY, startWidth, startHeight } = paneResizeRef.current

        if (side === 'right') {
          const deltaX = startMouseX - e.clientX
          setRightWidth(Math.max(200, Math.min(window.innerWidth * 0.4, startWidth + deltaX)))
        } else if (side === 'code') {
          const deltaX = startMouseX - e.clientX
          setCodeWidth(Math.max(250, Math.min(window.innerWidth * 0.5, startWidth + deltaX)))
        } else if (side === 'chat') {
          const deltaY = startMouseY - e.clientY
          setChatHeight(Math.max(150, Math.min(window.innerHeight * 0.5, startHeight + deltaY)))
        }
        return
      }

      // â”€â”€ Panning â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      if (panRef.current) {
        const { startMouseX, startMouseY, startScrollX, startScrollY } = panRef.current
        const dx = e.clientX - startMouseX
        const dy = e.clientY - startMouseY

        const wrapper = document.getElementById('canvas-scroll-wrapper')
        if (wrapper) {
          wrapper.scrollLeft = startScrollX - dx
          wrapper.scrollTop = startScrollY - dy
        }
        return
      }

      // â”€â”€ Resize mode â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      if (resizeRef.current) {
        const { id, dir, startMouseX, startMouseY, startX, startY, startW, startH } = resizeRef.current
        const PT_RATIO = 0.75
        const pxRatio = (1 / zoomRef.current) * PT_RATIO
        const dx = (e.clientX - startMouseX) * pxRatio
        const dy = (e.clientY - startMouseY) * pxRatio
        
        const SNAP_THRESHOLD = 8
        
        const parent = findParent(tree, id)
        const isChildOfContainer = parent && parent.type !== 'App'
        const siblings = isChildOfContainer ? (parent.children || []) : (activeScreenNode?.children || [])
        const filteredSiblings = siblings.filter(s => s.id !== id).map(s => resolveProperties(s, runtimeLocalVars, fullFlatNodes, parent))

        let snapDx = dx
        let snapDy = dy
        const newSnapLines = []

        // Horizontal snapping (E/W)
        if (dir.includes('e') || dir.includes('w')) {
          const theoreticalEdge = dir.includes('e') ? startX + startW + dx : startX + dx
          let bestSnapX = null
          let minDiffX = Infinity

          // Calculate current Y-range of the node being resized
          const curY1 = startY + (dir.includes('n') ? dy : 0)
          const curY2 = startY + startH + (dir.includes('s') ? dy : 0)

          // Snap to siblings
          for (const s of filteredSiblings) {
            // Only snap if Y-ranges overlap (collision)
            const sY1 = s.Y || 0, sY2 = (s.Y || 0) + (s.Height || 0)
            if (Math.max(curY1, sY1) < Math.min(curY2, sY2)) {
              const edges = [s.X || 0, (s.X || 0) + (s.Width || 0)]
              for (const edge of edges) {
                const diff = Math.abs(theoreticalEdge - edge)
                if (diff < SNAP_THRESHOLD && diff < minDiffX) {
                  minDiffX = diff
                  bestSnapX = { gridLine: edge }
                }
              }
            }
          }
          // Snap to parent grid lines
          const gridLinesX = resizeRef.current.parentGridLinesX || []
          for (const line of gridLinesX) {
            const diff = Math.abs(theoreticalEdge - line)
            if (diff < SNAP_THRESHOLD && diff < minDiffX) {
              minDiffX = diff
              bestSnapX = { gridLine: line }
            }
          }

          if (bestSnapX) {
            snapDx = bestSnapX.gridLine - (dir.includes('e') ? (startX + startW) : startX)
            newSnapLines.push({ x: bestSnapX.gridLine, orientation: 'vertical', parentId: parent?.id || 'root' })
          }
        }

        // Vertical snapping (N/S)
        if (dir.includes('s') || dir.includes('n')) {
          const theoreticalEdge = dir.includes('s') ? startY + startH + dy : startY + dy
          let bestSnapY = null
          let minDiffY = Infinity

          // Calculate current X-range
          const curX1 = startX + (dir.includes('w') ? dx : 0)
          const curX2 = startX + startW + (dir.includes('e') ? dx : 0)

          // Snap to siblings
          for (const s of filteredSiblings) {
            const sX1 = s.X || 0, sX2 = (s.X || 0) + (s.Width || 0)
            if (Math.max(curX1, sX1) < Math.min(curX2, sX2)) {
              const edges = [s.Y || 0, (s.Y || 0) + (s.Height || 0)]
              for (const edge of edges) {
                const diff = Math.abs(theoreticalEdge - edge)
                if (diff < SNAP_THRESHOLD && diff < minDiffY) {
                  minDiffY = diff
                  bestSnapY = { gridLine: edge }
                }
              }
            }
          }
          // Snap to parent grid lines
          const gridLinesY = resizeRef.current.parentGridLinesY || []
          for (const line of gridLinesY) {
            const diff = Math.abs(theoreticalEdge - line)
            if (diff < SNAP_THRESHOLD && diff < minDiffY) {
              minDiffY = diff
              bestSnapY = { gridLine: line }
            }
          }

          if (bestSnapY) {
            snapDy = bestSnapY.gridLine - (dir.includes('s') ? (startY + startH) : startY)
            newSnapLines.push({ y: bestSnapY.gridLine, orientation: 'horizontal', parentId: parent?.id || 'root' })
          }
        }

        setSnapLines(newSnapLines)

        setTree(prev => updateNode(prev, id, (node) => {
          let newX = startX, newY = startY, newW = startW, newH = startH
          if (dir.includes('e')) newW = Math.max(20, startW + snapDx)
          if (dir.includes('s')) newH = Math.max(20, startH + snapDy)
          if (dir.includes('w')) {
             const requestedW = startW - snapDx
             newW = Math.max(20, requestedW)
             newX = startX + startW - newW
          }
          if (dir.includes('n')) {
             const requestedH = startH - snapDy
             newH = Math.max(20, requestedH)
             newY = startY + startH - newH
          }
          const updates = {
            X: Math.round(newX),
            Y: Math.round(newY),
            Width: Math.round(newW),
            Height: Math.round(newH)
          }

          return updates
        }))
        return
      }

      // â”€â”€ Drag move â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      if (dragRef.current && dragRef.current.nodes?.length) {
        const { startMouseX, startMouseY, nodes } = dragRef.current
        
        // Calculate scaled delta
        const PT_RATIO = 0.75
        const pxRatio = (1 / zoomRef.current) * PT_RATIO
        const dx = (e.clientX - startMouseX) * pxRatio
        const dy = (e.clientY - startMouseY) * pxRatio

        // dx/dy are now just applied to the nodes below.

        // â”€â”€ Grid Snapping Logic â”€â”€
        const SNAP_THRESHOLD = 8
        
        // Calculate aggregate bounds of all dragged nodes for group snapping
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
        for (const node of nodes) {
          minX = Math.min(minX, node.startX)
          minY = Math.min(minY, node.startY)
          maxX = Math.max(maxX, node.startX + node.width)
          maxY = Math.max(maxY, node.startY + node.height)
        }
        const groupWidth = maxX - minX
        const groupHeight = maxY - minY
        
        const parent = nodes.length > 0 ? findParent(tree, nodes[0].id) : null
        const isChildOfContainer = parent && parent.type !== 'App'
        const siblings = isChildOfContainer ? (parent.children || []) : (activeScreenNode?.children || [])
        
        const draggedIds = new Set(nodes.map(n => n.id))
        const filteredSiblings = siblings.filter(s => !draggedIds.has(s.id)).map(s => resolveProperties(s, runtimeLocalVars, fullFlatNodes, parent))

        let snapDx = dx
        let snapDy = dy
        const newSnapLines = []

        // X-axis snapping
        const theoreticalX1 = minX + dx
        const theoreticalX2 = minX + groupWidth + dx
        const theoreticalXC = minX + groupWidth / 2 + dx
        let bestSnapX = null
        let minDiffX = Infinity

        // Snap to siblings
        for (const s of filteredSiblings) {
          // Collision check: Y-ranges overlap
          const sY1 = s.Y || 0, sY2 = (s.Y || 0) + (s.Height || 0)
          const curY1 = minY + dy, curY2 = minY + groupHeight + dy
          if (Math.max(curY1, sY1) < Math.min(curY2, sY2)) {
             const sEdges = [s.X || 0, (s.X || 0) + (s.Width || 0), (s.X || 0) + (s.Width || 0) / 2]
             for (const sEdge of sEdges) {
                // Check dragged group left edge
                let d1 = Math.abs(theoreticalX1 - sEdge)
                if (d1 < SNAP_THRESHOLD && d1 < minDiffX) {
                   minDiffX = d1
                   bestSnapX = { gridLine: sEdge, type: 'left' }
                }
                // Check dragged group right edge
                let d2 = Math.abs(theoreticalX2 - sEdge)
                if (d2 < SNAP_THRESHOLD && d2 < minDiffX) {
                   minDiffX = d2
                   bestSnapX = { gridLine: sEdge, type: 'right' }
                }
                // Check dragged group center
                let dc = Math.abs(theoreticalXC - sEdge)
                if (dc < SNAP_THRESHOLD && dc < minDiffX) {
                  minDiffX = dc
                  bestSnapX = { gridLine: sEdge, type: 'center' }
                }
             }
          }
        }
        // Snap to parent grid lines
        const gridLinesX = dragRef.current.parentGridLinesX || []
        for (const line of gridLinesX) {
           let d1 = Math.abs(theoreticalX1 - line)
           if (d1 < SNAP_THRESHOLD && d1 < minDiffX) {
              minDiffX = d1
              bestSnapX = { gridLine: line, type: 'left' }
           }
           let d2 = Math.abs(theoreticalX2 - line)
           if (d2 < SNAP_THRESHOLD && d2 < minDiffX) {
              minDiffX = d2
              bestSnapX = { gridLine: line, type: 'right' }
           }
           let dc = Math.abs(theoreticalXC - line)
           if (dc < SNAP_THRESHOLD && dc < minDiffX) {
              minDiffX = dc
              bestSnapX = { gridLine: line, type: 'center' }
           }
        }

        if (bestSnapX) {
          if (bestSnapX.type === 'left') snapDx = bestSnapX.gridLine - minX
          else if (bestSnapX.type === 'right') snapDx = bestSnapX.gridLine - groupWidth - minX
          else snapDx = bestSnapX.gridLine - groupWidth / 2 - minX
          newSnapLines.push({ x: bestSnapX.gridLine, orientation: 'vertical', parentId: parent?.id || 'root' })
        }

        // Y-axis snapping
        const theoreticalY1 = minY + dy
        const theoreticalY2 = minY + groupHeight + dy
        const theoreticalYC = minY + groupHeight / 2 + dy
        let bestSnapY = null
        let minDiffY = Infinity

        // Snap to siblings
        for (const s of filteredSiblings) {
          // Collision check: X-ranges overlap
          const sX1 = s.X || 0, sX2 = (s.X || 0) + (s.Width || 0)
          const curX1 = minX + snapDx, curX2 = minX + groupWidth + snapDx
          if (Math.max(curX1, sX1) < Math.min(curX2, sX2)) {
             const sEdges = [s.Y || 0, (s.Y || 0) + (s.Height || 0), (s.Y || 0) + (s.Height || 0) / 2]
             for (const sEdge of sEdges) {
                // Check dragged group top edge
                let d1 = Math.abs(theoreticalY1 - sEdge)
                if (d1 < SNAP_THRESHOLD && d1 < minDiffY) {
                   minDiffY = d1
                   bestSnapY = { gridLine: sEdge, type: 'top' }
                }
                // Check dragged group bottom edge
                let d2 = Math.abs(theoreticalY2 - sEdge)
                if (d2 < SNAP_THRESHOLD && d2 < minDiffY) {
                   minDiffY = d2
                   bestSnapY = { gridLine: sEdge, type: 'bottom' }
                }
                // Check dragged group center
                let dc = Math.abs(theoreticalYC - sEdge)
                if (dc < SNAP_THRESHOLD && dc < minDiffY) {
                  minDiffY = dc
                  bestSnapY = { gridLine: sEdge, type: 'center' }
                }
             }
          }
        }
        // Snap to parent grid lines
        const gridLinesY = dragRef.current.parentGridLinesY || []
        for (const line of gridLinesY) {
           let d1 = Math.abs(theoreticalY1 - line)
           if (d1 < SNAP_THRESHOLD && d1 < minDiffY) {
              minDiffY = d1
              bestSnapY = { gridLine: line, type: 'top' }
           }
           let d2 = Math.abs(theoreticalY2 - line)
           if (d2 < SNAP_THRESHOLD && d2 < minDiffY) {
              minDiffY = d2
              bestSnapY = { gridLine: line, type: 'bottom' }
           }
           let dc = Math.abs(theoreticalYC - line)
           if (dc < SNAP_THRESHOLD && dc < minDiffY) {
              minDiffY = dc
              bestSnapY = { gridLine: line, type: 'center' }
           }
        }

        if (bestSnapY) {
          if (bestSnapY.type === 'top') snapDy = bestSnapY.gridLine - minY
          else if (bestSnapY.type === 'bottom') snapDy = bestSnapY.gridLine - groupHeight - minY
          else snapDy = bestSnapY.gridLine - groupHeight / 2 - minY
          newSnapLines.push({ y: bestSnapY.gridLine, orientation: 'horizontal', parentId: parent?.id || 'root' })
        }

        setSnapLines(newSnapLines)

        setTree(prev => {
          let nextTree = prev
          for (const draggedNode of nodes) {
            const parent = findParent(nextTree, draggedNode.id)
            let limitW = canvasW
            let limitH = canvasH
            if (parent && parent.type !== 'App') {
              const grandParent = findParent(nextTree, parent.id)
              const resolvedParent = resolveProperties(parent, runtimeLocalVars, fullFlatNodes, grandParent)
              limitW = resolvedParent.Width || limitW
              limitH = resolvedParent.Height || limitH
              
              if (parent.type === 'Gallery') {
                const isVertical = resolvedParent.Variant ? resolvedParent.Variant.includes('Vertical') : resolvedParent.Height > resolvedParent.Width
                const tSize = resolvedParent.TemplateSize || 100
                if (isVertical) limitH = tSize
                else limitW = tSize
              }
            }

            let targetX = Math.round(draggedNode.startX + snapDx)
            let targetY = Math.round(draggedNode.startY + snapDy)

            // Clamp against parent boundaries
            targetX = Math.max(0, Math.min(targetX, limitW - draggedNode.width))
            targetY = Math.max(0, Math.min(targetY, limitH - draggedNode.height))

            nextTree = updateNode(nextTree, draggedNode.id, (node) => {
              // Intentionally override formulas with static values if dragged
              return {
                X: targetX,
                Y: targetY
              }
            })
          }
          return nextTree
        })
        return
      }

      // â”€â”€ Marquee Selection Move â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      if (selectionBoxRef.current) {
        const rootCanvas = document.getElementById('canvas-root')
        if (rootCanvas) {
          const rect = rootCanvas.getBoundingClientRect()
          const PT_RATIO = 0.75
          const pxRatio = (1 / zoomRef.current) * PT_RATIO
          const currentX = (e.clientX - rect.left) * pxRatio
          const currentY = (e.clientY - rect.top) * pxRatio
          // console.log('Marquee moving:', currentX, currentY)
          selectionBoxRef.current.currentX = currentX
          selectionBoxRef.current.currentY = currentY
          setSelectionBox({ ...selectionBoxRef.current })
        }
      }
    }
    
    const onUp = (e) => { 
      // â”€â”€ Pane Resizing End â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      if (paneResizeRef.current) {
        paneResizeRef.current = null
        document.body.style.cursor = ''
      }

      // â”€â”€ Pan end â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      if (panRef.current) {
        panRef.current = null
        document.body.style.cursor = ''
        return
      }

      // â”€â”€ Resize end â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      if (resizeRef.current) {
        resizeRef.current = null
        document.body.style.cursor = ''

        saveHistory(tree)
        return
      }

      // â”€â”€ Marquee Selection End â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      if (selectionBoxRef.current) {
        // Calculate bounding box in canvas coordinates
        const { startX, startY, currentX, currentY } = selectionBoxRef.current
        
        // If it was just a click (no movement), don't perform marquee selection.
        // This prevents the marquee logic from clearing the selection set by onMouseDown.
        const dist = Math.sqrt(Math.pow(currentX - startX, 2) + Math.pow(currentY - startY, 2))
        if (dist < 3) {
          selectionBoxRef.current = null
          setSelectionBox(null)
          return
        }

        const boxLeft = Math.min(startX, currentX)
        const boxTop = Math.min(startY, currentY)
        const boxRight = Math.max(startX, currentX)
        const boxBottom = Math.max(startY, currentY)
        
        // Find all intersecting nodes
        const intersectingIds = []
        
        // Helper to check intersection of two rects
        const doIntersect = (r1, r2) => {
          return !(r2.left > r1.right || r2.right < r1.left || r2.top > r1.bottom || r2.bottom < r1.top)
        }

        const selBoxRect = { left: boxLeft, top: boxTop, right: boxRight, bottom: boxBottom }

        const findIntersectingNodes = (nodes) => {
          for (const node of nodes) {
            const nodeRect = { left: node.X, top: node.Y, right: node.X + node.Width, bottom: node.Y + node.Height }
            if (doIntersect(selBoxRect, nodeRect)) {
              intersectingIds.push(node.id)
            }
            if (node.children?.length) {
              findIntersectingNodes(node.children)
            }
          }
        }
        
        if (activeScreenNode?.children) {
          findIntersectingNodes(activeScreenNode.children)
        }
        
        // Update selection (don't clear if Shift is held)
        if (e.shiftKey) {
          const newSelected = new Set(selectedIds)
          for (const id of intersectingIds) {
            if (newSelected.has(id)) newSelected.delete(id)
            else newSelected.add(id)
          }
          setSelectedIds(Array.from(newSelected))
        } else {
          setSelectedIds(intersectingIds)
        }
        
        selectionBoxRef.current = null
        setSelectionBox(null)
        return
      }

      // â”€â”€ Drag end â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      if (!dragRef.current || !dragRef.current.nodes?.length) {
        setSnapLines([]) // Clear lines if mouse up without dragging
        return
      }
      
      const dragId = dragRef.current.id
      const finalDragOverId = dragOverId
      
      dragRef.current = null 
      setDragOverId(null)
      setSnapLines([]) // Clear lines
  
      if (finalDragOverId && finalDragOverId !== '_canvas') {
        setTree(prev => handleDropLogic(prev, dragId, finalDragOverId))
      }
  
      
      // Tree was updated during onMove.
      // We need to trigger saveHistory with the current tree.
      setTree(prev => {
        saveHistory(prev)
        return prev
      })
    }
    
    window.addEventListener('mousemove', onMove, { passive: false })
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [tree, saveHistory, selectedIds])

  // â”€â”€ Drop logic â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleDropInto = useCallback((targetContainerId) => {
    if (!dragRef.current) return
    const dragId = dragRef.current.id
    setTree(prev => handleDropLogic(prev, dragId, targetContainerId))
  }, [])

  // â”€â”€ Resize handle mousedown â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleResizeMouseDown = useCallback((e, id, dir) => {
    e.stopPropagation()
    e.preventDefault()
    const node = findNode(tree, id)
    if (!node) return
    const parent = findParent(tree, id)
    const rn = resolveProperties(node, runtimeLocalVars, fullFlatNodes, parent)
    const limitW = (parent && parent.type !== 'App') ? (parent.Width || 800) : canvasW
    const limitH = (parent && parent.type !== 'App') ? (parent.Height || 600) : canvasH

    resizeRef.current = {
      id, dir,
      startMouseX: e.clientX, startMouseY: e.clientY,
      startX: rn.X, startY: rn.Y,
      startW: rn.Width, startH: rn.Height,
      parentGridLinesX: [limitW * 0.25, limitW * 0.5, limitW * 0.75],
      parentGridLinesY: [limitH * 0.25, limitH * 0.5, limitH * 0.75],
    }
    // Set a global cursor while resizing
    const cursorMap = { n:'n-resize', s:'s-resize', e:'e-resize', w:'w-resize', ne:'ne-resize', nw:'nw-resize', se:'se-resize', sw:'sw-resize' }
    document.body.style.cursor = cursorMap[dir] || 'default'
  }, [tree, localVars, fullFlatNodes])

  // â”€â”€ Keyboard shortcuts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const clipboardRef = useRef(null)

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger if typing in an input
      const tag = document.activeElement?.tagName
      const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
      if (inInput) return

      // Copy: Ctrl+C / Cmd+C
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        if (selectedIds.length > 0) {
          e.preventDefault()
          void copySelectedToClipboard()
        }
      }

    // Delete/Backspace
    if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.length > 0) {
      deleteSelected()
      }
    }

    const handlePaste = (e) => {
      const tag = document.activeElement?.tagName
      const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
      if (inInput) return

      const text = e.clipboardData?.getData('text/plain') || ''
      const copiedNodes = deserializeCopiedNodes(text)
      if (copiedNodes?.length) {
        e.preventDefault()
        clipboardRef.current = copiedNodes
        pasteCopiedNodes(copiedNodes)
        return
      }
      if (text && importPowerAppsYamlText(text)) {
        e.preventDefault()
        return
      }

      if (pasteInternalClipboard()) {
        e.preventDefault()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('paste', handlePaste)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('paste', handlePaste)
    }
  }, [selectedIds, deleteSelected, importPowerAppsYamlText, copySelectedToClipboard, pasteCopiedNodes, pasteInternalClipboard])

  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = document.activeElement?.tagName
      const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
      if (inInput) return

      if (e.code === 'Space') {
        spacePanRef.current = true
        e.preventDefault()
      }
    }

    const handleKeyUp = (e) => {
      if (e.code === 'Space') {
        spacePanRef.current = false
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  // â”€â”€ Canvas size commit â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const commitCanvasSize = () => {
    const w = parseInt(canvasWInput, 10), h = parseInt(canvasHInput, 10)
    if (!isNaN(w) && w > 0) setCanvasW(w)
    if (!isNaN(h) && h > 0) setCanvasH(h)
  }

  const handleExportToPowerApps = useCallback(() => {
    const exportNode = selectedNode?.type === 'App' ? null : selectedNode
    const yaml = (() => {
      if (!exportNode) return screenToYaml(tree, normalizedCanvasTheme)
      if (exportNode.type === 'Screen') {
        return screenToYaml(tree, normalizedCanvasTheme, [exportNode])
      }
      return componentToYaml(exportNode)
    })()

    const hasErrors = exportNode
      ? globalErrors.some(err => err.nodeId === exportNode.id || isDescendant(tree, err.nodeId, exportNode.id))
      : globalErrors.length > 0

    if (hasErrors) {
      notify('Cannot copy YAML with validation errors. Please fix them in the Errors pane first.', 'Error')
      return
    }

    navigator.clipboard.writeText(yaml).then(() => {
      notify('Power Apps YAML copied to clipboard.', 'Success')
    }).catch(() => {
      notify('Failed to copy YAML to clipboard.', 'Error')
    })
  }, [selectedNode, tree, normalizedCanvasTheme, globalErrors, notify])

  // â”€â”€ AI Component Tweaking â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleTweakSubmit = useCallback(async () => {
    const msg = tweakInput.trim()
    if (!msg || selectedIds.length !== 1 || tweakLoading) return
    
    const selectedId = selectedIds[0]
    const currentNode = findNode(tree, selectedId)
    if (!currentNode) return
    const parentNode = findParent(tree, selectedId)
    const siblingNodes = ((parentNode?.children || activeScreenNode?.children || []) as any[])
      .filter(node => node?.id !== selectedId)
      .slice(0, 6)
    // Cancel any previous tweak request
    if (tweakAbortControllerRef.current) tweakAbortControllerRef.current.abort()
    tweakAbortControllerRef.current = new AbortController()

    setTweakLoading(true)
    setAiLoadingMessage('Preparing component update...')
    try {
      const idToken = await user.getIdToken()
      const res = await fetch('/api/tweak-component', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          prompt: msg,
          component_context: {
            component: compactNodeForAIRequest(currentNode, { childLimit: 8 }),
            parent: compactNodeForAIRequest(parentNode, { summaryOnly: true }),
            siblings: siblingNodes.map(node => compactNodeForAIRequest(node, { summaryOnly: true })),
          },
          canvas_width: canvasW,
          canvas_height: canvasH,
        }),
        signal: tweakAbortControllerRef.current.signal
      })
      if (!res.ok) { 
        const e = await res.json().catch(() => ({})); 
        throw new Error(e.error || `Error ${res.status}`) 
      }

      if (onCreditDeduction) onCreditDeduction()

      const modifiedComponentResponse = await consumeAIResponse(res, { onStatus: setAiLoadingMessage })
      const modifiedComponent = modifiedComponentResponse?.mode === 'legacy'
        ? modifiedComponentResponse.data
        : modifiedComponentResponse
      const normalizedModifiedComponent = resolveSampleTextDeep(modifiedComponent)

      // Update the tree with the new component immediately (Keep/Undo flow)
      if (normalizedModifiedComponent && normalizedModifiedComponent.id === selectedId) {
        setTree(prev => {
          const nextTree = updateNode(prev, selectedId, () => normalizedModifiedComponent)
          saveHistory(nextTree)
          return nextTree
        })
        setTweakOriginalNode(null)
        setTweakInput('')
        setIsTweaking(false)
      }

    } catch (err) {
      if (err.name === 'AbortError') return
      alert(`Tweak failed: ${err.message}`)
    } finally {
      setTweakLoading(false)
      setAiLoadingMessage(DEFAULT_AI_LOADING_MESSAGE)
      tweakAbortControllerRef.current = null
    }
  }, [tweakInput, selectedIds, tweakLoading, tree, canvasW, canvasH, tweakOriginalNode, onCreditDeduction, user, saveHistory, activeScreenNode])

  const confirmTweak = useCallback(() => {
    setTweakOriginalNode(null)
    setIsTweaking(false)
    setTweakInput('')
  }, [])

  const undoTweak = useCallback(() => {
    if (tweakOriginalNode) {
      setTree(prev => {
        const nextTree = updateNode(prev, tweakOriginalNode.id, () => tweakOriginalNode)
        saveHistory(nextTree)
        return nextTree
      })
      setTweakOriginalNode(null)
      setIsTweaking(false)
      setTweakInput('')
    }
  }, [tweakOriginalNode, saveHistory])

  // Clear tweak state if selection changes
  useEffect(() => {
    if (selectedIds.length === 1 && tweakOriginalNode && selectedIds[0] !== tweakOriginalNode.id) {
      confirmTweak() // Auto-confirm if you click away
    } else if (selectedIds.length !== 1 && tweakOriginalNode) {
      confirmTweak() // Auto-confirm if multiple or no items are selected
    }
  }, [selectedIds, tweakOriginalNode, confirmTweak])

  // â”€â”€ Image compression helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const MAX_RENDERER_CHAT_REQUEST_BYTES = 900 * 1024
  const MAX_CHAT_IMAGE_BYTES = 450 * 1024

  const estimateBase64Bytes = (base64) => {
    const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0
    return Math.max(0, Math.floor((base64.length * 3) / 4) - padding)
  }

  const compressImageDataUrl = (dataUrl, callback) => {
    const img = new Image()
    img.onload = () => {
      let { width, height } = img
      const maxDim = 768
      if (width > maxDim || height > maxDim) {
        if (width > height) { height = Math.round(height * (maxDim / width)); width = maxDim }
        else { width = Math.round(width * (maxDim / height)); height = maxDim }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width; canvas.height = height
      canvas.getContext('2d').drawImage(img, 0, 0, width, height)
      const qualitySteps = [0.72, 0.6, 0.5, 0.4]
      let finalDataUrl = canvas.toDataURL('image/jpeg', qualitySteps[0])

      for (const quality of qualitySteps) {
        const candidate = canvas.toDataURL('image/jpeg', quality)
        finalDataUrl = candidate
        const [, base64 = ''] = candidate.split(',')
        if (estimateBase64Bytes(base64) <= MAX_CHAT_IMAGE_BYTES) break
      }

      callback(finalDataUrl)
    }
    img.onerror = () => callback(null)
    img.src = dataUrl
  }

  // â”€â”€ LLM Chat â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleChatSubmit = useCallback(async () => {
    const msg = chatInput.trim()
    if ((!msg && !chatImage) || chatLoading) return
    const requestStartedAt = performance.now()
    setChatInput('')

    const imagePayload = chatImage
    setChatImage(null)

    setChatMessages(prev => [...prev, { role: 'user', content: msg, added: 0, image: imagePayload }])
    
    if (chatAbortControllerRef.current) chatAbortControllerRef.current.abort()
    chatAbortControllerRef.current = new AbortController()

    setChatLoading(true)
    setAiLoadingMessage('Analyzing the current canvas...')

    const payload = {
      message: msg || "See attached image.",
      chat_history: chatMessages.slice(-10).map(m => ({ role: m.role, content: m.content })),
      canvas_components: activeScreenNode?.children || [],
      active_screen_id: activeScreenNode?.id || activeScreenIdRef.current,
      canvas_width: canvasW,
      canvas_height: canvasH,
      model: chatModel,
      prompt_method: 'Direct'
    } as any

    if (imagePayload) {
      const [header, base64] = imagePayload.split(',')
      const mimeMatch = header.match(/:(.*?);/)
      if (mimeMatch && base64) {
        payload.image_mime_type = mimeMatch[1]
        payload.image_data = base64
      }
    }

    const requestBody = JSON.stringify(payload)
    const requestBytes = new TextEncoder().encode(requestBody).length
    if (requestBytes > MAX_RENDERER_CHAT_REQUEST_BYTES) {
      throw new Error('The attached screenshot makes the request too large. Try cropping or using a smaller screenshot.')
    }

    const preStreamTree = JSON.parse(JSON.stringify(treeRef.current))
    let streamMutatedTree = false

    try {
      const idToken = await user.getIdToken()
      const res = await fetch('/api/renderer-chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: requestBody,
        signal: chatAbortControllerRef.current.signal
      })
      if (!res.ok) { 
        const e = await res.json().catch(() => ({})); 
        throw new Error(e.error || `Error ${res.status}`) 
      }
      
      if (onCreditDeduction) onCreditDeduction()
      const response = await consumeAIResponse(res, {
        onStatus: setAiLoadingMessage,
        onPatch: (patch) => {
          streamMutatedTree = true
          applyRendererChatPatch(patch)
        }
      })

      if (response.mode === 'legacy') {
        const data = response.data

        if (data.components_to_add?.length || data.components_to_update?.length || data.components_to_remove?.length || data.components_to_reparent?.length) {
          setTree(prev => {
            let nextTree = prev
            if (data.components_to_remove?.length) {
              data.components_to_remove.forEach(rId => {
                const [t] = removeNode(nextTree, rId)
                nextTree = t
              })
            }
            if (data.components_to_reparent?.length) {
              data.components_to_reparent.forEach(r => {
                if (r.id && r.newParentId) {
                  nextTree = handleDropLogic(nextTree, r.id, r.newParentId)
                }
              })
            }
            if (data.components_to_update?.length) {
              data.components_to_update.forEach(u => {
                if (u.id) {
                  const { id, ...rawChanges } = u
                  const changes = resolveSampleTextDeep(rawChanges)
                  if (changes.name) {
                    const currentNames = flattenTree(nextTree).filter(n => n.id !== id).map(n => n.name)
                    if (currentNames.some(name => String(name || '').trim().toLowerCase() === String(changes.name || '').trim().toLowerCase())) {
                      changes.name = getNextAvailableName(changes.name, currentNames)
                    }
                  }
                  if (Array.isArray(changes.children)) {
                    const existingTreeWithoutCurrentNode = removeNode(nextTree, id)[0]
                    const currentNames = flattenTree(existingTreeWithoutCurrentNode).map(n => n.name)
                    changes.children = ensureUniqueNodeListNames(changes.children, currentNames)
                  }
                  nextTree = updateNode(nextTree, id, () => changes)
                }
              })
            }
            if (data.components_to_add?.length) {
              const allIds = new Set(flattenTree(nextTree).map(n => n.id))
              data.components_to_add.forEach(spec => {
                const comp = createFromSpec(spec, allIds)
                if (comp) {
                  const currentNames = flattenTree(nextTree).map(n => n.name)
                  const uniqueComp = ensureUniqueNodeNames(comp, currentNames)
                  nextTree = insertNode(nextTree, uniqueComp, spec.parentId || activeScreenNode?.id)
                }
              })
            }

            treeRef.current = nextTree
            saveHistory(nextTree)
            return nextTree
          })
        }

        let lastId = null
        if (data.components_to_add?.length) {
          lastId = data.components_to_add[data.components_to_add.length - 1].id
        } else if (data.components_to_update?.length) {
          lastId = data.components_to_update[data.components_to_update.length - 1].id
        }

        if (lastId) setTimeout(() => setSelectedIds([lastId]), 10)

        const addsCount = (data.components_to_add || []).length
        const modsCount = (data.components_to_update || []).length + (data.components_to_remove || []).length + (data.components_to_reparent || []).length

        setChatMessages(prev => [...prev, {
          role: 'assistant',
          content: data.reply || 'Done!',
          added: addsCount,
          mods: modsCount,
          usage: data.usage,
          responseMs: Math.round(performance.now() - requestStartedAt)
        }])
      } else {
        if (streamMutatedTree) {
          saveHistory(treeRef.current)
        }
        if (response.lastId) setTimeout(() => setSelectedIds([response.lastId]), 10)
        setChatMessages(prev => [...prev, {
          role: 'assistant',
          content: response.reply || 'Done!',
          added: response.added || 0,
          mods: response.mods || 0,
          responseMs: Math.round(performance.now() - requestStartedAt)
        }])
      }
    } catch (err) {
      if (typeof streamMutatedTree !== 'undefined' && streamMutatedTree) {
        treeRef.current = preStreamTree
        setTree(preStreamTree)
      }
      if (err.name === 'AbortError') return
      setChatMessages(prev => [...prev, { role: 'assistant', content: `âš ï¸ ${err.message}`, added: 0 }])
    } finally {
      setChatLoading(false)
      setAiLoadingMessage(DEFAULT_AI_LOADING_MESSAGE)
      chatAbortControllerRef.current = null
    }
  }, [chatInput, chatImage, chatLoading, canvasW, canvasH, saveHistory, activeScreenNode, onCreditDeduction, user, chatMessages, applyRendererChatPatch, chatModel])

  // â”€â”€ Shared child event handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleChildMouseDown = useCallback((e, id) => handleMouseDown(e, id), [handleMouseDown])
  
  // Also need to handle click on children for selection when not dragging
  const handleChildClick = useCallback((e) => {
    e.stopPropagation()
    // handleMouseDown already handles selection. We don't want to double trigger here.
  }, [])

  // â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  return (
    <div className="flex flex-col flex-1 overflow-hidden relative">
      <AppLoadingOverlay isVisible={chatLoading || tweakLoading} onCancel={handleCancelAI} message={aiLoadingMessage} />

      {/* Top Bar */}
      <div id="top-menu" className="relative flex items-center justify-center gap-4 px-5 py-2.5 border-b border-overlay/40 bg-surface/55 shrink-0 min-h-[58px]">
        <div className="absolute left-5 z-10 flex items-center gap-4">
        {/* Editable Project Name */}
        <input
          type="text"
          value={typeof activeProject === 'object' && activeProject?.name ? activeProject.name : 'Untitled Project'}
          onChange={e => {
            const newName = e.target.value;
            setActiveProject((prev: any) => typeof prev === 'object' ? { ...prev, name: newName } : prev);
          }}
          onFocus={e => (e.target as HTMLInputElement).select()}
          className="text-sm font-semibold text-text bg-transparent border-b border-transparent hover:border-overlay/60 focus:border-accent/60 focus:outline-none px-0.5 py-0.5 max-w-[200px] transition-colors"
          placeholder="Untitled Project"
          title="Click to rename project"
        />
        <div className="hidden">
          <label className="text-xs text-subtext">W</label>
          <input type="number" value={canvasWInput} onChange={e => setCanvasWInput(e.target.value)}
            onBlur={commitCanvasSize} onKeyDown={e => e.key === 'Enter' && commitCanvasSize()}
            className="w-20 bg-base border border-overlay/40 rounded-md px-2 py-1 text-xs text-text focus:outline-none focus:border-accent/60 text-right" />
          <span className="text-subtext/40 text-xs">Ã—</span>
          <label className="text-xs text-subtext">H</label>
          <input type="number" value={canvasHInput} onChange={e => setCanvasHInput(e.target.value)}
            onBlur={commitCanvasSize} onKeyDown={e => e.key === 'Enter' && commitCanvasSize()}
            className="w-20 bg-base border border-overlay/40 rounded-md px-2 py-1 text-xs text-text focus:outline-none focus:border-accent/60 text-right" />
          <span className="text-xs text-subtext/40">px</span>
        </div>

        </div>
        {/* Toolbar Right */}
        <div className="flex items-center">
          {/* Cloud Save & Exit Buttons */}

          
          <button
            onClick={handleExitProject}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all mr-2 bg-surface/50 text-subtext/80 hover:bg-surface border border-overlay/30 hover:text-text"
            title="Exit Project"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v.5"/></svg>
            Exit
          </button>

          <button
            onClick={handleSaveProject}
            disabled={isSaving}
            title="Save to Cloud"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all mr-3 ${
              isSaving
                ? 'bg-accent/50 text-white cursor-not-allowed opacity-70'
                : hasUnsavedChanges
                  ? 'bg-accent text-white hover:bg-accent-hover shadow-lg shadow-accent/20'
                  : 'bg-surface/50 text-subtext/80 hover:bg-surface border border-overlay/30 hover:text-text'
            }`}
          >
            {isSaving ? (
              <div className="w-3.5 h-3.5 rounded-full border-2 border-white/50 border-t-white animate-spin" />
            ) : (
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            )}
            Save
          </button>

          {/* Play / Pause Button */}
          <button
            onClick={() => {
              setIsPlaying(p => !p)
              setSelectedIds([])
            }}
            title={isPlaying ? 'Stop Preview (Esc)' : 'Preview App'}
            className={`flex items-center justify-center gap-1.5 w-20 px-3 py-1.5 rounded-lg text-xs font-bold transition-all mr-3 shadow-lg transform active:scale-95
              ${isPlaying
                ? 'bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30 shadow-red-500/10'
                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30 shadow-emerald-500/10'
            }`}
          >
            {isPlaying ? (
              <>
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 0 1 .75-.75H9a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H7.5a.75.75 0 0 1-.75-.75V5.25Zm7.5 0A.75.75 0 0 1 15 4.5h1.5a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H15a.75.75 0 0 1-.75-.75V5.25Z" clipRule="evenodd" />
                </svg>
                Stop
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path fillRule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" />
                </svg>
                Play
              </>
            )}
          </button>

          <button
            id="errors-trigger"
            onClick={toggleErrorsPane}
            className={`hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all mr-3 ${showErrorsPane ? 'bg-red/20 text-red border border-red/30 shadow-inner' : 'bg-surface/50 text-subtext/80 hover:bg-surface border border-overlay/30 hover:text-text'
              }`}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd" />
            </svg>
            Errors
            {globalErrors.length > 0 && (
               <span className="flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-red text-white text-[9px] font-bold">
                 {globalErrors.length}
               </span>
            )}
          </button>

          <button
            id="yaml-trigger"
            onClick={() => setShowCodePane(!showCodePane)}
            className={`hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all mr-3 [&>span:first-of-type]:hidden ${showCodePane ? 'bg-accent/20 text-accent border border-accent/30 shadow-inner' : 'bg-surface/50 text-subtext/80 hover:bg-surface border border-overlay/30 hover:text-text'
              }`}
          >
            <span className="text-[13px]">ðŸ’»</span>
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 6 3 12l5 6" />
              <path d="m16 6 5 6-5 6" />
              <path d="M14 4 10 20" />
            </svg>
            View Code
          </button>

          <button
            onClick={handleExportToPowerApps}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all mr-3 bg-surface/50 text-subtext/80 hover:bg-surface border border-overlay/30 hover:text-text"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3v12" />
              <path d="m7 10 5 5 5-5" />
              <path d="M5 21h14" />
            </svg>
            Export to PA
          </button>

          <button
            onClick={togglePropertiesPane}
            className={`hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all mr-3 ${showPropertiesPane ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30 shadow-inner' : 'bg-surface/50 text-subtext/80 hover:bg-surface border border-overlay/30 hover:text-text'
              }`}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 6h16M4 12h16M4 18h7" />
            </svg>
            Properties
          </button>

          <button
            onClick={toggleVariablesPane}
            className={`hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all mr-3 ${showLocalData ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-inner' : 'bg-surface/50 text-subtext/80 hover:bg-surface border border-overlay/30 hover:text-text'
              }`}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="9" y1="3" x2="9" y2="21" />
            </svg>
            Variables
          </button>

          <div ref={mobilePaneMenuRef} className="relative mr-3 xl:hidden">
            <button
              onClick={() => setShowMobilePaneMenu(prev => !prev)}
              aria-label="Open panel menu"
              title="Panels"
              className={`relative flex h-9 w-9 items-center justify-center rounded-lg border transition-all cursor-pointer ${
                showMobilePaneMenu || showErrorsPane || showPropertiesPane || showLocalData
                  ? 'border-accent/40 bg-accent/15 text-accent'
                  : 'border-overlay/30 bg-surface/50 text-subtext/80 hover:bg-surface hover:text-text'
              }`}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round">
                <path d="M4 7h16" />
                <path d="M4 12h16" />
                <path d="M4 17h16" />
              </svg>
              {globalErrors.length > 0 && (
                <span className="absolute -right-1 -top-1 flex min-w-[16px] h-4 items-center justify-center rounded-full bg-red px-1 text-[9px] font-bold text-white">
                  {globalErrors.length}
                </span>
              )}
            </button>

            {showMobilePaneMenu && (
              <div
                className="absolute right-0 top-full z-30 mt-2 min-w-[180px] overflow-hidden rounded-2xl border border-overlay/30 shadow-[var(--vc-shadow-floating-panel)]"
                style={{ backgroundColor: themeVars.colors.panel }}
              >
                <button
                  onClick={toggleErrorsPane}
                  className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm transition-colors cursor-pointer ${
                    showErrorsPane ? 'bg-red/10 text-red' : 'text-text hover:bg-surface/60'
                  }`}
                >
                  <span>Errors</span>
                  {globalErrors.length > 0 && (
                    <span className="rounded-full bg-red px-2 py-0.5 text-[10px] font-bold text-white">
                      {globalErrors.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowCodePane(prev => !prev)
                    setShowMobilePaneMenu(false)
                  }}
                  className={`flex w-full items-center px-4 py-3 text-left text-sm transition-colors cursor-pointer ${
                    showCodePane ? 'bg-accent/10 text-accent' : 'text-text hover:bg-surface/60'
                  }`}
                >
                  <span>View Code</span>
                </button>
                <button
                  onClick={togglePropertiesPane}
                  className={`flex w-full items-center px-4 py-3 text-left text-sm transition-colors cursor-pointer ${
                    showPropertiesPane ? 'bg-blue-500/10 text-blue-300' : 'text-text hover:bg-surface/60'
                  }`}
                >
                  <span>Properties</span>
                </button>
                <button
                  onClick={toggleVariablesPane}
                  className={`flex w-full items-center px-4 py-3 text-left text-sm transition-colors cursor-pointer ${
                    showLocalData ? 'bg-emerald-500/10 text-emerald-300' : 'text-text hover:bg-surface/60'
                  }`}
                >
                  <span>Variables</span>
                </button>
              </div>
            )}
          </div>

          {/* Undo / Redo Buttons */}
          <div className="flex items-center gap-1 bg-surface/50 border border-overlay/40 rounded-lg p-0.5 divide-x divide-overlay/40 mr-4">
            <button
              onClick={undo}
              disabled={historyState.index === 0}
              title="Undo (Ctrl+Z)"
              className={`p-1.5 rounded flex items-center justify-center transition-colors ${historyState.index > 0 ? 'text-subtext hover:text-text hover:bg-overlay/60' : 'text-subtext/30 cursor-not-allowed'}`}
            >
              <svg className="w-4 h-4 text-inherit" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 7v6h6" />
                <path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13" />
              </svg>
            </button>
            <button
              onClick={redo}
              disabled={historyState.index >= historyState.items.length - 1}
              title="Redo (Ctrl+Y)"
              className={`p-1.5 rounded flex items-center justify-center transition-colors ${historyState.index < historyState.items.length - 1 ? 'text-subtext hover:text-text hover:bg-overlay/60' : 'text-subtext/30 cursor-not-allowed'}`}
            >
              <svg className="w-4 h-4 text-inherit" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 7v6h-6" />
                <path d="M3 17a9 9 0 019-9 9 9 0 016 2.3l3 2.7" />
              </svg>
            </button>
          </div>

        </div>
        <div className="absolute right-5 z-10 flex items-center gap-2">
          <button 
            onClick={() => {
              setCurrentTourStep(0)
              setIsTourActive(true)
            }}
            aria-label="Open tutorial"
            title="Tutorial"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-sm font-black text-white transition-all hover:scale-105 hover:bg-emerald-400 active:scale-95 cursor-pointer"
          >
            ?
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left Toolbar */}
        <div id="left-toolbar" style={{ width: 256 }} className="shrink-0 border-r border-overlay/40 bg-surface/40 flex flex-col overflow-hidden relative">

          {/* Component Library */}
          <div className="max-h-[50%] flex flex-col overflow-hidden border-b border-overlay/25">
            <div className="flex items-center pt-3 pb-2 px-3 justify-between shrink-0 border-b border-overlay/25 shadow-sm bg-surface/50">
              <p className="text-[10px] font-semibold text-subtext/60 uppercase tracking-widest truncate mr-1">
                {selectedNode?.type === 'Container' ? 'Add To Container' : 'Add Component'}
              </p>

            </div>
            <div className={`overflow-y-auto flex-1 pb-3 ${showLayerNames ? 'px-3 pt-2' : 'px-2 pt-2'}`}>
              <div className="flex flex-col gap-2">
                {componentLibraryGroups.map(group => (
                  <details key={group.key} open className="rounded-xl border border-overlay/25 bg-base/30 overflow-hidden">
                    <summary className="list-none cursor-pointer select-none px-3 py-2.5 bg-surface/40 hover:bg-surface/55 transition-colors">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-subtext/75">{group.label}</p>
                          <p className="text-[10px] text-subtext/45 mt-0.5">{group.items.length} component{group.items.length !== 1 ? 's' : ''}</p>
                        </div>
                        <svg className="w-4 h-4 text-subtext/50 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.25 4.512a.75.75 0 0 1-1.08 0L5.21 8.27a.75.75 0 0 1 .02-1.06Z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </summary>
                    <div className="p-2 space-y-1.5">
                      {group.items.map(([label, sch]) => {
                        const Icon = TYPE_ICONS[label]
                        const color = TYPE_COLORS[label]
                        return (
                          <button key={label} onClick={() => !isPlaying && addComponent(sch)}
                            disabled={isPlaying}
                            title={!showLayerNames ? label : undefined}
                            className={`flex items-center gap-2 w-full text-left border rounded-lg transition-all duration-150 ${showLayerNames ? 'px-3 py-2.5 text-xs' : 'py-2.5 px-3 justify-start'} ${
                              isPlaying
                                ? 'bg-base/30 border-overlay/15 text-subtext/30 cursor-not-allowed'
                                : 'bg-base/60 border-overlay/30 hover:border-accent/50 hover:bg-accent/5 hover:text-accent text-subtext cursor-pointer'
                            }`}>
                            <span className={`w-6 h-6 rounded ${color} flex items-center justify-center shrink-0 shadow-sm text-white ${isPlaying ? 'opacity-40' : ''}`}>
                              {Icon && <Icon className="w-4 h-4" />}
                            </span>
                            {showLayerNames && <span className="font-medium truncate">{label}</span>}
                          </button>
                        )
                      })}
                    </div>
                  </details>
                ))}
              </div>{/* end button list */}
            </div>{/* end scrollable */}
            {selectedNode?.type === 'Container' && (
              <p className="text-[10px] text-accent/70 mt-2 text-center">
                Adding inside selected container
              </p>
            )}
          </div>

          {/* Layers */}
          <div className="flex-1 max-h-[50%] flex flex-col overflow-hidden">
          <div id="layers-panel" className="p-2 border-b border-overlay/35 bg-surface/65 flex items-center justify-between shrink-0 border-t border-overlay/25">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-text px-2">Layers</span>
              </div>
              {showLayerNames && tree.length > 0 && (
                <button onClick={() => setCollapsedIds(new Set())} className="text-[10px] text-accent/80 hover:text-accent font-medium px-2 py-1 rounded hover:bg-accent/10 transition-colors shrink-0">
                  Expand All
                </button>
              )}
            </div>
            <div className={`overflow-y-auto flex-1 pb-16 space-y-0.5 ${showLayerNames ? 'p-3' : 'px-2 py-3'}`}>
              {flatNodes.map(({ _depth, ...node }) => (
                <LayerRow
                  key={node.id}
                  node={node}
                  selectedIds={selectedIds}
                  onSelect={(e, id) => {
                    let newSelectedIds = [...selectedIds]
                    if (e.shiftKey) {
                      if (newSelectedIds.includes(id)) {
                        newSelectedIds = newSelectedIds.filter(i => i !== id)
                      } else {
                        newSelectedIds.push(id)
                      }
                    } else {
                      newSelectedIds = [id]
                    }
                    setSelectedIds(newSelectedIds)
                    if (!e.shiftKey) {
                      const nextScreenId = getScreenIdForNode(id)
                      if (nextScreenId) setActiveScreenId(nextScreenId)
                      setShowPropertiesPane(true)
                    }
                    setShowErrorsPane(false)
                  }}
                  onReorder={handleReorder}
                  depth={_depth}
                  isCollapsed={collapsedIds.has(node.id)}
                  toggleCollapse={toggleCollapse}
                  showNames={showLayerNames}
                />
              ))}
              {tree.length === 0 && <div className="text-xs text-subtext/40 italic px-2 py-4">Canvas is empty</div>}
              <div className="pt-2 px-1">
                <button 
                  onClick={addScreen}
                  title={!showLayerNames ? 'Add Screen' : undefined}
                  className={`w-full flex items-center justify-center gap-2 border border-dashed border-overlay/40 text-subtext/80 hover:text-text hover:border-accent/40 hover:bg-accent/5 transition-colors font-medium rounded-lg ${showLayerNames ? 'px-3 py-1.5 text-xs' : 'py-2'}`}
                >
                  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                  {showLayerNames && <span>Add Screen</span>}
                </button>
            </div>
          </div>
        </div>
      </div>    {/* Center: Canvas + Chat */}
      <div className="flex-1 relative overflow-hidden" style={{ backgroundColor: themeVars.colors.canvasWorkspace }}>
          {/* Notification Toast centered inside Canvas Workspace */}
          {notification && (() => {
            const type = notification.type || 'Information'
            const styles = {
              Success: {
                bgColor: 'rgba(236, 253, 245, 0.96)',
                borderColor: 'rgba(16, 185, 129, 0.3)',
                iconBg: 'bg-emerald-500',
                iconText: 'text-white',
                accent: 'bg-emerald-500',
                titleColor: '#065f46',
                bodyColor: 'rgba(6, 95, 70, 0.82)',
                shadow: 'shadow-emerald-500/10'
              },
              Error: {
                bgColor: 'rgba(254, 242, 242, 0.98)',
                borderColor: 'rgba(239, 68, 68, 0.35)',
                iconBg: 'bg-red-500',
                iconText: 'text-white',
                accent: 'bg-red-500',
                titleColor: '#7f1d1d',
                bodyColor: 'rgba(127, 29, 29, 0.84)',
                shadow: 'shadow-red-500/10',
                icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              },
              Warning: {
                bgColor: 'rgba(255, 251, 235, 0.97)',
                borderColor: 'rgba(245, 158, 11, 0.35)',
                iconBg: 'bg-amber-500',
                iconText: 'text-white',
                accent: 'bg-amber-500',
                titleColor: '#78350f',
                bodyColor: 'rgba(120, 53, 15, 0.82)',
                shadow: 'shadow-amber-500/10',
                icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
              },
              Information: {
                bgColor: 'rgba(239, 246, 255, 0.97)',
                borderColor: 'rgba(59, 130, 246, 0.3)',
                iconBg: 'bg-blue-500',
                iconText: 'text-white',
                accent: 'bg-blue-500',
                titleColor: '#1e3a8a',
                bodyColor: 'rgba(30, 58, 138, 0.82)',
                shadow: 'shadow-blue-500/10',
                icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
              }
            }
            const normalizedType = type?.replace('NotificationType.', '')
            const s = styles[normalizedType] || styles.Information
            return (
              <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[100000] animate-in fade-in slide-in-from-top-6 duration-300 pointer-events-none">
                <div
                  className={`backdrop-blur-md border shadow-2xl ${s.shadow} rounded-2xl p-1.5 flex items-center gap-3 min-w-[300px] overflow-hidden relative`}
                  style={{ backgroundColor: s.bgColor, borderColor: s.borderColor }}
                >
                  <div className={`w-10 h-10 rounded-xl ${s.iconBg} flex items-center justify-center shrink-0 shadow-lg shadow-black/5`}>
                    {normalizedType === 'Success' ? (
                      <svg className={`w-5 h-5 ${s.iconText}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    ) : s.icon}
                  </div>
                  <div className="flex-1 pr-4">
                    <p className="text-[13px] font-bold leading-tight" style={{ color: s.titleColor }}>{normalizedType}</p>
                    <p className="text-xs font-medium leading-tight mt-0.5" style={{ color: s.bodyColor }}>{notification.message}</p>
                  </div>
                  <div className="absolute bottom-0 left-0 w-full h-1 bg-black/5">
                     <div className={`h-full ${s.accent} animate-toast-progress`} />
                  </div>
                </div>
              </div>
            )
          })()}

          {/* Floating Tweak Bar Overlay */}
          {!effectiveIsPlaying && selectedIds.length === 1 && selectedNode?.type !== 'Screen' && selectedNode?.type !== 'App' && (
            <FloatingTweakBar 
              node={selectedNode}
              isTweaking={isTweaking}
              setIsTweaking={setIsTweaking}
              tweakInput={tweakInput}
              setTweakInput={setTweakInput}
              handleTweakSubmit={handleTweakSubmit}
              tweakLoading={tweakLoading}
              tweakOriginalNode={tweakOriginalNode}
              confirmTweak={confirmTweak}
              undoTweak={undoTweak}
              handleReorder={handleReorder}
              deleteSelected={deleteSelected}
            />
          )}

          <div
            id="canvas-scroll-wrapper"
            className="absolute inset-0 overflow-auto"
            style={{ backgroundColor: themeVars.colors.canvasSurface, backgroundImage: themeVars.gradients.canvasGrid, backgroundSize: '20px 20px' }}
            onContextMenu={(e) => {
              e.preventDefault()
            }}
            onMouseDown={(e) => {
              if (isPlaying) return // In preview mode, don't intercept canvas clicks
              
              if (e.button === 2) {
                e.preventDefault()
                document.body.style.cursor = 'grabbing'
                panRef.current = {
                  startMouseX: e.clientX,
                  startMouseY: e.clientY,
                  startScrollX: e.currentTarget.scrollLeft,
                  startScrollY: e.currentTarget.scrollTop,
                }
                return
              }

              if (e.button === 1 || (e.button === 0 && spacePanRef.current)) {
                e.preventDefault()
                document.body.style.cursor = 'grabbing'
                panRef.current = {
                  startMouseX: e.clientX,
                  startMouseY: e.clientY,
                  startScrollX: e.currentTarget.scrollLeft,
                  startScrollY: e.currentTarget.scrollTop,
                }
                return
              }

              // Handle Marquee Selection (Left Click only)
              if (effectiveIsPlaying) return; // Cannot marquee selection during play mode
              if (e.button !== 0) return; // Only allow left-clicks for marquee selection
              const isBg = (e.target as HTMLElement).id === 'canvas-scroll-wrapper' || (e.target as HTMLElement).id === 'canvas-padding-wrapper' || (e.target as HTMLElement).id === 'canvas-root'
              if (isBg) {
                // console.log('--- MOUSE DOWN ON bg ---', e.target.id)
                if (!e.shiftKey) setSelectedIds([activeScreenNode?.id].filter(Boolean))
                setShowErrorsPane(false)
                const canvasEl = document.getElementById('canvas-root')
                if (!canvasEl) return
                const rect = canvasEl.getBoundingClientRect()
                const PT_RATIO = 0.75
                const pxRatio = (1 / effectiveZoom) * PT_RATIO
                const startX = (e.clientX - rect.left) * pxRatio
                const startY = (e.clientY - rect.top) * pxRatio
                // console.log('Setting selectionBox start', { startX, startY })
                const box = { startX, startY, currentX: startX, currentY: startY }
                selectionBoxRef.current = box
                setSelectionBox(box)
              } else {
                // console.log('--- MOUSE DOWN on NON-bg ---', e.target.id, e.target.className)
              }
            }}
          >
            <div id="canvas-padding-wrapper" className="inline-block transition-transform duration-200" style={{ padding: '50vh 50vw', transform: `scale(${effectiveZoom})`, transformOrigin: 'center' }}>
              {/* Screen name label above canvas */}
              {activeScreenNode && (
                <div style={{ marginBottom: 6, marginLeft: 2 }} className="flex items-center gap-2">
                  <div className="inline-flex items-center gap-2 rounded-full border border-overlay/40 bg-base/90 px-3 py-1 shadow-sm backdrop-blur-sm">
                    <div className="h-2 w-2 rounded-full bg-emerald-400" />
                    <span className="text-[11px] font-semibold text-text tracking-wide select-none">
                      {activeScreenNode.name || activeScreenNode.id} - {activeScreenComponentCount} component{activeScreenComponentCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              )}
              <div
                className="relative shrink-0"
                style={{ width: `${canvasW}pt`, height: `${canvasH}pt`, backgroundColor: evaluateAST(parseFormula(activeScreenNode?.Fill || 'white'), runtimeLocalVars, fullFlatNodes), boxShadow: themeVars.shadows.canvas }}
                data-container-id={activeScreenNode?.id || 'root'}
                id="canvas-root"
                onDragOver={e => { e.preventDefault(); setDragOverId('_canvas') }}
                onDrop={e => { e.preventDefault(); setDragOverId(null) }}
              >
                {(!activeScreenNode || activeScreenNode.children?.length === 0) && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center mb-3">
                      <svg className="w-7 h-7 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                    </div>
                    <p className="text-gray-300 text-sm font-medium">Add components from the left panel or chat</p>
                    <p className="text-gray-200 text-xs mt-1">{canvasW} Ã— {canvasH}</p>
                  </div>
                )}
                {(activeScreenNode?.children || []).map((rawComp, siblingIndex) => {
                  const isSelected = selectedIds.includes(rawComp.id)
                  const comp = resolveProperties(rawComp, runtimeLocalVars, fullFlatNodes, activeScreenNode)
                  const sharedProps = {
                    comp, selected: isSelected, isPlaying: effectiveIsPlaying,
                    localVars: runtimeLocalVars, setLocalVars, notify,
                    flatNodes: fullFlatNodes,
                    updateProp,
                    parentNode: activeScreenNode,
                    canvasTheme: resolvedCanvasTheme,
                    renderZIndex: siblingIndex + 1,
                    navigate: (targetNameOrId) => {
                      const screens = tree[0]?.type === 'App' ? (tree[0]?.children || []) : []
                      const targetScreen = screens.find(s => s.id === targetNameOrId || s.name === targetNameOrId)
                      if (targetScreen) {
                        setActiveScreenId(targetScreen.id)
                        setSelectedIds([targetScreen.id])
                      } else {
                        notify(`Screen not found: ${targetNameOrId}`)
                      }
                    },
                    onMouseDown: (e) => {
                      if (comp.type === 'App') return // Prevent interacting with App node
                      handleMouseDown(e, comp.id)
                    },
                    onClick: (e) => { 
                      e.stopPropagation(); 
                      if (effectiveIsPlaying || comp.type === 'App') return; // Cannot select App or when playing
                      // Only set single selection if NOT shift-clicking
                      if (!e.shiftKey) setSelectedIds([comp.id]) 
                    },
                    selectedIds,
                    onChildMouseDown: handleChildMouseDown,
                    onChildClick: handleChildClick,
                    onDropInto: handleDropInto,
                    dragOverId,
                    setDragOverId
                  }
                  
                  if (comp.type === 'Icon') {
                    const iconProp = SCHEMAS.Icon.properties.find((p: any) => p.key === 'Icon') as any;
                    const schemaOptionVal = iconProp?.options?.find((o: any) => o?.value === comp.Icon);
                    comp._svg = schemaOptionVal ? schemaOptionVal.svg : null;
                  }

                  return <RendererSwitch key={comp.id} comp={comp} sharedProps={sharedProps} />
                })}
                
                {/* Snap Lines (Guides) */}
                {snapLines.map((line, i) => {
                  let absX = line.x || 0
                  let absY = line.y || 0
                  // If snapping inside a nested container, adjust coordinates to be relative to the active screen
                  if (line.parentId && line.parentId !== activeScreenId && line.parentId !== 'root' && line.parentId !== 'app_root') {
                    const parentPos = getNodeAbsolutePosition(tree, line.parentId, fullFlatNodes, runtimeLocalVars)
                    if (line.orientation === 'vertical') absX += parentPos.x
                    else absY += parentPos.y
                  }

                  return (
                    <div
                      key={`snap-${i}`}
                      style={{
                        position: 'absolute',
                        left: line.orientation === 'vertical' ? `${absX}pt` : 0,
                        top: line.orientation === 'horizontal' ? `${absY}pt` : 0,
                        width: line.orientation === 'vertical' ? 1 : '100%',
                        height: line.orientation === 'horizontal' ? 1 : '100%',
                        backgroundColor: themeVars.colors.selection,
                        zIndex: 10001,
                        pointerEvents: 'none',
                        boxShadow: themeVars.shadows.dragGuide
                      }}
                    />
                  )
                })}

                {/* Marquee Selection Box */}
                {selectionBox && (() => {
                  const left = Math.min(selectionBox.startX, selectionBox.currentX)
                  const top = Math.min(selectionBox.startY, selectionBox.currentY)
                  const width = Math.abs(selectionBox.startX - selectionBox.currentX)
                  const height = Math.abs(selectionBox.startY - selectionBox.currentY)
                  return (
                    <div
                      style={{
                        position: 'absolute',
                        left: `${left}pt`, top: `${top}pt`, width: `${width}pt`, height: `${height}pt`,
                        border: `1px solid ${themeVars.colors.selection}`,
                        backgroundColor: themeVars.colors.selectionSoft,
                        zIndex: 10000,
                        pointerEvents: 'none'
                      }}
                    />
                  )
                })()}

                {/* Multi-Selection Bounding Box */}
                {selectedIds.length > 1 && !effectiveIsPlaying && (() => {
                  const selectedNodes = (activeScreenNode?.children || []).filter(c => selectedIds.includes(c.id))
                  if (selectedNodes.length < 2) return null

                  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
                  selectedNodes.forEach(rawNode => {
                    const parent = findParent(tree, rawNode.id)
                    const node = resolveProperties(rawNode, runtimeLocalVars, fullFlatNodes, parent)
                    minX = Math.min(minX, node.X || 0)
                    minY = Math.min(minY, node.Y || 0)
                    maxX = Math.max(maxX, (node.X || 0) + (node.Width || 0))
                    maxY = Math.max(maxY, (node.Y || 0) + (node.Height || 0))
                  })

                  return (
                    <div
                      style={{
                        position: 'absolute',
                        left: `${minX - 4}pt`,
                        top: `${minY - 4}pt`,
                        width: `${(maxX - minX) + 8}pt`,
                        height: `${(maxY - minY) + 8}pt`,
                        border: `1.5pt solid ${themeVars.colors.selection}`,
                        backgroundColor: themeVars.colors.selectionSoft,
                        borderRadius: '4pt',
                        zIndex: 9998,
                        pointerEvents: 'none'
                      }}
                    />
                  )
                })()}

                {/* Error Indicators */}
                {(() => {
                  const errorNodeIds = new Set(visibleCanvasErrors.map(e => e.nodeId));
                  return Array.from(errorNodeIds).map(nodeId => {
                    const comp = findNode(tree, nodeId);
                    if (!comp || comp.type === 'Screen' || comp.type === 'App') return null;
                    
                    const { x, y } = getNodeAbsolutePosition(tree, comp.id, fullFlatNodes, runtimeLocalVars);
                    const parent = findParent(tree, comp.id);
                    const resolvedComp = resolveProperties(comp, runtimeLocalVars, fullFlatNodes, parent);
                    const { Width: w } = resolvedComp;
                    
                    return (
                      <div
                        key={`error-icon-${nodeId}`}
                        title="This component has validation errors"
                        style={{
                          position: 'absolute',
                          left: `${x + (w || 0) - 10}pt`,
                          top: `${y - 10}pt`,
                          zIndex: 10005
                        }}
                        className="w-5 h-5 rounded-full bg-red flex items-center justify-center text-white font-bold text-xs shadow-md border-2 border-white animate-pulse cursor-pointer hover:bg-red/80 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedIds([nodeId]);
                          if (!showErrorsPane) setShowErrorsPane(true);
                        }}
                      >
                        !
                      </div>
                    );
                  });
                })()}

                {/* Resize handles for selected root-level component */}
                {/* Resize handles â€” hidden in preview mode */}
                {selectedNode && selectedIds.length === 1 && !effectiveIsPlaying && selectedNode.type !== 'Screen' && selectedNode.type !== 'App' && (() => {
                  const comp = findNode(tree, selectedNode.id)
                  if (!comp) return null
                    const { x, y } = getNodeAbsolutePosition(tree, comp.id, fullFlatNodes, runtimeLocalVars)
                  
                  // Must use resolved height and width so handles match drawn bounds
                  const parent = findParent(tree, comp.id)
                    const resolvedComp = resolveProperties(comp, runtimeLocalVars, fullFlatNodes, parent);
                  const { Width: w, Height: h } = resolvedComp

                  const handles = [
                    { dir: 'nw', style: { left: `${x - 5}pt`, top: `${y - 5}pt`, cursor: 'nw-resize' } },
                    { dir: 'n',  style: { left: `${x + w/2 - 5}pt`, top: `${y - 5}pt`, cursor: 'n-resize' } },
                    { dir: 'ne', style: { left: `${x + w - 5}pt`, top: `${y - 5}pt`, cursor: 'ne-resize' } },
                    { dir: 'e',  style: { left: `${x + w - 5}pt`, top: `${y + h/2 - 5}pt`, cursor: 'e-resize' } },
                    { dir: 'se', style: { left: `${x + w - 5}pt`, top: `${y + h - 5}pt`, cursor: 'se-resize' } },
                    { dir: 's',  style: { left: `${x + w/2 - 5}pt`, top: `${y + h - 5}pt`, cursor: 's-resize' } },
                    { dir: 'sw', style: { left: `${x - 5}pt`, top: `${y + h - 5}pt`, cursor: 'sw-resize' } },
                    { dir: 'w',  style: { left: `${x - 5}pt`, top: `${y + h/2 - 5}pt`, cursor: 'w-resize' } },
                  ]
                  return handles.map(({ dir, style }) => (
                    <div
                      key={dir}
                      data-resize-handle="true"
                      style={{
                        ...style,
                        position: 'absolute',
                        width: 10,
                        height: 10,
                        zIndex: 9999,
                        backgroundColor: appTheme.colors.white,
                        border: `1px solid ${appTheme.editor.selection.color}`,
                      }}
                      className="rounded-sm shadow-sm transition-colors"
                      onMouseDown={e => handleResizeMouseDown(e, comp.id, dir)}
                    />
                  ))
                })()}
              </div>
            </div>
          </div>

          {/* Zoom Controls */}
          <div className={`absolute right-6 flex items-center bg-surface/90 backdrop-blur-md border border-overlay/30 shadow-md shadow-black/10 rounded-lg overflow-hidden z-40 transition-all duration-300 ${chatOpen ? 'bottom-[260px]' : 'bottom-6'}`}>
              <button 
                onClick={(e) => { e.stopPropagation(); setZoom(z => Math.max(0.25, z - 0.1)); }}
                className="p-2 text-subtext hover:bg-overlay/10 hover:text-text transition-colors"
                title="Zoom Out"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              </button>
              <div className="px-2 py-1 text-xs font-medium text-subtext/80 min-w-12 text-center border-x border-overlay/20 cursor-default select-none" onClick={e => e.stopPropagation()}>
                {Math.round(zoom * 100)}%
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); setZoom(z => Math.min(3, z + 0.1)); }}
                className="p-2 text-subtext hover:bg-overlay/10 hover:text-text transition-colors"
                title="Zoom In"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              </button>
            </div>

          {!chatOpen && (
            <button
              id="chat-panel-trigger"
              onClick={() => setChatOpen(true)}
              className="absolute bottom-6 left-1/2 z-40 flex min-w-[300px] -translate-x-1/2 items-center justify-center gap-4 rounded-full px-12 py-4 text-[19px] font-extrabold tracking-[0.01em] text-white transition-all duration-300 hover:scale-[1.03]"
              style={{
                backgroundImage: themeVars.gradients.askAi,
                boxShadow: `0 16px 40px ${appTheme.editor.askAi.glow}, inset 0 2px 0 ${appTheme.editor.askAi.insetHighlight}, inset 0 -2px 0 ${appTheme.editor.askAi.insetShadow}`,
              }}
            >
              <svg className="h-8 w-8 text-white" viewBox="0 0 24 24" fill="currentColor" style={{ filter: `drop-shadow(0 3px 8px ${appTheme.editor.askAi.iconGlow})` }}>
                <path d="M5.75 4.5A2.75 2.75 0 0 0 3 7.25v6A2.75 2.75 0 0 0 5.75 16H7v3.2c0 .64.76.98 1.24.56L12.6 16h5.65A2.75 2.75 0 0 0 21 13.25v-6a2.75 2.75 0 0 0-2.75-2.75H5.75Zm2.5 4.25a1 1 0 1 0 0 2h7.5a1 1 0 1 0 0-2h-7.5Zm0 3.75a1 1 0 1 0 0 2h4.5a1 1 0 1 0 0-2h-4.5Z" />
              </svg>
              Ask AI
              {chatLoading && <span className="w-2.5 h-2.5 rounded-full bg-white/95 animate-pulse" />}
            </button>
          )}


          {/* AI Chat Panel */}
          <div style={{ height: chatOpen ? chatHeight : 0, boxShadow: themeVars.shadows.chatDock }} className="absolute bottom-0 left-0 w-full z-50 border-t border-overlay/30 bg-base/95 backdrop-blur-md flex flex-col transition-all duration-300 ease-in-out overflow-hidden">
            {/* Resize Handle Chat */}
            <div 
              className="absolute top-0 left-0 w-full h-1 cursor-row-resize hover:bg-accent/30 transition-colors z-[60]"
              onMouseDown={(e) => {
                paneResizeRef.current = { side: 'chat', startMouseY: e.clientY, startHeight: chatHeight }
                document.body.style.cursor = 'row-resize'
              }}
            />
            <div className="flex items-center justify-between gap-3 px-4 py-2 border-b border-overlay/20 bg-surface/40 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg border border-overlay/30 bg-base/70 shadow-sm overflow-hidden">
                  <NextImage
                    src={logo}
                    alt="Velocity Canvas"
                    width={18}
                    height={18}
                    className="h-[18px] w-[18px] object-contain"
                    priority
                  />
                </div>
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs font-semibold text-text whitespace-nowrap">AI Canvas Assistant</span>
                  <label className="flex items-center gap-2 min-w-0 rounded-xl border border-overlay/30 bg-base/60 px-2.5 py-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-subtext/50 whitespace-nowrap">Chat model</span>
                    <select
                      value={chatModel}
                      onChange={e => setChatModel(e.target.value)}
                      className="min-w-[220px] bg-transparent text-[11px] font-medium text-text outline-none cursor-pointer"
                    >
                      {RENDERER_CHAT_MODEL_OPTIONS.map(option => (
                        <option key={option.value} value={option.value} className="text-text" style={{ backgroundColor: themeVars.colors.panel }}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  {chatModel === 'gemini-3.1-pro-preview' && (
                    <span className="text-[10px] font-medium text-amber-300/90 whitespace-nowrap">
                      Can take 1-3 minutes
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleClearChat}
                  className="rounded-lg border border-overlay/30 bg-base/60 px-2.5 py-1 text-[11px] font-medium text-subtext/80 transition-colors hover:border-overlay/50 hover:bg-surface hover:text-text cursor-pointer"
                >
                  Clear chat
                </button>
                <button onClick={() => setChatOpen(false)}
                  className="text-subtext/40 hover:text-subtext transition-colors duration-150 cursor-pointer">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 0 1 1.06 0L12 10.94l5.47-5.47a.75.75 0 1 1 1.06 1.06L13.06 12l5.47 5.47a.75.75 0 1 1-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 0 1-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
              {chatMessages.map((msg, i) => <ChatMessage key={i} msg={msg} />)}
              {chatLoading && (
                <div className="flex gap-2 items-center">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-accent flex items-center justify-center text-[10px] font-bold text-white shrink-0">AI</div>
                  <div className="bg-surface border border-overlay/40 rounded-xl px-3 py-2 flex items-center gap-2 max-w-[260px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '300ms' }} />
                    <span className="text-[11px] text-subtext/70 truncate">{aiLoadingMessage}</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <div className="border-t border-overlay/20 bg-surface/20 shrink-0 flex flex-col p-3 gap-2">
              {chatImage && (
                <div className="relative inline-block w-fit ml-2 group">
                  <img src={chatImage} alt="Chat upload" className="h-16 w-auto rounded-lg border border-overlay/30 object-contain bg-base/50 shadow-sm" />
                  <button
                    onClick={() => setChatImage(null)}
                    className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full text-[10px] text-white shadow-md transition-all cursor-pointer opacity-0 group-hover:opacity-100 hover:scale-110"
                    style={{ backgroundColor: appTheme.colors.red }}
                  >
                    âœ•
                  </button>
                </div>
              )}
              <div className="flex items-center gap-2">
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={e => {
                  const file = e.target.files[0]
                  if (file) {
                    const reader = new FileReader()
                    reader.onload = (ev) => compressImageDataUrl(ev.target.result, setChatImage)
                    reader.readAsDataURL(file)
                  }
                  e.target.value = ''
                }} />
                
                <button onClick={() => fileInputRef.current?.click()} className="w-9 h-9 flex items-center justify-center rounded-xl text-subtext/60 bg-base hover:text-accent hover:border-accent/40 border border-overlay/40 transition-colors shadow-sm cursor-pointer shrink-0" title="Attach image">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                </button>


                <div className="flex-1 relative flex items-center">
                  <input ref={chatInputRef} type="text" value={chatInput}
                    maxLength={1000}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleChatSubmit()}
                    onPaste={e => {
                      const items = e.clipboardData?.items
                      if (!items) return
                      for (const item of items) {
                        if (item.type.startsWith('image/')) {
                          e.preventDefault()
                          const file = item.getAsFile()
                          if (!file) return
                          const reader = new FileReader()
                          reader.onload = (ev) => compressImageDataUrl(ev.target.result, setChatImage)
                          reader.readAsDataURL(file)
                          return
                        }
                      }
                    }}
                    placeholder="Describe what to build â€” or paste a screenshot"
                    className="w-full bg-base border border-overlay/40 rounded-xl px-4 pr-12 h-9 text-xs text-text placeholder:text-subtext/40 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all shadow-sm" />
                  <span className={`absolute right-3 text-[9px] font-bold transition-colors ${chatInput.length >= 900 ? 'text-amber-500' : 'text-subtext/30'}`}>
                    {chatInput.length}/1000
                  </span>
                </div>
                <button onClick={handleChatSubmit} disabled={(!chatInput.trim() && !chatImage) || chatLoading}
                  className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-accent flex items-center justify-center shrink-0 shadow-md shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-105 active:scale-95 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 cursor-pointer">
                  <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3.478 2.405a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.405Z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>


        {/* Code Pane */}
        {showCodePane && (
          <div className="relative flex shrink-0">
            {/* Resize Handle Code */}
            <div 
              className="absolute top-0 left-0 w-1 h-full cursor-col-resize hover:bg-accent/30 transition-colors z-[60]"
              onMouseDown={(e) => {
                paneResizeRef.current = { side: 'code', startMouseX: e.clientX, startWidth: codeWidth }
                document.body.style.cursor = 'col-resize'
              }}
            />
            <CodePane 
              node={selectedNode}
              tree={tree}
              canvasTheme={normalizedCanvasTheme}
              globalErrors={globalErrors}
              notify={notify}
              isTweaking={isTweaking}
              setIsTweaking={setIsTweaking}
              tweakInput={tweakInput}
              setTweakInput={setTweakInput}
              handleTweakSubmit={handleTweakSubmit}
              tweakLoading={tweakLoading}
              tweakOriginalNode={tweakOriginalNode}
              width={codeWidth}
              onClose={() => setShowCodePane(false)}
            />
          </div>
        )}

        {/* Right Panel: Local Data OR Properties */}
        {/* Right Panel: Errors OR Local Data OR Properties */}
        {showErrorsPane ? (
          <div style={{ width: rightWidth, backgroundColor: themeVars.colors.panel }} className="shrink-0 border-l border-overlay/30 flex flex-col overflow-hidden relative">
            {/* Resize Handle Right */}
            <div 
              className="absolute top-0 left-0 w-1 h-full cursor-col-resize hover:bg-accent/30 transition-colors z-[60]"
              onMouseDown={(e) => {
                paneResizeRef.current = { side: 'right', startMouseX: e.clientX, startWidth: rightWidth }
                document.body.style.cursor = 'col-resize'
              }}
            />
            <ErrorsPane 
              errors={globalErrors}
              onSelectNode={(id) => {
                setSelectedIds([id])
                setShowErrorsPane(false)
                setShowPropertiesPane(true)
              }}
              width={rightWidth}
              onClose={() => setShowErrorsPane(false)}
            />
          </div>
        ) : showLocalData ? (
          <div style={{ width: rightWidth }} className="shrink-0 border-l border-overlay/40 bg-surface/40 flex flex-col overflow-hidden relative">
            {/* Resize Handle Right */}
            <div 
              className="absolute top-0 left-0 w-1 h-full cursor-col-resize hover:bg-accent/30 transition-colors z-[60]"
              onMouseDown={(e) => {
                paneResizeRef.current = { side: 'right', startMouseX: e.clientX, startWidth: rightWidth }
                document.body.style.cursor = 'col-resize'
              }}
            />
            {/* Header */}
            <div className="px-4 py-3 border-b border-overlay/20 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-xs font-semibold text-text">Variables</span>
              </div>
              <button
                onClick={() => setShowLocalData(false)}
                className="text-subtext/40 hover:text-subtext transition-colors duration-150 cursor-pointer p-1"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 0 1 1.06 0L12 10.94l5.47-5.47a.75.75 0 1 1 1.06 1.06L13.06 12l5.47 5.47a.75.75 0 1 1-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 0 1-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            {/* Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {Object.keys(localVars).length > 0 ? (
                <div className="flex-1 overflow-y-auto w-full">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-surface/50 border-b border-overlay/20 sticky top-0 z-10">
                      <tr>
                        <th className="px-4 py-2 text-[11px] font-semibold text-subtext/70 uppercase tracking-wide">Variable</th>
                        <th className="px-4 py-2 text-[11px] font-semibold text-subtext/70 uppercase tracking-wide">Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-overlay/10">
                      {Object.entries(localVars).map(([key, val]) => (
                        <tr key={key} className="hover:bg-overlay/5 transition-colors">
                          <td className="px-4 py-2.5 text-xs text-text border-r border-overlay/5 font-medium whitespace-nowrap overflow-hidden text-ellipsis max-w-[100px]" title={key}>{key}</td>
                          <td className="px-4 py-2.5 text-xs font-mono text-emerald-400 bg-emerald-500/5 whitespace-nowrap overflow-hidden text-ellipsis max-w-[120px]" title={typeof val === 'object' ? JSON.stringify(val) : String(val)}>{typeof val === 'object' ? JSON.stringify(val) : String(val)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
                  <div className="w-12 h-12 rounded-xl bg-overlay/20 flex items-center justify-center mb-3">
                    <svg className="w-6 h-6 text-subtext/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 0-6.23-.693L5 14.5m14.8.8 1.402 1.402c1.232 1.232.15 3.338-1.55 3.338H5.35c-1.7 0-2.783-2.106-1.55-3.338L5 14.5" />
                    </svg>
                  </div>
                  <p className="text-subtext/40 text-[11px] leading-relaxed">
                    No variables yet.<br/>Use <code className="bg-overlay/20 px-1 py-0.5 rounded text-subtext/70 font-mono">Set(VarName, "Value")</code> in a component's OnSelect property.
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : showPropertiesPane ? (
          <div id="props-panel" style={{ width: rightWidth }} className="shrink-0 border-l border-overlay/40 bg-surface/40 flex flex-col overflow-hidden relative">
            {/* Resize Handle Right */}
            <div 
              className="absolute top-0 left-0 w-1 h-full cursor-col-resize hover:bg-accent/30 transition-colors z-[60]"
              onMouseDown={(e) => {
                paneResizeRef.current = { side: 'right', startMouseX: e.clientX, startWidth: rightWidth }
                document.body.style.cursor = 'col-resize'
              }}
            />
            {selectedNode && isAppSelected ? (
              <>
                <div className="px-4 py-3 border-b border-overlay/20 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] bg-accent/15 text-accent border border-accent/25 px-2 py-0.5 rounded-full font-medium">
                      App
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setShowPropertiesPane(false)}
                        className="text-subtext/40 hover:text-subtext transition-colors duration-150 cursor-pointer p-1"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                          <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 0 1 1.06 0L12 10.94l5.47-5.47a.75.75 0 1 1 1.06 1.06L13.06 12l5.47 5.47a.75.75 0 1 1-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 0 1-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <NameInput
                    key={`app-name-${projectDisplayName}`}
                    initialValue={projectDisplayName}
                    checkDuplicate={(val) => (!val.trim() ? 'Name cannot be empty.' : null)}
                    onCommit={updateAppName}
                  />
                </div>
                <div className="flex-1 overflow-y-auto px-4 py-2">
                  <div className="flex flex-col gap-4 py-1">
                    <div className="rounded-xl border border-overlay/25 bg-overlay/10 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-subtext/60">Canvas Size</p>
                          <p className="mt-1 text-xs text-subtext/60">Set the base width and height for every screen in this app.</p>
                        </div>
                        <div className="rounded-full bg-accent/10 px-2.5 py-1 text-[10px] font-semibold text-accent">
                          {canvasW} x {canvasH}
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-3">
                        <label className="flex flex-col gap-1.5">
                          <span className="text-[11px] font-medium text-subtext/70">Width</span>
                          <input
                            type="number"
                            value={canvasWInput}
                            onChange={e => setCanvasWInput(e.target.value)}
                            onBlur={commitCanvasSize}
                            onKeyDown={e => e.key === 'Enter' && commitCanvasSize()}
                            className="w-full rounded-lg border border-overlay/35 bg-base px-3 py-2 text-sm text-text focus:outline-none focus:border-accent/60"
                          />
                        </label>
                        <label className="flex flex-col gap-1.5">
                          <span className="text-[11px] font-medium text-subtext/70">Height</span>
                          <input
                            type="number"
                            value={canvasHInput}
                            onChange={e => setCanvasHInput(e.target.value)}
                            onBlur={commitCanvasSize}
                            onKeyDown={e => e.key === 'Enter' && commitCanvasSize()}
                            className="w-full rounded-lg border border-overlay/35 bg-base px-3 py-2 text-sm text-text focus:outline-none focus:border-accent/60"
                          />
                        </label>
                      </div>
                    </div>
                    <div className="rounded-xl border border-overlay/25 bg-overlay/10 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-subtext/60">Modern Theme</p>
                          <p className="mt-1 text-xs text-subtext/60">Modern controls fall back to this app theme when local values are blank.</p>
                        </div>
                        <div
                          className="h-8 w-8 rounded-full border border-white/20 shadow-sm"
                          style={{ backgroundColor: activeCanvasTheme.BasePaletteColor }}
                          title={activeCanvasTheme.BasePaletteColor}
                        />
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-3">
                        <label className="col-span-2 flex flex-col gap-1.5">
                          <span className="text-[11px] font-medium text-subtext/70">Theme Name</span>
                          <input
                            type="text"
                            value={activeCanvasTheme.name}
                            onChange={e => updateActiveCanvasThemeName(e.target.value)}
                            className="w-full rounded-lg border border-overlay/35 bg-base px-3 py-2 text-sm text-text focus:outline-none focus:border-accent/60"
                          />
                        </label>
                        <label className="flex flex-col gap-1.5">
                          <span className="text-[11px] font-medium text-subtext/70">Base Palette</span>
                          <input
                            type="color"
                            value={activeCanvasTheme.BasePaletteColor}
                            onChange={e => updateActiveCanvasThemeField('BasePaletteColor', e.target.value)}
                            className="h-11 w-full rounded-lg border border-overlay/35 bg-base px-2 py-2"
                          />
                        </label>
                        <label className="flex flex-col gap-1.5">
                          <span className="text-[11px] font-medium text-subtext/70">Font</span>
                          <input
                            type="text"
                            value={activeCanvasTheme.Font}
                            onChange={e => updateActiveCanvasThemeField('Font', e.target.value)}
                            className="w-full rounded-lg border border-overlay/35 bg-base px-3 py-2 text-sm text-text focus:outline-none focus:border-accent/60"
                          />
                        </label>
                        <label className="flex flex-col gap-1.5">
                          <span className="text-[11px] font-medium text-subtext/70">Hue Torsion</span>
                          <input
                            type="number"
                            value={activeCanvasTheme.HueTorsion}
                            onChange={e => updateActiveCanvasThemeField('HueTorsion', Number(e.target.value || 0))}
                            className="w-full rounded-lg border border-overlay/35 bg-base px-3 py-2 text-sm text-text focus:outline-none focus:border-accent/60"
                          />
                        </label>
                        <label className="flex flex-col gap-1.5">
                          <span className="text-[11px] font-medium text-subtext/70">Vibrancy</span>
                          <input
                            type="number"
                            value={activeCanvasTheme.Vibrancy}
                            onChange={e => updateActiveCanvasThemeField('Vibrancy', Number(e.target.value || 0))}
                            className="w-full rounded-lg border border-overlay/35 bg-base px-3 py-2 text-sm text-text focus:outline-none focus:border-accent/60"
                          />
                        </label>
                      </div>
                    </div>
                    <div className="rounded-xl border border-overlay/20 bg-overlay/5 px-3 py-2.5 text-xs text-subtext/65">
                      {screenCount} screen{screenCount !== 1 ? 's' : ''} in this app.
                      {activeScreenNode ? ` Currently editing ${activeScreenNode.name || activeScreenNode.id}.` : ''}
                    </div>
                  </div>
                </div>
              </>
            ) : selectedNode && selectedNode.type === 'UnknownPowerAppsObject' ? (
              <>
                <div className="px-4 py-3 border-b border-overlay/20 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] bg-amber-500/15 text-amber-300 border border-amber-500/25 px-2 py-0.5 rounded-full font-medium">
                      Preserved Power Apps Object
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setShowPropertiesPane(false)}
                        className="text-subtext/40 hover:text-subtext transition-colors duration-150 cursor-pointer p-1"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                          <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 0 1 1.06 0L12 10.94l5.47-5.47a.75.75 0 1 1 1.06 1.06L13.06 12l5.47 5.47a.75.75 0 1 1-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 0 1-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                    {selectedNode.sourceControl || 'Unknown'}
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto px-4 py-4">
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-xs text-subtext/80 space-y-4">
                    <p className="text-text font-medium">This Power Apps object is not recognized by the renderer, so its original YAML is being preserved exactly for export.</p>
                    <div className="rounded-lg bg-black/20 px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wide text-subtext/55">Source Control</p>
                      <p className="mt-1 font-mono text-[11px] text-amber-100 break-all">{selectedNode.sourceControl || 'Unknown'}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        ['X', 'X'],
                        ['Y', 'Y'],
                        ['Width', 'Width'],
                        ['Height', 'Height'],
                      ].map(([key, label]) => (
                        <label key={key} className="flex flex-col gap-1.5">
                          <span className="text-[11px] font-medium text-subtext/70">{label}</span>
                          <input
                            type="number"
                            value={selectedNode[key] ?? ''}
                            onChange={e => updateProp(selectedNode.id, key, Number(e.target.value || 0))}
                            className="w-full rounded-lg border border-overlay/35 bg-base px-3 py-2 text-sm text-text focus:outline-none focus:border-amber-400/60"
                          />
                        </label>
                      ))}
                    </div>
                    <p>It is shown on the canvas as a placeholder rectangle so we can keep layout context without losing the original YAML.</p>
                  </div>
                </div>
              </>
            ) : selectedNode && schema ? (
              <>
                <div className="px-4 py-3 border-b border-overlay/20 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] bg-accent/15 text-accent border border-accent/25 px-2 py-0.5 rounded-full font-medium">
                      {schema.control}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setShowPropertiesPane(false)}
                        className="text-subtext/40 hover:text-subtext transition-colors duration-150 cursor-pointer p-1"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                          <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 0 1 1.06 0L12 10.94l5.47-5.47a.75.75 0 1 1 1.06 1.06L13.06 12l5.47 5.47a.75.75 0 1 1-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 0 1-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  {(() => {
                    const originalName = selectedNode.name || ''
                    // Check for duplicate and invalid characters live as user types
                    const validateName = (val) => {
                      const trimmed = val.trim()
                      if (!trimmed) return "Name cannot be empty."
                      
                      // 1. Check for valid characters (alphanumeric and underscore only)
                      if (!/^[A-Za-z0-9_]*$/.test(trimmed)) {
                        return "Name can only contain letters, numbers, and underscores."
                      }
                      
                      // 2. Check for leading number
                      if (/^[0-9]/.test(trimmed)) {
                        return "Name cannot start with a number."
                      }

                      // 3. Check for conflict with variables
                      if (localVars[trimmed] !== undefined) {
                        return `"${trimmed}" is already used as a variable name.`
                      }

                      if (trimmed.toLowerCase() === originalName.toLowerCase()) return null
                      
                      const allNames = []
                      const collect = (nodes) => {
                        for (const n of nodes) {
                          if (n.id !== selectedNode.id) allNames.push((n.name || '').toLowerCase())
                          if (n.children) collect(n.children)
                        }
                      }
                      collect(tree)
                      return allNames.includes(trimmed.toLowerCase())
                        ? `"${trimmed}" is already used by another control or screen.`
                        : null
                    }
                    return (
                      <NameInput
                        key={selectedNode.id}
                        initialValue={originalName}
                        checkDuplicate={validateName}
                        onCommit={val => updateProp(selectedNode.id, 'name', val)}
                      />
                    )
                  })()}
                </div>
                <div className="flex-1 overflow-y-auto px-4 py-2">
                  {selectedNode.type === 'Container' && (
                    <p className="text-[10px] text-subtext/50 mb-2 bg-overlay/20 rounded-lg px-2 py-1.5">
                      {selectedNode.children?.length ?? 0} child component{(selectedNode.children?.length ?? 0) !== 1 ? 's' : ''}
                      {' Â· '}Select this container then click &quot;Add Component&quot; to add children.
                    </p>
                  )}
                  <div className="divide-y divide-overlay/20">
                    {schema.properties
                      .filter(p => {
                        // Screens should not have editable width/height in the props panel as they follow the canvas
                        if (selectedNode.type === 'Screen' && (p.key === 'Width' || p.key === 'Height')) return false;
                        return p.propertyType === 'Input' || p.propertyType === 'Event' || p.propertyType === 'Output';
                      })
                      .map(prop => (
                        <PropField 
                          key={prop.key} 
                          prop={prop} 
                          value={selectedNode[prop.key]}
                          onChange={val => updateProp(selectedNode.id, prop.key, val)}
                          localVars={runtimeLocalVars}
                          flatNodes={fullFlatNodes}
                          parentNode={findParent(tree, selectedNode.id)}
                          selfNode={selectedNode}
                        />
                      ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center flex-1 text-center px-6">
                <div className="w-12 h-12 rounded-xl bg-overlay/30 flex items-center justify-center mb-3">
                  <svg className="w-6 h-6 text-subtext/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
                  </svg>
                </div>
                <p className="text-subtext/50 text-xs">Select a component to edit its properties</p>
              </div>
            )}
          </div>
        ) : null}
      </div>
      {isTourActive && (
        <TourOverlay 
          step={TOUR_STEPS[currentTourStep]}
          onNext={() => setCurrentTourStep(s => s + 1)}
          onBack={() => setCurrentTourStep(s => s - 1)}
          onFinish={() => setIsTourActive(false)}
        />
      )}
    </div>
  )
}

export {
  screenToYaml,
  componentToYaml,
  ButtonRenderer,
  ModernButtonRenderer,
  ModernDropdownRenderer,
  ModernCheckboxRenderer,
  ModernComboBoxRenderer,
  ModernProgressBarRenderer,
  ModernSliderRenderer,
  ModernSpinnerRenderer,
  ModernTextRenderer,
  ModernTextInputRenderer,
  ModernToggleRenderer,
  LinkRenderer,
  NumberInputRenderer,
  ModernDatePickerRenderer,
  RichTextEditorRenderer,
  RatingRenderer,
  LabelRenderer,
  TextInputRenderer,
  DropdownRenderer,
  ContainerRenderer,
  GalleryRenderer,
  CheckboxRenderer,
  RectangleRenderer,
  IconRenderer,
  ToggleRenderer,
  RadioRenderer,
  SliderRenderer,
  UnknownPowerAppsObjectRenderer,
  createFromSpec
}
