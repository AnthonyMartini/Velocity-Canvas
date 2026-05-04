import { NextResponse } from "next/server";
import { FORMULA_BUILDER_MODEL_NAME, formulaBuilderModel } from "@/lib/gemini";
import { verifyIdToken, checkAndDeductCredit, logTokenUsage } from "@/lib/firebase-admin";

const SSE_HEADERS = {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  "X-Accel-Buffering": "no",
  "Content-Encoding": "none",
  Connection: "keep-alive",
};

const MAX_REQUEST_CHARS = 8000;
const MAX_CONTEXT_CHARS = 6000;

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function extractFormula(raw: string): string {
  let s = raw.replace(/\r\n/g, "\n").trim();
  const fence = /```(?:powerfx|fx|plaintext|text)?\s*\n?([\s\S]*?)```/i;
  const m = fence.exec(s);
  if (m) s = m[1].trim();
  if (s.startsWith("=")) s = s.slice(1).trim();
  return s;
}

function buildUserMessage(
  contextMode: string,
  optionalContext: string | undefined,
  message: string,
): string {
  const modeLine =
    contextMode === "behavior"
      ? "BEHAVIOR (semicolon-separated actions such as Set, Navigate, and Notify are allowed when appropriate)."
      : "PROPERTY (single expression only; no semicolon-separated action sequences).";

  const ctx =
    optionalContext && optionalContext.trim()
      ? `Optional binding / control names / fields the user mentioned:\n${optionalContext.trim()}`
      : "Optional binding context: (none provided).";

  return [
    `Target formula kind: ${modeLine}`,
    "",
    "Demo variables available on the builder page for evaluation: unitPrice (number), quantity (number), product (record with name, sku, inStock).",
    ctx,
    "",
    "User request:",
    message.trim(),
  ].join("\n");
}

export async function POST(req: Request) {
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

    const creditResult = await checkAndDeductCredit(uid, "Formula Builder AI", 1);
    if (!creditResult.success) {
      return NextResponse.json(
        {
          error: creditResult.error || "Insufficient credits",
          credits: creditResult.credits,
        },
        { status: 403 },
      );
    }

    let body: {
      message?: string;
      context_mode?: string;
      optional_context?: string;
    };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const message = typeof body.message === "string" ? body.message : "";
    if (!message.trim()) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    const contextMode = body.context_mode === "behavior" ? "behavior" : "property";
    const optionalContext = typeof body.optional_context === "string" ? body.optional_context : "";

    if (message.length > MAX_REQUEST_CHARS) {
      return NextResponse.json({ error: "Request text is too long." }, { status: 400 });
    }
    if (optionalContext.length > MAX_CONTEXT_CHARS) {
      return NextResponse.json({ error: "Context text is too long." }, { status: 400 });
    }

    const userText = buildUserMessage(contextMode, optionalContext, message);

    return new Response(
      new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          const send = (event: string, payload: unknown) => {
            controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`));
          };

          let rawText = "";
          let usage: { promptTokenCount?: number; candidatesTokenCount?: number } | null = null;
          const modelStartedAt = Date.now();

          try {
            send("status", { message: "Generating formula…" });
            const stream = await formulaBuilderModel.generateContentStream(userText);

            for await (const chunk of stream) {
              usage = (chunk as { usageMetadata?: typeof usage }).usageMetadata || usage;
              const text = (chunk as { text?: () => string }).text?.() || "";
              if (!text) continue;
              rawText += text;
              send("delta", { text });
            }

            if (usage) {
              logTokenUsage(uid, FORMULA_BUILDER_MODEL_NAME, usage).catch(console.error);
            }

            const formula = extractFormula(rawText);
            if (!formula) {
              send("error", { error: "The model returned an empty formula. Try rephrasing your request." });
              return;
            }

            send("done", { formula });
            console.log("[formula-builder] timings", {
              totalMs: Date.now() - requestStartedAt,
              modelMs: Date.now() - modelStartedAt,
              promptChars: userText.length,
            });
          } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : "Formula generation failed";
            console.error("[formula-builder]", error);
            send("error", { error: msg });
          } finally {
            controller.close();
          }
        },
      }),
      { headers: SSE_HEADERS },
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Server error";
    console.error("[formula-builder]", error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
