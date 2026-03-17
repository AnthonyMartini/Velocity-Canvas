import { NextResponse } from "next/server";
import { tweakModel } from "@/lib/gemini";

export async function POST(req) {
  try {
    const { prompt, component, canvas_width, canvas_height } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const compJson = JSON.stringify(component, null, 2);
    const ctx = `Canvas size: ${canvas_width} x ${canvas_height} px.\n`;
    const fullPrompt = `${ctx}\nComponent to tweak:\n${compJson}\n\nUser request: ${prompt.trim()}`;

    const response = await tweakModel.generateContent(fullPrompt);
    const rawText = response.response.text();

    const cleaned = rawText
      .replace(/^```[a-zA-Z]*\n?/, "")
      .replace(/\n?```$/, "")
      .trim();

    return NextResponse.json(JSON.parse(cleaned));
  } catch (error) {
    console.error("Gemini API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
