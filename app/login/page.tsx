'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { LogIn } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) {
      setError(data.error || 'Unable to sign in.');
      return;
    }
    const next = new URLSearchParams(window.location.search).get('next');
    router.push(next || '/dashboard');
    router.refresh();
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-5">
      <form onSubmit={submit} className="w-full max-w-sm rounded-xl p-6"
        style={{ background: 'var(--rounded-container-bg)', border: '1px solid rgba(90,140,220,0.18)' }}>
        <LogIn size={20} style={{ color: 'var(--accent-blue)' }} />
        <h1 className="mt-4 text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>Log in</h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>Return to your connected repos, release drafts, and sandbox chat.</p>
        <div className="mt-5 flex flex-col gap-3">
          <input value={email} onChange={event => setEmail(event.target.value)} type="email" placeholder="Email" className="rounded-lg px-3 py-2.5 text-sm outline-none"
            style={{ background: 'var(--rounded-container-bg)', border: '1px solid rgba(70,120,220,0.22)', color: 'var(--text-primary)' }} />
          <input value={password} onChange={event => setPassword(event.target.value)} type="password" placeholder="Password" className="rounded-lg px-3 py-2.5 text-sm outline-none"
            style={{ background: 'var(--rounded-container-bg)', border: '1px solid rgba(70,120,220,0.22)', color: 'var(--text-primary)' }} />
        </div>
        {error && <div className="mt-3 text-xs" style={{ color: 'var(--logout-text)' }}>{error}</div>}
        <button disabled={loading} className="mt-5 w-full rounded-lg py-2.5 text-sm font-medium"
          style={{ background: 'var(--accent-blue)', border: '1px solid rgba(96,165,250,0.4)', color: '#dbeafe' }}>
          {loading ? 'Signing in...' : 'Log in'}
        </button>
        <div className="mt-4 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
          New here? <Link href="/signup" style={{ color: 'var(--accent-blue)' }}>Create an account</Link>
        </div>
      </form>
    </main>
  );
}
