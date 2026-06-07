import { NextResponse } from 'next/server';

type IncomingRepo = {
  owner?: string;
  name?: string;
  fullName?: string;
};

type GitHubIssue = {
  title: string;
  html_url: string;
  updated_at: string;
  labels?: { name: string; color?: string }[];
  pull_request?: unknown;
};

function splitRepo(repo: IncomingRepo) {
  if (repo.owner && repo.name) return { owner: repo.owner, name: repo.name };
  const [owner, name] = String(repo.fullName || '').split('/');
  return owner && name ? { owner, name } : null;
}

function githubHeaders() {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  return headers;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: githubHeaders(), cache: 'no-store' });
  if (!response.ok) {
    const message = response.status === 404 ? 'Repo not found or private' : `GitHub returned ${response.status}`;
    throw new Error(message);
  }
  return response.json();
}

function timeAgo(dateValue: string) {
  const diffMs = Date.now() - new Date(dateValue).getTime();
  const diffMinutes = Math.max(1, Math.floor(diffMs / 60000));
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const repos = Array.isArray(body?.repos) ? body.repos : [];
    const normalized = repos.map(splitRepo).filter(Boolean) as { owner: string; name: string }[];

    const data = await Promise.all(normalized.map(async ({ owner, name }) => {
      const encodedOwner = encodeURIComponent(owner);
      const encodedName = encodeURIComponent(name);
      const base = `https://api.github.com/repos/${encodedOwner}/${encodedName}`;

      const [repo, issues, contributors] = await Promise.all([
        fetchJson<any>(base),
        fetchJson<GitHubIssue[]>(`${base}/issues?state=open&sort=updated&direction=desc&per_page=100`),
        fetchJson<any[]>(`${base}/contributors?per_page=100`).catch(() => []),
      ]);

      const openPrs = issues.filter(issue => issue.pull_request).length;
      const openIssues = issues.filter(issue => !issue.pull_request);
      const recentIssues = openIssues.slice(0, 5).map(issue => {
        const label = issue.labels?.[0];
        return {
          repo: repo.full_name,
          title: issue.title,
          url: issue.html_url,
          label: label?.name || 'issue',
          color: label?.color ? `#${label.color}` : '#3b82f6',
          time: timeAgo(issue.updated_at),
        };
      });

      return {
        owner,
        name,
        fullName: repo.full_name,
        description: repo.description,
        url: repo.html_url,
        language: repo.language || 'Unknown',
        stars: repo.stargazers_count || 0,
        forks: repo.forks_count || 0,
        openIssues: openIssues.length,
        openPrs,
        contributors: contributors.length,
        updatedAt: repo.updated_at,
        pushedAt: repo.pushed_at,
        recentIssues,
      };
    }));

    return NextResponse.json({ repos: data, syncedAt: new Date().toISOString() });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to sync GitHub repos' },
      { status: 500 }
    );
  }
}
