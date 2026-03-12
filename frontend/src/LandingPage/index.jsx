import React from 'react';
import logo from '../assets/logo.png';

export default function LandingPage({ onStart }) {
  return (
    <div className="min-h-screen bg-base relative overflow-x-hidden font-sans selection:bg-accent/30 selection:text-white">
      
      {/* Background Effects */}
      <div className="fixed top-1/4 left-1/4 w-96 h-96 bg-accent/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-1/4 right-1/4 w-[30rem] h-[30rem] bg-accent-dark/10 rounded-full blur-[150px] pointer-events-none" />

      {/* ── Hero Section ──────────────────────────────────────────────────────── */}
      <div className="relative z-10 text-center px-6 pt-32 pb-20 max-w-5xl mx-auto flex flex-col items-center animate-slide-up">
        
        {/* Logo Float */}
        <img
          src={logo}
          alt="Velocity Canvas Logo"
          className="w-20 h-20 mb-8 rounded-3xl object-cover shadow-2xl shadow-accent/40 animate-pulse-slow"
        />

        {/* Hero Typography */}
        <h1 className="text-5xl md:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-text to-subtext mb-6 tracking-tight leading-tight">
          Velocity Canvas
        </h1>
        
        <p className="text-xl md:text-2xl text-subtext/80 mb-12 max-w-2xl font-light leading-relaxed">
          The next-generation <span className="text-accent font-medium">Power Apps UI Generator</span>. 
          Design, preview, and export breathtaking components at the speed of thought, powered by Gemini AI.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-6 items-center">
          <button 
            onClick={onStart}
            className="group relative px-8 py-4 bg-accent text-base font-bold rounded-2xl text-lg shadow-xl shadow-accent/20 hover:shadow-accent/40 hover:-translate-y-1 transition-all duration-300 overflow-hidden"
          >
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
            <span className="relative flex items-center gap-2 text-[#1e1e2e]">
              Start for Free
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 group-hover:translate-x-1 transition-transform" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
              </svg>
            </span>
          </button>

          <button 
            onClick={onStart}
            className="px-8 py-4 bg-surface/50 border border-overlay/30 text-text font-semibold rounded-2xl text-lg hover:bg-surface hover:border-overlay/60 backdrop-blur-sm transition-all duration-300 shadow-lg shadow-black/10 hover:-translate-y-1"
          >
            Sign Up
          </button>
        </div>

        {/* Features Preview */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in" style={{ animationDelay: '0.2s', animationFillMode: 'backwards' }}>
           {[
             { title: 'AI Powered', desc: 'Generate complete YAML structures instantly with Gemini 3.1 Flash.' },
             { title: 'Live Preview', desc: 'Instantly visualize your Power Apps components before exporting.' },
             { title: 'Component Library', desc: 'Manage and reuse your custom UI elements efficiently.' }
           ].map((item, i) => (
             <div key={i} className="bg-surface/30 backdrop-blur-md border border-overlay/20 p-6 rounded-2xl text-left hover:bg-surface/50 transition-colors">
                <h3 className="text-white font-semibold mb-2">{item.title}</h3>
                <p className="text-subtext/70 text-sm leading-relaxed">{item.desc}</p>
             </div>
           ))}
        </div>

      </div>

      {/* ── Features Section ────────────────────────────────────────────────────── */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 py-24 flex flex-col gap-32">
        
        {/* Feature 1: AI Generation */}
        <div className="flex flex-col lg:flex-row items-center gap-16">
          <div className="flex-1 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 text-accent text-sm font-semibold border border-accent/20">
              <SparklesIcon /> AI-Powered
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight">Generate UI from plain English</h2>
            <p className="text-lg text-subtext/90 leading-relaxed">
              Describe the component you need. Our integration with Gemini 3.1 Flash instantly analyzes your request and writes production-ready Power Apps YAML. No more tedious manual dragging and dropping.
            </p>
          </div>
          <div className="flex-1 w-full">
            <ScreenshotPlaceholder title="Generator View" />
          </div>
        </div>

        {/* Feature 2: Live Preview */}
        <div className="flex flex-col lg:flex-row-reverse items-center gap-16">
          <div className="flex-1 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green/10 text-green text-sm font-semibold border border-green/20">
              <EyeIcon /> Real-time
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight">Interactive Live Preview</h2>
            <p className="text-lg text-subtext/90 leading-relaxed">
              See exactly what your YAML code will look like before you copy it into Canvas Studio. The built-in renderer perfectly mimics Power Apps controls, typography, and styling.
            </p>
          </div>
          <div className="flex-1 w-full">
            <ScreenshotPlaceholder title="Live Renderer View" />
          </div>
        </div>

        {/* Feature 3: Component Library */}
        <div className="flex flex-col lg:flex-row items-center gap-16">
          <div className="flex-1 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow/10 text-yellow text-sm font-semibold border border-yellow/20">
              <LibraryIcon /> Reusable assets
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight">Manage your UI Library</h2>
            <p className="text-lg text-subtext/90 leading-relaxed">
              Store, tag, and easily retrieve components you've built. Maintaining design consistency across your organization's Power Apps has never been easier.
            </p>
          </div>
          <div className="flex-1 w-full">
            <ScreenshotPlaceholder title="Component Library View" />
          </div>
        </div>
      </div>

      {/* ── Bottom CTA ────────────────────────────────────────────────────────── */}
      <div className="relative z-10 py-32 px-6 text-center">
        <div className="max-w-3xl mx-auto bg-surface/30 backdrop-blur-xl border border-overlay/30 rounded-3xl p-12 shadow-2xl shadow-black/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-accent/10 rounded-full blur-[80px]" />
          <h2 className="text-4xl font-bold text-white mb-6 relative z-10">Ready to accelerate your workflow?</h2>
          <p className="text-xl text-subtext mb-10 relative z-10">Stop writing tedious YAML by hand. Let AI build your Power Apps UI.</p>
          <button 
            onClick={onStart}
            className="relative z-10 px-8 py-4 bg-accent text-base font-bold rounded-2xl text-lg shadow-xl shadow-accent/20 hover:shadow-accent/40 hover:-translate-y-1 transition-all duration-300"
          >
            Launch Velocity Canvas
          </button>
        </div>
      </div>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-surface/40 py-8 text-center text-sm text-subtext/50">
        <p>© 2026 Velocity Canvas. Engineered for the future of Power Apps.</p>
      </footer>

      {/* Tailwind arbitrary values needed for the shimmer animation without modifying config */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes shimmer {
          100% {
            transform: translateX(100%);
          }
        }
      `}} />
    </div>
  );
}

// ── Shared Components ────────────────────────────────────────────────────────

function ScreenshotPlaceholder({ title }) {
  return (
    <div className="w-full aspect-video rounded-2xl bg-gradient-to-br from-surface/80 to-surface/40 border border-overlay/40 shadow-2xl shadow-black/40 backdrop-blur-sm overflow-hidden flex flex-col group relative">
      {/* Mock Window Header */}
      <div className="h-10 border-b border-overlay/30 bg-surface/50 flex items-center px-4 gap-2">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red/80" />
          <div className="w-3 h-3 rounded-full bg-yellow/80" />
          <div className="w-3 h-3 rounded-full bg-green/80" />
        </div>
        <div className="mx-auto text-xs font-medium text-subtext/60">{title}</div>
      </div>
      
      {/* Drop Zone Content */}
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-subtext/50 group-hover:text-accent/80 transition-colors">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12 opacity-50">
          <path fillRule="evenodd" d="M1.5 6a2.25 2.25 0 0 1 2.25-2.25h16.5A2.25 2.25 0 0 1 22.5 6v12a2.25 2.25 0 0 1-2.25 2.25H3.75A2.25 2.25 0 0 1 1.5 18V6ZM3 16.06V18c0 .414.336.75.75.75h16.5A.75.75 0 0 0 21 18v-1.94l-2.69-2.689a1.5 1.5 0 0 0-2.12 0l-.88.879.97.97a.75.75 0 1 1-1.06 1.06l-5.16-5.159a1.5 1.5 0 0 0-2.12 0L3 16.061Zm10.125-7.81a1.125 1.125 0 1 1 2.25 0 1.125 1.125 0 0 1-2.25 0Z" clipRule="evenodd" />
        </svg>
        <span className="text-sm font-medium tracking-wide text-center px-4">Screenshot goes here</span>
      </div>

      {/* Animated shimmer overlay */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_3s_infinite] pointer-events-none" />
    </div>
  )
}

function SparklesIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path d="M15.98 1.804a1 1 0 0 0-1.96 0l-.24 1.192a7.153 7.153 0 0 1-5.492 5.492l-1.192.24a1 1 0 0 0 0 1.96l1.192.24a7.153 7.153 0 0 1 5.492 5.492l.24 1.192a1 1 0 0 0 1.96 0l.24-1.192a7.153 7.153 0 0 1 5.492-5.492l1.192-.24a1 1 0 0 0 0-1.96l-1.192-.24a7.153 7.153 0 0 1-5.492-5.492l-.24-1.192Z" />
      <path d="M4 8.75A.75.75 0 0 1 4.75 8h.812c.16 0 .307-.067.41-.18A1.378 1.378 0 0 0 6.25 6.812V6a.75.75 0 0 1 1.5 0v.812c0 .16.067.307.18.41A1.378 1.378 0 0 0 8.938 7.5H9.75a.75.75 0 0 1 0 1.5h-.812a1.378 1.378 0 0 0-.965.812v.812a.75.75 0 0 1-1.5 0v-.812a1.378 1.378 0 0 0-.41-.965A1.378 1.378 0 0 0 5.563 9H4.75A.75.75 0 0 1 4 8.75Z" />
    </svg>
  )
}

function EyeIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
      <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.827 2.666 9.336 6.404a1.651 1.651 0 0 1 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.827-2.666-9.336-6.404ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" clipRule="evenodd" />
    </svg>
  )
}

function LibraryIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path fillRule="evenodd" d="M11 2a1 1 0 0 0-1.58-.813L6 3.659l-3.42-2.472A1 1 0 0 0 1 2v14a1 1 0 0 0 1 1h8v-1.077c-.45-.487-1-1.01-1-1.556v-3.738a.75.75 0 0 1 .157-.463l3.221-4.295A2 2 0 0 1 15 5h4V2h-8ZM4.5 4A.5.5 0 0 0 4 4.5v11a.5.5 0 0 0 .5.5h3A.5.5 0 0 0 8 15.5v-11A.5.5 0 0 0 7.5 4h-3ZM14.996 7h4v4.5A1.5 1.5 0 0 1 17.496 13h-4.32a.75.75 0 0 0-.6.3l-1.58 2.106v-3.739c0-.466.425-.945.885-1.39l3.115-3.277Z" clipRule="evenodd" />
    </svg>
  )
}
