import { NextResponse } from "next/server";
import { tweakModel } from "@/lib/gemini";

import { verifyIdToken, checkAndDeductCredit } from "@/lib/firebase-admin";

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
    const creditResult = await checkAndDeductCredit(uid, "Component Tweak");
    if (!creditResult.success) {
      return NextResponse.json({ 
        error: creditResult.error || "Insufficient credits", 
        credits: creditResult.credits 
      }, { status: 403 });
    }

    const { prompt, component, canvas_width, canvas_height } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const compJson = JSON.stringify(component, null, 2);
    const ctx = `Canvas size: ${canvas_width} x ${canvas_height} px.\n`;
    const fullPrompt = `${ctx}\nComponent to tweak:\n${compJson}\n\nUser request: ${prompt.trim()}`;

    const response = await tweakModel.generateContent(fullPrompt);
    const rawText = response.response.text();

    // Robust JSON extraction
    const start = rawText.indexOf("{");
    const end = rawText.lastIndexOf("}");
    
    if (start === -1 || end === -1 || end < start) {
      console.error("No valid JSON object found in tweak-component response.");
      return NextResponse.json({ error: "Invalid JSON from AI", raw: rawText }, { status: 500 });
    }

    const cleaned = rawText.substring(start, end + 1).trim();

    let parsed: any;
    try {
      parsed = JSON.parse(cleaned);
    } catch (parseError) {
      console.error("Failed to parse JSON in tweak-component:", parseError);
      return NextResponse.json({ error: "Parse error", raw: cleaned }, { status: 500 });
    }

    // Convert single-tick string literals ('value') → "value" (PowerApps double-quote format).
    const singleTickRe = /^'([\s\S]*)'$/;
    function convertSingleTickLiterals(value: any): any {
      if (typeof value === "string") {
        const m = value.match(singleTickRe);
        return m ? `"${m[1]}"` : value;
      }
      if (Array.isArray(value)) return value.map(convertSingleTickLiterals);
      if (value !== null && typeof value === "object") {
        const out: Record<string, any> = {};
        for (const [k, v] of Object.entries(value)) out[k] = convertSingleTickLiterals(v);
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
