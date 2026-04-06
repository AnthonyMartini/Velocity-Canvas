import { GoogleGenAI } from "@google/genai";
import { TWEAK_SYSTEM_PROMPT, RENDERER_CHAT_SYSTEM_PROMPT } from "./prompts";

// ── Client Factories ─────────────────────────────────────────────────────────

function getVertexClient(): GoogleGenAI {
  const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!serviceAccountStr) throw new Error("Missing FIREBASE_SERVICE_ACCOUNT for Vertex AI.");

  let cert: any;
  try {
    const sanitized = serviceAccountStr.trim().replace(/^['\"]|['\"]$/g, "");
    cert = sanitized.startsWith("{")
      ? JSON.parse(sanitized)
      : JSON.parse(Buffer.from(sanitized, "base64").toString());
  } catch (e: any) {
    throw new Error(`Failed to parse FIREBASE_SERVICE_ACCOUNT: ${e.message}`);
  }

  if (cert.private_key) cert.private_key = cert.private_key.replace(/\\n/g, "\n");

  const location = process.env.GCP_LOCATION || "us-central1";

  console.log(`Vertex AI (Gen AI SDK) initializing with project: ${cert.project_id}, location: ${location}`);

  // The new @google/genai SDK uses Google Auth Library under the hood.
  // We pass the credentials JSON directly via the googleAuthOptions.
  return new GoogleGenAI({
    vertexai: true,
    project: cert.project_id,
    location,
    googleAuthOptions: {
      credentials: {
        client_email: cert.client_email,
        private_key: cert.private_key,
      },
    },
  } as any);
}

function getClient(): GoogleGenAI {
  if (!(globalThis as any).__velocityCanvasGeminiClient) {
    (globalThis as any).__velocityCanvasGeminiClient = getVertexClient();
  }
  return (globalThis as any).__velocityCanvasGeminiClient;
}

// ── Model Wrapper ────────────────────────────────────────────────────────────

export const MODEL_NAME = process.env.GEMINI_MODEL || "gemini-2.0-flash-lite";
export const TWEAK_MODEL_NAME = process.env.GEMINI_TWEAK_MODEL || process.env.GEMINI_MODEL || "gemini-2.0-flash-lite";
export const RENDERER_CHAT_MODEL_NAME = process.env.GEMINI_RENDERER_CHAT_MODEL || process.env.GEMINI_MODEL || "gemini-2.0-flash-lite";

/**
 * Creates a thin wrapper around the new @google/genai SDK that matches
 * the call signature used across the API routes.
 */
function createModel(systemInstruction: string, modelName: string = MODEL_NAME) {
  function buildGenerateParams(content: any) {
    let contents: any;
    let config = { systemInstruction } as Record<string, any>;
    let rest = {};

    if (typeof content === "string") {
      contents = [{ role: "user", parts: [{ text: content }] }];
    } else if (content && Array.isArray(content.contents)) {
      const { contents: c, generationConfig, ...remaining } = content;
      contents = c;
      config = {
        systemInstruction,
        ...(generationConfig || {}),
      };
      rest = remaining;
    } else {
      contents = content;
    }

    return {
      model: modelName,
      contents,
      config,
      ...rest,
    };
  }

  return {
    generateContent: async (content: any) => {
      const client = getClient();
      const response = await client.models.generateContent(buildGenerateParams(content));

      return { response: wrapResponse(response) };
    },
    generateContentStream: async (content: any) => {
      const client = getClient();
      const stream = await client.models.generateContentStream(buildGenerateParams(content));
      return wrapStream(stream);
    },
  };
}

/**
 * Wraps the new SDK response to expose the same interface previously
 * expected by the route handlers (response.text(), response.usageMetadata).
 */
function wrapResponse(response: any) {
  return {
    // New SDK exposes text as a property; provide it as both property and method
    // for backwards compatibility with existing route code.
    text: () => response.text ?? "",
    usageMetadata: response.usageMetadata ?? null,
    candidates: response.candidates ?? [],
  };
}

async function* wrapStream(stream: AsyncGenerator<any>) {
  for await (const chunk of stream) {
    yield wrapResponse(chunk);
  }
}

// ── Exported Models ──────────────────────────────────────────────────────────


export const tweakModel = createModel(TWEAK_SYSTEM_PROMPT, TWEAK_MODEL_NAME);
export const rendererChatModel = createModel(RENDERER_CHAT_SYSTEM_PROMPT, RENDERER_CHAT_MODEL_NAME);
