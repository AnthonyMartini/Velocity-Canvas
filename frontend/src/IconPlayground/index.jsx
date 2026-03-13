import React, { useState } from 'react'
import iconSchema from '../../../schemas/icon.json'
import { TYPE_ICONS } from '../common/constants.jsx'

// Extract library icons from schema
const LIBRARY_ICONS = iconSchema.properties.find(p => p.key === 'Icon').options.map(icon => ({
  ...icon,
  type: 'library',
  id: icon.value
}))

// Extract component icons from constants
const COMPONENT_ICONS = Object.entries(TYPE_ICONS).map(([name, IconComp]) => ({
  label: name,
  value: name,
  id: `Comp.${name}`,
  type: 'component',
  IconComponent: IconComp
}))

const ALL_ICONS = [...COMPONENT_ICONS, ...LIBRARY_ICONS]

export default function IconPlayground() {
  const [search, setSearch] = useState('')

  const filteredIcons = ALL_ICONS.filter(icon => 
    icon.label.toLowerCase().includes(search.toLowerCase()) ||
    icon.value.toLowerCase().includes(search.toLowerCase())
  )

  const componentIcons = filteredIcons.filter(i => i.type === 'component')
  const libraryIcons = filteredIcons.filter(i => i.type === 'library')

  return (
    <div className="flex-1 flex flex-col bg-base overflow-hidden">
      {/* Header */}
      <div className="p-8 border-b border-surface/40 bg-surface/20 shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-3xl font-extrabold text-white tracking-tight mb-1">Icon Playground</h2>
            <p className="text-subtext text-sm">Explore {COMPONENT_ICONS.length} component icons and {LIBRARY_ICONS.length} library icons.</p>
          </div>
          
          <div className="relative w-full md:w-96 group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-subtext/60 group-focus-within:text-accent transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search icons..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-surface/50 border border-overlay/40 rounded-2xl py-3 pl-10 pr-4 text-white placeholder-subtext/40 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 transition-all text-sm backdrop-blur-sm"
            />
          </div>
        </div>
      </div>

      {/* Grid Content */}
      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        <div className="max-w-7xl mx-auto space-y-12">
          
          {/* Component Icons Section */}
          {componentIcons.length > 0 && (
            <section>
              <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
                <span className="w-8 h-1 bg-accent rounded-full" />
                Component Types
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                {componentIcons.map((icon) => (
                  <IconCard key={icon.id} icon={icon} />
                ))}
              </div>
            </section>
          )}

          {/* Library Icons Section */}
          {libraryIcons.length > 0 && (
            <section>
              <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
                <span className="w-8 h-1 bg-pink-500 rounded-full" />
                SVG Library
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                {libraryIcons.map((icon) => (
                  <IconCard key={icon.id} icon={icon} />
                ))}
              </div>
            </section>
          )}

          {filteredIcons.length === 0 && (
            <div className="py-20 text-center">
              <div className="text-subtext/20 text-6xl mb-4 font-black">404</div>
              <div className="text-subtext/60 font-medium">No matches found for "{search}"</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function IconCard({ icon }) {
  const isComponent = icon.type === 'component'
  
  return (
    <div 
      className="group relative bg-surface/30 backdrop-blur-md border border-overlay/20 rounded-2xl p-4 flex flex-col items-center justify-center gap-4 hover:bg-surface/50 hover:border-accent/40 hover:-translate-y-1 transition-all duration-300 cursor-pointer shadow-lg shadow-black/5"
      onClick={() => {
        navigator.clipboard.writeText(icon.value)
      }}
    >
      {/* Icon Container */}
      <div className="w-16 h-16 flex items-center justify-center text-white group-hover:scale-110 transition-transform duration-300">
        {isComponent ? (
          <icon.IconComponent className="w-12 h-12" />
        ) : (
          <div 
            className="w-12 h-12 flex items-center justify-center"
            dangerouslySetInnerHTML={{ __html: icon.svg.replace('viewBox=', 'width="48" height="48" viewBox=').replace('stroke-width=\'2\'', 'stroke-width=\'2.5\'').replace('stroke-width="2"', 'stroke-width="2.5"') }}
          />
        )}
      </div>
      
      {/* Meta */}
      <div className="text-center w-full">
        <div className="text-white text-xs font-bold mb-1 truncate px-1">{icon.label}</div>
        <div className="text-subtext/50 text-[10px] font-mono bg-base/50 py-0.5 rounded truncate px-1">
          {isComponent ? icon.value : icon.value.replace('Icon.', '')}
        </div>
      </div>

      {/* Type Badge */}
      <div className={`absolute top-2 left-2 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${isComponent ? 'bg-accent/20 text-accent' : 'bg-pink-500/20 text-pink-500'}`}>
        {icon.type}
      </div>

      {/* Copy hint */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-accent" viewBox="0 0 20 20" fill="currentColor">
           <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
           <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
        </svg>
      </div>
    </div>
  )
}
