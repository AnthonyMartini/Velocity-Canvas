import { NextRequest, NextResponse } from 'next/server';
import { verifyIdToken, savePlanInterest } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = authHeader.split('Bearer ')[1];
  const uid = await verifyIdToken(token);
  if (!uid) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  try {
    const { planId, email } = await req.json();
    if (!planId || !email) {
      return NextResponse.json({ error: 'Missing planId or email' }, { status: 400 });
    }

    const result = await savePlanInterest(uid, email, planId);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in plan-interest API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
