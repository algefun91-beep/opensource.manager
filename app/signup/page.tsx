'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { UserPlus } from 'lucide-react';

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
    <main className="flex min-h-screen items-center justify-center px-5">
      <form onSubmit={submit} className="w-full max-w-sm rounded-xl p-6"
        style={{ background: 'rgba(12,24,58,0.72)', border: '1px solid rgba(90,140,220,0.18)' }}>
        <UserPlus size={20} style={{ color: '#93c5fd' }} />
        <h1 className="mt-4 text-2xl font-semibold" style={{ color: 'rgba(232,242,255,0.98)' }}>Sign up</h1>
        <p className="mt-2 text-sm" style={{ color: 'rgba(140,170,220,0.68)' }}>Start with a local account and connect GitHub repos when you land inside.</p>
        <div className="mt-5 flex flex-col gap-3">
          <input value={name} onChange={event => setName(event.target.value)} placeholder="Name" className="rounded-lg px-3 py-2.5 text-sm outline-none"
            style={{ background: 'rgba(6,12,28,0.72)', border: '1px solid rgba(70,120,220,0.22)', color: '#e2e8f0' }} />
          <input value={email} onChange={event => setEmail(event.target.value)} type="email" placeholder="Email" className="rounded-lg px-3 py-2.5 text-sm outline-none"
            style={{ background: 'rgba(6,12,28,0.72)', border: '1px solid rgba(70,120,220,0.22)', color: '#e2e8f0' }} />
          <input value={password} onChange={event => setPassword(event.target.value)} type="password" placeholder="Password" className="rounded-lg px-3 py-2.5 text-sm outline-none"
            style={{ background: 'rgba(6,12,28,0.72)', border: '1px solid rgba(70,120,220,0.22)', color: '#e2e8f0' }} />
        </div>
        {error && <div className="mt-3 text-xs" style={{ color: 'rgba(255,150,150,0.9)' }}>{error}</div>}
        <button disabled={loading} className="mt-5 w-full rounded-lg py-2.5 text-sm font-medium"
          style={{ background: 'rgba(37,99,235,0.55)', border: '1px solid rgba(96,165,250,0.4)', color: '#dbeafe' }}>
          {loading ? 'Creating account...' : 'Create account'}
        </button>
        <div className="mt-4 text-center text-sm" style={{ color: 'rgba(140,170,220,0.68)' }}>
          Already have one? <Link href="/login" style={{ color: '#93c5fd' }}>Log in</Link>
        </div>
      </form>
    </main>
  );
}
