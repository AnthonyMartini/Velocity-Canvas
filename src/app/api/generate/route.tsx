import { NextResponse } from "next/server";
import { model } from "@/lib/gemini";
import { jsonToYaml } from "@/lib/yaml-utils";
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
    const creditResult = await checkAndDeductCredit(uid, "Component Generation");
    if (!creditResult.success) {
      return NextResponse.json({ 
        error: creditResult.error || "Insufficient credits", 
        credits: creditResult.credits 
      }, { status: 403 });
    }

    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const response = await model.generateContent(prompt);
    const rawText = response.response.text();
    
    // Debug log for checking what exactly we got from AI
    console.log("Gemini Raw Response (first 100 chars):", rawText.substring(0, 100));

    // Robust JSON extraction: Find the first '{' and the last '}'
    const start = rawText.indexOf("{");
    const end = rawText.lastIndexOf("}");
    
    if (start === -1 || end === -1 || end < start) {
      console.error("No valid JSON object found in AI response.");
      console.error("Full raw response:", rawText);
      return NextResponse.json({ 
        error: "The AI did not return a valid JSON structure. Please try again.",
        raw_response: rawText 
      }, { status: 500 });
    }

    const cleaned = rawText.substring(start, end + 1).trim();

    try {
      const jsonData = JSON.parse(cleaned);
      const yamlCode = jsonToYaml(jsonData);
      
      if (!yamlCode || yamlCode.trim() === "") {
        console.warn("jsonToYaml returned an empty string. JSON was:", JSON.stringify(jsonData, null, 2));
      }

      return NextResponse.json({
        yaml_code: yamlCode,
        json_data: jsonData, // Return the tree for preview
        usage: response.response.usageMetadata,
      });
    } catch (parseError) {
      console.error("Failed to parse JSON from Gemini:", parseError);
      console.error("Extracted string:", cleaned);
      return NextResponse.json({ 
        error: "The AI returned an invalid format. Please try again.",
        raw_response: rawText 
      }, { status: 500 });
    }
  } catch (error) {
    console.error("Gemini API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
