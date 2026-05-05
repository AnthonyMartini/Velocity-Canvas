import { NextResponse } from "next/server";
import { rendererChatModel, RENDERER_CHAT_MODEL_NAME } from "@/lib/gemini";
import { SUPPORTED_ICON_ENUM_VALUES } from "@/features/powerapps/ai-constraints";
import { AI_PROMPT_COMPONENT_RULES_TEXT } from "@/features/powerapps/ai-prompt-access";
import { TEXT_SIZING_RUNTIME_GUIDE } from "@/features/powerapps/text-sizing";
import { RENDERER_CHAT_SYSTEM_PROMPT } from "@/lib/prompts";
import { verifyIdToken, checkAndDeductCredit, logTokenUsage } from "@/lib/firebase-admin";
import { applyPatchToLookup, buildNodeLookup, sanitizeRendererPatch, sanitizeReplyText } from "@/lib/component-security";
import { normalizeSingleQuotedStringLiteralsDeep } from "@/lib/powerfx-string-normalization";

const SSE_HEADERS = {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  "X-Accel-Buffering": "no",
  "Content-Encoding": "none",
  Connection: "keep-alive",
};
const ALLOWED_RENDERER_CHAT_MODELS = new Set([
  "gemini-3-flash-preview",
  "gemini-3.1-pro-preview",
]);
const ALLOWED_IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_BYTES = 450 * 1024;
const RENDERER_CHAT_MODEL_CREDIT_COST = {
  "gemini-3-flash-preview": 5,
  "gemini-3.1-pro-preview": 10,
};

type OtherScreenSummary = {
  screenId?: string;
  screenName?: string;
  topLevelControlCounts?: Record<string, number>;
  notablePatterns?: string[];
  variables?: string[];
  navigationTargets?: string[];
  collections?: Array<{
    controlId?: string;
    controlName?: string;
    kind?: string;
    fields?: string[];
    itemsPreview?: string;
  }>;
  notableFormulas?: string[];
};

function estimateBase64Bytes(base64 = "") {
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
}

function parseJsonFromText(rawText) {
  const start = rawText.indexOf("{");
  const end = rawText.lastIndexOf("}");

  if (start === -1 || end === -1 || end < start) {
    throw new Error("Invalid JSON from AI");
  }

  return JSON.parse(rawText.substring(start, end + 1).trim());
}

function countComponents(nodes = []) {
  let count = 0;

  const walk = (items) => {
    for (const item of items || []) {
      count += 1;
      if (item?.children?.length) walk(item.children);
    }
  };

  walk(nodes);
  return count;
}

function readComponentProp(component, ...keys) {
  for (const key of keys) {
    if (component?.[key] !== undefined && component?.[key] !== null) {
      return component[key];
    }
  }

  return undefined;
}

function summarizeItemsForPrompt(items) {
  if (Array.isArray(items)) {
    return `array(${items.length})`;
  }

  if (typeof items === "string") {
    return items.length > 120 ? `${items.slice(0, 117)}...` : items;
  }

  return undefined;
}

function summarizeCountsForPrompt(counts: Record<string, number> | undefined) {
  const entries = Object.entries(counts || {}).sort((left, right) => right[1] - left[1]);
  if (entries.length === 0) return "none";
  return entries
    .slice(0, 8)
    .map(([type, count]) => `${type}=${count}`)
    .join(", ");
}

