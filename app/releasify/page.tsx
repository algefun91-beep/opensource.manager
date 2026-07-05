'use client';

import { useEffect, useState } from 'react';
import { GitBranch, Sparkles, Copy, Send, Check, RefreshCw } from 'lucide-react';
import { useConnectedRepos } from '@/components/useConnectedRepos';

type Commit = {
  sha: string;
  message: string;
  author: string;
  time: string;
};

export default function ReleasifyPage() {
  const { repos } = useConnectedRepos();
  const [generating, setGenerating] = useState(false);
  const [loadingCommits, setLoadingCommits] = useState(false);
  const [changelog, setChangelog] = useState('');
  const [copied, setCopied] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState('');
  const [commits, setCommits] = useState<Commit[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!selectedRepo && repos[0]) setSelectedRepo(repos[0].fullName);
  }, [repos, selectedRepo]);

  const loadCommits = async (repo = selectedRepo) => {
    if (!repo) return;
    setLoadingCommits(true);
    setError('');
    try {
      const response = await fetch(`/api/github/commits?repo=${encodeURIComponent(repo)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to load commits.');
      setCommits(Array.isArray(data.commits) ? data.commits : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load commits.');
      setCommits([]);
    } finally {
      setLoadingCommits(false);
    }
  };

  useEffect(() => {
    if (selectedRepo) {
      setChangelog('');
      loadCommits(selectedRepo);
    }
  }, [selectedRepo]);

  const generate = async () => {
    if (!selectedRepo || commits.length === 0) return;
    setGenerating(true);
    setChangelog('');
    setError('');

    try {
      const response = await fetch('/api/releasify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo: selectedRepo, commits, since: 'latest fetched commit window' }),
      });
      if (!response.ok) throw new Error('Unable to generate changelog.');

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Generator returned no stream.');
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        setChangelog(prev => prev + decoder.decode(value, { stream: true }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to generate changelog.');
    } finally {
      setGenerating(false);
    }
  };

  const copy = () => {
    navigator.clipboard.writeText(changelog);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      <div className="h-13 flex items-center px-5 gap-3 flex-shrink-0"
        style={{ height: 52, borderBottom: '1px solid rgba(100,160,255,0.1)', background: 'var(--rounded-container-bg)', backdropFilter: 'blur(8px)' }}>
        <GitBranch size={15} style={{ color: 'var(--accent-blue)' }} />
        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Releasify</span>
        <span className="text-[11px] px-2 py-0.5 rounded-full"
          style={{ background: 'var(--rounded-container-bg)', color: 'var(--accent-blue)', border: '1px solid rgba(59,130,246,0.2)' }}>
          AI changelog generator
        </span>
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div className="w-80 flex-shrink-0 flex flex-col min-h-0 overflow-hidden"
          style={{ borderRight: '1px solid rgba(100,160,255,0.1)' }}>
          <div className="px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid rgba(100,160,255,0.08)' }}>
            <div className="text-[11px] uppercase tracking-wider mb-2" style={{ color: 'rgba(100,140,200,0.5)' }}>Repository</div>
            <select value={selectedRepo} onChange={event => setSelectedRepo(event.target.value)}
              className="w-full px-3 py-2 rounded-lg text-[13px] outline-none"
              style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}>
              <option value="">Connect a repo first</option>
              {repos.map(repo => <option key={repo.fullName} value={repo.fullName}>{repo.fullName}</option>)}
            </select>
          </div>

          <div className="px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid rgba(100,160,255,0.08)' }}>
            <div className="flex items-center justify-between">
              <div className="text-[11px] uppercase tracking-wider" style={{ color: 'rgba(100,140,200,0.5)' }}>
                Latest commits
              </div>
              <button onClick={() => loadCommits()} disabled={!selectedRepo || loadingCommits} style={{ color: 'rgba(150,190,255,0.7)' }}>
                <RefreshCw size={13} className={loadingCommits ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-2">
            {commits.length === 0 && (
              <div className="px-3 py-5 text-center text-[12px]" style={{ color: 'rgba(100,140,200,0.55)' }}>
                {loadingCommits ? 'Loading commits...' : 'No commits loaded yet.'}
              </div>
            )}
            {commits.map(c => (
              <div key={c.sha} className="px-3 py-2.5 rounded-lg mb-1.5"
                style={{ background: 'var(--rounded-container-bg)', border: '1px solid rgba(60,100,200,0.1)' }}>
                <div className="text-[12px] mb-1" style={{ color: 'rgba(180,210,255,0.8)', lineHeight: 1.4 }}>
                  {c.message}
                </div>
                <div className="flex gap-2 text-[10px]" style={{ color: 'rgba(100,140,200,0.45)' }}>
                  <span style={{ fontFamily: 'monospace' }}>{c.sha}</span>
                  <span>{c.time}</span>
                  <span>{c.author}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="px-3 py-3 flex-shrink-0" style={{ borderTop: '1px solid rgba(100,160,255,0.1)' }}>
            <button onClick={generate} disabled={generating || commits.length === 0}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-[13px] font-medium transition-all"
              style={{
                background: generating ? 'rgba(37,99,235,0.2)' : 'rgba(37,99,235,0.35)',
                border: '1px solid rgba(96,165,250,0.35)',
                color: '#93c5fd',
                cursor: generating || commits.length === 0 ? 'not-allowed' : 'pointer',
              }}>
              <Sparkles size={14} className={generating ? 'animate-spin' : ''} />
              {generating ? 'Generating...' : 'Generate changelog'}
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 flex-shrink-0"
            style={{ borderBottom: '1px solid rgba(100,160,255,0.08)' }}>
            <div className="text-[12px]" style={{ color: 'rgba(130,170,240,0.7)' }}>
              {error || (changelog ? 'Draft saved to your account' : 'Changelog will appear here')}
            </div>
            {changelog && (
              <div className="flex gap-2">
                <button onClick={copy}
                  className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-md"
                  style={{ border: '1px solid rgba(100,160,255,0.2)', background: 'rgba(30,50,100,0.3)', color: 'rgba(160,200,255,0.75)' }}>
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
                <button
                  className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-md"
                  style={{ border: '1px solid rgba(96,165,250,0.4)', background: 'rgba(37,99,235,0.35)', color: '#93c5fd' }}>
                  <Send size={12} /> Ready
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {!changelog && !generating && (
              <div className="h-full flex flex-col items-center justify-center gap-3">
                <GitBranch size={32} style={{ color: 'rgba(80,120,200,0.3)' }} />
                <div className="text-[13px]" style={{ color: 'rgba(100,140,200,0.5)' }}>
                  Select a connected repo and generate a changelog from live commits
                </div>
              </div>
            )}
            {(changelog || generating) && (
              <pre className="text-[13px] whitespace-pre-wrap leading-relaxed"
                style={{ color: 'rgba(180,210,255,0.85)', fontFamily: 'ui-monospace,monospace' }}>
                {changelog}
                {generating && <span className="cursor-blink" style={{ display: 'inline-block', width: 8, height: 14, background: 'rgba(100,180,255,0.7)', verticalAlign: 'middle' }} />}
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
