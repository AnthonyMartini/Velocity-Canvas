import { NextResponse } from "next/server";
import { verifyIdToken, checkUserIsAdmin } from "@/lib/firebase-admin";

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ isAdmin: false }, { status: 401 });
    }

    const idToken = authHeader.split("Bearer ")[1];
    const uid = await verifyIdToken(idToken);
    
    if (!uid) {
      return NextResponse.json({ isAdmin: false }, { status: 401 });
    }

    const isAdmin = await checkUserIsAdmin(uid);
    return NextResponse.json({ isAdmin });
  } catch (error: any) {
    console.error("Admin check error:", error);
    return NextResponse.json({ isAdmin: false }, { status: 500 });
  }
}