function buildOtherScreenSummaryLines(summaries: OtherScreenSummary[] = []) {
  if (!Array.isArray(summaries) || summaries.length === 0) {
    return "";
  }

  const lines = [
    "Other screens are provided as read-only context only. Do not edit them, move components onto them, or create new screens unless the user explicitly asks.",
    "Other screen summaries:",
  ];

  summaries.slice(0, 8).forEach((summary, index) => {
    lines.push(
      `${index + 1}. ${summary.screenName || summary.screenId || "Screen"} (id="${summary.screenId || "unknown"}")`
    );
    lines.push(`   - top-level controls: ${summarizeCountsForPrompt(summary.topLevelControlCounts)}`);
    if (summary.notablePatterns?.length) {
      lines.push(`   - patterns: ${summary.notablePatterns.join(", ")}`);
    }
    if (summary.variables?.length) {
      lines.push(`   - variables: ${summary.variables.join(", ")}`);
    }
    if (summary.navigationTargets?.length) {
      lines.push(`   - navigation targets: ${summary.navigationTargets.join(", ")}`);
    }
    if (summary.collections?.length) {
      summary.collections.slice(0, 2).forEach((collection) => {
        lines.push(
          `   - ${collection.kind || "collection"} ${collection.controlName || collection.controlId || "unnamed"} fields: ${(collection.fields || []).join(", ") || "unknown"}`
        );
        if (collection.itemsPreview) {
          lines.push(`     items: ${collection.itemsPreview}`);
        }
      });
    }
    if (summary.notableFormulas?.length) {
      summary.notableFormulas.slice(0, 3).forEach((formula) => {
        lines.push(`   - formula: ${formula}`);
      });
    }
  });

  return lines.join("\n");
}

const ENGINE_COMPATIBILITY_PROMPT = [
  "Engine compatibility constraints:",
  AI_PROMPT_COMPONENT_RULES_TEXT,
  "- Follow the component/property allowlist from the system prompt for every add and update.",
  '- ModernTabList is the only allowed modern control exception. Do not add other modern controls or modern-only properties.',
  '- Parent references are limited to "Parent.Width", "Parent.Height", "Parent.TemplateWidth", and "Parent.TemplateHeight" only.',
  '- "Parent.TemplateWidth" and "Parent.TemplateHeight" are only valid for children inside a Gallery.',
  '- For a vertical gallery, Parent.TemplateHeight = Parent.TemplateSize and Parent.TemplateWidth = Parent.Width. For a horizontal gallery, Parent.TemplateWidth = Parent.TemplateSize and Parent.TemplateHeight = Parent.Height.',
  '- Never use unsupported Power Apps runtime references such as "Parent.X", "Parent.Y", or "Self.*". The only supported App path is "App.Theme.*".',
  '- If you need gallery or container layout math, use numeric X/Y/Width/Height values plus supported Gallery properties like TemplateSize, TemplatePadding, and WrapCount.',
  '- For ModernTabList, Alignment must be one of "LayoutDirection.Horizontal" or "LayoutDirection.Vertical".',
  '- For ModernTabList, Appearance must be one of "TabListAppearance.Transparent", "TabListAppearance.Subtle", "TabListAppearance.SubtleCircular", or "TabListAppearance.FilledCircular".',
  '- For ModernTabList, TabSize must be one of "TabSize.Small", "TabSize.Medium", or "TabSize.Large".',
  '- For ModernTabList, Default and Selected must be a record with a Value field (use a JSON string like "{\\"Value\\":\\"Overview\\"}" in the component JSON).',
  `- For Icon controls, Icon must be one of these exact enum strings: ${SUPPORTED_ICON_ENUM_VALUES.map((value) => `"${value}"`).join(", ")}.`,
  '- For Image controls, do not use URLs, media names, uploaded assets, custom SVG, or source properties. Images are fixed cloud placeholders in this renderer.',
  '- Use double quotes for string literals in component properties and formulas. Never emit single-quoted strings.',
  '- When referencing another control in a formula, use that control\'s exact existing "name" from the canvas context. Never invent aliases, abbreviations, or renamed references.',
  '- If you create a control and need to reference it in the same response, set an explicit stable "name" on that control first and then use that exact same name in every formula reference.',
  '- Prefer locally previewable formulas when they are sufficient, but richer Power Apps functions such as With, Filter, LookUp, Search, SortByColumns, Collect, ClearCollect, and Patch are allowed when they materially improve export quality. Those formulas may be preview-limited locally.',
  '- If the user asks to put one control above or below another, that is a z-order change. Use a reorder patch rather than trying to fake layering with position edits alone.',
].join("\n");

