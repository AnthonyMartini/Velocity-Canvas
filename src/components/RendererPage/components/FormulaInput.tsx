import { useCallback, useEffect, useRef, useState, type FocusEvent, type KeyboardEvent } from "react";
import Editor from "react-simple-code-editor";
import { FUNCTIONS } from "../Functions";
import {
  buildFormulaCompletions,
  getFormulaCompletionContext,
  type FormulaCompletionItem,
} from "@/features/powerapps/formulaCompletions";

const categoryStyle: Record<FormulaCompletionItem["category"], string> = {
  function: "text-accent/90",
  variable: "text-blue-400",
  keyword: "text-orange-400",
  property: "text-purple-400",
  enum: "text-pink-400",
  control: "text-blue-400",
};

const categoryLabel: Record<FormulaCompletionItem["category"], string> = {
  function: "fn",
  variable: "var",
  keyword: "kw",
  property: "prop",
  enum: "enum",
  control: "ctl",
};

export default function FormulaInput({
  value,
  onChange,
  onBlur,
  onFocus,
  className = "",
  placeholder = "",
  onKeyDown,
  hasError,
  validationTone = "error",
  minEditorHeight = 28,
  /** When true (default), show function / control / property / enum suggestions while typing. */
  enableCompletions = true,
  /** Extra root identifiers (e.g. control names and `localVars` keys from the canvas). */
  completionExtraIdentifiers,
}: {
  value: string;
  onChange: (next: string) => void;
  onBlur?: (e: FocusEvent<Element>) => void;
  /** Fires when the editor receives focus (after internal focus state updates). */
  onFocus?: () => void;
  className?: string;
  placeholder?: string;
  onKeyDown?: (e: KeyboardEvent) => void;
  hasError?: boolean;
  validationTone?: "error" | "warning";
  minEditorHeight?: number;
  enableCompletions?: boolean;
  completionExtraIdentifiers?: string[];
}) {
  const [isFocused, setIsFocused] = useState(false);
  const [open, setOpen] = useState(false);
  const [completions, setCompletions] = useState<FormulaCompletionItem[]>([]);
  /** -1 = no keyboard selection; Enter/Tab only apply after ↑↓ (or hover highlights a row). */
  const [activeIndex, setActiveIndex] = useState(-1);
  const editorRef = useRef(null);
  const rootRef = useRef<HTMLDivElement>(null);
  /** After ↑↓ list nav or Esc to close, skip `onKeyUp` → `syncCompletions` so we don't reset `activeIndex` or reopen the list. */
  const skipNextCompletionSyncAfterKeyUpRef = useRef(false);
  const valueRef = useRef(value);
  valueRef.current = value;

  const syncCompletions = useCallback(
    (textOverride?: string, cursorOverride?: number) => {
      if (!enableCompletions) return;
      const ta = rootRef.current?.querySelector<HTMLTextAreaElement>("textarea");
      const text = textOverride ?? valueRef.current;
      const cursor = cursorOverride ?? ta?.selectionStart ?? text.length;
      const ctx = getFormulaCompletionContext(text, cursor);
      if (!ctx) {
        setOpen(false);
        setCompletions([]);
        return;
      }
      const items = buildFormulaCompletions(ctx, { extraIdentifiers: completionExtraIdentifiers });
      if (items.length === 0) {
        setOpen(false);
        setCompletions([]);
        return;
      }
      setCompletions(items.slice(0, 50));
      setActiveIndex(-1);
      setOpen(true);
    },
    [enableCompletions, completionExtraIdentifiers],
  );

  const applyCompletion = useCallback(
    (item: FormulaCompletionItem) => {
      if (!enableCompletions) return;
      const ta = rootRef.current?.querySelector<HTMLTextAreaElement>("textarea");
      const text = valueRef.current;
      const cursor = ta?.selectionStart ?? text.length;
      const ctx = getFormulaCompletionContext(text, cursor);
      if (!ctx) return;

      const next = text.slice(0, ctx.replaceStart) + item.insert + text.slice(ctx.replaceEnd);
      onChange(next);
      const pos = ctx.replaceStart + item.insert.length;
      requestAnimationFrame(() => {
        const t2 = rootRef.current?.querySelector<HTMLTextAreaElement>("textarea");
        if (t2) {
          t2.focus();
          t2.setSelectionRange(pos, pos);
        }
        syncCompletions(next, pos);
      });
    },
    [onChange, syncCompletions, enableCompletions],
  );

  useEffect(() => {
    if (!enableCompletions || !open) return;
    const close = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open, enableCompletions]);

  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!enableCompletions || !open) return;
    const el = listRef.current?.querySelector(`[data-index="${activeIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open, enableCompletions]);

  const handleKeyDownCapture = (e: KeyboardEvent) => {
    if (!enableCompletions || !open || completions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      e.stopPropagation();
      skipNextCompletionSyncAfterKeyUpRef.current = true;
      setActiveIndex((i) => Math.min(i < 0 ? 0 : i + 1, completions.length - 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      e.stopPropagation();
      skipNextCompletionSyncAfterKeyUpRef.current = true;
      setActiveIndex((i) => (i <= 0 ? -1 : i - 1));
      return;
    }
    if (e.key === "Enter" || e.key === "Tab") {
      if (activeIndex < 0 || activeIndex >= completions.length) return;
      e.preventDefault();
      e.stopPropagation();
      applyCompletion(completions[activeIndex]);
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      skipNextCompletionSyncAfterKeyUpRef.current = true;
      setOpen(false);
    }
  };

  const renderHighlightedFormula = (text: string) => {
    if (!text) return null;

    const tokenRegex =
      /("[^"]*"|'[^']*')|([A-Za-z_][A-Za-z0-9_]*\.[A-Za-z_][A-Za-z0-9_]*)|([A-Za-z_][A-Za-z0-9_]*)(?=\s*\()|([A-Z][A-Za-z0-9_]*)|(\W+)/g;

    const tokens: { text: string; type: string }[] = [];
    let match: RegExpExecArray | null;
    let lastIndex = 0;

    while ((match = tokenRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        tokens.push({ text: text.substring(lastIndex, match.index), type: "normal" });
      }

      const [fullMatch, , isCompProp, isFunc, isVar] = match;

      let type = "normal";
      if (match[1]) type = "string";
      else if (isCompProp) type = "compProp";
      else if (isFunc) type = "function";
      else if (isVar) {
        const isKnownFunc = FUNCTIONS.some((f) => f.name.toLowerCase() === fullMatch.toLowerCase());
        type = isKnownFunc ? "function" : "variable";
      } else if (match[5]) type = "symbol";

      tokens.push({ text: fullMatch, type });
      lastIndex = tokenRegex.lastIndex;
    }

    if (lastIndex < text.length) {
      tokens.push({ text: text.substring(lastIndex), type: "normal" });
    }

    return tokens.map((t, i) => {
      if (t.type === "string") return <span key={i} className="text-green-400">{t.text}</span>;
      if (t.type === "compProp") {
        const dot = t.text.indexOf(".");
        const comp = dot >= 0 ? t.text.slice(0, dot) : t.text;
        const prop = dot >= 0 ? t.text.slice(dot + 1) : "";
        return (
          <span key={i}>
            <span className="text-pink-400">{comp}</span>
            <span className="text-subtext">.</span>
            <span className="text-purple-400">{prop}</span>
          </span>
        );
      }
      if (t.type === "function") return <span key={i} className="text-accent">{t.text}</span>;
      if (t.type === "variable") {
        if (t.text === "True" || t.text === "False") return <span key={i} className="text-orange-400">{t.text}</span>;
        return <span key={i} className="text-blue-400">{t.text}</span>;
      }
      if (t.type === "symbol") return <span key={i} className="text-subtext/70">{t.text}</span>;

      return <span key={i} className="text-text">{t.text}</span>;
    });
  };

  const highlight = (code: string) => {
    return <>{renderHighlightedFormula(code)}</>;
  };

  const sharedStyle = {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    fontSize: "0.75rem",
    lineHeight: "1.25rem",
    minHeight: `${minEditorHeight}px`,
  };

  const frameClass =
    hasError
      ? validationTone === "warning"
        ? "border-amber-400/80 bg-amber-500/5 ring-1 ring-amber-500/20"
        : "border-red/100 bg-red-500/5 ring-1 ring-red-500/20"
      : isFocused
        ? "border-accent/60 ring-1 ring-accent/20"
        : "border-overlay/40";

  return (
    <div
      ref={enableCompletions ? rootRef : undefined}
      className={`relative flex flex-col font-mono bg-base overflow-hidden transition-colors duration-200 border rounded-md ${frameClass} ${className}`}
      onKeyDown={onKeyDown}
      onKeyDownCapture={enableCompletions ? handleKeyDownCapture : undefined}
    >
      <div className="relative min-h-0 flex-1">
        <Editor
          ref={editorRef}
          value={String(value || "")}
          onValueChange={(v) => {
            onChange(v);
            if (enableCompletions) requestAnimationFrame(() => syncCompletions(v));
          }}
          highlight={highlight}
          padding={4}
          onBlur={(e: FocusEvent<Element>) => {
            setIsFocused(false);
            if (enableCompletions) {
              const related = e.relatedTarget as Node | null;
              if (rootRef.current && related && rootRef.current.contains(related)) {
                // keep suggestions when moving to list
              } else {
                setOpen(false);
              }
            }
            onBlur?.(e);
          }}
          onFocus={() => {
            setIsFocused(true);
            onFocus?.();
            if (enableCompletions) requestAnimationFrame(() => syncCompletions());
          }}
          textareaClassName="focus:outline-none placeholder-subtext/40"
          tabSize={2}
          insertSpaces={true}
          className="w-full text-xs"
          style={sharedStyle}
          onKeyUp={
            enableCompletions
              ? () =>
                  requestAnimationFrame(() => {
                    if (skipNextCompletionSyncAfterKeyUpRef.current) {
                      skipNextCompletionSyncAfterKeyUpRef.current = false;
                      return;
                    }
                    syncCompletions();
                  })
              : undefined
          }
          onClick={enableCompletions ? () => requestAnimationFrame(() => syncCompletions()) : undefined}
          onSelect={enableCompletions ? () => requestAnimationFrame(() => syncCompletions()) : undefined}
        />
        {!value && placeholder && !isFocused && (
          <div className="absolute inset-0 px-2 flex items-center pointer-events-none text-xs text-subtext/40">
            {placeholder}
          </div>
        )}
      </div>

      {enableCompletions && open && completions.length > 0 && (
        <div className="z-30 shrink-0 border-t border-overlay/40 bg-surface/95">
          <div className="border-b border-overlay/25 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-subtext">
            Suggestions (↑↓ select · Enter/Tab apply · Esc)
          </div>
          <div ref={listRef} className="max-h-36 overflow-y-auto py-0.5">
            {completions.map((item, index) => (
              <button
                key={`${item.category}-${item.label}-${index}`}
                type="button"
                data-index={index}
                className={`flex w-full items-center gap-2 px-2 py-1 text-left text-[11px] transition-colors ${
                  activeIndex >= 0 && index === activeIndex ? "bg-accent/15 text-text" : "text-text hover:bg-overlay/25"
                }`}
                onMouseDown={(ev) => ev.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => applyCompletion(item)}
              >
                <span className={`w-7 shrink-0 font-mono text-[9px] font-bold uppercase ${categoryStyle[item.category]}`}>
                  {categoryLabel[item.category]}
                </span>
                <span className="min-w-0 flex-1 truncate font-mono">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
