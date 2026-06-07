import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { pbkdf2Sync, randomBytes, timingSafeEqual } from 'crypto';
import { createId, readDb, updateDb, UserRecord } from './db';

export const SESSION_COOKIE = 'osm_session';
const SESSION_DAYS = 14;

export type PublicUser = {
  id: string;
  email: string;
  name: string;
};

function hashPassword(password: string, salt = randomBytes(16).toString('hex')) {
  const hash = pbkdf2Sync(password, salt, 120000, 32, 'sha256').toString('hex');
  return { salt, hash };
}

export function verifyPassword(password: string, salt: string, expectedHash: string) {
  const actual = Buffer.from(hashPassword(password, salt).hash, 'hex');
  const expected = Buffer.from(expectedHash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function toPublicUser(user: UserRecord): PublicUser {
  return { id: user.id, email: user.email, name: user.name };
}

export async function createUser(name: string, email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const trimmedName = name.trim() || normalizedEmail.split('@')[0];
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new Error('Enter a valid email address.');
  }
  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters.');
  }

  return updateDb(db => {
    if (db.users.some(user => user.email === normalizedEmail)) {
      throw new Error('An account with that email already exists.');
    }

    const passwordResult = hashPassword(password);
    const user: UserRecord = {
      id: createId('usr'),
      email: normalizedEmail,
      name: trimmedName,
      passwordHash: passwordResult.hash,
      salt: passwordResult.salt,
      createdAt: new Date().toISOString(),
    };
    db.users.push(user);
    return user;
  });
}

export async function createSession(userId: string) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const session = {
    id: createId('ses'),
    userId,
    createdAt: now.toISOString(),
    expiresAt,
  };

  await updateDb(db => {
    db.sessions.push(session);
  });

  return session;
}

export function setSessionCookie(response: NextResponse, sessionId: string) {
  response.cookies.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, '', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 0 });
}

export async function getUserFromSessionId(sessionId?: string | null) {
  if (!sessionId) return null;
  const db = await readDb();
  const session = db.sessions.find(item => item.id === sessionId);
  if (!session || new Date(session.expiresAt).getTime() < Date.now()) return null;
  const user = db.users.find(item => item.id === session.userId);
  return user || null;
}

export async function getCurrentUser() {
  return getUserFromSessionId(cookies().get(SESSION_COOKIE)?.value);
}

export async function requireUser(req?: NextRequest) {
  const sessionId = req?.cookies.get(SESSION_COOKIE)?.value || cookies().get(SESSION_COOKIE)?.value;
  const user = await getUserFromSessionId(sessionId);
  if (!user) throw new Error('Authentication required.');
  return user;
}

export async function removeSession(sessionId?: string | null) {
  if (!sessionId) return;
  await updateDb(db => {
    db.sessions = db.sessions.filter(session => session.id !== sessionId);
  });
}
