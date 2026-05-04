import { GoogleGenAI } from "@google/genai";
import { FORMULA_BUILDER_SYSTEM_PROMPT, TWEAK_SYSTEM_PROMPT, RENDERER_CHAT_SYSTEM_PROMPT } from "./prompts";

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

  const location = process.env.GCP_LOCATION || "global";

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

export const MODEL_NAME = "gemini-3-flash-preview";
export const TWEAK_MODEL_NAME = "gemini-3.1-flash-lite-preview";
export const RENDERER_CHAT_MODEL_NAME = "gemini-3-flash-preview";

const THINKING_LEVEL_VALUES = new Set(["HIGH", "MEDIUM", "LOW", "MINIMAL", "THINKING_LEVEL_UNSPECIFIED"]);

function isGeminiThreeFamily(modelName: string) {
  return /^gemini-3(\.|-|$)/i.test(modelName);
}

function isGeminiThreeFlash(modelName: string) {
  return /^gemini-3(?:\.\d+)?-flash(?:-|$)/i.test(modelName);
}

function parseEnvInteger(name: string) {
  const raw = process.env[name];
  if (raw == null || raw === "") return null;
  const parsed = Number.parseInt(String(raw).trim(), 10);
  if (!Number.isFinite(parsed)) {
    console.warn(`[gemini] Ignoring invalid integer env ${name}=${raw}`);
    return null;
  }
  return parsed;
}

function parseEnvThinkingLevel(name: string) {
  const raw = process.env[name];
  if (!raw) return null;
  const normalized = String(raw).trim().toUpperCase();
  if (!THINKING_LEVEL_VALUES.has(normalized)) {
    console.warn(`[gemini] Ignoring invalid thinking level env ${name}=${raw}`);
    return null;
  }
  return normalized;
}

function resolveThinkingConfig(modelName: string, envPrefix?: string) {
  const scopedLevel = envPrefix ? parseEnvThinkingLevel(`${envPrefix}_THINKING_LEVEL`) : null;
  const globalLevel = parseEnvThinkingLevel("GEMINI_THINKING_LEVEL");
  const scopedBudget = envPrefix ? parseEnvInteger(`${envPrefix}_THINKING_BUDGET`) : null;
  const globalBudget = parseEnvInteger("GEMINI_THINKING_BUDGET");

  if (isGeminiThreeFamily(modelName)) {
    let thinkingLevel = scopedLevel ?? globalLevel;
    if ((thinkingLevel === "MINIMAL" || thinkingLevel === "MEDIUM") && !isGeminiThreeFlash(modelName)) {
      console.warn(`[gemini] ${modelName} does not support thinking level ${thinkingLevel}; falling back to LOW`);
      thinkingLevel = "LOW";
    }
    return thinkingLevel ? { thinkingLevel } : null;
  }

  const thinkingBudget = scopedBudget ?? globalBudget;
  return thinkingBudget != null ? { thinkingBudget } : null;
}

/**
 * Creates a thin wrapper around the new @google/genai SDK that matches
 * the call signature used across the API routes.
 */
function createModel(systemInstruction: string, modelName: string = MODEL_NAME, options: { envPrefix?: string } = {}) {
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

    const thinkingConfig = resolveThinkingConfig(modelName, options.envPrefix);
    if (thinkingConfig) {
      config.thinkingConfig = {
        ...(config.thinkingConfig || {}),
        ...thinkingConfig,
      };
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


export const rendererChatModel = createModel(RENDERER_CHAT_SYSTEM_PROMPT, RENDERER_CHAT_MODEL_NAME, { envPrefix: "RENDERER_CHAT" });
export const tweakModel = createModel(TWEAK_SYSTEM_PROMPT, TWEAK_MODEL_NAME, { envPrefix: "TWEAK" });

export const FORMULA_BUILDER_MODEL_NAME = TWEAK_MODEL_NAME;
export const formulaBuilderModel = createModel(FORMULA_BUILDER_SYSTEM_PROMPT, FORMULA_BUILDER_MODEL_NAME, { envPrefix: "FORMULA_BUILDER" });
