import { SCHEMAS } from "@/features/powerapps/schema";
import { AI_ADDABLE_COMPONENT_TYPE_SET } from "@/features/powerapps/ai-constraints";
import { autoSizeTextComponents, getAutoSizedComponentChanges } from "@/features/powerapps/text-sizing";
import { sanitizeHtmlFragment, sanitizeSvgFragment } from "@/lib/content-sanitizer";
import { normalizeCanvasThemeState } from "@/theme/canvasTheme";
import { ALL_ENUM_VALUES, FUNCTIONS } from "@/features/powerapps/functions";

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
const UNKNOWN_POWERAPPS_TYPE = "UnknownPowerAppsObject";
const MAX_PROJECT_SUMMARY_PREVIEW_NODES = 80;

const ALLOWED_CHILD_CONTAINERS = new Set(["App", "Screen", "Container", "Gallery"]);
const SCHEMA_TYPES = new Set(Object.keys(SCHEMAS));
const TEXT_LITERAL_PROPERTY_EXCLUSIONS = new Set([
  "Items",
  "DisplayFields",
  "SearchFields",
  "DefaultSelectedItems",
  "SelectedItems",
  "SelectedItemsText",
]);
const RESERVED_FORMULA_ROOTS = new Set(["Parent", "Self", "ThisItem", "ThisRecord", "App"]);
const ENUM_ROOTS = new Set(
  Array.from(ALL_ENUM_VALUES || [])
    .map((value: any) => String(value || "").split(".")[0])
    .filter(Boolean),
);
const FUNCTION_NAMES = new Set((FUNCTIONS || []).map((func: any) => String(func?.name || "")));
const CONTROL_OUTPUT_REFERENCE_HINTS = [
  ".Selected",
  ".SelectedItems",
  ".SelectedDate",
  ".Text",
  ".Value",
  ".Visible",
  ".Width",
  ".Height",
  ".X",
  ".Y",
  ".Checked",
];

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

function walkNodes(nodes: any[], visitor: (node: any) => void) {
  for (const node of nodes || []) {
    if (!node || typeof node !== "object") continue;
    visitor(node);
    if (Array.isArray(node.children) && node.children.length) {
      walkNodes(node.children, visitor);
    }
  }
}

function getPropertyOptionValues(propertyDef: any) {
  if (!Array.isArray(propertyDef?.options)) return [];

  return propertyDef.options
    .map((option: any) => (isPlainObject(option) && "value" in option ? option.value : option))
    .filter((value: any) => ["string", "number", "boolean"].includes(typeof value));
}

function sanitizeFormulaProps(value: unknown, propertyMap: Map<any, any>) {
  if (!isPlainObject(value)) return undefined;

  const safeFlags = Object.fromEntries(
    Object.entries(value)
      .filter(([key, enabled]) => propertyMap.has(key) && enabled === true)
      .slice(0, 200)
      .map(([key]) => [key, true]),
  );

  return Object.keys(safeFlags).length ? safeFlags : undefined;
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

function shouldNormalizeTextLiteral(propertyKey: string, propertyDef?: any) {
  return (
    propertyDef?.type === "text" &&
    propertyDef?.propertyType === "Input" &&
    !TEXT_LITERAL_PROPERTY_EXCLUSIONS.has(propertyKey)
  );
}

function looksLikePowerFxExpression(value: string) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return false;

  if (trimmed.startsWith("=")) return true;
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return true;
  }

  if (/^(Parent|Self|ThisItem|ThisRecord|App)\./.test(trimmed)) return true;
  if (/^[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z0-9_]+)+$/.test(trimmed)) return true;
  if (/^[A-Za-z_][A-Za-z0-9_]*\s*\(/.test(trimmed)) return true;
  if (/^[A-Z][A-Za-z0-9_]*\.[A-Z][A-Za-z0-9_]*$/.test(trimmed)) return true;
  if (
    (trimmed.startsWith("[") && trimmed.endsWith("]")) ||
    (trimmed.startsWith("{") && trimmed.endsWith("}"))
  ) {
    return true;
  }

  return trimmed.includes("&") || trimmed.includes(";");
}

function collectKnownNodeNames(lookup: Map<string, any>, extraNodes: any[] = []) {
  const names = new Set<string>();

  for (const node of lookup.values()) {
    const nodeName = String(node?.name || "").trim();
    if (nodeName) names.add(nodeName);
  }

  walkNodes(extraNodes, (node) => {
    const nodeName = String(node?.name || "").trim();
    if (nodeName) names.add(nodeName);
  });

  return names;
}

