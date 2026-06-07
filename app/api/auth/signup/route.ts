import { NextResponse } from 'next/server';
import { createSession, createUser, setSessionCookie, toPublicUser } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const user = await createUser(String(body.name || ''), String(body.email || ''), String(body.password || ''));
    const session = await createSession(user.id);
    const response = NextResponse.json({ user: toPublicUser(user) });
    setSessionCookie(response, session.id);
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to create account.' },
      { status: 400 }
    );
  }
}
