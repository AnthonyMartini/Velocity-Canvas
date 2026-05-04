"use client";

import { useCallback, useMemo, useState } from "react";
import { Check, Copy, Sparkles } from "lucide-react";
import FormulaInput from "@/components/RendererPage/components/FormulaInput";
import { normalizeFormulaString } from "@/common/helpers";
import { parseFormula, evaluateAST } from "@/features/powerapps/formula-parser";
import { ALL_ENUM_VALUES } from "@/features/powerapps/functions";
import { useAppShell } from "@/features/app/AppShellProvider";
import { notFound } from "next/navigation";

const DEMO_LOCAL_VARS: Record<string, unknown> = {
  unitPrice: 19.99,
  quantity: 3,
  product: { name: "Velocity", sku: "VC-100", inStock: true },
};

/** Walk the formula AST and list control/property paths and bare identifiers in first-seen order. */
function collectFormulaDependencies(node: unknown): string[] {
  const ordered: string[] = [];
  const seen = new Set<string>();

  function visit(n: unknown): void {
    if (!n || typeof n !== "object" || !("type" in (n as object))) return;
    const x = n as {
      type: string;
      value?: string;
      name?: string;
      left?: unknown;
      right?: unknown;
      argument?: unknown;
      arguments?: unknown[];
      fields?: Record<string, unknown>;
      elements?: unknown[];
    };

    switch (x.type) {
      case "PropertyAccess":
        if (typeof x.value === "string" && !seen.has(x.value)) {
          seen.add(x.value);
          ordered.push(x.value);
        }
        return;
      case "VariableAccess":
        if (typeof x.name === "string" && !seen.has(x.name)) {
          seen.add(x.name);
          ordered.push(x.name);
        }
        return;
      case "FunctionCall":
        for (const arg of x.arguments || []) visit(arg);
        return;
      case "BinaryExpression":
        visit(x.left);
        visit(x.right);
        return;
      case "UnaryExpression":
        visit(x.argument);
        return;
      case "ActionSequence":
        visit(x.left);
        visit(x.right);
        return;
      case "RecordLiteral":
        for (const fieldAst of Object.values(x.fields || {})) visit(fieldAst);
        return;
      case "ArrayLiteral":
        for (const el of x.elements || []) visit(el);
        return;
      default:
        return;
    }
  }

  visit(node);
  return ordered;
}

function inferEvaluatedType(value: unknown): string {
  if (value instanceof Error) return "error";
  if (value === "#CYCLE!") return "cycle";
  if (value === null) return "blank";
  if (value === undefined) return "undefined";
  if (value === "") return "blank";
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "number") {
    return Number.isFinite(value) ? "number" : "number (non-finite)";
  }
  if (typeof value === "string") {
    const t = value.trim();
    if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(t)) return "color";
    if (ALL_ENUM_VALUES.has(value)) {
      const dot = value.indexOf(".");
      const enumName = dot > 0 ? value.slice(0, dot) : "unknown";
      return `enum (${enumName})`;
    }
    return "text";
  }
  if (Array.isArray(value)) return "table";
  if (typeof value === "object" && value !== null) {
    const o = value as Record<string, unknown>;
    if (typeof o.type === "string" && typeof o.id === "string" && typeof o.name === "string") {
      return "control";
    }
    return "record";
  }
  return typeof value;
}

function formatEvaluatedPreview(value: unknown, maxLen = 240): string {
  if (value instanceof Error) return value.message;
  if (value === null) return "";
  if (value === undefined) return String(value);
  if (typeof value === "string") return value.length > maxLen ? `${value.slice(0, maxLen)}…` : value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value === "object" && value !== null) {
    const o = value as Record<string, unknown>;
    if (typeof o.type === "string" && typeof o.name === "string") {
      return `{ control: ${String(o.type)}, name: ${JSON.stringify(o.name)} }`;
    }
  }
  try {
    const s = JSON.stringify(value, null, 0);
    return s.length > maxLen ? `${s.slice(0, maxLen)}…` : s;
  } catch {
    return String(value);
  }
}