function buildComponentPromptLine(component, { indent = "", siblingIndex = 0, parentId = "screen" } = {}) {
  const x = readComponentProp(component, "X", "x") ?? 0;
  const y = readComponentProp(component, "Y", "y") ?? 0;
  const width = readComponentProp(component, "Width", "width") ?? 0;
  const height = readComponentProp(component, "Height", "height") ?? 0;
  const text = readComponentProp(component, "Text", "text");
  const hintText = readComponentProp(component, "HintText", "hintText");
  const defaultValue = readComponentProp(component, "Default", "default");
  const variant = readComponentProp(component, "Variant", "variant");
  const items = summarizeItemsForPrompt(readComponentProp(component, "Items", "items"));
  const childCount = Array.isArray(component?.children) ? component.children.length : 0;

  let line =
    `${indent}- ID: "${component.id}", Type: "${component.type}", siblingIndex=${siblingIndex}, parentId="${parentId}", ` +
    `X=${x}, Y=${y}, Width=${width}, Height=${height}`;

  if (component?.name) line += `, name="${component.name}"`;
  if (text) line += `, Text=${JSON.stringify(text)}`;
  if (hintText) line += `, HintText=${JSON.stringify(hintText)}`;
  if (defaultValue) line += `, Default=${JSON.stringify(defaultValue)}`;
  if (variant) line += `, Variant="${variant}"`;
  if (items) line += `, Items=${JSON.stringify(items)}`;
  if (childCount) line += `, childCount=${childCount}`;
  if (component?.type === "Gallery" && childCount) line += `, templateChildren=${childCount}`;

  return line;
}

function emitLegacyResultAsPatchEvents(legacyPayload, emitOperation, send) {
  if (legacyPayload?.reply) {
    send("reply", { text: sanitizeReplyText(legacyPayload.reply) });
  }

  for (const id of legacyPayload?.components_to_remove || []) {
    emitOperation({ op: "remove", id });
  }

  for (const item of legacyPayload?.components_to_reparent || []) {
    if (item?.id && item?.newParentId) {
      emitOperation({ op: "reparent", id: item.id, newParentId: item.newParentId });
    }
  }

  for (const item of legacyPayload?.components_to_reorder || []) {
    if (item?.id && item?.position) {
      emitOperation({ op: "reorder", id: item.id, position: item.position });
    }
  }

  for (const item of legacyPayload?.components_to_update || []) {
    if (!item?.id) continue;
    const { id, ...changes } = item;
    emitOperation({ op: "update", id, changes });
  }

  for (const component of legacyPayload?.components_to_add || []) {
    emitOperation({ op: "add", component, parentId: component?.parentId || null });
  }

  send("done", { reply: sanitizeReplyText(legacyPayload?.reply) });
}

function finalizeRendererStream({ rawText, sawStructuredOps, sawDone, emitOperation, send }) {
  if (!sawStructuredOps) {
    const parsedPayload = parseJsonFromText(rawText);
    const legacyPayload = normalizeSingleQuotedStringLiteralsDeep(parsedPayload);
    emitLegacyResultAsPatchEvents(legacyPayload, emitOperation, send);
    return;
  }

  if (!sawDone) {
    send("done", { reply: "Done!" });
  }
}

