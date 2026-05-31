'use client';
import { useState } from 'react';
import { RefreshCw, Plus, GitBranch, Clock, Star, GitPullRequest, AlertCircle, Users } from 'lucide-react';

const REPOS = [
  { name: 'my-cli-tool',      lang: 'TypeScript', color: '#3b82f6', issues: 12, prs: 4,  stars: 98,  status: 'healthy', statusColor: '#6ee7b7', statusBg: 'rgba(16,185,129,0.15)', statusBorder: 'rgba(16,185,129,0.2)' },
  { name: 'react-hooks-lib', lang: 'JavaScript',  color: '#8b5cf6', issues: 12, prs: 3,  stars: 44,  status: '3 stale',  statusColor: '#fcd34d', statusBg: 'rgba(245,158,11,0.15)',  statusBorder: 'rgba(245,158,11,0.2)' },
];

const RECENT_ISSUES = [
  { repo: 'my-cli-tool',     title: 'CLI crashes on Windows when path has spaces', label: 'bug',     color: '#ef4444', time: '2h ago' },
  { repo: 'react-hooks-lib', title: 'useDebounce not cleaning up on unmount',       label: 'bug',     color: '#ef4444', time: '5h ago' },
  { repo: 'my-cli-tool',     title: 'Add --dry-run flag to delete command',          label: 'feature', color: '#3b82f6', time: '1d ago' },
  { repo: 'react-hooks-lib', title: 'Document TypeScript generics in README',        label: 'docs',    color: '#8b5cf6', time: '2d ago' },
];

export default function DashboardPage() {
  const [syncing, setSyncing] = useState(false);

  const handleSync = () => {
    setSyncing(true);
    setTimeout(() => setSyncing(false), 1800);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Topbar */}
      <div className="h-13 flex items-center px-5 gap-3 flex-shrink-0"
        style={{ height: 52, borderBottom: '1px solid rgba(100,160,255,0.1)', background: 'rgba(8,16,38,0.7)', backdropFilter: 'blur(8px)' }}>
        <span className="text-sm font-medium" style={{ color: 'rgba(200,220,255,0.9)' }}>Project Dashboard</span>
        <span className="text-[11px] px-2 py-0.5 rounded-full flex items-center gap-1"
          style={{ background: 'rgba(16,185,129,0.15)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.25)' }}>
          ✓ 2 repos connected
        </span>
        <div className="ml-auto flex gap-2">
          <button onClick={handleSync}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md transition-all"
            style={{ border: '1px solid rgba(100,160,255,0.2)', background: 'rgba(30,50,100,0.3)', color: 'rgba(160,200,255,0.75)' }}>
            <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Syncing…' : 'Sync'}
          </button>
          <button className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md transition-all"
            style={{ border: '1px solid rgba(96,165,250,0.4)', background: 'rgba(37,99,235,0.35)', color: '#93c5fd' }}>
            <Plus size={12} /> New release
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">

        {/* Stat row */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { icon: AlertCircle, value: '24', label: 'open issues',   color: '#93c5fd' },
            { icon: GitPullRequest, value: '7',  label: 'open PRs',   color: '#a78bfa' },
            { icon: Star,        value: '142', label: 'total stars',  color: '#fcd34d' },
            { icon: Users,       value: '11',  label: 'contributors', color: '#6ee7b7' },
          ].map(({ icon: Icon, value, label, color }) => (
            <div key={label} className="rounded-xl p-4 text-center"
              style={{ background: 'rgba(15,28,65,0.6)', border: '1px solid rgba(70,120,220,0.15)' }}>
              <Icon size={16} className="mx-auto mb-2" style={{ color }} />
              <div className="text-2xl font-medium" style={{ color }}>{value}</div>
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
            <div className="text-[11px]" style={{ color: 'rgba(100,140,200,0.45)' }}>last synced 2m ago</div>
          </div>
          <div className="flex flex-col gap-2">
            {REPOS.map(r => (
              <div key={r.name} className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all"
                style={{ background: 'rgba(15,28,65,0.5)', border: '1px solid rgba(70,120,220,0.12)' }}>
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: r.color }} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm" style={{ color: 'rgba(200,220,255,0.85)' }}>{r.name}</div>
                  <div className="text-[11px] mt-0.5" style={{ color: 'rgba(100,140,200,0.5)' }}>
                    {r.issues} issues · {r.prs} PRs · {r.stars} ⭐
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full"
                  style={{ background: r.statusBg, color: r.statusColor, border: `1px solid ${r.statusBorder}` }}>
                  {r.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent issues */}
        <div className="rounded-xl p-4"
          style={{ background: 'rgba(12,24,58,0.6)', border: '1px solid rgba(70,120,220,0.15)' }}>
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider mb-3" style={{ color: 'rgba(130,170,240,0.7)' }}>
            <AlertCircle size={13} /> Recent issues
          </div>
          <div className="flex flex-col gap-2">
            {RECENT_ISSUES.map((issue, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer"
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
              </div>
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
            AI has drafted a changelog from 18 commits since v1.4.0. Review and publish when ready.
          </p>
          <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(30,50,100,0.4)' }}>
            <div className="h-full rounded-full shimmer-bar" style={{ width: '62%' }} />
          </div>
          <div className="text-[10px] mt-1.5" style={{ color: 'rgba(100,140,200,0.45)' }}>18 of 29 commits summarized</div>
        </div>
      </div>
    </div>
  );
}
