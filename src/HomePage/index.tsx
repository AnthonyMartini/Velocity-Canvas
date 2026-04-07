"use client";

import React, { useState, useEffect } from 'react';

export default function HomePage({ user, onOpenProject, onNavigateToProjects }) {
  const [recentProjects, setRecentProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRecentProjects = async () => {
      try {
        setLoading(true);
        setError(null);
        const idToken = await user.getIdToken();
        const res = await fetch('/api/projects', {
          headers: { Authorization: `Bearer ${idToken}` }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to fetch projects');
        
        // Assume API returns projects sorted by recent, just take the top 3
        const projects = data.projects || [];
        // Sort by updatedAt descending just in case
        projects.sort((a, b) => {
          const timeA = a.updatedAt?._seconds || a.updatedAt || 0;
          const timeB = b.updatedAt?._seconds || b.updatedAt || 0;
          return timeB - timeA;
        });
        
        setRecentProjects(projects.slice(0, 3));
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchRecentProjects();
    }
  }, [user]);

  const firstName = user?.displayName ? user.displayName.split(' ')[0] : 'there';

  return (
    <div className="flex-1 bg-base min-h-0 flex flex-col p-8 lg:p-12 overflow-y-auto">
      <div className="max-w-5xl mx-auto w-full flex flex-col gap-12">
        
        {/* Welcome Section */}
        <section className="animate-fade-in">
          <h1 className="text-4xl md:text-5xl font-black text-text tracking-tight mb-4">
            Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-accent-dark">{firstName}</span>
          </h1>
          <p className="text-subtext text-lg">Pick up where you left off or start something new.</p>
        </section>

        {/* Quick Actions */}
        <section className="animate-slide-up flex flex-wrap gap-4">
          <button
            onClick={() => onOpenProject('new')}
            className="flex items-center gap-3 bg-gradient-to-r from-accent to-accent-dark hover:from-accent-hover hover:to-accent text-white px-6 py-4 rounded-2xl font-bold transition-all shadow-xl shadow-accent/20 hover:shadow-accent/40 hover:-translate-y-0.5 group"
          >
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div className="text-left">
              <div className="text-base leading-tight">Create New Project</div>
              <div className="text-xs text-white/70 font-medium">Start from a blank canvas</div>
            </div>
          </button>
          
          <button
            onClick={onNavigateToProjects}
            className="flex items-center gap-3 bg-surface border border-overlay/40 hover:bg-surface/80 hover:border-overlay/60 text-text px-6 py-4 rounded-2xl font-bold transition-all group"
          >
            <div className="w-10 h-10 bg-overlay/30 rounded-full flex items-center justify-center text-subtext group-hover:text-text transition-colors shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </div>
            <div className="text-left">
              <div className="text-base leading-tight">View All Projects</div>
              <div className="text-xs text-subtext font-medium">Browse your entire library</div>
            </div>
          </button>
        </section>

        {/* Recent Projects */}
        <section className="animate-slide-up" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-text">Continue Working</h2>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-8 flex items-center gap-3">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium text-sm">{error}</span>
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-44 bg-surface/30 border border-overlay/10 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : recentProjects.length === 0 ? (
            <div className="text-center py-16 bg-surface/30 border border-overlay/20 rounded-2xl flex flex-col items-center justify-center shadow-inner">
              <div className="w-16 h-16 bg-surface border border-overlay/40 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-subtext/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <p className="text-subtext font-medium">You don't have any recent projects.</p>
              <p className="text-subtext/60 text-sm mt-1 mb-4">Create your first component using the builder.</p>
              <button
                onClick={() => onOpenProject('new')}
                className="text-accent hover:text-accent-hover text-sm font-bold flex items-center gap-1"
              >
                Create Project &rarr;
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentProjects.map((proj: any) => (
                <div
                  key={proj.id}
                  onClick={() => onOpenProject(proj)}
                  className="flex flex-col p-6 bg-surface border border-overlay/20 rounded-2xl cursor-pointer hover:bg-surface/80 hover:border-overlay/40 hover:-translate-y-1 transition-all shadow-lg shadow-black/10 group"
                >
                  <div className="flex justify-between items-start mb-6">
                    <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2Zm-7 9h-2V7h-2v5H6v2h2v5h2v-5h2v-2Z" />
                      </svg>
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-text leading-tight truncate mb-2 group-hover:text-accent transition-colors">
                    {proj.name || 'Untitled Project'}
                  </h3>

                  <div className="flex flex-wrap items-center gap-3 mt-auto pt-4 border-t border-overlay/20 text-[10px] uppercase font-bold tracking-wider text-subtext/70">
                    <span className="flex items-center gap-1.5 bg-base/50 px-2 py-1 rounded">
                      <svg className="w-3 h-3 text-subtext/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                      </svg>
                      {proj.canvasW}×{proj.canvasH}
                    </span>
                    <span className="flex items-center gap-1.5 bg-base/50 px-2 py-1 rounded">
                      <svg className="w-3 h-3 text-subtext/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {proj.updatedAt ? new Date(proj.updatedAt._seconds ? proj.updatedAt._seconds * 1000 : proj.updatedAt).toLocaleDateString() : 'Just now'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
