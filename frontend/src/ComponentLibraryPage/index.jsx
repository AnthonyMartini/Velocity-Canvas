import { useState } from 'react'
import { TYPE_ICONS, TYPE_COLORS } from '../common/constants.jsx'
import { PROP_TYPE_COLORS, SCHEMAS } from './constants.jsx'
import { formatDefaultValue, formatPropertyType } from './helpers.jsx'
import { FUNCTIONS, NotificationType, Align, VerticalAlign, FontWeight, BorderStyle, DisplayMode, Overflow } from '../RendererPage/Functions.jsx'



export default function DocumentationPage() {
  const [activeSection, setActiveSection] = useState('components') // 'components' or 'functions'
  const [expanded, setExpanded] = useState({})

  const toggleExpanded = (type) => {
    setExpanded(prev => ({ ...prev, [type]: !prev[type] }))
  }

  return (
    <div className="flex flex-col flex-1 overflow-auto bg-base">
      <div className="max-w-5xl mx-auto w-full px-8 py-10">
        
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h2 className="text-3xl font-bold text-text mb-2 tracking-tight">Documentation</h2>
            <p className="text-sm text-subtext/80 max-w-xl">
              Reference guide for components and formula functions supported by the Velocity engine.
            </p>
          </div>

          <div className="flex bg-surface/50 border border-overlay/30 p-1 rounded-xl shrink-0 self-start">
            <button 
              onClick={() => setActiveSection('components')}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer ${activeSection === 'components' ? 'bg-accent text-base shadow-lg shadow-accent/20' : 'text-subtext hover:text-text'}`}
            >
              Components
            </button>
            <button 
              onClick={() => setActiveSection('functions')}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer ${activeSection === 'functions' ? 'bg-accent text-base shadow-lg shadow-accent/20' : 'text-subtext hover:text-text'}`}
            >
              Functions
            </button>
          </div>
        </div>

        {activeSection === 'components' ? (
          <div className="flex flex-col gap-6">
            {SCHEMAS.map(schema => {
              const isExpanded = expanded[schema.type] || false
              return (
              <div key={schema.type} className="bg-surface/50 border border-overlay/30 rounded-2xl overflow-hidden shadow-sm transition-all duration-300 hover:border-overlay/50">
                
                {/* Card Header */}
                <button 
                  onClick={() => toggleExpanded(schema.type)}
                  className="w-full text-left px-6 py-5 border-b border-overlay/20 flex items-center justify-between bg-surface/80 hover:bg-surface transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-md transition-transform group-hover:scale-110 ${TYPE_COLORS[schema.type] || 'bg-overlay'}`}>
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
        ) : (
          <div className="flex flex-col gap-6">
            {/* Enums Section */}
            <div className="bg-surface/50 border border-overlay/40 rounded-2xl p-6 shadow-md">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                  <svg className="w-5 h-5 text-purple-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-text">Global Enums</h3>
                  <p className="text-sm text-subtext/80 text-balance">Available global enumerations for formulas.</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { name: 'NotificationType', data: NotificationType, color: 'purple' },
                  { name: 'Align', data: Align, color: 'blue' },
                  { name: 'VerticalAlign', data: VerticalAlign, color: 'indigo' },
                  { name: 'FontWeight', data: FontWeight, color: 'emerald' },
                   { name: 'BorderStyle', data: BorderStyle, color: 'amber' },
                  { name: 'DisplayMode', data: DisplayMode, color: 'rose' },
                  { name: 'Overflow', data: Overflow, color: 'cyan' }
                ].map(enm => (
                  <div key={enm.name} className="bg-base/40 rounded-xl p-4 border border-overlay/10">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-mono text-sm font-bold text-accent">{enm.name}</span>
                      <span className={`text-[10px] font-bold bg-${enm.color}-500/10 text-${enm.color}-500 px-2 py-0.5 rounded border border-${enm.color}-500/20 uppercase`}>Enum</span>
                    </div>
                    <div className="space-y-2">
                      {Object.keys(enm.data).map(key => (
                        <div key={key} className="flex items-center justify-between text-xs border-b border-overlay/5 pb-1.5 last:border-0 last:pb-0">
                          <span className="font-mono text-text/70">{enm.name}.{key}</span>
                          <span className="text-[10px] font-mono text-subtext/40 italic">"{enm.data[key]}"</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {FUNCTIONS.map(func => (
              <div key={func.name} className="bg-surface/50 border border-overlay/30 rounded-2xl p-6 shadow-sm hover:border-overlay/50 transition-all">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-xl font-bold text-text">{func.name}</h3>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md border uppercase font-bold tracking-tighter ${
                        func.type === 'event' 
                          ? 'bg-amber-400/10 text-amber-500 border-amber-400/20' 
                          : 'bg-emerald-400/10 text-emerald-500 border-emerald-400/20'
                      }`}>
                        {func.type}
                      </span>
                    </div>
                    <p className="text-sm text-subtext/80">{func.description}</p>
                  </div>

                  <div className="bg-base/50 border border-overlay/20 px-4 py-2 rounded-xl font-mono text-xs">
                    <span className="text-accent">{func.name}</span>
                    <span className="text-subtext/50">(</span>
                    {func.args.map((arg, i) => (
                      <span key={arg.name}>
                        <span className="text-text/80 italic">{arg.name}</span>
                        <span className="text-subtext/40">: </span>
                        <span className="text-purple-400">{arg.type}</span>
                        {i < func.args.length - 1 && <span className="text-subtext/50">, </span>}
                      </span>
                    ))}
                    <span className="text-subtext/50">)</span>
                  </div>
                </div>

                {func.example && (
                  <div className="mt-4 pt-4 border-t border-overlay/10">
                    <h4 className="text-[10px] font-bold text-subtext/40 uppercase tracking-widest mb-2">Example</h4>
                    <div className="bg-base/30 rounded-lg p-3 border border-overlay/10 font-mono text-xs text-accent">
                      {func.example}
                    </div>
                  </div>
                )}

                {func.args.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-overlay/10">
                    <h4 className="text-[10px] font-bold text-subtext/40 uppercase tracking-widest mb-3">Arguments</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {func.args.map(arg => (
                        <div key={arg.name} className="flex items-center gap-3 bg-base/30 rounded-lg p-2 border border-overlay/10">
                          <div className="w-1.5 h-1.5 rounded-full bg-accent/40" />
                          <span className="text-xs font-medium text-text/80 whitespace-nowrap">{arg.name}</span>
                          <span className="text-[10px] font-mono text-subtext/40 bg-overlay/10 px-1.5 py-0.5 rounded uppercase">{arg.type}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}
