import { useState } from 'react'
import GeneratorPage from './GeneratorPage'
import RendererPage from './RendererPage'
import ComponentLibraryPage from './ComponentLibraryPage'

// ── Tab Icons ──────────────────────────────────────────────────────────────────
const GeneratorIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path fillRule="evenodd" d="M14.447 3.026a.75.75 0 0 1 .527.921l-4.5 16.5a.75.75 0 0 1-1.448-.394l4.5-16.5a.75.75 0 0 1 .921-.527ZM16.72 6.22a.75.75 0 0 1 1.06 0l5.25 5.25a.75.75 0 0 1 0 1.06l-5.25 5.25a.75.75 0 1 1-1.06-1.06L21.44 12l-4.72-4.72a.75.75 0 0 1 0-1.06Zm-9.44 0a.75.75 0 0 1 0 1.06L2.56 12l4.72 4.72a.75.75 0 0 1-1.06 1.06L.97 12.53a.75.75 0 0 1 0-1.06L6.22 6.22a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
  </svg>
)

const RendererIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path d="M21 6.375c0 2.692-4.03 4.875-9 4.875S3 9.067 3 6.375 7.03 1.5 12 1.5s9 2.183 9 4.875Z" />
    <path d="M12 12.75c2.685 0 5.19-.586 7.078-1.609a8.283 8.283 0 0 0 1.897-1.384c.016.121.025.244.025.368C21 12.817 16.97 15 12 15s-9-2.183-9-4.875c0-.124.009-.247.025-.368a8.285 8.285 0 0 0 1.897 1.384C6.809 12.164 9.315 12.75 12 12.75Z" />
    <path d="M12 16.5c2.685 0 5.19-.586 7.078-1.609a8.282 8.282 0 0 0 1.897-1.384c.016.121.025.244.025.368 0 2.692-4.03 4.875-9 4.875s-9-2.183-9-4.875c0-.124.009-.247.025-.368a8.284 8.284 0 0 0 1.897 1.384C6.809 15.914 9.315 16.5 12 16.5Z" />
    <path d="M12 20.25c2.685 0 5.19-.586 7.078-1.609a8.282 8.282 0 0 0 1.897-1.384c.016.121.025.244.025.368 0 2.692-4.03 4.875-9 4.875s-9-2.183-9-4.875c0-.124.009-.247.025-.368a8.284 8.284 0 0 0 1.897 1.384C6.809 19.664 9.315 20.25 12 20.25Z" />
  </svg>
)

const LibraryIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path d="M11.25 4.533A9.707 9.707 0 0 0 6 3a9.735 9.735 0 0 0-3.25.555.75.75 0 0 0-.5.707v14.25a.75.75 0 0 0 1 .707A8.237 8.237 0 0 1 6 18.75c1.995 0 3.823.707 5.25 1.886V4.533ZM12.75 20.636A8.214 8.214 0 0 1 18 18.75c1.68 0 3.282.515 4.75 1.407A.75.75 0 0 0 24 19.462V5.212a.75.75 0 0 0-.5-.707A9.735 9.735 0 0 0 18 3a9.707 9.707 0 0 0-5.25 1.533v16.103Z" />
  </svg>
)

const TABS = [
  { id: 'generator', label: 'Generator', Icon: GeneratorIcon },
  { id: 'renderer', label: 'Test Renderer', Icon: RendererIcon },
  { id: 'library', label: 'Component Library', Icon: LibraryIcon },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('generator')

  return (
    <div className="h-screen bg-base flex flex-col overflow-hidden">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="border-b border-surface/60 backdrop-blur-sm sticky top-0 z-10 bg-base/90 shrink-0">
        <div className="max-w-none px-6 py-3 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center shadow-lg shadow-accent/30">
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="white" strokeWidth="2.2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1M4.22 4.22l.707.707M18.364 18.364l.707.707M3 12h1m16 0h1M4.927 19.073l.707-.707M18.364 5.636l.707-.707" />
                <circle cx="12" cy="12" r="4" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <h1 className="text-white font-bold text-lg leading-tight tracking-tight">Velocity Canvas</h1>
              <p className="text-subtext text-xs leading-tight">Power Apps UI Generator</p>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-1 bg-surface/50 border border-overlay/40 rounded-xl p-1">
            {TABS.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer ${
                  activeTab === id
                    ? 'bg-accent text-base shadow-md shadow-accent/30'
                    : 'text-subtext hover:text-text hover:bg-overlay/40'
                }`}
              >
                <Icon />
                {label}
              </button>
            ))}
          </div>

          {/* Status Indicator */}
          <div className="flex items-center gap-2 bg-surface/50 border border-overlay/40 rounded-full px-3 py-1.5">
            <div className="w-2 h-2 rounded-full bg-green animate-pulse-slow" />
            <span className="text-subtext text-xs font-medium">Gemini 2.5 Pro</span>
          </div>
        </div>
      </header>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden flex flex-col">
      {activeTab === 'generator' && <GeneratorPage />}
      {activeTab === 'renderer' && <RendererPage />}
      {activeTab === 'library' && <ComponentLibraryPage />}

      {/* ── Footer (Generator only) ──────────────────────────────────────────── */}
      {activeTab === 'generator' && (
        <footer className="border-t border-surface/60 py-5 px-6 shrink-0">
          <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-subtext/40">
            <span>Velocity Canvas — Power Apps YAML Generator</span>
            <span>Powered by Gemini 2.5 Pro · pa.yaml v3.0</span>
          </div>
        </footer>
      )}
      </div>
    </div>
  )
}
