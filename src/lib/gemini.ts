import { GoogleGenerativeAI } from "@google/generative-ai";
import { SYSTEM_PROMPT, TWEAK_SYSTEM_PROMPT, RENDERER_CHAT_SYSTEM_PROMPT } from "./prompts";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export const model = genAI.getGenerativeModel({
  model: "gemini-3.1-flash-lite-preview", // Reverting back to flash lite preview per user request
  systemInstruction: SYSTEM_PROMPT,
});

export const tweakModel = genAI.getGenerativeModel({
  model: "gemini-3.1-flash-lite-preview",
  systemInstruction: TWEAK_SYSTEM_PROMPT,
});

export const rendererChatModel = genAI.getGenerativeModel({
  model: "gemini-3.1-flash-lite-preview",
  systemInstruction: RENDERER_CHAT_SYSTEM_PROMPT,
});
