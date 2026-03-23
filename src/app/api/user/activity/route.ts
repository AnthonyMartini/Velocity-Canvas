import { NextRequest, NextResponse } from 'next/server';
import { verifyIdToken, adminDb } from '@/lib/firebase-admin';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Auth required' }, { status: 401 });
  }

  const token = authHeader.split('Bearer ')[1];
  const uid = await verifyIdToken(token);

  if (!uid) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  if (!adminDb) {
    return NextResponse.json({ error: 'Admin SDK not initialized' }, { status: 500 });
  }

  try {
    const activitySnapshot = await adminDb
      .collection('users')
      .doc(uid)
      .collection('activity')
      .orderBy('timestamp', 'desc')
      .limit(50)
      .get();

    const logs = activitySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        action: data.action,
        amount: data.amount,
        timestamp: data.timestamp?.toDate ? data.timestamp.toDate().toISOString() : new Date().toISOString(),
        previousCredits: data.previousCredits,
        newCredits: data.newCredits
      };
    });

    return NextResponse.json({ logs });
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
  }
}
