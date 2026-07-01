'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard, GitBranch, Bot, Github,
  Plus, Settings, Cpu, X
} from 'lucide-react';
import clsx from 'clsx';
import { useConnectedRepos } from '@/components/useConnectedRepos';

const NAV = [
  { href: '/dashboard',  label: 'Project Dashboard', icon: LayoutDashboard },
  { href: '/releasify',  label: 'Releasify',          icon: GitBranch,  badge: '3 new' },
  { href: '/sandbox',    label: 'Agent Sandbox',      icon: Bot,        live: true },
  { href: '/settings',   label: 'Settings',           icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const { repos, addRepo, removeRepo } = useConnectedRepos();
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [repoInput, setRepoInput] = useState('');
  const [repoError, setRepoError] = useState('');
  const [showConnect, setShowConnect] = useState(false);

  const handleConnectRepo = async (event: FormEvent) => {
    event.preventDefault();
    const result = await addRepo(repoInput);
    if (!result.ok) {
      setRepoError(result.error || 'Unable to connect repo.');
      return;
    }

    setRepoInput('');
    setRepoError('');
    setShowConnect(false);
  };

  const isPublicPage = path === '/' || path === '/login' || path === '/signup';

  useEffect(() => {
    fetch('/api/auth/me')
      .then(response => response.json())
      .then(data => setUser(data.user || null))
      .catch(() => setUser(null));
  }, []);

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  if (isPublicPage) {
    return (
      <div className="min-h-screen"
        style={{ background: 'var(--app-bg)' }}>
        {children}
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden"
      style={{ background: 'var(--app-bg)' }}>

      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 flex flex-col glass"
        style={{ borderRight: '1px solid var(--sidebar-border)', background: 'var(--sidebar-bg, rgba(8,16,40,0.85))' }}>

        {/* Logo */}
        <div className="px-4 py-4 flex items-center gap-2.5"
          style={{ borderBottom: '1px solid rgba(100,160,255,0.1)' }}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#2563eb,#7c3aed)' }}>
            <Cpu size={14} className="text-white" />
          </div>
          <div>
            <div className="text-xs font-medium" style={{ color: 'rgba(200,220,255,0.9)' }}>
              opensource.manager
            </div>
            <div className="text-[10px]" style={{ color: 'rgba(100,140,200,0.5)', letterSpacing: '0.04em' }}>
              v0.1.0 — built with Next.js, React, and a lot of ❤️
            </div>
          </div>
        </div>

        {/* Main nav */}
        <div className="px-2.5 pt-3 pb-1">
          <div className="text-[10px] px-1.5 mb-1.5 uppercase tracking-widest"
            style={{ color: 'rgba(100,140,200,0.45)' }}>workspace</div>
          {NAV.map(({ href, label, icon: Icon, badge, live }) => {
            const active = path.startsWith(href);
            return (
              <Link key={href} href={href}
                className={clsx(
                  'flex items-center gap-2 px-2.5 py-2 rounded-lg mb-0.5 text-[13px] transition-all duration-150',
                  'border',
                  active
                    ? 'border-[rgba(96,165,250,0.25)] text-[#93c5fd]'
                    : 'border-transparent hover:border-[rgba(80,130,255,0.15)] hover:text-[rgba(200,220,255,0.9)]'
                )}
                style={active
                  ? { background: 'rgba(37,99,235,0.2)', color: '#93c5fd' }
                  : { color: 'rgba(160,190,240,0.65)' }}>
                <Icon size={15} className="flex-shrink-0" />
                <span className="flex-1 truncate">{label}</span>
                {live && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                    style={{ background: 'rgba(16,185,129,0.2)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.25)' }}>
                    live
                  </span>
                )}
                {badge && !live && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                    style={{ background: 'rgba(37,99,235,0.35)', color: '#93c5fd', border: '1px solid rgba(96,165,250,0.2)' }}>
                    {badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Repos */}
        <div className="px-2.5 pt-3 pb-1">
          <div className="text-[10px] px-1.5 mb-1.5 uppercase tracking-widest"
            style={{ color: 'rgba(100,140,200,0.45)' }}>repos</div>
          {repos.map(r => (
            <div key={r.fullName}
              className="group flex items-center gap-2 px-2.5 py-1.5 rounded-lg mb-0.5 text-[12px] transition-all"
              style={{ color: 'rgba(140,170,230,0.6)' }}>
              <Github size={13} className="flex-shrink-0" />
              <span className="truncate flex-1">{r.fullName}</span>
              <button
                onClick={() => removeRepo(r.fullName)}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                title={`Remove ${r.fullName}`}
                style={{ color: 'rgba(140,170,230,0.55)' }}
              >
                <X size={12} />
              </button>
            </div>
          ))}
          {showConnect ? (
            <form onSubmit={handleConnectRepo} className="mt-2 flex flex-col gap-1.5">
              <input
                value={repoInput}
                onChange={event => {
                  setRepoInput(event.target.value);
                  setRepoError('');
                }}
                placeholder="owner/repo"
                className="text-[12px] px-2 py-1.5 rounded-md outline-none"
                style={{
                  background: 'rgba(6,12,28,0.7)',
                  border: '1px solid rgba(70,120,220,0.2)',
                  color: 'rgba(200,220,255,0.9)',
                }}
              />
              {repoError && (
                <div className="text-[10px] leading-snug" style={{ color: 'rgba(255,140,140,0.85)' }}>
                  {repoError}
                </div>
              )}
              <div className="flex gap-1.5">
                <button
                  type="submit"
                  className="flex-1 text-[11px] px-2 py-1 rounded-md"
                  style={{ background: 'rgba(37,99,235,0.35)', border: '1px solid rgba(96,165,250,0.25)', color: '#93c5fd' }}
                >
                  Connect
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowConnect(false);
                    setRepoInput('');
                    setRepoError('');
                  }}
                  className="text-[11px] px-2 py-1 rounded-md"
                  style={{ background: 'rgba(30,50,100,0.25)', border: '1px solid rgba(100,160,255,0.12)', color: 'rgba(160,190,240,0.65)' }}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setShowConnect(true)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[12px] cursor-pointer w-full"
              style={{ color: 'rgba(100,140,200,0.45)' }}
            >
              <Plus size={13} />
              <span>Connect repo</span>
            </button>
          )}
        </div>

        {/* Bottom */}
        <div className="mt-auto px-2.5 py-3" style={{ borderTop: '1px solid rgba(100,160,255,0.1)' }}>
          <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-medium flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#1d4ed8,#7c3aed)', color: '#fff' }}>
              {(user?.name || user?.email || 'U').slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] truncate" style={{ color: 'rgba(180,210,255,0.8)' }}>{user?.name || 'dev'}</div>
              <div className="text-[10px] truncate" style={{ color: 'rgba(100,140,200,0.5)' }}>{user?.email || 'local account'}</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {children}
      </main>
    </div>
  );
}
