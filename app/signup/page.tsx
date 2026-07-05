'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { Bot, GitBranch, LayoutDashboard, Sparkles, UserPlus } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    const response = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) {
      setError(data.error || 'Unable to create account.');
      return;
    }
    router.push('/dashboard');
    router.refresh();
  };

  return (
    <main className="min-h-screen overflow-hidden">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ background: 'linear-gradient(135deg,#2563eb,#14b8a6)' }}>
            <Sparkles size={15} className="text-white" />
          </div>
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>opensource.manager</span>
        </Link>
        <Link href="/login" className="rounded-md px-3 py-1.5 text-sm"
          style={{ background: 'var(--rounded-container-bg)', border: '1px solid rgba(96,165,250,0.35)', color: 'var(--accent-blue)' }}>
          Log in
        </Link>
      </nav>

      <section className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-5 pb-10 pt-8 lg:grid-cols-[0.95fr_1.05fr] lg:gap-8 lg:pt-12">
        <form onSubmit={submit} className="glass-shine relative w-full rounded-xl p-5 sm:p-6"
          style={{ background: 'var(--rounded-container-bg)', border: '1px solid rgba(70,120,220,0.15)' }}>
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider"
            style={{ color: 'rgba(130,170,240,0.7)' }}>
            <UserPlus size={14} /> New workspace
          </div>
          <h1 className="mt-4 text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>Sign up</h1>
          <p className="mt-2 text-sm leading-6" style={{ color: 'var(--text-secondary)' }}>
            Start with a local account and connect GitHub repos when you land inside.
          </p>

          <div className="mt-6 flex flex-col gap-3">
            <label className="flex flex-col gap-1.5 text-[11px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Name
              <input
                value={name}
                onChange={event => setName(event.target.value)}
                autoComplete="name"
                className="rounded-lg px-3 py-2.5 text-sm normal-case outline-none"
                style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)', letterSpacing: 0 }}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-[11px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Email
              <input
                value={email}
                onChange={event => setEmail(event.target.value)}
                type="email"
                autoComplete="email"
                className="rounded-lg px-3 py-2.5 text-sm normal-case outline-none"
                style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)', letterSpacing: 0 }}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-[11px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Password
              <input
                value={password}
                onChange={event => setPassword(event.target.value)}
                type="password"
                autoComplete="new-password"
                className="rounded-lg px-3 py-2.5 text-sm normal-case outline-none"
                style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)', letterSpacing: 0 }}
              />
            </label>
          </div>

          {error && (
            <div className="mt-3 rounded-lg px-3 py-2 text-xs"
              style={{ background: 'var(--logout-bg)', border: '1px solid var(--logout-border)', color: 'var(--logout-text)' }}>
              {error}
            </div>
          )}

          <button disabled={loading} className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all"
            style={{ background: 'rgba(37,99,235,0.35)', border: '1px solid rgba(96,165,250,0.35)', color: '#93c5fd', cursor: loading ? 'not-allowed' : 'pointer' }}>
            <UserPlus size={14} />
            {loading ? 'Creating account...' : 'Create account'}
          </button>

          <div className="mt-4 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
            Already have one? <Link href="/login" style={{ color: 'var(--accent-blue)' }}>Log in</Link>
          </div>
        </form>

        <div className="grid content-center gap-3">
          {[
            { icon: LayoutDashboard, title: 'Project cockpit', text: 'Track issues, pull requests, stars, and contributor activity in one view.' },
            { icon: GitBranch, title: 'Changelog flow', text: 'Turn live commits into release notes without leaving the workspace.' },
            { icon: Bot, title: 'Saved sandbox', text: 'Keep assistant conversations attached to your local account.' },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-xl p-5"
              style={{ background: 'var(--rounded-container-bg)', border: '1px solid rgba(90,140,220,0.16)' }}>
              <Icon size={18} style={{ color: 'var(--accent-blue)' }} />
              <div className="mt-3 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{title}</div>
              <p className="mt-2 text-sm leading-6" style={{ color: 'var(--text-secondary)' }}>{text}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
