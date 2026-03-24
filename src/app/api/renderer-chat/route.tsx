import { NextResponse } from "next/server";
import { rendererChatModel } from "@/lib/gemini";
import { RENDERER_CHAT_SYSTEM_PROMPT } from "@/lib/prompts";

import { adminAuth, verifyIdToken, checkAndDeductCredit } from "@/lib/firebase-admin";

export async function POST(req) {
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

    // Check and deduct credit
    const creditResult = await checkAndDeductCredit(uid, "Canvas Editor AI Chat");
    if (!creditResult.success) {
      return NextResponse.json({ 
        error: creditResult.error || "Insufficient credits", 
        credits: creditResult.credits 
      }, { status: 403 });
    }

    const { message, canvas_components, canvas_width, canvas_height, image_data, image_mime_type, chat_history } = await req.json();

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // Build context
    let canvas_ctx = `Canvas size: ${canvas_width} x ${canvas_height} px.\n`;
    if (canvas_components && canvas_components.length > 0) {
      const comp_lines = [];
      const processComponent = (c, indent = "") => {
        let line = `${indent}- ID: "${c.id}", Type: "${c.type}", x=${c.x || 0}, y=${c.y || 0}, w=${c.width || 0}, h=${c.height || 0}`;
        if (c.text) line += `, text="${c.text}"`;
        if (c.name) line += `, name="${c.name}"`;
        comp_lines.push(line);
        if (c.children) {
          c.children.forEach(child => processComponent(child, indent + "  "));
        }
      };
      canvas_components.forEach(c => processComponent(c));
      canvas_ctx += "Current components on canvas:\n" + comp_lines.join("\n");
    } else {
      canvas_ctx += "The canvas is currently empty.";
    }

    const full_prompt = `${canvas_ctx}\n\nUser prompt: ${message.trim()}`;

    // Format chat history for Google SDK
    const history = chat_history.map(msg => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }]
    }));

    const result = await rendererChatModel.generateContent({
      contents: [
        ...history,
        {
          role: "user",
          parts: [
            { text: full_prompt },
            ...(image_data ? [{ inlineData: { data: image_data, mimeType: image_mime_type } }] : [])
          ]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    const responseText = result.response.text();
    
    // Robust JSON extraction
    const start = responseText.indexOf("{");
    const end = responseText.lastIndexOf("}");
    
    if (start === -1 || end === -1 || end < start) {
      console.error("No valid JSON object found in renderer-chat response.");
      return NextResponse.json({ error: "Invalid JSON from AI", raw: responseText }, { status: 500 });
    }

    const cleaned = responseText.substring(start, end + 1).trim();

    let parsed: any;
    try {
      console.log("Cleaned JSON:", cleaned);
      parsed = JSON.parse(cleaned);
    } catch (parseError) {
      console.error("Failed to parse JSON in renderer-chat:", parseError);
      return NextResponse.json({ error: "Parse error", raw: cleaned }, { status: 500 });
    }

    // Post-process: convert single-tick string literals ('value') → "value" (PowerApps format).
    // The model is instructed to wrap literal strings in single quotes to avoid the
    // JSON-escaping issues that arise from double-quotes-within-double-quotes.
    // We walk the entire object and translate every string value of the form 'foo' → "foo".
    // Keys that hold layout numerics (X, Y, Width, Height, etc.) are exempt because the
    // model never wraps numbers in single ticks; the check is purely on string content.
    const singleTickRe = /^'([\s\S]*)'$/;

    function convertSingleTickLiterals(value: any): any {
      if (typeof value === "string") {
        const m = value.match(singleTickRe);
        if (m) {
          // Replace with PowerApps double-quote format: surround with actual " characters
          return `"${m[1]}"`;
        }
        return value;
      }
      if (Array.isArray(value)) {
        return value.map(convertSingleTickLiterals);
      }
      if (value !== null && typeof value === "object") {
        const out: Record<string, any> = {};
        for (const [k, v] of Object.entries(value)) {
          out[k] = convertSingleTickLiterals(v);
        }
        return out;
      }
      return value;
    }

    return NextResponse.json(convertSingleTickLiterals(parsed));

  } catch (error) {
    console.error("Gemini API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
