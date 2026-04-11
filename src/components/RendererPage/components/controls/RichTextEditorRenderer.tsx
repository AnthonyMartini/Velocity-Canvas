import { useEffect, useRef } from 'react'
import PropTypes from 'prop-types'
import { getSelectionStyles } from '@/theme/theme'
import { normalizeLiteralString } from './modernControlUtils'
import { sanitizeHtmlFragment } from '@/lib/content-sanitizer'

const TOOLBAR_ACTIONS = [
  { label: 'B', command: 'bold' },
  { label: 'I', command: 'italic' },
  { label: 'U', command: 'underline' },
  { label: '•', command: 'insertUnorderedList' },
]

export default function RichTextEditorRenderer({
  comp,
  selected,
  isPlaying,
  updateProp,
  onMouseDown,
  onClick,
  renderZIndex = 1,
}) {
  const editorRef = useRef<HTMLDivElement | null>(null)
  const isDisabledMode = comp.DisplayMode === 'DisplayMode.Disabled'
  const isViewMode = comp.DisplayMode === 'DisplayMode.View'
  const isEditable = isPlaying && !isDisabledMode && !isViewMode
  const html = sanitizeHtmlFragment(normalizeLiteralString(comp.HTMLText || comp.Default, '<p>Type here</p>'))

  useEffect(() => {
    if (!editorRef.current) return
    if (editorRef.current.innerHTML !== html) {
      editorRef.current.innerHTML = html
    }
  }, [html, comp.id])

  return (
    <div
      onMouseDown={onMouseDown}
      onClick={onClick}
      style={{
        position: 'absolute',
        left: `${comp.X}pt`,
        top: `${comp.Y}pt`,
        width: `${comp.Width}pt`,
        height: `${comp.Height}pt`,
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid rgba(0,0,0,0.12)',
        borderRadius: '10pt',
        backgroundColor: isDisabledMode ? '#f3f4f6' : '#ffffff',
        opacity: comp.Visible === false ? 0.3 : 1,
        overflow: 'hidden',
        cursor: isPlaying ? 'default' : 'move',
        ...getSelectionStyles(selected, 'default'),
        zIndex: renderZIndex,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6pt',
          padding: '8pt',
          borderBottom: '1px solid rgba(0,0,0,0.08)',
          backgroundColor: '#f8fafc',
        }}
      >
        {TOOLBAR_ACTIONS.map((action) => (
          <button
            key={action.command}
            type="button"
            disabled={!isEditable}
            onMouseDown={(event) => {
              event.preventDefault()
              event.stopPropagation()
            }}
            onClick={(event) => {
              event.stopPropagation()
              if (!isEditable) return
              document.execCommand(action.command)
              updateProp?.(comp.id, 'HTMLText', editorRef.current?.innerHTML || html)
              editorRef.current?.focus()
            }}
            style={{
              minWidth: '28pt',
              height: '28pt',
              borderRadius: '8pt',
              border: '1px solid rgba(0,0,0,0.08)',
              backgroundColor: '#ffffff',
              color: '#111827',
              cursor: isEditable ? 'pointer' : 'default',
            }}
          >
            {action.label}
          </button>
        ))}
      </div>
      <div
        ref={editorRef}
        contentEditable={isEditable}
        suppressContentEditableWarning
        spellCheck={comp.EnableSpellCheck !== false}
        aria-label={normalizeLiteralString(comp.AccessibleLabel) || 'Rich text editor'}
        onMouseDown={(event) => {
          if (isPlaying) event.stopPropagation()
        }}
        onClick={(event) => {
          if (isPlaying) event.stopPropagation()
        }}
        onInput={() => {
          updateProp?.(comp.id, 'HTMLText', editorRef.current?.innerHTML || '')
        }}
        style={{
          flex: 1,
          padding: '12pt',
          outline: 'none',
          overflowY: 'auto',
          color: '#111827',
          fontSize: '14pt',
          lineHeight: 1.5,
          backgroundColor: 'transparent',
        }}
      />
    </div>
  )
}

RichTextEditorRenderer.propTypes = {
  comp: PropTypes.shape({
    id: PropTypes.string.isRequired,
    X: PropTypes.number.isRequired,
    Y: PropTypes.number.isRequired,
    Width: PropTypes.number.isRequired,
    Height: PropTypes.number.isRequired,
    AccessibleLabel: PropTypes.string,
    Default: PropTypes.string,
    DisplayMode: PropTypes.string,
    EnableSpellCheck: PropTypes.bool,
    HTMLText: PropTypes.string,
    Visible: PropTypes.bool,
  }).isRequired,
  selected: PropTypes.bool,
  isPlaying: PropTypes.bool,
  updateProp: PropTypes.func,
  renderZIndex: PropTypes.number,
  onMouseDown: PropTypes.func.isRequired,
  onClick: PropTypes.func.isRequired,
}
