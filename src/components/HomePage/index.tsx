"use client";

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  deleteProjectById,
  listProjects,
  saveProjectDocument,
  type ProjectDocument,
} from '@/features/projects/api';
import { DEFAULT_PROJECT_NAME, RECENT_PROJECTS_LIMIT } from './constants';
import { getProjectDisplayName, getProjectUpdatedLabel } from './helpers';
import { themeVars } from '@/theme/theme';
import { findParent, flattenTree, getNodeAbsolutePosition, resolveProperties } from '@/common/helpers';

const PREVIEW_MAX_NODES = 80;
const PREVIEW_TEXT_NODE_TYPES = new Set([
  'Button',
  'ModernButton',
  'Label',
  'ModernText',
  'TextInput',
  'ModernTextInput',
  'Dropdown',
  'ModernDropdown',
  'ListBox',
  'ComboBox',
  'ModernComboBox',
  'Link',
  'NumberInput',
  'DatePicker',
  'ModernDatePicker',
  'Checkbox',
  'ModernCheckbox',
  'Radio',
  'Toggle',
  'ModernToggle',
  'RichTextEditor',
]);

const PREVIEW_CONTAINER_TYPES = new Set([
  'Container',
  'Gallery',
  'Screen',
]);

function clampPreviewNumber(value: any, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getProjectPreviewScreen(tree: any[]) {
  if (!Array.isArray(tree) || tree.length === 0) return null;

  const directScreen = tree.find((node) => node?.type === 'Screen');
  if (directScreen) return directScreen;

  const appNode = tree.find((node) => node?.type === 'App');
  if (appNode?.children?.length) {
    return appNode.children.find((node: any) => node?.type === 'Screen') ?? null;
  }

  return null;
}

function getPreviewGlyphSeed(node: any) {
  return String(
    node?.Text ??
      node?.Label ??
      node?.Placeholder ??
      node?.HintText ??
      node?.Default ??
      node?.name ??
      ''
  ).trim();
}

function getPreviewLineCount(node: any, height: number) {
  if (!PREVIEW_TEXT_NODE_TYPES.has(node?.type)) return 0;
  if (height < 16) return 1;

  const seedLength = getPreviewGlyphSeed(node).length;
  if (seedLength > 36 && height >= 34) return 3;
  if (seedLength > 12 && height >= 24) return 2;
  return 1;
}

function clampChannel(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function parsePreviewColor(value: any) {
  const text = String(value || '').trim();
  if (!text || text.toLowerCase() === 'transparent' || text === 'RGBA(0, 0, 0, 0)') return null;

  const rgbaMatch = text.match(/^RGBA?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)$/i);
  if (rgbaMatch) {
    return {
      r: clampChannel(Number(rgbaMatch[1])),
      g: clampChannel(Number(rgbaMatch[2])),
      b: clampChannel(Number(rgbaMatch[3])),
      a: Math.max(0, Math.min(1, Number(rgbaMatch[4]))),
    };
  }

  const hex = text.replace('#', '');
  if (/^[0-9a-fA-F]{6}$/.test(hex)) {
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
      a: 1,
    };
  }

  if (/^[0-9a-fA-F]{3}$/.test(hex)) {
    return {
      r: parseInt(hex[0] + hex[0], 16),
      g: parseInt(hex[1] + hex[1], 16),
      b: parseInt(hex[2] + hex[2], 16),
      a: 1,
    };
  }

  return null;
}

