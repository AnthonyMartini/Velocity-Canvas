import {
  Align,
  BorderStyle,
  DateTimeFormat,
  DisplayMode,
  DropShadow,
  FontWeight,
  FUNCTIONS,
  Icon,
  Layout,
  LayoutDirection,
  ModernButtonAppearance,
  ModernButtonIconStyle,
  ModernButtonLayout,
  NotificationType,
  Overflow,
  StartOfWeek,
  TabListAlignment,
  TabListAppearance,
  TabSize,
  TextFormat,
  TextMode,
  VerticalAlign,
} from "@/features/powerapps/functions";
import { SCHEMAS } from "@/features/powerapps/schema";

const KEYWORD_NAMES = ["true", "false", "Self", "Parent", "ThisItem", "ThisRecord"] as const;

/** Enum roots available after `Name.`. */
export const FORMULA_ENUM_ROOTS: Record<string, Record<string, string>> = {
  NotificationType,
  StartOfWeek,
  Align,
  VerticalAlign,
  FontWeight,
  BorderStyle,
  DisplayMode,
  DateTimeFormat,
  ModernButtonAppearance,
  ModernButtonLayout,
  ModernButtonIconStyle,
  TabListAlignment,
  LayoutDirection,
  TabListAppearance,
  TabSize,
  Overflow,
  DropShadow,
  TextMode,
  TextFormat,
  Layout,
  Icon,
};

export type FormulaCompletionItem = {
  label: string;
  insert: string;
  category: "function" | "variable" | "keyword" | "property" | "enum" | "control";
};

export type FormulaCompletionContext = {
  mode: "root" | "member";
  base: string;
  queryLower: string;
  replaceStart: number;
  replaceEnd: number;
};

function getAllSchemaPropertyNames(): string[] {
  const set = new Set<string>();
  for (const schema of Object.values(SCHEMAS)) {
    const s = schema as {
      groups?: { properties?: { key?: string; name?: string }[] }[];
      properties?: { key?: string; name?: string }[];
    };
    const props = s?.groups ? s.groups.flatMap((g) => g.properties || []) : s?.properties || [];
    for (const p of props) {
      const k = p.key || p.name;
      if (k && typeof k === "string" && !k.startsWith("_")) set.add(k);
    }
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

let cachedSchemaProps: string[] | null = null;

function schemaPropertyNames(): string[] {
  if (!cachedSchemaProps) cachedSchemaProps = getAllSchemaPropertyNames();
  return cachedSchemaProps;
}

export function getFormulaCompletionContext(text: string, cursor: number): FormulaCompletionContext | null {
  const before = text.slice(0, Math.min(cursor, text.length));
  const member = /(?:^|[^A-Za-z0-9_])([A-Za-z_][A-Za-z0-9_]*)\.([A-Za-z0-9_]*)$/.exec(before);
  if (member) {
    const base = member[1];
    const partial = member[2];
    return {
      mode: "member",
      base,
      queryLower: partial.toLowerCase(),
      replaceStart: cursor - partial.length,
      replaceEnd: cursor,
    };
  }
  const root = /([A-Za-z_][A-Za-z0-9_]*)$/.exec(before);
  if (!root) return null;
  const raw = root[1];
  return {
    mode: "root",
    base: "",
    queryLower: raw.toLowerCase(),
    replaceStart: cursor - raw.length,
    replaceEnd: cursor,
  };
}

export type BuildFormulaCompletionsOptions = {
  /** Control names, `localVars` keys, or other identifiers to suggest at the root. */
  extraIdentifiers?: string[];
};

export function buildFormulaCompletions(
  ctx: FormulaCompletionContext,
  options?: BuildFormulaCompletionsOptions,
): FormulaCompletionItem[] {
  const q = ctx.queryLower;
  const starts = (label: string) => label.toLowerCase().startsWith(q);
  const extra = options?.extraIdentifiers?.filter((s) => typeof s === "string" && s.length > 0) ?? [];

  if (ctx.mode === "member") {
    const enumObj = FORMULA_ENUM_ROOTS[ctx.base];
    if (enumObj) {
      return Object.keys(enumObj)
        .filter((k) => k.toLowerCase().startsWith(q))
        .map((k) => ({
          label: `${ctx.base}.${k}`,
          insert: k,
          category: "enum" as const,
        }));
    }
    return schemaPropertyNames()
      .filter((name) => name.toLowerCase().startsWith(q))
      .map((name) => ({
        label: `${ctx.base}.${name}`,
        insert: name,
        category: "property" as const,
      }));
  }

  const out: FormulaCompletionItem[] = [];
  const seen = new Set<string>();

  for (const f of FUNCTIONS) {
    if (!starts(f.name)) continue;
    const key = `fn:${f.name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ label: f.name, insert: f.name, category: "function" });
  }
  for (const id of extra) {
    if (!starts(id)) continue;
    const key = `c:${id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ label: id, insert: id, category: "control" });
  }
  for (const k of KEYWORD_NAMES) {
    if (!starts(k)) continue;
    const key = `kw:${k}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ label: k, insert: k, category: "keyword" });
  }
  for (const name of Object.keys(FORMULA_ENUM_ROOTS)) {
    if (!starts(name)) continue;
    const key = `en:${name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ label: name, insert: name, category: "enum" });
  }

  out.sort((a, b) => {
    const rank = (c: FormulaCompletionItem["category"]) => {
      if (c === "function") return 0;
      if (c === "control") return 1;
      if (c === "keyword") return 2;
      return 3;
    };
    const d = rank(a.category) - rank(b.category);
    if (d !== 0) return d;
    return a.label.localeCompare(b.label);
  });
  return out;
}
