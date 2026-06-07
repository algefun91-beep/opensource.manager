import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { createId, updateDb } from '@/lib/db';

function normalizeRepo(input: string) {
  const trimmed = input.trim();
  const match = trimmed.match(/^(?:https?:\/\/github\.com\/)?([^/\s]+)\/([^/\s#?]+)\/?$/i);
  if (!match) return null;
  const owner = match[1];
  const name = match[2].replace(/\.git$/i, '');
  return owner && name ? { owner, name, fullName: `${owner}/${name}` } : null;
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const repos = await updateDb(db => db.repos.filter(repo => repo.userId === user.id));
    return NextResponse.json({ repos });
  } catch {
    return NextResponse.json({ repos: [] }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const body = await req.json();
    const normalized = normalizeRepo(String(body.repo || body.fullName || ''));
    if (!normalized) {
      return NextResponse.json({ error: 'Use owner/repo or a GitHub repo URL.' }, { status: 400 });
    }

    const repo = await updateDb(db => {
      const existing = db.repos.find(item => item.userId === user.id && item.fullName.toLowerCase() === normalized.fullName.toLowerCase());
      if (existing) return existing;

      const next = {
        id: createId('repo'),
        userId: user.id,
        ...normalized,
        createdAt: new Date().toISOString(),
      };
      db.repos.push(next);
      return next;
    });

    return NextResponse.json({ repo });
  } catch {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const fullName = req.nextUrl.searchParams.get('fullName') || '';
    await updateDb(db => {
      db.repos = db.repos.filter(repo => !(repo.userId === user.id && repo.fullName.toLowerCase() === fullName.toLowerCase()));
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }
}
