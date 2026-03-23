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
