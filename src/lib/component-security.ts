import { SCHEMAS } from "@/RendererPage/constants";
import { sanitizeHtmlFragment, sanitizeSvgFragment } from "@/lib/content-sanitizer";

const DEFAULT_SCREEN_FILL = "RGBA(255, 255, 255, 1)";
const MAX_COMPONENT_DEPTH = 12;
const MAX_COMPONENT_NODES = 800;
const MAX_COMPONENT_CHILDREN = 250;
const MAX_STRING_LENGTH = 10000;
const MAX_NAME_LENGTH = 120;
const MAX_REPLY_LENGTH = 600;
const DEFAULT_CANVAS_WIDTH = 1366;
const DEFAULT_CANVAS_HEIGHT = 768;
const MIN_CANVAS_SIZE = 240;
const MAX_CANVAS_SIZE = 8192;

const ALLOWED_CHILD_CONTAINERS = new Set(["App", "Screen", "Container", "Gallery"]);
const SCHEMA_TYPES = new Set(Object.keys(SCHEMAS));

function isPlainObject(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function sanitizeString(value: unknown, maxLength = MAX_STRING_LENGTH) {
  return String(value ?? "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .slice(0, maxLength);
}

function sanitizeDocumentId(value: unknown) {
  const trimmed = sanitizeString(value, 200).trim();
  return trimmed && !trimmed.includes("/") ? trimmed : null;
}

function sanitizeNodeId(value: unknown, fallback: string) {
  const cleaned = sanitizeString(value, 120).trim().replace(/[^A-Za-z0-9:_-]/g, "_");
  return cleaned || fallback;
}

function sanitizeNodeName(value: unknown, fallback: string) {
  const cleaned = sanitizeString(value, MAX_NAME_LENGTH).trim();
  return cleaned || fallback;
}

function clampCanvasSize(value: unknown, fallback: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(MIN_CANVAS_SIZE, Math.min(MAX_CANVAS_SIZE, Math.round(value)));
}

function getPropertyMapForType(type: string) {
  if (type === "App") return new Map<string, any>();

  const schema = (SCHEMAS as Record<string, any>)[type];
  const properties = schema?.groups
    ? schema.groups.reduce((acc: any[], group: any) => acc.concat(group.properties || []), [])
    : schema?.properties || [];

  return new Map(properties.map((property: any) => [property.key || property.name, property]));
}

function sanitizePropertyValue(type: string, key: string, value: unknown) {
  if (value == null) return undefined;

  if (key === "HtmlText" && typeof value === "string") {
    return sanitizeHtmlFragment(value);
  }

  if (key === "_svg" && typeof value === "string") {
    return sanitizeSvgFragment(value);
  }

  if (typeof value === "string") {
    return sanitizeString(value);
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (Array.isArray(value) || isPlainObject(value)) {
    return undefined;
  }

  return undefined;
}

function buildDefaultTree(projectName = "Untitled Project") {
  return [
    {
      id: "app_root",
      type: "App",
      name: sanitizeNodeName(projectName, "Untitled Project"),
      children: [
        {
          id: "screen_1",
          type: "Screen",
          name: "Screen1",
          Fill: DEFAULT_SCREEN_FILL,
          children: [],
        },
      ],
    },
  ];
}

function ensureAppRootHasScreen(tree: any[], projectName: string) {
  if (!Array.isArray(tree) || !tree.length || tree[0]?.type !== "App") {
    return buildDefaultTree(projectName);
  }

  const appRoot = tree[0];
  const hasScreen = Array.isArray(appRoot.children) && appRoot.children.some((child: any) => child?.type === "Screen");
  if (hasScreen) return tree;

  return [
    {
      ...appRoot,
      children: [
        {
          id: "screen_1",
          type: "Screen",
          name: "Screen1",
          Fill: DEFAULT_SCREEN_FILL,
          children: [],
        },
      ],
    },
    ...tree.slice(1),
  ];
}

function sanitizeComponentNode(node: unknown, options: { depth?: number; countRef?: { value: number } } = {}) {
  const depth = options.depth ?? 0;
  const countRef = options.countRef ?? { value: 0 };

  if (!isPlainObject(node) || depth > MAX_COMPONENT_DEPTH || countRef.value >= MAX_COMPONENT_NODES) {
    return null;
  }

  const rawType = sanitizeString(node.type, 40).trim();
  if (rawType !== "App" && !SCHEMA_TYPES.has(rawType)) return null;

  countRef.value += 1;

  const fallbackName = rawType === "App" ? "App" : rawType;
  const fallbackId = `${rawType.toLowerCase() || "node"}_${countRef.value}`;
  const sanitized: Record<string, any> = {
    id: sanitizeNodeId(node.id, fallbackId),
    type: rawType,
    name: sanitizeNodeName(node.name, fallbackName),
  };

  const propertyMap = getPropertyMapForType(rawType);
  for (const [key, value] of Object.entries(node)) {
    if (["id", "type", "name", "children"].includes(key)) continue;
    if (key === "_svg" && rawType !== "Icon") continue;

    if (key === "_svg") {
      const safeSvg = sanitizePropertyValue(rawType, key, value);
      if (safeSvg) sanitized._svg = safeSvg;
      continue;
    }

    if (rawType !== "App" && !propertyMap.has(key)) continue;

    const safeValue = sanitizePropertyValue(rawType, key, value);
    if (safeValue !== undefined) {
      sanitized[key] = safeValue;
    }
  }

  if (ALLOWED_CHILD_CONTAINERS.has(rawType) && Array.isArray(node.children)) {
    const safeChildren = node.children
      .slice(0, MAX_COMPONENT_CHILDREN)
      .map((child) => sanitizeComponentNode(child, { depth: depth + 1, countRef }))
      .filter(Boolean);

    sanitized.children = safeChildren;
  } else if (rawType === "App") {
    sanitized.children = [];
  }

  return sanitized;
}

function sanitizeComponentChanges(type: string, changes: unknown) {
  if (!isPlainObject(changes)) return null;

  const propertyMap = getPropertyMapForType(type);
  const countRef = { value: 0 };
  const sanitizedChanges: Record<string, any> = {};

  for (const [key, value] of Object.entries(changes)) {
    if (["id", "type"].includes(key)) continue;

    if (key === "name") {
      sanitizedChanges.name = sanitizeNodeName(value, type);
      continue;
    }

    if (key === "_svg" && type === "Icon") {
      const safeSvg = sanitizePropertyValue(type, key, value);
      if (safeSvg) sanitizedChanges._svg = safeSvg;
      continue;
    }

    if (key === "children" && ALLOWED_CHILD_CONTAINERS.has(type) && Array.isArray(value)) {
      const safeChildren = value
        .slice(0, MAX_COMPONENT_CHILDREN)
        .map((child) => sanitizeComponentNode(child, { depth: 1, countRef }))
        .filter(Boolean);
      sanitizedChanges.children = safeChildren;
      continue;
    }

    if (!propertyMap.has(key)) continue;

    const safeValue = sanitizePropertyValue(type, key, value);
    if (safeValue !== undefined) {
      sanitizedChanges[key] = safeValue;
    }
  }

  return Object.keys(sanitizedChanges).length ? sanitizedChanges : null;
}

function indexTree(nodes: any[], map: Map<string, any>) {
  for (const node of nodes || []) {
    map.set(node.id, node);
    if (Array.isArray(node.children) && node.children.length) {
      indexTree(node.children, map);
    }
  }
}

export function buildNodeLookup(nodes: any[]) {
  const lookup = new Map<string, any>();
  indexTree(nodes || [], lookup);
  return lookup;
}

function removeNodeFromLookup(node: any, lookup: Map<string, any>) {
  if (!node) return;
  lookup.delete(node.id);
  for (const child of node.children || []) {
    removeNodeFromLookup(child, lookup);
  }
}

function addNodeToLookup(node: any, lookup: Map<string, any>) {
  if (!node) return;
  lookup.set(node.id, node);
  for (const child of node.children || []) {
    addNodeToLookup(child, lookup);
  }
}

export function applyPatchToLookup(operation: any, lookup: Map<string, any>) {
  if (!operation?.op) return;

  if (operation.op === "add") {
    addNodeToLookup(operation.component, lookup);
    return;
  }

  if (operation.op === "update") {
    const existing = lookup.get(operation.id);
    if (!existing) return;
    const nextNode = { ...existing, ...operation.changes };
    lookup.set(operation.id, nextNode);
    if (Array.isArray(operation.changes?.children)) {
      for (const child of operation.changes.children) {
        addNodeToLookup(child, lookup);
      }
    }
    return;
  }

  if (operation.op === "remove") {
    removeNodeFromLookup(lookup.get(operation.id), lookup);
  }
}

export function sanitizeRendererPatch(operation: unknown, lookup: Map<string, any>) {
  if (!isPlainObject(operation) || typeof operation.op !== "string") return null;

  if (operation.op === "add") {
    const parentId = operation.parentId == null ? null : sanitizeNodeId(operation.parentId, "");
    if (parentId && !lookup.has(parentId)) return null;
    if (parentId) {
      const parentNode = lookup.get(parentId);
      if (!parentNode || !ALLOWED_CHILD_CONTAINERS.has(parentNode.type)) return null;
    }

    const component = sanitizeComponentNode(operation.component);
    if (!component) return null;

    return {
      op: "add",
      parentId,
      component,
    };
  }

  if (operation.op === "update") {
    const id = sanitizeNodeId(operation.id, "");
    const existing = lookup.get(id);
    if (!id || !existing) return null;

    const changes = sanitizeComponentChanges(existing.type, operation.changes);
    if (!changes) return null;

    return {
      op: "update",
      id,
      changes,
    };
  }

  if (operation.op === "remove") {
    const id = sanitizeNodeId(operation.id, "");
    return id && lookup.has(id) ? { op: "remove", id } : null;
  }

  if (operation.op === "reparent") {
    const id = sanitizeNodeId(operation.id, "");
    const newParentId = sanitizeNodeId(operation.newParentId, "");
    if (!id || !newParentId || !lookup.has(id) || !lookup.has(newParentId)) return null;

    const newParent = lookup.get(newParentId);
    if (!newParent || !ALLOWED_CHILD_CONTAINERS.has(newParent.type)) return null;

    return {
      op: "reparent",
      id,
      newParentId,
    };
  }

  return null;
}

export function sanitizeReplyText(value: unknown) {
  return sanitizeString(value, MAX_REPLY_LENGTH).trim() || "Done!";
}

export function sanitizeTweakResult(result: unknown, sourceComponent: any) {
  if (!isPlainObject(sourceComponent)) return null;

  const sanitized = sanitizeComponentNode({
    ...(isPlainObject(result) ? result : {}),
    id: sourceComponent.id,
    type: sourceComponent.type,
    name: sourceComponent.name,
  });

  if (!sanitized) return null;
  sanitized.id = sanitizeNodeId(sourceComponent.id, sanitized.id);
  sanitized.type = sanitizeString(sourceComponent.type, 40).trim() || sanitized.type;
  sanitized.name = sanitizeNodeName(sourceComponent.name, sanitized.name || sanitized.type);
  return sanitized;
}

export function sanitizeProjectRecord(project: any) {
  const source = isPlainObject(project) ? project : {};
  const safeName = sanitizeNodeName(source.name, "Untitled Project");
  const countRef = { value: 0 };
  const safeTree = Array.isArray(source.tree)
    ? source.tree
        .slice(0, MAX_COMPONENT_CHILDREN)
        .map((node) => sanitizeComponentNode(node, { countRef }))
        .filter(Boolean)
    : [];

  const finalTree =
    safeTree.length && safeTree[0]?.type === "App"
      ? ensureAppRootHasScreen(safeTree, safeName)
      : buildDefaultTree(safeName);

  return {
    ...source,
    name: safeName,
    tree: finalTree,
    canvasW: clampCanvasSize(source.canvasW, DEFAULT_CANVAS_WIDTH),
    canvasH: clampCanvasSize(source.canvasH, DEFAULT_CANVAS_HEIGHT),
  };
}

export function sanitizeProjectPayload(payload: any) {
  const source = isPlainObject(payload) ? payload : {};
  const sanitized = sanitizeProjectRecord(source);

  return {
    name: sanitized.name,
    tree: sanitized.tree,
    canvasW: sanitized.canvasW,
    canvasH: sanitized.canvasH,
  };
}

export function sanitizeProjectId(value: unknown) {
  return sanitizeDocumentId(value);
}
