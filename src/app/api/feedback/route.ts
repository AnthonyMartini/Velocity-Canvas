import { NextRequest, NextResponse } from 'next/server';
import { verifyIdToken, saveFeedback } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  let uid: string | null = null;

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.split('Bearer ')[1];
    uid = await verifyIdToken(token);
  }

  try {
    const { type, message, wantsReply, path, email } = await req.json();

    if (!type || !message) {
      return NextResponse.json({ error: 'Missing feedback type or message' }, { status: 400 });
    }

    const result = await saveFeedback({
      uid,
      email: email || null,
      type,
      message,
      wantsReply: Boolean(wantsReply),
      path: path || '/',
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in feedback API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