function getSuspiciousUnknownControlReferences(formula: string, knownNames: Set<string>) {
  const suspiciousRoots = new Set<string>();
  const normalized = String(formula || "");
  const pathMatches = normalized.matchAll(/\b([A-Za-z_][A-Za-z0-9_]*)\s*\.[A-Za-z_][A-Za-z0-9_]*/g);

  for (const match of pathMatches) {
    const rootName = String(match[1] || "").trim();
    if (!rootName) continue;
    if (RESERVED_FORMULA_ROOTS.has(rootName)) continue;
    if (ENUM_ROOTS.has(rootName)) continue;
    if (FUNCTION_NAMES.has(rootName)) continue;
    if (knownNames.has(rootName)) continue;

    const pathText = String(match[0] || "");
    if (!CONTROL_OUTPUT_REFERENCE_HINTS.some((hint) => pathText.includes(hint))) continue;

    suspiciousRoots.add(rootName);
  }

  return [...suspiciousRoots];
}

function normalizeTextLiteralProperty(propertyKey: string, value: string, propertyDef?: any) {
  if (!shouldNormalizeTextLiteral(propertyKey, propertyDef)) return value;
  if (looksLikePowerFxExpression(value)) return value;
  return JSON.stringify(value);
}

function sanitizePropertyValue(type: string, key: string, value: unknown, propertyDef?: any) {
  if (value == null) return undefined;

  const sanitizedStringValue = typeof value === "string" ? sanitizeString(value) : null;
  const normalizedStringValue =
    sanitizedStringValue == null
      ? null
      : normalizeTextLiteralProperty(key, sanitizedStringValue, propertyDef);

  if (type === UNKNOWN_POWERAPPS_TYPE) {
    if (key === "_rawPowerAppsYaml" || key === "sourceControl") {
      return sanitizeString(value, MAX_STRING_LENGTH);
    }
    if (typeof value === "string") return sanitizedStringValue;
    if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
    if (typeof value === "boolean") return value;
    return undefined;
  }

  if (key === "HtmlText" && normalizedStringValue != null) {
    return sanitizeHtmlFragment(normalizedStringValue);
  }

  if (key === "_svg" && sanitizedStringValue != null) {
    return sanitizeSvgFragment(sanitizedStringValue);
  }

  if (normalizedStringValue != null) {
    const sanitized = normalizedStringValue;
    const allowedOptions = getPropertyOptionValues(propertyDef);

    if (allowedOptions.length && !allowedOptions.includes(sanitized)) {
      return undefined;
    }

    return sanitized;
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
  if (rawType !== "App" && rawType !== UNKNOWN_POWERAPPS_TYPE && !SCHEMA_TYPES.has(rawType)) return null;

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

    if (key === "_formulaProps") {
      const safeFormulaProps = sanitizeFormulaProps(value, propertyMap);
      if (safeFormulaProps) sanitized._formulaProps = safeFormulaProps;
      continue;
    }

    if (key === "_svg") {
      const safeSvg = sanitizePropertyValue(rawType, key, value);
      if (safeSvg) sanitized._svg = safeSvg;
      continue;
    }

    if (rawType !== "App" && rawType !== UNKNOWN_POWERAPPS_TYPE && !propertyMap.has(key)) continue;

    const safeValue = sanitizePropertyValue(rawType, key, value, propertyMap.get(key));
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

function sanitizeComponentChanges(type: string, changes: unknown, existingNode?: Record<string, any>) {
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

    if (key === "_formulaProps") {
      const safeFormulaProps = sanitizeFormulaProps(value, propertyMap);
      if (safeFormulaProps) sanitizedChanges._formulaProps = safeFormulaProps;
      continue;
    }

    if (key === "_svg" && type === "Icon") {
      const safeSvg = sanitizePropertyValue(type, key, value, propertyMap.get(key));
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

    if (type !== UNKNOWN_POWERAPPS_TYPE && !propertyMap.has(key)) continue;

    const safeValue = sanitizePropertyValue(type, key, value, propertyMap.get(key));
    if (safeValue !== undefined) {
      sanitizedChanges[key] = safeValue;
    }
  }

  if (!Object.keys(sanitizedChanges).length) return null;

  if (isPlainObject(existingNode)) {
    return getAutoSizedComponentChanges(existingNode, sanitizedChanges);
  }

  return sanitizedChanges;
}

function hasInvalidControlNameReferences(
  nodeType: string,
  changes: Record<string, any>,
  lookup: Map<string, any>,
  extraNodes: any[] = [],
) {
  const propertyMap = getPropertyMapForType(nodeType);
  const knownNames = collectKnownNodeNames(lookup, extraNodes);

  for (const [key, value] of Object.entries(changes || {})) {
    if (typeof value !== "string") continue;
    if (!looksLikePowerFxExpression(value)) continue;
    if (key === "name") continue;

    const propertyDef = propertyMap.get(key);
    const isEventLike =
      propertyDef?.propertyType === "Event" ||
      propertyDef?.type === "event" ||
      key.startsWith("On");
    const isTextFormula = value.trim().startsWith("=") || isEventLike || /[()&+\-*/<>=;[\]{}]/.test(value);
    if (!isTextFormula) continue;

    const suspiciousRoots = getSuspiciousUnknownControlReferences(value, knownNames);
    if (suspiciousRoots.length > 0) {
      return true;
    }
  }

  return false;
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

function isAiAddableComponentSubtree(node: any): boolean {
  if (!node || typeof node !== "object") return false;
  if (!AI_ADDABLE_COMPONENT_TYPE_SET.has(String(node.type || ""))) return false;
  return !Array.isArray(node.children) || node.children.every(isAiAddableComponentSubtree);
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
    if (!isAiAddableComponentSubtree(component)) return null;
    if (hasInvalidControlNameReferences(component.type, component, lookup, [component])) return null;
    autoSizeTextComponents(component);

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

    const changes = sanitizeComponentChanges(existing.type, operation.changes, existing);
    if (!changes) return null;
    if (hasInvalidControlNameReferences(existing.type, changes, lookup)) return null;

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

  if (operation.op === "reorder") {
    const id = sanitizeNodeId(operation.id, "");
    const rawPosition = sanitizeString(operation.position, 20).trim().toLowerCase();
    const positionMap: Record<string, string> = {
      front: "front",
      back: "back",
      forward: "up",
      backward: "down",
      up: "up",
      down: "down",
    };
    const position = positionMap[rawPosition];
    if (!id || !position || !lookup.has(id)) return null;

    return {
      op: "reorder",
      id,
      position,
    };
  }

  return null;
}

export function sanitizeReplyText(value: unknown) {
  return sanitizeString(value, MAX_REPLY_LENGTH).trim() || "Done!";
}

export function sanitizeTweakResult(result: unknown, sourceComponent: any) {
  if (!isPlainObject(sourceComponent)) return null;

  const baseComponent = sanitizeComponentNode(sourceComponent);
  if (!baseComponent) return null;

  const sanitizedChanges = sanitizeComponentChanges(
    sourceComponent.type,
    isPlainObject(result) ? result : {},
    sourceComponent,
  );

  const sanitized = {
    ...baseComponent,
    ...(sanitizedChanges || {}),
    id: sanitizeNodeId(sourceComponent.id, baseComponent.id),
    type: sanitizeString(sourceComponent.type, 40).trim() || baseComponent.type,
    name: sanitizeNodeName(sourceComponent.name, baseComponent.name || baseComponent.type),
  };

  autoSizeTextComponents(sanitized);
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
    canvasTheme: normalizeCanvasThemeState(source.canvasTheme),
  };
}

function trimProjectPreviewTree(nodes: any[], remainingRef: { value: number }): any[] {
  if (!Array.isArray(nodes) || remainingRef.value <= 0) return [];

  const trimmed: any[] = [];

  for (const node of nodes) {
    if (!node || remainingRef.value <= 0) break;
    remainingRef.value -= 1;

    const nextNode = {
      ...node,
      children: trimProjectPreviewTree(node.children || [], remainingRef),
    };

    trimmed.push(nextNode);
  }

  return trimmed;
}

export function sanitizeProjectSummaryRecord(project: any) {
  const sanitized = sanitizeProjectRecord(project);
  const appRoot = Array.isArray(sanitized.tree) ? sanitized.tree[0] : null;
  const firstScreen = Array.isArray(appRoot?.children)
    ? appRoot.children.find((child: any) => child?.type === "Screen") ?? appRoot.children[0] ?? null
    : null;
  const remainingRef = { value: MAX_PROJECT_SUMMARY_PREVIEW_NODES };

  const previewTree =
    appRoot && firstScreen
      ? trimProjectPreviewTree(
          [
            {
              ...appRoot,
              children: [firstScreen],
            },
          ],
          remainingRef,
        )
      : sanitized.tree;

  return {
    id: project?.id ?? null,
    name: sanitized.name,
    canvasW: sanitized.canvasW,
    canvasH: sanitized.canvasH,
    canvasTheme: sanitized.canvasTheme,
    updatedAt: project?.updatedAt ?? null,
    tree: previewTree,
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
    canvasTheme: sanitized.canvasTheme,
  };
}

export function sanitizeProjectId(value: unknown) {
  return sanitizeDocumentId(value);
}
