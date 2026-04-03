import { GoogleGenAI } from "@google/genai";
import { SYSTEM_PROMPT, TWEAK_SYSTEM_PROMPT, RENDERER_CHAT_SYSTEM_PROMPT } from "./prompts";

// ── Client Factories ─────────────────────────────────────────────────────────

function getAIStudioClient(): GoogleGenAI {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("Missing GEMINI_API_KEY for AI Studio.");
  return new GoogleGenAI({ apiKey: key });
}

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
  return process.env.USE_VERTEX_AI === "true" ? getVertexClient() : getAIStudioClient();
}

// ── Model Wrapper ────────────────────────────────────────────────────────────

export const MODEL_NAME = process.env.GEMINI_MODEL || "gemini-2.0-flash-lite";

/**
 * Creates a thin wrapper around the new @google/genai SDK that matches
 * the call signature used across the API routes.
 */
function createModel(systemInstruction: string) {
  return {
    generateContent: async (content: any) => {
      const client = getClient();

      // Normalise content to the SDK's Parts format
      let contents: any;
      if (typeof content === "string") {
        contents = [{ role: "user", parts: [{ text: content }] }];
      } else if (content && Array.isArray(content.contents)) {
        // Already the full request shape from renderer-chat
        // Pass through directly, extracting generationConfig as config
        const { contents: c, generationConfig, ...rest } = content;
        const response = await client.models.generateContent({
          model: MODEL_NAME,
          contents: c,
          config: {
            systemInstruction,
            ...(generationConfig || {}),
          },
          ...rest,
        });
        return { response: wrapResponse(response) };
      } else {
        contents = content;
      }

      const response = await client.models.generateContent({
        model: MODEL_NAME,
        contents,
        config: { systemInstruction },
      });

      return { response: wrapResponse(response) };
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

// ── Exported Models ──────────────────────────────────────────────────────────

export const model = createModel(SYSTEM_PROMPT);
export const tweakModel = createModel(TWEAK_SYSTEM_PROMPT);
export const rendererChatModel = createModel(RENDERER_CHAT_SYSTEM_PROMPT);
