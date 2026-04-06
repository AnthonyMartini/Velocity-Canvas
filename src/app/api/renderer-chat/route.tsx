import { NextResponse } from "next/server";
import { rendererChatModel, RENDERER_CHAT_MODEL_NAME } from "@/lib/gemini";
import { RENDERER_CHAT_SYSTEM_PROMPT } from "@/lib/prompts";
import { verifyIdToken, checkAndDeductCredit, logTokenUsage } from "@/lib/firebase-admin";

const SSE_HEADERS = {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
};
const ALLOWED_RENDERER_CHAT_MODELS = new Set([
  "gemini-3-flash-preview",
  "gemini-3.1-pro-preview",
]);
const RENDERER_CHAT_MODEL_CREDIT_COST = {
  "gemini-3-flash-preview": 5,
  "gemini-3.1-pro-preview": 10,
};

function parseJsonFromText(rawText) {
  const start = rawText.indexOf("{");
  const end = rawText.lastIndexOf("}");

  if (start === -1 || end === -1 || end < start) {
    throw new Error("Invalid JSON from AI");
  }

  return JSON.parse(rawText.substring(start, end + 1).trim());
}

function convertSingleTickLiterals(value) {
  const singleTickRe = /^'([\s\S]*)'$/;

  if (typeof value === "string") {
    const match = value.match(singleTickRe);
    return match ? `"${match[1]}"` : value;
  }

  if (Array.isArray(value)) {
    return value.map(convertSingleTickLiterals);
  }

  if (value !== null && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = convertSingleTickLiterals(v);
    return out;
  }

  return value;
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

function emitLegacyResultAsPatchEvents(legacyPayload, send) {
  if (legacyPayload?.reply) {
    send("reply", { text: legacyPayload.reply });
  }

  for (const id of legacyPayload?.components_to_remove || []) {
    send("patch", { op: "remove", id });
  }

  for (const item of legacyPayload?.components_to_reparent || []) {
    if (item?.id && item?.newParentId) {
      send("patch", { op: "reparent", id: item.id, newParentId: item.newParentId });
    }
  }

  for (const item of legacyPayload?.components_to_update || []) {
    if (!item?.id) continue;
    const { id, ...changes } = item;
    send("patch", { op: "update", id, changes });
  }

  for (const component of legacyPayload?.components_to_add || []) {
    send("patch", { op: "add", component, parentId: component?.parentId || null });
  }

  send("done", { reply: legacyPayload?.reply || "Done!" });
}

function finalizeRendererStream({ rawText, sawStructuredOps, sawDone, send }) {
  if (!sawStructuredOps) {
    const parsedPayload = parseJsonFromText(rawText);
    const legacyPayload = convertSingleTickLiterals(parsedPayload);
    emitLegacyResultAsPatchEvents(legacyPayload, send);
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

    const { message, canvas_components, active_screen_id, canvas_width, canvas_height, image_data, image_mime_type, chat_history, model } =
      await req.json();

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

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const screenParentId = active_screen_id || "screen";
    let canvas_ctx = `Canvas size: ${canvas_width} x ${canvas_height} px.\n`;
    canvas_ctx += `Active screen id: "${screenParentId}". Put new top-level components on this screen unless the user explicitly asks for a different screen.\n`;
    if (canvas_components && canvas_components.length > 0) {
      const comp_lines = [];
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

    const full_prompt = `${canvas_ctx}\n\nUser prompt: ${message.trim()}`;
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
          let lineBuffer = "";
          let usage = null;
          let firstChunkAt = null;
          let sawStructuredOps = false;
          let sawDone = false;
          const modelStartedAt = Date.now();

          const processOperation = (op) => {
            if (!op?.op) return;
            sawStructuredOps = true;

            if (op.op === "reply") {
              send("reply", { text: op.text || "" });
              return;
            }

            if (op.op === "add" || op.op === "update" || op.op === "remove" || op.op === "reparent") {
              send("patch", op);
              return;
            }

            if (op.op === "done") {
              sawDone = true;
              send("done", { reply: op.reply || "Done!" });
            }
          };

          const flushLines = (flushRemainder = false) => {
            const normalized = lineBuffer.replace(/\r\n/g, "\n");
            const lines = normalized.split("\n");
            const remainder = flushRemainder ? "" : lines.pop() || "";

            for (const rawLine of lines) {
              const op = parseStreamOperation(rawLine);
              if (op) processOperation(op);
            }

            lineBuffer = remainder;
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
              lineBuffer += text;
              console.log(`[renderer-chat] chunk: ${text}`);
              flushLines(false);
            }

            flushLines(true);

            if (usage) {
              logTokenUsage(
                uid,
                requestedModel,
                usage.promptTokenCount || 0,
                usage.candidatesTokenCount || 0,
                usage.cachedContentTokenCount || 0
              ).catch(console.error);
            }

            finalizeRendererStream({ rawText, sawStructuredOps, sawDone, send });

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

            console.log("[renderer-chat] final prompt", {
              message,
              fullPrompt: full_prompt,
            });

            console.log("[renderer-chat] final output", rawText);

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
