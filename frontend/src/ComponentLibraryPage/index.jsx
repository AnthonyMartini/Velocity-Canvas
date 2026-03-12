import { useState } from 'react'
import { TYPE_ICONS, TYPE_COLORS } from '../common/constants.jsx'
import { PROP_TYPE_COLORS, SCHEMAS } from './constants.jsx'
import { formatDefaultValue, formatPropertyType } from './helpers.jsx'



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
                    {(() => { const Icon = TYPE_ICONS[schema.type]; return Icon ? <Icon className="w-6 h-6" /> : null })()}
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
                          {formatPropertyType(p, PROP_TYPE_COLORS)}
                        </td>
                        <td className="px-6 py-3">
                          <span className="font-mono text-xs text-subtext/70">
                            {formatDefaultValue(schema.defaults[p.key])}
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
