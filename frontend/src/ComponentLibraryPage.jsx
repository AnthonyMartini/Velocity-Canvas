import { useState } from 'react'
import buttonSchema from '@schemas/button.json'
import labelSchema from '@schemas/label.json'
import containerSchema from '@schemas/container.json'
import textInputSchema from '@schemas/textInput.json'
import dropdownSchema from '@schemas/dropdown.json'
import gallerySchema from '@schemas/gallery.json'

const SCHEMAS = [buttonSchema, labelSchema, textInputSchema, dropdownSchema, containerSchema, gallerySchema]

// ── Icons ──────────────────────────────────────────────────────────────────────
const TYPE_ICONS = {
  Button: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 0 0-5.25 5.25v3a3 3 0 0 0-3 3v6.75a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3V12.75a3 3 0 0 0-3-3v-3c0-2.9-2.35-5.25-5.25-5.25Zm3.75 8.25v-3a3.75 3.75 0 1 0-7.5 0v3h7.5Z" clipRule="evenodd" /></svg>,
  Label: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path fillRule="evenodd" d="M14.447 3.026a.75.75 0 0 1 .527.921l-4.5 16.5a.75.75 0 0 1-1.448-.394l4.5-16.5a.75.75 0 0 1 .921-.527Z" clipRule="evenodd" /></svg>,
  Container: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M2 3a1 1 0 0 1 1-1h18a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3Zm0 9a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-8Zm11-1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-6Z" /></svg>,
  TextInput: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path fillRule="evenodd" d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0 0 16.5 9h-1.875a1.875 1.875 0 0 1-1.875-1.875V5.25A3.75 3.75 0 0 0 9 1.5H5.625ZM7.5 15a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5A.75.75 0 0 1 7.5 15Zm.75 2.25a.75.75 0 0 0 0 1.5H12a.75.75 0 0 0 0-1.5H8.25Z" clipRule="evenodd" /></svg>,
  Dropdown: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path fillRule="evenodd" d="M12.53 16.28a.75.75 0 0 1-1.06 0l-7.5-7.5a.75.75 0 0 1 1.06-1.06L12 14.69l6.97-6.97a.75.75 0 1 1 1.06 1.06l-7.5 7.5Z" clipRule="evenodd" /></svg>,
  Gallery: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="3" y1="15" x2="21" y2="15"></line></svg>
}

const TYPE_COLORS = { 
  Button: 'bg-[#0078d4]', 
  Label: 'bg-overlay', 
  Container: 'bg-violet-500', 
  TextInput: 'bg-emerald-500',
  Dropdown: 'bg-amber-500',
  Gallery: 'bg-pink-500'
}

const PROP_TYPE_COLORS = {
  text: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  number: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
  color: 'text-pink-400 bg-pink-400/10 border-pink-400/20',
  boolean: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
  select: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
}

export default function ComponentLibraryPage() {
  const [expanded, setExpanded] = useState({})

  const toggleExpanded = (type) => {
    setExpanded(prev => ({ ...prev, [type]: !prev[type] }))
  }

  return (
    <div className="flex flex-col flex-1 overflow-auto bg-base">
      <div className="max-w-5xl mx-auto w-full px-8 py-10">
        
        <div className="mb-10">
          <h2 className="text-2xl font-bold text-text mb-2 tracking-tight">Component Library</h2>
          <p className="text-sm text-subtext/80">Reference schemas and metadata for all available PowerApps components supported by the engine.</p>
        </div>

        <div className="flex flex-col gap-6">
          {SCHEMAS.map(schema => {
            const isExpanded = expanded[schema.type] || false
            return (
            <div key={schema.type} className="bg-surface/50 border border-overlay/30 rounded-2xl overflow-hidden shadow-sm">
              
              {/* Card Header */}
              <button 
                onClick={() => toggleExpanded(schema.type)}
                className="w-full text-left px-6 py-5 border-b border-overlay/20 flex items-center justify-between bg-surface/80 hover:bg-surface transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-md ${TYPE_COLORS[schema.type] || 'bg-overlay'}`}>
                    {TYPE_ICONS[schema.type]}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-text">{schema.type}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-mono bg-accent/15 text-accent border border-accent/25 px-2 py-0.5 rounded-md">
                        {schema.control}
                      </span>
                      <span className="text-xs text-subtext/60">{schema.properties.length} Props</span>
                    </div>
                  </div>
                </div>
                <svg 
                  className={`w-5 h-5 text-subtext/40 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} 
                  viewBox="0 0 20 20" fill="currentColor"
                >
                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                </svg>
              </button>

              {/* Card Body - Properties Table */}
              <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="p-0 overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-overlay/20 bg-base/40">
                      <th className="px-6 py-3 text-[10px] font-semibold text-subtext/60 uppercase tracking-widest">Property Key</th>
                      <th className="px-6 py-3 text-[10px] font-semibold text-subtext/60 uppercase tracking-widest">Label</th>
                      <th className="px-6 py-3 text-[10px] font-semibold text-subtext/60 uppercase tracking-widest">Type</th>
                      <th className="px-6 py-3 text-[10px] font-semibold text-subtext/60 uppercase tracking-widest">Default Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-overlay/10">
                    {schema.properties.map(p => (
                      <tr key={p.key} className="hover:bg-overlay/5 transition-colors">
                        <td className="px-6 py-3">
                          <span className="font-mono text-xs text-text/90 font-medium">{p.key}</span>
                        </td>
                        <td className="px-6 py-3 text-sm text-subtext">{p.label}</td>
                        <td className="px-6 py-3">
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded border ${PROP_TYPE_COLORS[p.type] || 'text-subtext bg-overlay/10 border-overlay/20'}`}>
                            {p.type} {p.type === 'select' && p.options && <span className="opacity-60 ml-1">({p.options.length})</span>}
                          </span>
                        </td>
                        <td className="px-6 py-3">
                          <span className="font-mono text-xs text-subtext/70">
                            {schema.defaults[p.key] !== undefined 
                              ? typeof schema.defaults[p.key] === 'boolean' 
                                ? schema.defaults[p.key].toString() 
                                : String(schema.defaults[p.key])
                              : <span className="italic opacity-50">none</span>}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>

            </div>
            )
          })}
        </div>

      </div>
    </div>
  )
}
