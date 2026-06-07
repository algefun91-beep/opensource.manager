'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, GitBranch, Clock, Star, GitPullRequest, AlertCircle, Users } from 'lucide-react';
import { useConnectedRepos } from '@/components/useConnectedRepos';

type DashboardRepo = {
  owner: string;
  name: string;
  fullName: string;
  description: string | null;
  url: string;
  language: string;
  stars: number;
  forks: number;
  openIssues: number;
  openPrs: number;
  contributors: number;
  updatedAt: string;
  pushedAt: string;
  recentIssues: RecentIssue[];
};

type RecentIssue = {
  repo: string;
  title: string;
  url: string;
  label: string;
  color: string;
  time: string;
};

const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: '#3b82f6',
  JavaScript: '#fcd34d',
  Python: '#6ee7b7',
  Go: '#38bdf8',
  Rust: '#fb7185',
  Ruby: '#f87171',
  PHP: '#a78bfa',
  Java: '#f59e0b',
};

function formatSyncTime(value: string | null) {
  if (!value) return 'not synced yet';
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(value));
}

function repoStatus(repo: DashboardRepo) {
  if (repo.openIssues === 0 && repo.openPrs === 0) {
    return {
      label: 'healthy',
      color: '#6ee7b7',
      background: 'rgba(16,185,129,0.15)',
      border: 'rgba(16,185,129,0.2)',
    };
  }

  if (repo.openIssues >= 25) {
    return {
      label: `${repo.openIssues} open`,
      color: '#fcd34d',
      background: 'rgba(245,158,11,0.15)',
      border: 'rgba(245,158,11,0.2)',
    };
  }

  return {
    label: 'active',
    color: '#93c5fd',
    background: 'rgba(59,130,246,0.15)',
    border: 'rgba(59,130,246,0.2)',
  };
}

