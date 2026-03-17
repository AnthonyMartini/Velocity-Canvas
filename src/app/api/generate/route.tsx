import { NextResponse } from "next/server";
import { model } from "@/lib/gemini";

export async function POST(req) {
  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const response = await model.generateContent(prompt);
    const rawText = response.response.text();

    // Strip Markdown fences
    const cleaned = rawText
      .replace(/^```[a-zA-Z]*\n?/, "")
      .replace(/\n?```$/, "")
      .trim();

    return NextResponse.json({
      yaml_code: cleaned,
      usage: response.response.usageMetadata,
    });
  } catch (error) {
    console.error("Gemini API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