async function consumeFormulaBuilderStream(res: Response, onStatus?: (m: string) => void): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) throw new Error("Streaming response not available");

  const decoder = new TextDecoder();
  let buffer = "";
  let formula = "";

  const processEvent = (rawEvent: string) => {
    if (!rawEvent.trim()) return;
    let eventName = "message";
    const dataLines: string[] = [];
    for (const line of rawEvent.split(/\r?\n/)) {
      if (line.startsWith("event:")) eventName = line.slice(6).trim();
      if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
    }
    const payload = dataLines.length ? JSON.parse(dataLines.join("\n")) : null;

    if (eventName === "status" && payload?.message) {
      onStatus?.(payload.message);
      return;
    }
    if (eventName === "error") {
      throw new Error(payload?.error || "Formula generation failed");
    }
    if (eventName === "done" && payload?.formula != null) {
      formula = String(payload.formula);
    }
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let boundaryMatch = buffer.match(/\r?\n\r?\n/);
    let boundary = boundaryMatch ? boundaryMatch.index ?? -1 : -1;
    let boundaryLength = boundaryMatch ? boundaryMatch[0].length : 0;
    while (boundary !== -1) {
      const eventBlock = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + boundaryLength);
      processEvent(eventBlock);
      boundaryMatch = buffer.match(/\r?\n\r?\n/);
      boundary = boundaryMatch ? boundaryMatch.index ?? -1 : -1;
      boundaryLength = boundaryMatch ? boundaryMatch[0].length : 0;
    }
  }
  if (buffer.trim()) processEvent(buffer.trim());

  if (!formula.trim()) throw new Error("No formula returned");
  return formula;
}

