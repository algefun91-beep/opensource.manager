'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Bot, GitBranch, LayoutDashboard, Sparkles } from 'lucide-react';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    fetch('/api/auth/me')
      .then(response => response.json())
      .then(data => {
        if (data.user) router.replace('/dashboard');
      })
      .catch(() => undefined);
  }, [router]);

  return (
    <main className="min-h-screen overflow-hidden">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ background: 'linear-gradient(135deg,#2563eb,#14b8a6)' }}>
            <Sparkles size={15} className="text-white" />
          </div>
          <span className="text-sm font-medium" style={{ color: 'rgba(220,235,255,0.95)' }}>opensource.manager</span>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/login" className="rounded-md px-3 py-1.5 text-sm"
            style={{ color: 'rgba(170,205,255,0.82)' }}>
            Log in
          </Link>
          <Link href="/signup" className="rounded-md px-3 py-1.5 text-sm"
            style={{ background: 'rgba(37,99,235,0.42)', border: '1px solid rgba(96,165,250,0.35)', color: '#bfdbfe' }}>
            Sign up
          </Link>
        </div>
      </nav>

      <section className="mx-auto grid max-w-6xl grid-cols-[1.05fr_0.95fr] gap-8 px-5 pb-10 pt-12">
        <div className="flex min-h-[520px] flex-col justify-center">
          <div className="mb-4 w-fit rounded-full px-3 py-1 text-xs"
            style={{ background: 'rgba(20,184,166,0.14)', border: '1px solid rgba(45,212,191,0.25)', color: '#99f6e4' }}>
            GitHub project ops, changelogs, and AI sandboxes
          </div>
          <h1 className="max-w-3xl text-5xl font-semibold leading-tight"
            style={{ color: 'rgba(232,242,255,0.98)' }}>
            Run your open source work from one focused cockpit.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7"
            style={{ color: 'rgba(150,180,230,0.72)' }}>
            Connect repositories, watch live project health, draft releases from real commits, and keep an AI sandbox close to the code.
          </p>
          <div className="mt-7 flex gap-3">
            <Link href="/signup" className="rounded-lg px-4 py-2 text-sm font-medium"
              style={{ background: 'rgba(37,99,235,0.55)', border: '1px solid rgba(96,165,250,0.4)', color: '#dbeafe' }}>
              Create account
            </Link>
            <Link href="/login" className="rounded-lg px-4 py-2 text-sm"
              style={{ background: 'rgba(15,28,65,0.5)', border: '1px solid rgba(100,160,255,0.18)', color: 'rgba(180,210,255,0.82)' }}>
              Open workspace
            </Link>
          </div>
        </div>

        <div className="grid content-center gap-3">
          {[
            { icon: LayoutDashboard, title: 'Live dashboard', text: 'Issues, pull requests, stars, contributors, and recent work refresh from GitHub.' },
            { icon: GitBranch, title: 'Releasify', text: 'Turn commit history into a clean Markdown changelog draft in one pass.' },
            { icon: Bot, title: 'Agent sandbox', text: 'Keep assistant messages saved to your account and ready when you return.' },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-xl p-5"
              style={{ background: 'rgba(12,24,58,0.62)', border: '1px solid rgba(90,140,220,0.16)' }}>
              <Icon size={18} style={{ color: '#93c5fd' }} />
              <div className="mt-3 text-sm font-medium" style={{ color: 'rgba(220,235,255,0.92)' }}>{title}</div>
              <p className="mt-2 text-sm leading-6" style={{ color: 'rgba(140,170,220,0.68)' }}>{text}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
