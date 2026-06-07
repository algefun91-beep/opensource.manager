import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { createId, updateDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const messages = await updateDb(db => db.sandboxMessages.filter(message => message.userId === user.id));
    return NextResponse.json({ messages });
  } catch {
    return NextResponse.json({ messages: [] }, { status: 401 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const body = await req.json();
    const messages = Array.isArray(body.messages) ? body.messages : [];
    await updateDb(db => {
      db.sandboxMessages = db.sandboxMessages.filter(message => message.userId !== user.id);
      db.sandboxMessages.push(...messages.map((message: any) => ({
        id: message.id || createId('msg'),
        userId: user.id,
        role: message.role === 'user' ? 'user' : 'agent',
        content: String(message.content || ''),
        steps: Array.isArray(message.steps) ? message.steps : undefined,
        timestamp: message.timestamp ? new Date(message.timestamp).toISOString() : new Date().toISOString(),
      })));
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }
}
