'use client';
import { useState } from 'react';
import { GitBranch, Sparkles, Copy, Send, ChevronDown, Check } from 'lucide-react';

const MOCK_COMMITS = [
  { sha: 'a1b2c3d', message: 'fix: crash when path contains spaces on Windows', author: 'jdev', time: '2h ago' },
  { sha: 'e4f5a6b', message: 'feat: add --dry-run flag to delete command',       author: 'jdev', time: '6h ago' },
  { sha: 'c7d8e9f', message: 'refactor: extract path utils into separate module', author: 'jdev', time: '1d ago' },
  { sha: 'b1c2d3e', message: 'docs: update README with Windows install steps',    author: 'jdev', time: '1d ago' },
  { sha: 'f4a5b6c', message: 'fix: handle empty config file gracefully',          author: 'jdev', time: '2d ago' },
  { sha: 'd7e8f9a', message: 'chore: bump dependencies',                          author: 'jdev', time: '3d ago' },
];

const MOCK_CHANGELOG = `## v1.5.0 — What's new

### 🐛 Bug Fixes
- **Windows path fix**: Resolved a crash that occurred when the working directory path contained spaces on Windows systems.
- **Empty config handling**: The CLI now exits gracefully when it encounters an empty or malformed config file instead of throwing an unhandled exception.

### ✨ New Features
- **Dry run mode**: Added a \`--dry-run\` flag to the \`delete\` command. Use it to preview what would be deleted before committing.

### 🔧 Improvements
- Extracted path utilities into a dedicated internal module, improving testability and reducing duplication across commands.
- Updated README with Windows installation instructions and common troubleshooting steps.

### 📦 Dependencies
- Bumped several transitive dependencies to their latest patch versions.`;

export default function ReleasifyPage() {
  const [generating, setGenerating] = useState(false);
  const [changelog, setChangelog] = useState('');
  const [copied, setCopied] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState('my-cli-tool');

  const generate = async () => {
    setGenerating(true);
    setChangelog('');
    // Simulate streaming
    let i = 0;
    const chars = MOCK_CHANGELOG.split('');
    const interval = setInterval(() => {
      if (i >= chars.length) { clearInterval(interval); setGenerating(false); return; }
      setChangelog(prev => prev + chars[i]);
      i += 3;
    }, 20);
  };

  const copy = () => {
    navigator.clipboard.writeText(changelog);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Topbar */}
      <div className="h-13 flex items-center px-5 gap-3 flex-shrink-0"
        style={{ height: 52, borderBottom: '1px solid rgba(100,160,255,0.1)', background: 'rgba(8,16,38,0.7)', backdropFilter: 'blur(8px)' }}>
        <GitBranch size={15} style={{ color: '#93c5fd' }} />
        <span className="text-sm font-medium" style={{ color: 'rgba(200,220,255,0.9)' }}>Releasify</span>
        <span className="text-[11px] px-2 py-0.5 rounded-full"
          style={{ background: 'rgba(59,130,246,0.15)', color: '#93c5fd', border: '1px solid rgba(59,130,246,0.2)' }}>
          AI changelog generator
        </span>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: commits */}
        <div className="w-72 flex-shrink-0 flex flex-col overflow-hidden"
          style={{ borderRight: '1px solid rgba(100,160,255,0.1)' }}>
          <div className="px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid rgba(100,160,255,0.08)' }}>
            <div className="text-[11px] uppercase tracking-wider mb-2" style={{ color: 'rgba(100,140,200,0.5)' }}>Repository</div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer"
              style={{ background: 'rgba(15,28,65,0.6)', border: '1px solid rgba(70,120,220,0.2)' }}>
              <span className="flex-1 text-[13px]" style={{ color: 'rgba(190,215,255,0.85)' }}>{selectedRepo}</span>
              <ChevronDown size={13} style={{ color: 'rgba(100,140,200,0.5)' }} />
            </div>
          </div>

          <div className="px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid rgba(100,160,255,0.08)' }}>
            <div className="text-[11px] uppercase tracking-wider mb-2" style={{ color: 'rgba(100,140,200,0.5)' }}>
              Commits since v1.4.0
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-2">
            {MOCK_COMMITS.map(c => (
              <div key={c.sha} className="px-3 py-2.5 rounded-lg mb-1.5 cursor-pointer"
                style={{ background: 'rgba(10,20,50,0.4)', border: '1px solid rgba(60,100,200,0.1)' }}>
                <div className="text-[12px] mb-1" style={{ color: 'rgba(180,210,255,0.8)', lineHeight: 1.4 }}>
                  {c.message}
                </div>
                <div className="flex gap-2 text-[10px]" style={{ color: 'rgba(100,140,200,0.45)' }}>
                  <span style={{ fontFamily: 'monospace' }}>{c.sha}</span>
                  <span>·</span>
                  <span>{c.time}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="px-3 py-3 flex-shrink-0" style={{ borderTop: '1px solid rgba(100,160,255,0.1)' }}>
            <button onClick={generate} disabled={generating}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-[13px] font-medium transition-all"
              style={{
                background: generating ? 'rgba(37,99,235,0.2)' : 'rgba(37,99,235,0.35)',
                border: '1px solid rgba(96,165,250,0.35)',
                color: '#93c5fd',
                cursor: generating ? 'not-allowed' : 'pointer',
              }}>
              <Sparkles size={14} className={generating ? 'animate-spin' : ''} />
              {generating ? 'Generating…' : 'Generate changelog'}
            </button>
          </div>
        </div>

        {/* Right: changelog editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 flex-shrink-0"
            style={{ borderBottom: '1px solid rgba(100,160,255,0.08)' }}>
            <div className="text-[12px]" style={{ color: 'rgba(130,170,240,0.7)' }}>
              {changelog ? 'Draft — edit before publishing' : 'Changelog will appear here'}
            </div>
            {changelog && (
              <div className="flex gap-2">
                <button onClick={copy}
                  className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-md"
                  style={{ border: '1px solid rgba(100,160,255,0.2)', background: 'rgba(30,50,100,0.3)', color: 'rgba(160,200,255,0.75)' }}>
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
                <button
                  className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-md"
                  style={{ border: '1px solid rgba(96,165,250,0.4)', background: 'rgba(37,99,235,0.35)', color: '#93c5fd' }}>
                  <Send size={12} /> Publish
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {!changelog && !generating && (
              <div className="h-full flex flex-col items-center justify-center gap-3">
                <GitBranch size={32} style={{ color: 'rgba(80,120,200,0.3)' }} />
                <div className="text-[13px]" style={{ color: 'rgba(100,140,200,0.5)' }}>
                  Select a repo and click Generate to create an AI-powered changelog
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