export default function DashboardPage() {
  const [syncing, setSyncing] = useState(false);
  const [reposData, setReposData] = useState<DashboardRepo[]>([]);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [syncError, setSyncError] = useState('');
  const { repos } = useConnectedRepos();

  const handleSync = useCallback(async () => {
    if (repos.length === 0) {
      setReposData([]);
      setLastSyncedAt(null);
      setSyncError('');
      return;
    }

    setSyncing(true);
    setSyncError('');
    try {
      const response = await fetch('/api/github/repos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repos }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Unable to sync GitHub repos');

      setReposData(Array.isArray(data.repos) ? data.repos : []);
      setLastSyncedAt(data.syncedAt || new Date().toISOString());
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : 'Unable to sync GitHub repos');
    } finally {
      setSyncing(false);
    }
  }, [repos]);

  useEffect(() => {
    handleSync();
    const interval = window.setInterval(handleSync, 60000);
    window.addEventListener('focus', handleSync);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', handleSync);
    };
  }, [handleSync]);

  const recentIssues = useMemo(() => reposData.flatMap(repo => repo.recentIssues).slice(0, 8), [reposData]);
  const totals = useMemo(() => ({
    issues: reposData.reduce((sum, repo) => sum + repo.openIssues, 0),
    prs: reposData.reduce((sum, repo) => sum + repo.openPrs, 0),
    stars: reposData.reduce((sum, repo) => sum + repo.stars, 0),
    contributors: reposData.reduce((sum, repo) => sum + repo.contributors, 0),
  }), [reposData]);

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      {/* Topbar */}
      <div className="h-13 flex items-center px-5 gap-3 flex-shrink-0"
        style={{ height: 52, borderBottom: '1px solid rgba(100,160,255,0.1)', background: 'rgba(8,16,38,0.7)', backdropFilter: 'blur(8px)' }}>
        <span className="text-sm font-medium" style={{ color: 'rgba(200,220,255,0.9)' }}>Project Dashboard</span>
        <span className="text-[11px] px-2 py-0.5 rounded-full flex items-center gap-1"
          style={{ background: 'rgba(16,185,129,0.15)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.25)' }}>
          ✓ {repos.length} repos connected
        </span>
        <div className="ml-auto flex gap-2">
          <button onClick={handleSync}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md transition-all"
            style={{ border: '1px solid rgba(100,160,255,0.2)', background: 'rgba(30,50,100,0.3)', color: 'rgba(160,200,255,0.75)' }}>
            <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Syncing…' : 'Sync'}
          </button>
          <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md"
            style={{ border: '1px solid rgba(16,185,129,0.2)', background: 'rgba(16,185,129,0.12)', color: '#6ee7b7' }}>
            Live
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
        {syncError && (
          <div className="rounded-lg px-3 py-2 text-[12px]"
            style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.22)', color: 'rgba(255,180,180,0.9)' }}>
            {syncError}
          </div>
        )}

        {/* Stat row */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { icon: AlertCircle, value: totals.issues, label: 'open issues',   color: '#93c5fd' },
            { icon: GitPullRequest, value: totals.prs,  label: 'open PRs',   color: '#a78bfa' },
            { icon: Star,        value: totals.stars, label: 'total stars',  color: '#fcd34d' },
            { icon: Users,       value: totals.contributors,  label: 'contributors', color: '#6ee7b7' },
          ].map(({ icon: Icon, value, label, color }) => (
            <div key={label} className="rounded-xl p-4 text-center"
              style={{ background: 'rgba(15,28,65,0.6)', border: '1px solid rgba(70,120,220,0.15)' }}>
              <Icon size={16} className="mx-auto mb-2" style={{ color }} />
              <div className="text-2xl font-medium" style={{ color }}>{value.toLocaleString()}</div>
              <div className="text-[11px] mt-0.5" style={{ color: 'rgba(100,140,200,0.55)' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Repos */}
        <div className="rounded-xl p-4 relative overflow-hidden glass-shine"
          style={{ background: 'rgba(12,24,58,0.6)', border: '1px solid rgba(70,120,220,0.15)', position: 'relative' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider" style={{ color: 'rgba(130,170,240,0.7)' }}>
              <GitBranch size={13} /> Repositories
            </div>
            <div className="text-[11px]" style={{ color: 'rgba(100,140,200,0.45)' }}>last synced {formatSyncTime(lastSyncedAt)}</div>
          </div>
          <div className="flex flex-col gap-2">
            {reposData.length === 0 && (
              <div className="px-3 py-5 rounded-lg text-center"
                style={{ background: 'rgba(15,28,65,0.45)', border: '1px solid rgba(70,120,220,0.12)' }}>
                <div className="text-sm" style={{ color: 'rgba(200,220,255,0.82)' }}>No live repo data yet</div>
                <div className="text-[12px] mt-1" style={{ color: 'rgba(100,140,200,0.58)' }}>
                  Use Connect repo in the sidebar, then the dashboard will sync from GitHub.
                </div>
              </div>
            )}
            {reposData.map(r => {
              const status = repoStatus(r);
              const color = LANGUAGE_COLORS[r.language] || '#8b5cf6';
              return (
                <a key={r.fullName} href={r.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all"
                  style={{ background: 'rgba(15,28,65,0.5)', border: '1px solid rgba(70,120,220,0.12)' }}>
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm" style={{ color: 'rgba(200,220,255,0.85)' }}>{r.fullName}</div>
                    <div className="text-[11px] mt-0.5" style={{ color: 'rgba(100,140,200,0.5)' }}>
                      {r.openIssues} issues · {r.openPrs} PRs · {r.stars.toLocaleString()} stars · {r.language}
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full"
                    style={{ background: status.background, color: status.color, border: `1px solid ${status.border}` }}>
                    {status.label}
                  </span>
                </a>
              );
            })}
          </div>
        </div>

        {/* Recent issues */}
        <div className="rounded-xl p-4"
          style={{ background: 'rgba(12,24,58,0.6)', border: '1px solid rgba(70,120,220,0.15)' }}>
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider mb-3" style={{ color: 'rgba(130,170,240,0.7)' }}>
            <AlertCircle size={13} /> Recent issues
          </div>
          <div className="flex flex-col gap-2">
            {recentIssues.length === 0 && (
              <div className="px-3 py-4 rounded-lg text-[12px] text-center"
                style={{ background: 'rgba(10,20,50,0.4)', border: '1px solid rgba(60,100,200,0.1)', color: 'rgba(100,140,200,0.58)' }}>
                No open issues found for connected repos.
              </div>
            )}
            {recentIssues.map((issue, i) => (
              <a key={`${issue.repo}-${issue.title}-${i}`} href={issue.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer"
                style={{ background: 'rgba(10,20,50,0.4)', border: '1px solid rgba(60,100,200,0.1)' }}>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] truncate" style={{ color: 'rgba(190,215,255,0.85)' }}>{issue.title}</div>
                  <div className="text-[11px] mt-0.5" style={{ color: 'rgba(100,140,200,0.5)' }}>{issue.repo}</div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full flex-shrink-0"
                  style={{ background: `${issue.color}22`, color: issue.color, border: `1px solid ${issue.color}44` }}>
                  {issue.label}
                </span>
                <span className="text-[11px] flex-shrink-0" style={{ color: 'rgba(100,140,200,0.45)' }}>
                  {issue.time}
                </span>
              </a>
            ))}
          </div>
        </div>

        {/* Releasify draft card */}
        <div className="rounded-xl p-4"
          style={{ background: 'rgba(12,24,58,0.6)', border: '1px solid rgba(70,120,220,0.15)' }}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider" style={{ color: 'rgba(130,170,240,0.7)' }}>
              <Clock size={13} /> Releasify — next changelog
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(59,130,246,0.15)', color: '#93c5fd', border: '1px solid rgba(59,130,246,0.2)' }}>
              draft
            </span>
          </div>
          <p className="text-[12px] mb-3" style={{ color: 'rgba(140,180,240,0.7)', lineHeight: 1.6 }}>
            Connected repos refresh live from GitHub every minute. Use Releasify when you are ready to draft a changelog from recent commits.
          </p>
          <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(30,50,100,0.4)' }}>
            <div className="h-full rounded-full shimmer-bar" style={{ width: reposData.length ? '62%' : '12%' }} />
          </div>
          <div className="text-[10px] mt-1.5" style={{ color: 'rgba(100,140,200,0.45)' }}>{reposData.length} repos available for release work</div>
        </div>
      </div>
    </div>
  );
}