export default function FormulaBuilderPage() {
  const { user, isAdmin, refreshCredits } = useAppShell();

  if (!isAdmin) {
    return notFound();
  }

  const [formula, setFormula] = useState('Concatenate("Hello", ", ", "world")');
  const [contextMode, setContextMode] = useState<"property" | "behavior">("property");
  const [userRequest, setUserRequest] = useState("");
  const [optionalContext, setOptionalContext] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  const result = useMemo(() => {
    const normalized = normalizeFormulaString(formula);
    if (!normalized.trim()) {
      return {
        astKind: null as string | null,
        resultType: "blank",
        preview: "",
        error: null as string | null,
        propertyFormulaError: null as string | null,
        dependencies: [] as string[],
      };
    }

    let ast: ReturnType<typeof parseFormula>;
    try {
      ast = parseFormula(normalized, true);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return {
        astKind: null,
        resultType: "error",
        preview: "",
        error: msg,
        propertyFormulaError: null,
        dependencies: [] as string[],
      };
    }

    const astKind = (ast as { type?: string })?.type ?? "unknown";
    const dependencies = collectFormulaDependencies(ast);

    const evalContext = {
      isActionContext: contextMode === "behavior",
      screens: [],
    };

    let evaluated: unknown;
    try {
      evaluated = evaluateAST(ast, DEMO_LOCAL_VARS, [], new Set(), null, null, evalContext, false);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return {
        astKind,
        resultType: "error",
        preview: "",
        error: msg,
        propertyFormulaError: null,
        dependencies,
      };
    }

    if (evaluated instanceof Error) {
      return {
        astKind,
        resultType: "error",
        preview: "",
        error: evaluated.message,
        propertyFormulaError: null,
        dependencies,
      };
    }

    let propertyFormulaError: string | null = null;
    if (contextMode === "property" && (ast as { type?: string }).type === "ActionSequence") {
      propertyFormulaError =
        "Actions (semicolon-separated) are not valid in a property formula; switch to behavior formula or use a single expression.";
    }

    const resultType = inferEvaluatedType(evaluated);
    const preview = formatEvaluatedPreview(evaluated);

    return {
      astKind,
      resultType,
      preview,
      error: null as string | null,
      propertyFormulaError,
      dependencies,
    };
  }, [formula, contextMode]);

  const handleGenerate = useCallback(async () => {
    if (!user) return;
    const trimmed = userRequest.trim();
    if (!trimmed) {
      setAiError("Describe what you want the formula to do.");
      return;
    }
    setAiError(null);
    setAiLoading(true);
    setAiStatus(null);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/formula-builder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          message: trimmed,
          context_mode: contextMode,
          optional_context: optionalContext.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `Request failed (${res.status})`);
      }

      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("text/event-stream")) {
        throw new Error("Unexpected response from server");
      }

      const nextFormula = await consumeFormulaBuilderStream(res, (m) => setAiStatus(m));
      setFormula(nextFormula);
      await refreshCredits(user);
    } catch (e: unknown) {
      setAiError(e instanceof Error ? e.message : String(e));
    } finally {
      setAiLoading(false);
      setAiStatus(null);
    }
  }, [user, userRequest, contextMode, optionalContext, refreshCredits]);

  const handleCopyFormula = useCallback(async () => {
    const text = normalizeFormulaString(formula).trim();
    if (!text) return;
    setCopyError(null);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyError("Unable to copy to the clipboard.");
    }
  }, [formula]);

  if (!user) return null;

  const hasError = !!(result.error || result.propertyFormulaError);

  return (
    <div className="flex flex-1 flex-col overflow-auto bg-base">
      <div className="mx-auto w-full max-w-5xl px-8 py-10">
        <div className="mb-8">
          <h2 className="mb-2 text-3xl font-bold tracking-tight text-text">Formula builder</h2>
          <p className="max-w-2xl text-sm text-subtext/80">
            Describe the outcome you want in plain language; the model proposes a Power Fx formula that matches Velocity
            Canvas rules. The playground below uses the same parser and evaluator as the canvas so you can validate,
            tweak with completions, and copy the final expression into your app.
          </p>
        </div>

        <div className="mb-6 rounded-2xl border border-overlay/30 bg-surface/50 p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" aria-hidden />
            <span className="text-xs font-semibold uppercase tracking-wide text-subtext">Generate from description</span>
          </div>
          <p className="mb-4 text-xs text-subtext/70">
            Uses the same supported functions and references as canvas AI (1 credit per generation). Pick property vs
            behavior first so the model matches formula shape.
          </p>

          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-subtext">Target formula kind</span>
            <div className="flex rounded-xl border border-overlay/40 bg-base/80 p-1">
              <button
                type="button"
                onClick={() => setContextMode("property")}
                disabled={aiLoading}
                className={`rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
                  contextMode === "property"
                    ? "bg-accent text-base shadow-md shadow-accent/25"
                    : "text-subtext hover:text-text"
                }`}
              >
                Property formula
              </button>
              <button
                type="button"
                onClick={() => setContextMode("behavior")}
                disabled={aiLoading}
                className={`rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
                  contextMode === "behavior"
                    ? "bg-accent text-base shadow-md shadow-accent/25"
                    : "text-subtext hover:text-text"
                }`}
              >
                Behavior formula
              </button>
            </div>
          </div>

          <label className="mb-2 block text-xs font-medium text-subtext">What should the formula do?</label>
          <textarea
            value={userRequest}
            onChange={(e) => setUserRequest(e.target.value)}
            disabled={aiLoading}
            rows={4}
            placeholder='e.g. "Show the product name, a dash, and the quantity as text" or "If quantity is over 5, success notify, else information notify"'
            className="mb-4 w-full resize-y rounded-xl border border-overlay/40 bg-base/90 px-3 py-2.5 text-sm text-text placeholder:text-subtext/45 focus:border-accent/60 focus:outline-none focus:ring-1 focus:ring-accent/25 disabled:opacity-60"
          />

          <label className="mb-2 block text-xs font-medium text-subtext">
            Optional context (control names, fields, gallery columns…)
          </label>
          <textarea
            value={optionalContext}
            onChange={(e) => setOptionalContext(e.target.value)}
            disabled={aiLoading}
            rows={2}
            placeholder="e.g. Label1 shows unit price; gallery column Cost"
            className="mb-4 w-full resize-y rounded-xl border border-overlay/40 bg-base/90 px-3 py-2.5 text-sm text-text placeholder:text-subtext/45 focus:border-accent/60 focus:outline-none focus:ring-1 focus:ring-accent/25 disabled:opacity-60"
          />

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void handleGenerate()}
              disabled={aiLoading || !userRequest.trim()}
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-base shadow-md shadow-accent/25 transition-all hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4" aria-hidden />
              {aiLoading ? "Generating…" : "Generate formula"}
            </button>
            {aiStatus ? <span className="text-xs text-subtext">{aiStatus}</span> : null}
          </div>

          {aiError ? (
            <div className="mt-4 rounded-lg border border-red/30 bg-red/5 px-3 py-2 text-xs text-red">{aiError}</div>
          ) : null}
        </div>

        <div className="mb-6 rounded-2xl border border-overlay/30 bg-surface/50 p-6 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-subtext">Playground</span>
          </div>
          <p className="mb-4 text-xs text-subtext/70">
            Demo variables:{" "}
            <code className="rounded bg-overlay/25 px-1.5 py-0.5 font-mono text-[11px] text-text">unitPrice</code>,{" "}
            <code className="rounded bg-overlay/25 px-1.5 py-0.5 font-mono text-[11px] text-text">quantity</code>,{" "}
            <code className="rounded bg-overlay/25 px-1.5 py-0.5 font-mono text-[11px] text-text">product</code> (name,
            sku, inStock). Other control paths resolve as blank here but still appear under dependencies.
          </p>

          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <label className="text-xs font-medium text-subtext">Formula</label>
            <button
              type="button"
              onClick={() => void handleCopyFormula()}
              disabled={!normalizeFormulaString(formula).trim()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-overlay/40 bg-base/80 px-3 py-1.5 text-xs font-semibold text-text transition-colors hover:bg-overlay/25 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-green" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
              {copied ? "Copied" : "Copy formula"}
            </button>
          </div>
          {copyError ? <p className="mb-2 text-xs text-red">{copyError}</p> : null}
          <FormulaInput
            value={formula}
            onChange={setFormula}
            hasError={hasError}
            minEditorHeight={220}
            completionExtraIdentifiers={["unitPrice", "quantity", "product"]}
            placeholder='e.g. unitPrice * quantity or Concatenate(product.name, " — ", Text(quantity))'
            className="text-sm"
          />

          <div className="mt-6 grid gap-4 border-t border-overlay/20 pt-6 sm:grid-cols-2">
            <div>
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-subtext">AST root</div>
              <div className="font-mono text-sm text-text">{result.astKind ?? "—"}</div>
            </div>
            <div>
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-subtext">Result type</div>
              <div
                className={`inline-flex rounded-md border px-2.5 py-1 font-mono text-sm font-semibold ${
                  result.resultType === "error" || result.resultType === "cycle"
                    ? "border-red/40 bg-red/10 text-red"
                    : result.resultType === "blank"
                      ? "border-overlay/40 bg-overlay/10 text-subtext"
                      : "border-accent/35 bg-accent/10 text-accent"
                }`}
              >
                {result.resultType}
              </div>
            </div>
            <div className="sm:col-span-2">
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-subtext">
                Dependencies (identifiers and property paths)
              </div>
              <pre className="max-h-32 overflow-auto whitespace-pre-wrap break-all rounded-lg border border-overlay/30 bg-base/80 p-3 font-mono text-xs text-text">
                {result.dependencies.length ? JSON.stringify(result.dependencies, null, 2) : "[]"}
              </pre>
            </div>
          </div>

          {(result.error || result.propertyFormulaError) && (
            <div className="mt-4 rounded-lg border border-red/30 bg-red/5 px-3 py-2 text-xs text-red">
              {result.error || result.propertyFormulaError}
            </div>
          )}

          {!result.error && (
            <div className="mt-4">
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-subtext">Evaluated value</div>
              <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-all rounded-lg border border-overlay/30 bg-base/80 p-3 font-mono text-xs text-text">
                {result.preview === "" && result.resultType === "blank" ? "(empty)" : result.preview}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
