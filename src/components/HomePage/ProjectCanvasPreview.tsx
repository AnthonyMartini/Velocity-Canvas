"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ProjectDocument } from "@/features/projects/api";
import { findParent, flattenTree, getNodeAbsolutePosition, resolveProperties } from "@/common/helpers";

const PREVIEW_MAX_NODES = 80;
const PREVIEW_TEXT_NODE_TYPES = new Set([
  "Button",
  "ModernButton",
  "Label",
  "ModernText",
  "TextInput",
  "ModernTextInput",
  "Dropdown",
  "ModernDropdown",
  "ListBox",
  "ComboBox",
  "ModernComboBox",
  "Link",
  "NumberInput",
  "DatePicker",
  "ModernDatePicker",
  "Checkbox",
  "ModernCheckbox",
  "Radio",
  "Toggle",
  "ModernToggle",
  "RichTextEditor",
]);

const PREVIEW_CONTAINER_TYPES = new Set([
  "Container",
  "Gallery",
  "Screen",
]);

function clampPreviewNumber(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getProjectPreviewScreen(tree: any[]) {
  if (!Array.isArray(tree) || tree.length === 0) return null;
  return flattenTree(tree, new Set()).find((node: any) => node?.type === "Screen") ?? null;
}

function getPreviewGlyphSeed(node: any) {
  return String(
    node?.Text ??
      node?.Label ??
      node?.Placeholder ??
      node?.HintText ??
      node?.Default ??
      node?.name ??
      "",
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
  const text = String(value || "").trim();
  if (!text || text.toLowerCase() === "transparent" || text === "RGBA(0, 0, 0, 0)") return null;

  const rgbaMatch = text.match(/^RGBA?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)$/i);
  if (rgbaMatch) {
    return {
      r: clampChannel(Number(rgbaMatch[1])),
      g: clampChannel(Number(rgbaMatch[2])),
      b: clampChannel(Number(rgbaMatch[3])),
      a: Math.max(0, Math.min(1, Number(rgbaMatch[4]))),
    };
  }

  const hex = text.replace("#", "");
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
      fill: withPreviewAlpha(baseColor, baseColor ? Math.max(0.06, baseColor.a * 0.16) : 0.03) || "rgba(255,255,255,0.03)",
      stroke: withPreviewAlpha(baseColor, 0.78) || "rgba(148,163,184,0.72)",
      strokeWidth: 1.5,
      outlineInset: 4,
      outlineStroke: withPreviewAlpha(baseColor, 0.4) || "rgba(226,232,240,0.34)",
      outlineStrokeWidth: 0.9,
      radius: 12,
    };
  }

  if (node?.type === "Image" || node?.type === "Icon") {
    return {
      fill: withPreviewAlpha(baseColor, baseColor ? Math.max(0.2, baseColor.a * 0.4) : 0.16) || "rgba(96,165,250,0.16)",
      stroke: withPreviewAlpha(baseColor, 0.58) || "rgba(96,165,250,0.45)",
      strokeWidth: 1.1,
      radius: 10,
    };
  }

  return {
    fill: withPreviewAlpha(baseColor, baseColor ? Math.max(0.24, baseColor.a * 0.7) : 0.12) || "rgba(255,255,255,0.12)",
    stroke: withPreviewAlpha(baseColor, 0.85) || "rgba(255,255,255,0.2)",
    strokeWidth: 1,
    radius: 10,
  };
}

function getPreviewScreenFill(screen: any) {
  const baseColor = getResolvedPreviewColor(screen);
  return withPreviewAlpha(baseColor, baseColor ? Math.max(0.72, baseColor.a) : 1) || "rgba(15, 23, 42, 0.82)";
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

  return "rgba(255,255,255,0.72)";
}

function buildProjectPreviewModel(project: ProjectDocument) {
  const screen = getProjectPreviewScreen(project?.tree || []);
  const canvasW = Math.max(1, clampPreviewNumber(project?.canvasW ?? screen?.Width, 1366));
  const canvasH = Math.max(1, clampPreviewNumber(project?.canvasH ?? screen?.Height, 768));

  if (!screen) {
    return {
      canvasW,
      canvasH,
      screenFill: "rgba(15, 23, 42, 0.82)",
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
          fill={shape.glyphColor || "rgba(255,255,255,0.72)"}
        />
      ))}
    </>
  );
}

function PreviewSkeleton({ aspectRatio }: { aspectRatio: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950/80" style={{ aspectRatio }}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.12),transparent_58%)]" />
      <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-white/[0.03] via-transparent to-white/[0.05]" />
    </div>
  );
}

export default function ProjectCanvasPreview({ project }: { project: ProjectDocument }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [shouldRenderPreview, setShouldRenderPreview] = useState(false);

  useEffect(() => {
    if (shouldRenderPreview) return;

    const target = containerRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldRenderPreview(true);
          observer.disconnect();
        }
      },
      { rootMargin: "240px" },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [shouldRenderPreview]);

  const aspectRatio = useMemo(() => {
    const screen = Array.isArray(project?.tree) ? project.tree.find((node: any) => node?.type === "Screen") : null;
    const canvasW = Math.max(1, clampPreviewNumber(project?.canvasW ?? screen?.Width, 1366));
    const canvasH = Math.max(1, clampPreviewNumber(project?.canvasH ?? screen?.Height, 768));
    return `${canvasW} / ${canvasH}`;
  }, [project?.canvasH, project?.canvasW, project?.tree]);

  const preview = useMemo(
    () => (shouldRenderPreview ? buildProjectPreviewModel(project) : null),
    [project, shouldRenderPreview],
  );

  return (
    <div ref={containerRef}>
      {!preview ? (
        <PreviewSkeleton aspectRatio={aspectRatio} />
      ) : preview.shapes.length === 0 ? (
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950/80" style={{ aspectRatio: `${preview.canvasW} / ${preview.canvasH}` }}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(148,163,184,0.12),transparent_55%)]" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400/70">
              Empty Screen
            </div>
          </div>
        </div>
      ) : (
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
                {PREVIEW_CONTAINER_TYPES.has(shape.type) && shape.width > 18 && shape.height > 18 ? (
                  <rect
                    x={shape.x + (shape.style.outlineInset ?? 4)}
                    y={shape.y + (shape.style.outlineInset ?? 4)}
                    width={Math.max(4, shape.width - ((shape.style.outlineInset ?? 4) * 2))}
                    height={Math.max(4, shape.height - ((shape.style.outlineInset ?? 4) * 2))}
                    rx={Math.max(4, shape.style.radius - 4)}
                    fill="none"
                    stroke={shape.style.outlineStroke || "rgba(226,232,240,0.34)"}
                    strokeWidth={shape.style.outlineStrokeWidth ?? 0.9}
                    strokeDasharray="6 4"
                  />
                ) : null}
                <PreviewGlyphs shape={shape} />
              </g>
            ))}
          </svg>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-950/55 to-transparent" />
        </div>
      )}
    </div>
  );
}
