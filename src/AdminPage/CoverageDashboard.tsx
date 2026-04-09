"use client";

import { useState } from 'react'
import {
  CONTROL_COVERAGE,
  CONTROL_COVERAGE_SUMMARY,
  FUNCTION_COVERAGE,
  FUNCTION_COVERAGE_SUMMARY,
  EXTRA_IMPLEMENTED_FUNCTIONS,
  COVERAGE_METADATA,
} from './coverageData'

const STATUS_STYLES = {
  supported: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  partial: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  unsupported: 'bg-rose-500/10 text-rose-300 border-rose-500/20',
}

const AVAILABILITY_STYLES = {
  current: 'bg-white/5 text-subtext border-white/10',
  preview: 'bg-sky-500/10 text-sky-300 border-sky-500/20',
  experimental: 'bg-fuchsia-500/10 text-fuchsia-300 border-fuchsia-500/20',
}

const formatPercent = (value: number) => `${Math.round(value)}%`

const CoverageCard = ({
  label,
  value,
  tone = 'default',
  helper,
}: {
  label: string
  value: string
  tone?: 'default' | 'accent' | 'success'
  helper?: string
}) => {
  const toneClass =
    tone === 'accent'
      ? 'text-accent'
      : tone === 'success'
        ? 'text-emerald-400'
        : 'text-text'

  return (
    <div className="bg-surface/40 border border-overlay/30 rounded-3xl p-6">
      <div className="text-subtext text-[10px] uppercase font-black tracking-widest mb-2">{label}</div>
      <div className={`text-4xl font-black ${toneClass}`}>{value}</div>
      {helper && <div className="text-subtext/60 text-xs mt-2">{helper}</div>}
    </div>
  )
}

