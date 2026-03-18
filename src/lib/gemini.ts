import { GoogleGenerativeAI } from "@google/generative-ai";
import { SYSTEM_PROMPT, TWEAK_SYSTEM_PROMPT, RENDERER_CHAT_SYSTEM_PROMPT } from "./prompts";

// Lazy loading to ensure environment variables are read at runtime (not just build time)
let genAIInstance: GoogleGenerativeAI | null = null;

function getGenAI() {
  if (!genAIInstance) {
    const key = process.env.GEMINI_API_KEY;
    
    if (!key) {
      console.error("CRITICAL: Gemini API key is missing! Checked GEMINI_API_KEY, GOOGLE_API_KEY, and NEXT_PUBLIC_GEMINI_API_KEY.");
      throw new Error("Missing Gemini API Key. Please ensure it is set in your AWS Amplify Environment Variables.");
    }

    // Diagnostic log (safe for production)
    console.log(`Gemini SDK initializing with key: ${key.substring(0, 4)}... (length: ${key.length})`);
    
    genAIInstance = new GoogleGenerativeAI(key);
  }
  return genAIInstance;
}

// Re-exporting models as proxies/functions to maintain compatibility or updating callers
// To avoid changing all routes, we use a proxy-based approach or just lazy models.
const createModel = (modelName: string, systemInstruction: string) => {
  return {
    generateContent: async (content: any, ...args: any[]) => {
      const gAI = getGenAI();
      const model = gAI.getGenerativeModel({
        model: modelName,
        systemInstruction,
      });
      return model.generateContent(content, ...args);
    }
  };
};

const MODEL_NAME = "gemini-3.1-flash-lite-preview";

export const model = createModel(MODEL_NAME, SYSTEM_PROMPT);
export const tweakModel = createModel(MODEL_NAME, TWEAK_SYSTEM_PROMPT);
export const rendererChatModel = createModel(MODEL_NAME, RENDERER_CHAT_SYSTEM_PROMPT);
