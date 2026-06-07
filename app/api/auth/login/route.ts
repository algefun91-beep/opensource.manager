import { NextResponse } from 'next/server';
import { createSession, setSessionCookie, toPublicUser, verifyPassword } from '@/lib/auth';
import { readDb } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const db = await readDb();
    const user = db.users.find(item => item.email === email);
    if (!user || !verifyPassword(password, user.salt, user.passwordHash)) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    const session = await createSession(user.id);
    const response = NextResponse.json({ user: toPublicUser(user) });
    setSessionCookie(response, session.id);
    return response;
  } catch {
    return NextResponse.json({ error: 'Unable to sign in.' }, { status: 400 });
  }
}