const PropertyPill = ({
  name,
  supported,
}: {
  name: string
  supported: boolean
}) => (
  <span
    className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] border ${
      supported
        ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
        : 'bg-rose-500/10 text-rose-200 border-rose-500/20'
    }`}
  >
    {name}
  </span>
)

export default function CoverageDashboard() {
  const [activeSection, setActiveSection] = useState<'controls' | 'functions'>('controls')
  const [statusFilter, setStatusFilter] = useState<'all' | 'supported' | 'partial' | 'unsupported'>('all')
  const [variantFilter, setVariantFilter] = useState<'all' | 'classic' | 'modern'>('all')
  const [query, setQuery] = useState('')
  const [expandedKey, setExpandedKey] = useState<string | null>(null)

  const normalizedQuery = query.trim().toLowerCase()

  const filteredControls = CONTROL_COVERAGE.filter((control) => {
    if (statusFilter !== 'all' && control.status !== statusFilter) return false
    if (variantFilter !== 'all' && control.variant !== variantFilter) return false
    if (!normalizedQuery) return true

    return (
      control.name.toLowerCase().includes(normalizedQuery) ||
      control.variant.toLowerCase().includes(normalizedQuery) ||
      control.missingProperties.some((property: any) => property.name.toLowerCase().includes(normalizedQuery))
    )
  })

  const filteredFunctions = FUNCTION_COVERAGE.filter((func) => {
    if (statusFilter !== 'all' && func.status !== statusFilter) return false
    if (!normalizedQuery) return true

    return (
      func.name.toLowerCase().includes(normalizedQuery) ||
      func.category.toLowerCase().includes(normalizedQuery) ||
      func.description.toLowerCase().includes(normalizedQuery)
    )
  })

  const propertyCoverage =
    CONTROL_COVERAGE_SUMMARY.totalProperties === 0
      ? 0
      : (CONTROL_COVERAGE_SUMMARY.supportedProperties / CONTROL_COVERAGE_SUMMARY.totalProperties) * 100

  const functionCoverage =
    FUNCTION_COVERAGE_SUMMARY.total === 0
      ? 0
      : (FUNCTION_COVERAGE_SUMMARY.supported / FUNCTION_COVERAGE_SUMMARY.total) * 100

  return (
    <div className="max-w-6xl mx-auto animate-fade-in px-4">
      <div className="mb-8 flex flex-col xl:flex-row xl:items-end justify-between gap-6">
        <div>
          <h3 className="text-3xl font-black text-text tracking-tight">
            Coverage <span className="text-accent">Dashboard</span>
          </h3>
          <p className="text-subtext text-sm max-w-3xl mt-2">
            Compare the official Power Apps canvas reference against the controls, properties, and formula functions currently implemented in Velocity Canvas.
          </p>
        </div>

        <div className="flex bg-surface/50 border border-overlay/40 rounded-xl p-1 self-start">
          {[
            { id: 'controls', label: 'Controls' },
            { id: 'functions', label: 'Functions' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveSection(tab.id as 'controls' | 'functions')
                setStatusFilter('all')
                setVariantFilter('all')
                setExpandedKey(null)
              }}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer uppercase tracking-wider ${
                activeSection === tab.id
                  ? 'bg-accent text-base shadow-md shadow-accent/30'
                  : 'text-subtext hover:text-text hover:bg-overlay/35'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        {activeSection === 'controls' ? (
          <>
            <CoverageCard label="Supported Controls" value={String(CONTROL_COVERAGE_SUMMARY.supported)} tone="success" helper={`${CONTROL_COVERAGE_SUMMARY.partial} partial, ${CONTROL_COVERAGE_SUMMARY.unsupported} unsupported`} />
            <CoverageCard label="Property Coverage" value={formatPercent(propertyCoverage)} tone="accent" helper={`${CONTROL_COVERAGE_SUMMARY.supportedProperties} of ${CONTROL_COVERAGE_SUMMARY.totalProperties} official properties`} />
            <CoverageCard label="Classic vs Modern" value={`${CONTROL_COVERAGE_SUMMARY.classic} / ${CONTROL_COVERAGE_SUMMARY.modern}`} helper="Official classic and modern controls tracked" />
            <CoverageCard label="Preview Surfaces" value={String(CONTROL_COVERAGE_SUMMARY.previewOrExperimental)} helper="Preview or experimental controls included in the official reference" />
          </>
        ) : (
          <>
            <CoverageCard label="Supported Functions" value={String(FUNCTION_COVERAGE_SUMMARY.supported)} tone="success" helper={`${FUNCTION_COVERAGE_SUMMARY.unsupported} unsupported from the official canvas list`} />
            <CoverageCard label="Function Coverage" value={formatPercent(functionCoverage)} tone="accent" helper={`${FUNCTION_COVERAGE_SUMMARY.supported} of ${FUNCTION_COVERAGE_SUMMARY.total} official Power Fx functions`} />
            <CoverageCard label="App-Only Functions" value={String(FUNCTION_COVERAGE_SUMMARY.extraImplemented)} helper="Implemented locally but not present in the official canvas function list" />
            <CoverageCard label="Reference Snapshot" value={new Date(COVERAGE_METADATA.functionsGeneratedAt).toLocaleDateString()} helper="Last generated from official docs" />
          </>
        )}
      </div>

      <div className="bg-surface/40 border border-overlay/30 rounded-3xl p-5 mb-8">
        <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
          <div className="flex-1">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={activeSection === 'controls' ? 'Search controls or missing properties...' : 'Search functions, categories, or descriptions...'}
              className="w-full bg-base/60 border border-overlay/30 rounded-2xl px-4 py-3 text-sm text-text placeholder:text-subtext/50 outline-none focus:border-accent/50"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              { id: 'all', label: 'All' },
              { id: 'supported', label: 'Supported' },
              { id: 'partial', label: 'Partial' },
              { id: 'unsupported', label: 'Unsupported' },
            ].map((filter) => (
              <button
                key={filter.id}
                onClick={() => setStatusFilter(filter.id as 'all' | 'supported' | 'partial' | 'unsupported')}
                className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
                  statusFilter === filter.id
                    ? 'bg-accent/15 text-accent border-accent/30'
                    : 'bg-base/30 text-subtext border-overlay/20 hover:text-text hover:border-overlay/40'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {activeSection === 'controls' && (
          <div className="flex flex-wrap gap-2 mt-4">
            {[
              { id: 'all', label: 'All Variants' },
              { id: 'classic', label: 'Classic' },
              { id: 'modern', label: 'Modern' },
            ].map((filter) => (
              <button
                key={filter.id}
                onClick={() => setVariantFilter(filter.id as 'all' | 'classic' | 'modern')}
                className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
                  variantFilter === filter.id
                    ? 'bg-accent/15 text-accent border-accent/30'
                    : 'bg-base/30 text-subtext border-overlay/20 hover:text-text hover:border-overlay/40'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {activeSection === 'controls' ? (
        <div className="space-y-4">
          {filteredControls.map((control) => {
            const cardKey = `${control.variant}-${control.name}`
            const isExpanded = expandedKey === cardKey

            return (
              <div key={cardKey} className="bg-surface/40 border border-overlay/30 rounded-3xl overflow-hidden">
                <button
                  onClick={() => setExpandedKey(isExpanded ? null : cardKey)}
                  className="w-full px-6 py-5 text-left hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full border ${STATUS_STYLES[control.status]}`}>
                          {control.statusLabel}
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full border bg-base/40 text-subtext border-white/10">
                          {control.variant}
                        </span>
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full border ${AVAILABILITY_STYLES[control.availability]}`}>
                          {control.availabilityLabel}
                        </span>
                      </div>
                      <div className="text-xl font-black text-text">{control.name}</div>
                      <div className="text-sm text-subtext mt-1 max-w-3xl">{control.summary}</div>
                    </div>

                    <div className="w-full lg:w-72 shrink-0">
                      <div className="flex items-center justify-between text-xs text-subtext mb-2">
                        <span>Property coverage</span>
                        <span>{control.supportedPropertyCount} / {control.totalPropertyCount}</span>
                      </div>
                      <div className="h-2 rounded-full bg-base/80 overflow-hidden">
                        <div
                          className={`h-full ${
                            control.status === 'supported'
                              ? 'bg-emerald-400'
                              : control.status === 'partial'
                                ? 'bg-amber-300'
                                : 'bg-rose-300'
                          }`}
                          style={{ width: `${control.propertyCoveragePercent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-6 pb-6 border-t border-white/5">
                    {control.note && (
                      <div className="mt-5 mb-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-100/90">
                        {control.note}
                      </div>
                    )}

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-5">
                      <div className="bg-base/30 rounded-2xl border border-overlay/20 p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-bold text-emerald-300">Supported Properties</h4>
                          <span className="text-xs text-subtext">{control.supportedPropertyCount}</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {control.supportedProperties.length > 0 ? (
                            control.supportedProperties.map((property: any) => (
                              <PropertyPill key={property.name} name={property.name} supported />
                            ))
                          ) : (
                            <span className="text-sm text-subtext/70">No official properties matched the current implementation.</span>
                          )}
                        </div>
                      </div>

                      <div className="bg-base/30 rounded-2xl border border-overlay/20 p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-bold text-rose-300">Missing Properties</h4>
                          <span className="text-xs text-subtext">{control.missingProperties.length}</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {control.missingProperties.length > 0 ? (
                            control.missingProperties.map((property: any) => (
                              <PropertyPill key={property.name} name={property.name} supported={false} />
                            ))
                          ) : (
                            <span className="text-sm text-subtext/70">All documented properties are covered for this control.</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3 text-xs text-subtext">
                      <a
                        href={control.source.learnUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-accent hover:opacity-80 transition-opacity"
                      >
                        Open official control reference
                      </a>
                      <span>Doc updated: {control.source.docLastUpdated || 'Unknown'}</span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {filteredControls.length === 0 && (
            <div className="bg-surface/30 border border-overlay/20 rounded-3xl py-16 text-center text-subtext">
              No controls matched the current filters.
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-surface/40 border border-overlay/30 rounded-3xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/5 bg-surface/60 flex items-center justify-between">
              <h4 className="text-lg font-bold text-text">Official Canvas Functions</h4>
              <span className="text-xs text-subtext">{filteredFunctions.length} shown</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px]">
                <thead className="bg-base/40">
                  <tr>
                    <th className="px-6 py-3 text-left text-[10px] uppercase font-black tracking-widest text-subtext/50">Status</th>
                    <th className="px-6 py-3 text-left text-[10px] uppercase font-black tracking-widest text-subtext/50">Function</th>
                    <th className="px-6 py-3 text-left text-[10px] uppercase font-black tracking-widest text-subtext/50">Category</th>
                    <th className="px-6 py-3 text-left text-[10px] uppercase font-black tracking-widest text-subtext/50">Implementation</th>
                    <th className="px-6 py-3 text-left text-[10px] uppercase font-black tracking-widest text-subtext/50">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFunctions.map((func) => (
                    <tr key={func.name} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${STATUS_STYLES[func.status]}`}>
                          {func.statusLabel}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-text font-bold">{func.name}</td>
                      <td className="px-6 py-4 text-subtext text-sm">{func.category}</td>
                      <td className="px-6 py-4 text-sm">
                        {func.implementation ? (
                          <div className="flex flex-col">
                            <span className="text-emerald-300 font-medium">{func.implementation.type}</span>
                            {func.implementation.example && (
                              <span className="text-subtext/60 font-mono text-xs mt-1">{func.implementation.example}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-subtext/50">Not implemented</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-subtext text-sm">
                        <a
                          href={func.docUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-text transition-colors"
                        >
                          {func.description}
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {EXTRA_IMPLEMENTED_FUNCTIONS.length > 0 && (
            <div className="bg-surface/40 border border-overlay/30 rounded-3xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-bold text-text">App-Only Implementations</h4>
                <span className="text-xs text-subtext">{EXTRA_IMPLEMENTED_FUNCTIONS.length} extra</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {EXTRA_IMPLEMENTED_FUNCTIONS.map((func) => (
                  <div key={func.name} className="bg-base/30 border border-overlay/20 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="text-text font-bold">{func.name}</div>
                      <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full border bg-indigo-500/10 text-indigo-300 border-indigo-500/20">
                        {func.type}
                      </span>
                    </div>
                    <div className="text-sm text-subtext">{func.description}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
