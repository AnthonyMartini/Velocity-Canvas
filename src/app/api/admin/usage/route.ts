import { NextResponse } from "next/server";
import { verifyIdToken, checkUserIsAdmin, adminDb } from "@/lib/firebase-admin";

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const idToken = authHeader.split("Bearer ")[1];
    const uid = await verifyIdToken(idToken);
    
    if (!uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAdmin = await checkUserIsAdmin(uid);
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden: Admins only" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const timeframe = searchParams.get("timeframe") || "all";
    
    if (!adminDb) {
      return NextResponse.json({ error: "Database not initialized" }, { status: 500 });
    }

    let query: FirebaseFirestore.Query = adminDb.collection("token_usage");

    if (timeframe !== "all") {
      const now = new Date();
      let startDate = new Date();
      if (timeframe === "today") {
        startDate.setHours(0, 0, 0, 0);
      } else if (timeframe === "7d") {
        startDate.setDate(now.getDate() - 7);
      } else if (timeframe === "30d") {
        startDate.setDate(now.getDate() - 30);
      }
      query = query.where("timestamp", ">=", startDate);
    }

    const snapshot = await query.orderBy("timestamp", "desc").limit(500).get();
    
    const usageLogs = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        timestamp: data.timestamp?.toDate().toISOString() || new Date().toISOString()
      };
    });

    return NextResponse.json({ usageLogs });
  } catch (error: any) {
    console.error("Admin usage fetch error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
