'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, GitBranch, Bot, Github,
  Plus, Settings, Cpu
} from 'lucide-react';
import clsx from 'clsx';

const NAV = [
  { href: '/dashboard',  label: 'Project Dashboard', icon: LayoutDashboard },
  { href: '/releasify',  label: 'Releasify',          icon: GitBranch,  badge: '3 new' },
  { href: '/sandbox',    label: 'Agent Sandbox',      icon: Bot,        live: true },
];

const REPOS = ['my-cli-tool', 'react-hooks-lib'];

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();

  return (
    <div className="flex h-screen overflow-hidden"
      style={{ background: 'linear-gradient(160deg,#0a0f1e 0%,#0d1a2e 50%,#091628 100%)' }}>

      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 flex flex-col glass"
        style={{ borderRight: '1px solid rgba(100,160,255,0.13)', background: 'rgba(8,16,40,0.85)' }}>

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
              v0.1.0 · local
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
          {REPOS.map(r => (
            <div key={r}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg mb-0.5 text-[12px] cursor-pointer transition-all"
              style={{ color: 'rgba(140,170,230,0.6)' }}>
              <Github size={13} className="flex-shrink-0" />
              <span className="truncate">{r}</span>
            </div>
          ))}
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[12px] cursor-pointer"
            style={{ color: 'rgba(100,140,200,0.45)' }}>
            <Plus size={13} />
            <span>Connect repo</span>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-auto px-2.5 py-3" style={{ borderTop: '1px solid rgba(100,160,255,0.1)' }}>
          <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-medium flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#1d4ed8,#7c3aed)', color: '#fff' }}>
              JD
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px]" style={{ color: 'rgba(180,210,255,0.8)' }}>dev</div>
              <div className="text-[10px]" style={{ color: 'rgba(100,140,200,0.5)' }}>local instance</div>
            </div>
            <Settings size={13} style={{ color: 'rgba(100,140,200,0.4)' }} />
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