function withPreviewAlpha(color: any, alpha = 1) {
  if (!color) return null;
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${Math.max(0, Math.min(1, alpha))})`;
}

function getResolvedPreviewColor(node: any) {
  const candidates = [
    node?.Fill,
    node?.BasePaletteColor,
    node?.Color,
    node?.HoverFill,
    node?.PressedFill,
    node?.BorderColor,
  ];

  for (const candidate of candidates) {
    const parsed = parsePreviewColor(candidate);
    if (parsed) return parsed;
  }

  return null;
}

function getPreviewNodeStyle(node: any, resolvedNode: any) {
  const baseColor = getResolvedPreviewColor(resolvedNode);

  if (PREVIEW_CONTAINER_TYPES.has(node?.type)) {
    return {
      fill: withPreviewAlpha(baseColor, baseColor ? Math.max(0.12, baseColor.a * 0.28) : 0.06) || 'rgba(255,255,255,0.06)',
      stroke: withPreviewAlpha(baseColor, 0.42) || 'rgba(148,163,184,0.34)',
      strokeWidth: 1.2,
      radius: 12,
    };
  }

  if (node?.type === 'Image' || node?.type === 'Icon') {
    return {
      fill: withPreviewAlpha(baseColor, baseColor ? Math.max(0.2, baseColor.a * 0.4) : 0.16) || 'rgba(96,165,250,0.16)',
      stroke: withPreviewAlpha(baseColor, 0.58) || 'rgba(96,165,250,0.45)',
      strokeWidth: 1.1,
      radius: 10,
    };
  }

  return {
    fill: withPreviewAlpha(baseColor, baseColor ? Math.max(0.24, baseColor.a * 0.7) : 0.12) || 'rgba(255,255,255,0.12)',
    stroke: withPreviewAlpha(baseColor, 0.85) || 'rgba(255,255,255,0.2)',
    strokeWidth: 1,
    radius: 10,
  };
}

function getPreviewScreenFill(screen: any) {
  const baseColor = getResolvedPreviewColor(screen);
  return withPreviewAlpha(baseColor, baseColor ? Math.max(0.72, baseColor.a) : 1) || 'rgba(15, 23, 42, 0.82)';
}

function getPreviewTextColor(node: any) {
  const candidates = [
    node?.Color,
    node?.FontColor,
    node?.HoverColor,
    node?.PressedColor,
    node?.Fill,
  ];

  for (const candidate of candidates) {
    const parsed = parsePreviewColor(candidate);
    if (parsed) {
      return withPreviewAlpha(parsed, Math.max(0.78, parsed.a));
    }
  }

  return 'rgba(255,255,255,0.72)';
}

function buildProjectPreviewModel(project: ProjectDocument) {
  const screen = getProjectPreviewScreen(project?.tree || []);
  const canvasW = Math.max(1, clampPreviewNumber(project?.canvasW ?? screen?.Width, 1366));
  const canvasH = Math.max(1, clampPreviewNumber(project?.canvasH ?? screen?.Height, 768));

  if (!screen) {
    return {
      canvasW,
      canvasH,
      screenFill: 'rgba(15, 23, 42, 0.82)',
      shapes: [],
    };
  }

  const baseTree = [screen];
  const resolvedScreen = resolveProperties(screen, {}, [], null);
  const flatNodes = flattenTree(screen.children || [], new Set()).reverse().slice(0, PREVIEW_MAX_NODES);
  const shapes = flatNodes
    .map((node: any) => {
      const parent = findParent(baseTree, node.id) ?? screen;
      const resolved = resolveProperties(node, {}, flatNodes, parent);
      const position = getNodeAbsolutePosition(baseTree, node.id, flatNodes, {});
      const width = Math.max(6, clampPreviewNumber(resolved?.Width, 32));
      const height = Math.max(6, clampPreviewNumber(resolved?.Height, 20));
      const x = clampPreviewNumber(position?.x, 0);
      const y = clampPreviewNumber(position?.y, 0);

      if (resolved?.Visible === false) return null;
      if (x > canvasW || y > canvasH || x + width < 0 || y + height < 0) return null;

      return {
        id: node.id,
        type: node.type,
        x,
        y,
        width,
        height,
        lineCount: getPreviewLineCount(node, height),
        glyphColor: getPreviewTextColor(resolved),
        style: getPreviewNodeStyle(node, resolved),
      };
    })
    .filter(Boolean);

  return {
    canvasW,
    canvasH,
    screenFill: getPreviewScreenFill(resolvedScreen),
    shapes,
  };
}

function PreviewGlyphs({ shape }: { shape: any }) {
  if (!shape?.lineCount) return null;

  const insetX = Math.max(5, Math.min(shape.width * 0.12, 16));
  const lineHeight = Math.max(2.2, Math.min(5, shape.height * 0.11));
  const gap = Math.max(2, Math.min(5, shape.height * 0.08));
  const firstY = shape.y + Math.max(5, Math.min(shape.height * 0.24, 14));
  const widths = [0.62, 0.46, 0.71];

  return (
    <>
      {Array.from({ length: shape.lineCount }).map((_, index) => (
        <rect
          key={`${shape.id}-glyph-${index}`}
          x={shape.x + insetX}
          y={firstY + index * (lineHeight + gap)}
          width={Math.max(6, (shape.width - insetX * 2) * widths[index % widths.length])}
          height={lineHeight}
          rx={lineHeight / 2}
          fill={shape.glyphColor || 'rgba(255,255,255,0.72)'}
        />
      ))}
    </>
  );
}

function ProjectCanvasPreview({ project }: { project: ProjectDocument }) {
  const preview = buildProjectPreviewModel(project);

  if (preview.shapes.length === 0) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950/80" style={{ aspectRatio: `${preview.canvasW} / ${preview.canvasH}` }}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(148,163,184,0.12),transparent_55%)]" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400/70">
            Empty Screen
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950/80 shadow-inner" style={{ aspectRatio: `${preview.canvasW} / ${preview.canvasH}` }}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.12),transparent_58%)]" />
      <svg viewBox={`0 0 ${preview.canvasW} ${preview.canvasH}`} className="absolute inset-0 h-full w-full">
        <rect x="0" y="0" width={preview.canvasW} height={preview.canvasH} rx="20" fill={preview.screenFill} />
        {preview.shapes.map((shape: any) => (
          <g key={shape.id}>
            <rect
              x={shape.x}
              y={shape.y}
              width={shape.width}
              height={shape.height}
              rx={shape.style.radius}
              fill={shape.style.fill}
              stroke={shape.style.stroke}
              strokeWidth={shape.style.strokeWidth}
            />
            <PreviewGlyphs shape={shape} />
          </g>
        ))}
      </svg>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-950/55 to-transparent" />
    </div>
  );
}

export default function ProjectsDashboard({
  user,
  onOpenProject,
}: {
  user: any;
  onOpenProject: (project: ProjectDocument) => void;
}) {
  const [projects, setProjects] = useState<ProjectDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState(DEFAULT_PROJECT_NAME);
  const [projectToDelete, setProjectToDelete] = useState<ProjectDocument | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    void fetchProjects();
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
      setProjects(await listProjects(user));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent<HTMLButtonElement>, proj: ProjectDocument) => {
    e.stopPropagation();
    setProjectToDelete(proj);
  };

  const confirmDelete = async () => {
    if (!projectToDelete || !projectToDelete.id || isDeleting) return;
    
    setIsDeleting(true);
    try {
      setDeletingId(projectToDelete.id);
      await deleteProjectById(user, projectToDelete.id);
      setProjects(prev => prev.filter((p) => p.id !== projectToDelete.id));
      setProjectToDelete(null);
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    } finally {
      setDeletingId(null);
      setIsDeleting(false);
    }
  };

  const startRename = (e: React.MouseEvent<HTMLButtonElement>, proj: ProjectDocument) => {
    e.stopPropagation();
    setRenamingId(proj.id ?? null);
    setRenameValue(getProjectDisplayName(proj.name));
  };

  const commitRename = async (proj: ProjectDocument) => {
    const newName = renameValue.trim() || DEFAULT_PROJECT_NAME;
    setRenamingId(null);
    if (newName === proj.name) return;

    // Optimistic update
    setProjects(prev => prev.map((p) => (p.id === proj.id ? { ...p, name: newName } : p)));

    try {
      await saveProjectDocument(user, {
        projectId: proj.id,
        name: newName,
        tree: proj.tree,
        canvasW: proj.canvasW,
        canvasH: proj.canvasH,
        canvasTheme: proj.canvasTheme,
      });
    } catch (err) {
      // Revert on failure
      setProjects(prev => prev.map((p) => (p.id === proj.id ? { ...p, name: proj.name } : p)));
    }
  };

  return (
    <div 
      className="flex-1 min-h-0 flex flex-col p-8 overflow-y-auto"
      style={{ 
        backgroundColor: themeVars.colors.base,
        backgroundImage: themeVars.gradients.canvasGrid,
        backgroundSize: '20px 20px',
        backgroundAttachment: 'fixed'
      }}
    >
      <div className="max-w-6xl mx-auto w-full">
        <div className="mb-12 animate-fade-in px-4">
          <h1 className="text-4xl font-black text-text tracking-tight mb-2">
            Welcome back, <span className="text-accent">{user?.displayName?.split(' ')[0] || 'Builder'}</span>!
          </h1>
          <p className="text-subtext text-lg max-w-xl">
            Pick up where you left off or start something new.
          </p>
        </div>

        <div className="flex items-center justify-between mb-8 px-4">
          <div>
            <h2 className="text-2xl font-black text-text tracking-tight mb-1">
              {showAll ? 'All Projects' : 'Recent Projects'}
            </h2>
            {showAll && (
              <p className="text-subtext text-xs uppercase tracking-widest font-bold opacity-60">
                {projects.length} Total
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setNewProjectName(DEFAULT_PROJECT_NAME);
                setShowNewProjectModal(true);
              }}
              className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-accent/20 transform active:scale-95"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              New Project
            </button>
          </div>
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
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 px-4 text-center animate-slide-up">
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-accent/20 blur-3xl rounded-full" />
              <div className="relative w-24 h-24 bg-surface border border-overlay/20 rounded-3xl flex items-center justify-center text-accent shadow-2xl ring-1 ring-white/10">
                <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
            </div>
            <h3 className="text-3xl font-black text-text mb-4 tracking-tight">no projects yet.</h3>
            <p className="text-subtext text-lg mb-10 max-w-md mx-auto leading-relaxed">
              Let's start building! Create your first project to experience the power of Velocity Canvas.
            </p>
            <button
              onClick={() => {
                setNewProjectName(DEFAULT_PROJECT_NAME);
                setShowNewProjectModal(true);
              }}
              className="group relative inline-flex items-center gap-3 bg-accent hover:bg-accent-hover text-white px-10 py-4 rounded-2xl font-black transition-all shadow-2xl shadow-accent/30 transform active:scale-95 hover:-translate-y-1"
            >
              <svg className="w-5 h-5 transition-transform group-hover:rotate-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              Start Building
              <div className="absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-slide-up">
              {/* Existing Projects */}
              {(showAll ? projects : projects.slice(0, RECENT_PROJECTS_LIMIT)).map((proj) => (
                <div
                  key={proj.id ?? proj.name}
                  onClick={() => renamingId !== proj.id && onOpenProject(proj)}
                  className="relative flex flex-col p-6 bg-surface/50 border border-overlay/20 rounded-2xl cursor-pointer hover:bg-surface/80 hover:border-overlay/40 hover:-translate-y-1 transition-all group shadow-sm hover:shadow-xl"
                >
                  <div className="flex justify-between items-start gap-3 mb-4">
                    <div className="min-w-0 flex-1">
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
                          className="text-lg font-bold text-text bg-base/60 border border-accent/60 rounded-lg px-2 py-1 w-full focus:outline-none focus:ring-1 focus:ring-accent/40"
                        />
                      ) : (
                        <div className="flex items-center gap-1.5 group/name">
                          <h3 className="text-lg font-bold text-text leading-tight truncate flex-1">
                            {getProjectDisplayName(proj.name)}
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
                    </div>
                    <button
                      onClick={(e) => {
                        if (proj.id) {
                          handleDeleteClick(e, proj);
                        }
                      }}
                      disabled={!proj.id || deletingId === proj.id}
                      className="p-2 text-subtext/40 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>

                  <div className="mb-4">
                    <ProjectCanvasPreview project={proj} />
                  </div>

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
                      {getProjectUpdatedLabel(proj.updatedAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {!showAll && projects.length > RECENT_PROJECTS_LIMIT && (
              <div className="mt-8 flex justify-center">
                <button
                  onClick={() => setShowAll(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-surface/50 border border-overlay/30 rounded-xl text-accent font-bold hover:bg-surface hover:border-accent/40 shadow-sm transition-all"
                >
                  See all projects
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            )}

            {showAll && (
              <div className="mt-12 flex justify-center pb-12">
                <button
                  onClick={() => {
                    setShowAll(false);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="text-subtext/60 hover:text-text text-sm font-bold transition-colors"
                >
                  ↑ Back to summary
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* New Project Modal */}
      {showNewProjectModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 backdrop-blur-sm bg-base/40 animate-fade-in">
          <div className="bg-surface border border-overlay/40 rounded-3xl p-8 max-w-md w-full shadow-2xl animate-pop-in">
            <h2 className="text-2xl font-black text-text mb-2">New Project</h2>
            <p className="text-subtext text-sm mb-6">Give your project a name to get started.</p>
            
            <div className="mb-8">
              <label className="text-[10px] uppercase font-black tracking-widest text-subtext/60 block mb-2 px-1">Project Name</label>
              <input
                autoFocus
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newProjectName.trim()) {
                    onOpenProject({ name: newProjectName.trim(), isNew: true });
                    setShowNewProjectModal(false);
                  }
                  if (e.key === 'Escape') setShowNewProjectModal(false);
                }}
                className="w-full bg-base/50 border border-overlay/40 rounded-xl px-4 py-3 text-text font-bold focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all"
                placeholder="e.g. My Awesome App"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setShowNewProjectModal(false)}
                className="px-6 py-3 rounded-xl text-sm font-bold text-subtext hover:bg-white/5 transition-all"
              >
                Cancel
              </button>
              <button
                disabled={!newProjectName.trim()}
                onClick={() => {
                  onOpenProject({ name: newProjectName.trim(), isNew: true });
                  setShowNewProjectModal(false);
                }}
                className="px-6 py-3 rounded-xl text-sm font-black bg-accent hover:bg-accent-hover text-white transition-all shadow-lg shadow-accent/20 disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95"
              >
                Create Project
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Project Modal */}
      {projectToDelete && createPortal(
        <div className="fixed inset-0 z-[100002] flex items-center justify-center px-4">
          <button
            type="button"
            aria-label="Close delete prompt"
            disabled={isDeleting}
            onClick={() => setProjectToDelete(null)}
            className="absolute inset-0 bg-black/55 backdrop-blur-[1px] disabled:cursor-default"
          />
          <div className="relative z-10 w-full max-w-sm rounded-2xl border border-overlay/35 bg-surface p-5 shadow-2xl shadow-black/40 animate-pop-in">
            <h3 className="text-base font-semibold text-text">Delete project?</h3>
            <p className="mt-2 text-sm leading-relaxed text-subtext">
              Are you sure you want to delete <span className="font-bold text-text">"{getProjectDisplayName(projectToDelete.name)}"</span>? This action cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setProjectToDelete(null)}
                disabled={isDeleting}
                className="rounded-lg border border-overlay/30 bg-base px-3 py-1.5 text-xs font-medium text-subtext transition-colors hover:bg-overlay/10 hover:text-text disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={isDeleting}
                className="flex min-w-[80px] items-center justify-center gap-1.5 rounded-lg border border-red/30 bg-red/10 px-3 py-1.5 text-xs font-medium text-red transition-colors hover:bg-red/20 hover:text-red disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDeleting ? (
                  <div className="h-3 w-3 rounded-full border-2 border-red-400/50 border-t-red-400 animate-spin" />
                ) : null}
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
