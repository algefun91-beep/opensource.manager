import { NextRequest, NextResponse } from 'next/server';
import { clearSessionCookie, removeSession, SESSION_COOKIE } from '@/lib/auth';

export async function POST(req: NextRequest) {
  await removeSession(req.cookies.get(SESSION_COOKIE)?.value);
  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response);
  return response;
}
