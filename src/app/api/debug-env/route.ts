import { NextResponse } from "next/server";

export async function GET() {
  const envKeys = Object.keys(process.env);
  
  // Create a safe mapping of keys with masked values
  const debugInfo = envKeys.map(key => {
    const value = process.env[key] || "";
    const isSecret = key.includes("KEY") || key.includes("SECRET") || key.includes("PASSWORD") || key.includes("TOKEN") || key.includes("AUTH");
    
    return {
      key,
      length: value.length,
      prefix: isSecret ? (value.length > 4 ? value.substring(0, 4) + "..." : "****") : value,
      isPublic: key.startsWith("NEXT_PUBLIC_")
    };
  });

  return NextResponse.json({
    message: "Environment Variable Debug Info",
    timestamp: new Date().toISOString(),
    node_version: process.version,
    env_vars: debugInfo,
    // Explicit check for the key we care about
    gemini_key_check: {
      found_gemini: !!process.env.GEMINI_API_KEY,
      found_google: !!process.env.GOOGLE_API_KEY,
      found_public_gemini: !!process.env.NEXT_PUBLIC_GEMINI_API_KEY,
    }
  });
}
