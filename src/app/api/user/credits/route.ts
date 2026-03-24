import { NextResponse } from "next/server";
import { verifyIdToken, getUserCredits } from "@/lib/firebase-admin";

export async function GET(req: Request) {
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

    const credits = await getUserCredits(uid);
    return NextResponse.json({ credits });
  } catch (error: any) {
    console.error("Error fetching user credits:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
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

    const { updateUserCredits } = await import("@/lib/firebase-admin");
    const currentCredits = await getUserCredits(uid);
    const newCredits = currentCredits + 100;
    
    await updateUserCredits(uid, newCredits);
    
    return NextResponse.json({ success: true, credits: newCredits });
  } catch (error: any) {
    console.error("Error adding credits:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
