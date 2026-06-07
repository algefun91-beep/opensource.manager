import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { readDb } from '@/lib/db';

function githubHeaders() {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return headers;
}

function timeAgo(dateValue: string) {
  const diffMs = Date.now() - new Date(dateValue).getTime();
  const minutes = Math.max(1, Math.floor(diffMs / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const fullName = req.nextUrl.searchParams.get('repo') || '';
    const db = await readDb();
    const connected = db.repos.find(repo => repo.userId === user.id && repo.fullName.toLowerCase() === fullName.toLowerCase());
    if (!connected) return NextResponse.json({ error: 'Connect that repo first.' }, { status: 404 });

    const base = `https://api.github.com/repos/${encodeURIComponent(connected.owner)}/${encodeURIComponent(connected.name)}`;
    const response = await fetch(`${base}/commits?per_page=30`, { headers: githubHeaders(), cache: 'no-store' });
    if (!response.ok) return NextResponse.json({ error: `GitHub returned ${response.status}` }, { status: response.status });

    const commits = await response.json();
    return NextResponse.json({
      commits: Array.isArray(commits) ? commits.map((item: any) => ({
        sha: String(item.sha || '').slice(0, 7),
        message: String(item.commit?.message || '').split('\n')[0],
        author: item.commit?.author?.name || item.author?.login || 'unknown',
        time: item.commit?.author?.date ? timeAgo(item.commit.author.date) : '',
      })) : [],
    });
  } catch {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }
}
