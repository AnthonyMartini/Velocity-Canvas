import { NextResponse } from "next/server";
import { tweakModel, TWEAK_MODEL_NAME } from "@/lib/gemini";
import { verifyIdToken, checkAndDeductCredit, logTokenUsage } from "@/lib/firebase-admin";
import { sanitizeTweakResult } from "@/lib/component-security";

const SSE_HEADERS = {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
};

const AI_SUMMARY_KEYS = new Set([
  "id",
  "type",
  "name",
  "X",
  "Y",
  "Width",
  "Height",
  "Text",
  "Fill",
  "Color",
  "Size",
  "Font",
  "FontWeight",
  "Align",
  "VerticalAlign",
  "DisplayMode",
  "Visible",
  "Icon",
  "LayoutMode",
]);

const ENGINE_COMPATIBILITY_PROMPT = [
  "Engine compatibility constraints:",
  '- Only use supported component property keys and formulas that this renderer understands.',
  '- Parent references are limited to "Parent.Width" and "Parent.Height" only.',
  '- Never use unsupported Power Apps runtime references such as "Parent.TemplateWidth", "Parent.TemplateHeight", "Parent.X", "Parent.Y", "Self.*", or "App.*".',
  '- If you need gallery or container layout math, use numeric X/Y/Width/Height values plus supported Gallery properties like TemplateSize, TemplatePadding, and WrapCount.',
].join("\n");

function compactNodeForAI(node, { summaryOnly = false, childLimit = 0 } = {}) {
  if (!node || typeof node !== "object") return null;

  const out: any = {};

  for (const [key, value] of Object.entries(node)) {
    if (value == null || key.startsWith("_") || typeof value === "function") continue;

    if (key === "children") {
      if (!Array.isArray(value) || value.length === 0 || childLimit <= 0) continue;
      out.children = value.slice(0, childLimit).map((child) => compactNodeForAI(child, { summaryOnly: true }));
      out.childCount = value.length;
      continue;
    }

    if (Array.isArray(value)) {
      if (summaryOnly || value.length === 0) continue;
      if (value.every((item) => item == null || ["string", "number", "boolean"].includes(typeof item))) {
        out[key] = value.slice(0, 12);
      }
      continue;
    }

    if (typeof value === "object") continue;
    if (summaryOnly && !AI_SUMMARY_KEYS.has(key)) continue;

    out[key] = value;
  }

  return out;
}

function buildTweakPrompt({ canvasWidth, canvasHeight, component, parent, siblings, prompt }) {
  const sections = [
    `Canvas size: ${canvasWidth} x ${canvasHeight} px.`,
    `Selected component:\n${JSON.stringify(component)}`,
    ENGINE_COMPATIBILITY_PROMPT,
  ];

  if (parent) {
    sections.push(`Parent context:\n${JSON.stringify(parent)}`);
  }

  if (siblings?.length) {
    sections.push(`Nearby sibling summaries:\n${JSON.stringify(siblings)}`);
  }

  sections.push(`User request: ${prompt.trim()}`);
  return sections.join("\n\n");
}

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

  if (Array.isArray(value)) return value.map(convertSingleTickLiterals);

  if (value !== null && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = convertSingleTickLiterals(v);
    return out;
  }

  return value;
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

    const creditResult = await checkAndDeductCredit(uid, "Component Tweak", 1);
    if (!creditResult.success) {
      return NextResponse.json(
        {
          error: creditResult.error || "Insufficient credits",
          credits: creditResult.credits,
        },
        { status: 403 }
      );
    }

    const { prompt, component, component_context, canvas_width, canvas_height } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const selectedComponent = compactNodeForAI(component_context?.component || component, { childLimit: 8 });
    const parentSummary = compactNodeForAI(component_context?.parent, { summaryOnly: true });
    const siblingSummaries = Array.isArray(component_context?.siblings)
      ? component_context.siblings
          .map((sibling) => compactNodeForAI(sibling, { summaryOnly: true }))
          .filter(Boolean)
          .slice(0, 6)
      : [];

    const fullPrompt = buildTweakPrompt({
      canvasWidth: canvas_width,
      canvasHeight: canvas_height,
      component: selectedComponent,
      parent: parentSummary,
      siblings: siblingSummaries,
      prompt,
    });

    return new Response(
      new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          const send = (event, payload) => {
            controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`));
          };

          let rawText = "";
          let usage = null;
          let firstChunkAt = null;
          const modelStartedAt = Date.now();

          try {
            send("status", { message: "Preparing component update..." });
            const stream = await tweakModel.generateContentStream(fullPrompt);
            send("status", { message: "Generating component changes..." });

            for await (const chunk of stream) {
              usage = chunk.usageMetadata || usage;

              const text = (chunk as any).text?.() || "";
              if (!text) continue;

              if (!firstChunkAt) {
                firstChunkAt = Date.now();
                send("status", { message: "Finalizing component update..." });
              }

              rawText += text;
            }

            if (usage) {
              logTokenUsage(
                uid,
                TWEAK_MODEL_NAME,
                usage.promptTokenCount || 0,
                usage.candidatesTokenCount || 0,
                usage.cachedContentTokenCount || 0
              ).catch(console.error);
            }

            const parsed = parseJsonFromText(rawText);
            const result = sanitizeTweakResult(convertSingleTickLiterals(parsed), component_context?.component || component);
            const completedAt = Date.now();

            console.log("[tweak-component] timings", {
              totalMs: completedAt - requestStartedAt,
              modelMs: completedAt - modelStartedAt,
              timeToFirstChunkMs: firstChunkAt ? firstChunkAt - modelStartedAt : null,
              promptChars: fullPrompt.length,
            });

            if (!result) {
              throw new Error("AI returned an invalid component payload");
            }

            send("result", result);
          } catch (error) {
            console.error("Gemini API error:", error);
            send("error", { error: error.message || "Tweak failed" });
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
