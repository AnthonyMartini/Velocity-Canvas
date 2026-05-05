type ScreenSummaryCollection = {
  controlId: string;
  controlName: string;
  kind: "gallery";
  fields: string[];
  itemsPreview?: string;
};

export type PowerAppsScreenSummary = {
  screenId: string;
  screenName: string;
  topLevelControlCounts: Record<string, number>;
  notablePatterns: string[];
  variables: string[];
  navigationTargets: string[];
  collections: ScreenSummaryCollection[];
  notableFormulas: string[];
};

const STRUCTURAL_KEYS = new Set(["id", "type", "name", "children", "sourceControl"]);
const FORMULA_PROPERTY_PRIORITY = new Set([
  "Items",
  "OnSelect",
  "OnChange",
  "OnCheck",
  "OnUncheck",
  "Visible",
  "Default",
  "DefaultSelectedItems",
  "DefaultDate",
  "Text",
  "HtmlText",
]);

function walkNodes(nodes: any[], visitor: (node: any) => void) {
  for (const node of nodes || []) {
    if (!node || typeof node !== "object") continue;
    visitor(node);
    if (Array.isArray(node.children) && node.children.length > 0) {
      walkNodes(node.children, visitor);
    }
  }
}

function summarizeText(value: string, maxLength = 120) {
  const normalized = String(value || "").replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 3)}...` : normalized;
}

function pushUnique(values: string[], value: string) {
  const normalized = String(value || "").trim();
  if (!normalized || values.includes(normalized)) return;
  values.push(normalized);
}

function looksLikeFormula(value: unknown) {
  if (typeof value !== "string") return false;
  const normalized = value.trim();
  if (!normalized) return false;
  if (normalized.startsWith("=")) return true;
  return (
    /[()&+\-*/<>=;[\]{}]/.test(normalized) ||
    /\b(?:Set|Navigate|Filter|LookUp|Lookup|With|SortByColumns|Collect|ClearCollect|Patch|Search|If|Coalesce|Table)\s*\(/i.test(normalized) ||
    /\b(?:ThisItem|Parent|App)\./.test(normalized)
  );
}

function extractMatches(formula: string, regex: RegExp, target: string[]) {
  regex.lastIndex = 0;
  let match;
  while ((match = regex.exec(formula)) !== null) {
    pushUnique(target, match[1]);
  }
}

function extractThisItemFields(value: unknown, target: string[]) {
  if (typeof value !== "string") return;
  extractMatches(value, /\bThisItem\.([A-Za-z_][A-Za-z0-9_]*)\b/g, target);
}

function buildTopLevelControlCounts(screenNode: any) {
  const counts: Record<string, number> = {};
  for (const child of screenNode?.children || []) {
    const type = String(child?.type || "Unknown");
    counts[type] = (counts[type] || 0) + 1;
  }
  return counts;
}

export function summarizeScreen(screenNode: any): PowerAppsScreenSummary | null {
  if (!screenNode || screenNode.type !== "Screen") return null;

  const variables: string[] = [];
  const navigationTargets: string[] = [];
  const notableFormulas: string[] = [];
  const notablePatterns = new Set<string>();
  const collections: ScreenSummaryCollection[] = [];

  walkNodes(screenNode.children || [], (node) => {
    if (node.type === "Gallery") {
      notablePatterns.add("gallery");
      const fields: string[] = [];
      extractThisItemFields(node.Items, fields);
      walkNodes(node.children || [], (child) => {
        for (const [key, value] of Object.entries(child || {})) {
          if (STRUCTURAL_KEYS.has(key) || key.startsWith("_")) continue;
          extractThisItemFields(value, fields);
        }
      });

      collections.push({
        controlId: String(node.id || ""),
        controlName: String(node.name || node.id || "Gallery"),
        kind: "gallery",
        fields: fields.slice(0, 8),
        itemsPreview: typeof node.Items === "string" ? summarizeText(node.Items, 100) : undefined,
      });
    }

    if (node.type === "TextInput" || node.type === "Dropdown" || node.type === "ComboBox" || node.type === "ListBox") {
      notablePatterns.add("input");
    }
    if (node.type === "Button" || node.type === "ModernTabList") {
      notablePatterns.add("navigation-or-actions");
    }

    for (const [key, value] of Object.entries(node || {})) {
      if (STRUCTURAL_KEYS.has(key) || key.startsWith("_")) continue;
      if (typeof value !== "string" || !looksLikeFormula(value)) continue;

      extractMatches(value, /\bSet\s*\(\s*([A-Za-z_][A-Za-z0-9_]*)\s*,/gi, variables);
      extractMatches(value, /\bNavigate\s*\(\s*([A-Za-z_][A-Za-z0-9_]*)/gi, navigationTargets);

      if (FORMULA_PROPERTY_PRIORITY.has(key)) {
        pushUnique(notableFormulas, `${node.name || node.id}.${key}: ${summarizeText(value, 140)}`);
      }
    }
  });

  if (Object.keys(buildTopLevelControlCounts(screenNode)).some((type) => type === "Gallery")) {
    notablePatterns.add("repeated-data");
  }
  if (navigationTargets.length > 0) {
    notablePatterns.add("navigation");
  }
  if (variables.length > 0) {
    notablePatterns.add("state");
  }

  return {
    screenId: String(screenNode.id || ""),
    screenName: String(screenNode.name || screenNode.id || "Screen"),
    topLevelControlCounts: buildTopLevelControlCounts(screenNode),
    notablePatterns: [...notablePatterns],
    variables: variables.slice(0, 10),
    navigationTargets: navigationTargets.slice(0, 10),
    collections: collections.slice(0, 4),
    notableFormulas: notableFormulas.slice(0, 12),
  };
}

export function summarizeOtherScreens(tree: any[], activeScreenId: string | null | undefined): PowerAppsScreenSummary[] {
  const appNode = Array.isArray(tree) ? tree.find((node) => node?.type === "App") : null;
  const screens = appNode?.children || (Array.isArray(tree) ? tree.filter((node) => node?.type === "Screen") : []);

  return screens
    .filter((screen: any) => screen?.id && screen.id !== activeScreenId)
    .map((screen: any) => summarizeScreen(screen))
    .filter(Boolean) as PowerAppsScreenSummary[];
}