function parseStreamOperation(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed === "```" || trimmed === "```json") return null;
  if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) return null;

  try {
    const parsed = JSON.parse(trimmed);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

function extractCompleteJsonObjects(buffer) {
  const objects: string[] = [];
  let startIndex = -1;
  let depth = 0;
  let inString = false;
  let escaping = false;
  let lastProcessedIndex = 0;

  for (let i = 0; i < buffer.length; i += 1) {
    const char = buffer[i];

    if (inString) {
      if (escaping) {
        escaping = false;
        continue;
      }
      if (char === "\\") {
        escaping = true;
        continue;
      }
      if (char === "\"") {
        inString = false;
      }
      continue;
    }

    if (char === "\"") {
      inString = true;
      continue;
    }

    if (char === "{") {
      if (depth === 0) startIndex = i;
      depth += 1;
      continue;
    }

    if (char === "}" && depth > 0) {
      depth -= 1;
      if (depth === 0 && startIndex !== -1) {
        objects.push(buffer.slice(startIndex, i + 1));
        lastProcessedIndex = i + 1;
        startIndex = -1;
      }
    }
  }

  const remainder = depth > 0 && startIndex !== -1
    ? buffer.slice(startIndex)
    : buffer.slice(lastProcessedIndex);

  return { objects, remainder };
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req) {
  const requestStartedAt = Date.now();

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized: Missing ID Token" }, { status: 401 });
    }

    const idToken = authHeader.split("Bearer ")[1];
    const uid = await verifyIdToken(idToken);

    if (!uid) {
      return NextResponse.json({ error: "Unauthorized: Invalid ID Token" }, { status: 401 });
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid or oversized request body. Try a smaller screenshot." },
        { status: 400 }
      );
    }

    const { message, canvas_components, active_screen_id, active_screen_name, other_screen_summaries, canvas_width, canvas_height, image_data, image_mime_type, chat_history, model } =
      body || {};

    const requestedModel = ALLOWED_RENDERER_CHAT_MODELS.has(model) ? model : RENDERER_CHAT_MODEL_NAME;
    const creditCost = RENDERER_CHAT_MODEL_CREDIT_COST[requestedModel] ?? 5;

    const creditResult = await checkAndDeductCredit(uid, "Canvas Editor AI Chat", creditCost);
    if (!creditResult.success) {
      return NextResponse.json(
        {
          error: creditResult.error || "Insufficient credits",
          credits: creditResult.credits,
        },
        { status: 403 }
      );
    }

    if (typeof message !== "string" || !message.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    if (image_data != null) {
      if (typeof image_data !== "string" || !image_data.trim()) {
        return NextResponse.json({ error: "Attached image data is invalid." }, { status: 400 });
      }
      if (!ALLOWED_IMAGE_MIME_TYPES.has(image_mime_type)) {
        return NextResponse.json({ error: "Attached image type is not supported." }, { status: 400 });
      }
      if (estimateBase64Bytes(image_data) > MAX_IMAGE_BYTES) {
        return NextResponse.json(
          { error: "Attached screenshot is too large. Try a smaller or more compressed image." },
          { status: 413 }
        );
      }
    }

    if (chat_history != null && !Array.isArray(chat_history)) {
      return NextResponse.json({ error: "Chat history payload is invalid." }, { status: 400 });
    }

    const screenParentId = active_screen_id || "screen";
    const nodeLookup = buildNodeLookup([
      {
        id: screenParentId,
        type: "Screen",
        name: "ActiveScreen",
        children: Array.isArray(canvas_components) ? canvas_components : [],
      },
    ]);
    let canvas_ctx = `Canvas size: ${canvas_width} x ${canvas_height} px.\n`;
    canvas_ctx += `Active screen id: "${screenParentId}".`;
    if (active_screen_name) {
      canvas_ctx += ` Active screen name: "${active_screen_name}".`;
    }
    canvas_ctx += ` Only edit the active screen unless the user explicitly names another existing screen. Do not create new screens, modify navigation, or move components across screens unless the user explicitly asks.\n`;
    if (canvas_components && canvas_components.length > 0) {
      const comp_lines: string[] = [];
      const processComponent = (c, indent = "", siblingIndex = 0, parentId = screenParentId) => {
        comp_lines.push(buildComponentPromptLine(c, { indent, siblingIndex, parentId }));
        if (c.children) {
          c.children.forEach((child, i) => processComponent(child, indent + "  ", i, c.id));
        }
      };
      canvas_components.forEach((c, i) => processComponent(c, "", i, screenParentId));
      canvas_ctx +=
        "Current components (higher siblingIndex renders in front within the same parent; each parent branch layers as one grouped stack against its siblings):\n" + comp_lines.join("\n");
    } else {
      canvas_ctx += `The active screen "${screenParentId}" is currently empty.`;
    }

    const otherScreenContext = buildOtherScreenSummaryLines(
      Array.isArray(other_screen_summaries) ? other_screen_summaries : []
    );
    if (otherScreenContext) {
      canvas_ctx += `\n\n${otherScreenContext}`;
    }

    const full_prompt = `${canvas_ctx}\n\n${ENGINE_COMPATIBILITY_PROMPT}\n\n${TEXT_SIZING_RUNTIME_GUIDE}\n\nUser prompt: ${message.trim()}`;
    const history = (chat_history || []).map((msg) => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }],
    }));
    const historyChars = (chat_history || []).reduce((sum, msg) => sum + String(msg?.content || "").length, 0);
    const topLevelComponentCount = Array.isArray(canvas_components) ? canvas_components.length : 0;
    const totalComponentCount = countComponents(canvas_components || []);

    const requestPayload = {
      model: requestedModel,
      contents: [
        ...history,
        {
          role: "user",
          parts: [
            { text: full_prompt },
            ...(image_data ? [{ inlineData: { data: image_data, mimeType: image_mime_type } }] : []),
          ],
        },
      ],
    };

    return new Response(
      new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          const send = (event, payload) => {
            controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`));
          };

          let rawText = "";
          let operationBuffer = "";
          let usage: any = null;
          let firstChunkAt: number | null = null;
          let sawStructuredOps = false;
          let sawDone = false;
          const modelStartedAt = Date.now();

          const processOperation = (op) => {
            if (!op?.op) return;
            sawStructuredOps = true;

            if (op.op === "reply") {
              send("reply", { text: sanitizeReplyText(op.text) });
              return;
            }

            if (op.op === "add" || op.op === "update" || op.op === "remove" || op.op === "reparent" || op.op === "reorder") {
              const sanitizedPatch = sanitizeRendererPatch(op, nodeLookup);
              if (!sanitizedPatch) return;
              send("patch", sanitizedPatch);
              applyPatchToLookup(sanitizedPatch, nodeLookup);
              return;
            }

            if (op.op === "done") {
              sawDone = true;
              send("done", { reply: sanitizeReplyText(op.reply) });
            }
          };

          const flushOperations = () => {
            const { objects, remainder } = extractCompleteJsonObjects(operationBuffer);
            for (const rawObject of objects) {
              const op = parseStreamOperation(rawObject);
              if (op) processOperation(op);
            }
            operationBuffer = remainder;
          };

          try {
            send("status", { message: "Analyzing the current canvas..." });
            const stream = await rendererChatModel.generateContentStream(requestPayload);
            send("status", { message: "Generating canvas patches..." });

            for await (const chunk of stream) {
              usage = chunk.usageMetadata || usage;

              const text = (chunk as any).text?.() || "";
              if (!text) continue;

              if (!firstChunkAt) {
                firstChunkAt = Date.now();
                send("status", { message: "Streaming canvas patches..." });
              }

              rawText += text;
              operationBuffer += text;
              flushOperations();
            }

            flushOperations();

            if (usage) {
              logTokenUsage(
                uid,
                requestedModel,
                usage
              ).catch(console.error);
            }

            finalizeRendererStream({ rawText, sawStructuredOps, sawDone, emitOperation: processOperation, send });

            const completedAt = Date.now();

            console.log("[renderer-chat] timings", {
              totalMs: completedAt - requestStartedAt,
              modelMs: completedAt - modelStartedAt,
              timeToFirstChunkMs: firstChunkAt ? firstChunkAt - modelStartedAt : null,
              systemPromptChars: RENDERER_CHAT_SYSTEM_PROMPT.length,
              runtimePromptChars: full_prompt.length,
              canvasContextChars: canvas_ctx.length,
              messageChars: String(message || "").length,
              historyChars,
              historyCount: history.length,
              topLevelComponentCount,
              totalComponentCount,
              hasImage: Boolean(image_data),
              selectedModel: requestedModel,
            });

          } catch (error) {
            console.error("Gemini API error:", error);
            send("error", { error: error.message || "Chat request failed" });
          } finally {
            controller.close();
          }
        },
      }),
      { headers: SSE_HEADERS }
    );
  } catch (error) {
    console.error("Gemini API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
