import React, { useState, useEffect, useRef } from 'react';

export default function ProjectsDashboard({ user, onOpenProject }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProjects();
  }, [user]);

  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingId]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      const idToken = await user.getIdToken();
      const res = await fetch('/api/projects', {
        headers: { Authorization: `Bearer ${idToken}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch projects');
      setProjects(data.projects || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this project?')) return;
    try {
      setDeletingId(id);
      const idToken = await user.getIdToken();
      const res = await fetch(`/api/projects?id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${idToken}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete');
      setProjects(prev => prev.filter((p: any) => p.id !== id));
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const startRename = (e, proj) => {
    e.stopPropagation();
    setRenamingId(proj.id);
    setRenameValue(proj.name || 'Untitled Project');
  };

  const commitRename = async (proj) => {
    const newName = renameValue.trim() || 'Untitled Project';
    setRenamingId(null);
    if (newName === proj.name) return;

    // Optimistic update
    setProjects(prev => prev.map((p: any) => p.id === proj.id ? { ...p, name: newName } : p));

    try {
      const idToken = await user.getIdToken();
      await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ projectId: proj.id, name: newName, tree: proj.tree, canvasW: proj.canvasW, canvasH: proj.canvasH })
      });
    } catch (err) {
      // Revert on failure
      setProjects(prev => prev.map((p: any) => p.id === proj.id ? { ...p, name: proj.name } : p));
    }
  };

  return (
    <div className="flex-1 bg-base min-h-0 flex flex-col p-8 overflow-y-auto">
      <div className="max-w-6xl mx-auto w-full">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight mb-2">Your Projects</h1>
            <p className="text-subtext text-sm">Select a project or create a new one to open the Canvas Editor.</p>
          </div>
          <button
            onClick={() => onOpenProject('new')}
            className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-accent/20"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            New Project
          </button>
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
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 rounded-full border-4 border-accent border-t-transparent animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">


            {/* Existing Projects */}
            {(projects as any[]).map(proj => (
              <div
                key={proj.id}
                onClick={() => renamingId !== proj.id && onOpenProject(proj)}
                className="relative flex flex-col p-6 bg-surface/50 border border-overlay/20 rounded-2xl cursor-pointer hover:bg-surface/80 hover:border-overlay/40 hover:-translate-y-1 transition-all group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2Zm-7 9h-2V7h-2v5H6v2h2v5h2v-5h2v-2Z" />
                    </svg>
                  </div>
                  <button
                    onClick={(e) => handleDelete(e, proj.id)}
                    disabled={deletingId === proj.id}
                    className="p-2 text-subtext/40 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>

                {/* Editable project name */}
                {renamingId === proj.id ? (
                  <input
                    ref={renameInputRef}
                    type="text"
                    value={renameValue}
                    onChange={e => setRenameValue(e.target.value)}
                    onClick={e => e.stopPropagation()}
                    onBlur={() => commitRename(proj)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') commitRename(proj);
                      if (e.key === 'Escape') setRenamingId(null);
                    }}
                    className="text-lg font-bold text-white bg-base/60 border border-accent/60 rounded-lg px-2 py-1 mb-2 w-full focus:outline-none focus:ring-1 focus:ring-accent/40"
                  />
                ) : (
                  <div className="flex items-center gap-1.5 mb-2 group/name">
                    <h3 className="text-lg font-bold text-white leading-tight truncate flex-1">
                      {proj.name || 'Untitled Project'}
                    </h3>
                    <button
                      onClick={e => startRename(e, proj)}
                      className="p-1 text-subtext/30 hover:text-accent rounded opacity-0 group-hover/name:opacity-100 transition-all flex-shrink-0"
                      title="Rename project"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-3 mt-auto pt-4 border-t border-white/5 text-[10px] font-medium text-subtext">
                  <span className="flex items-center gap-1.5">
                    <svg className="w-3 h-3 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                    {proj.canvasW} × {proj.canvasH}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <svg className="w-3 h-3 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {proj.updatedAt ? new Date(proj.updatedAt._seconds ? proj.updatedAt._seconds * 1000 : proj.updatedAt).toLocaleDateString() : 'Just now'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
