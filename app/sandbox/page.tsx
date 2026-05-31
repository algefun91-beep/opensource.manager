'use client';
import { useState, useRef, useEffect } from 'react';
import { Bot, Send, Monitor, Terminal, FolderOpen, CheckCircle, Loader, AlertCircle, ArrowUp } from 'lucide-react';
import clsx from 'clsx';

type Step = { type: 'done' | 'running' | 'error'; text: string };
type Message = {
  role: 'user' | 'agent';
  content: string;
  steps?: Step[];
  timestamp: Date;
};

const SCREEN_LINES = [
  { color: 'rgba(80,160,255,0.7)',   text: '$ agent-sandbox v0.1.0 ready' },
  { color: 'rgba(160,210,160,0.8)',  text: '→ docker container running' },
  { color: 'rgba(160,210,160,0.8)',  text: '→ 2GB storage mounted at /storage' },
  { color: 'rgba(160,210,160,0.8)',  text: '→ playwright browser ready' },
  { color: 'rgba(200,200,80,0.8)',   text: '→ awaiting task...' },
];

const EXAMPLE_PROMPTS = [
  'Find all open bug issues in my-cli-tool and write a fix plan',
  'Search the web for best practices for CLI error handling and summarize',
  'List files in /storage and tell me what is there',
  'Draft a release announcement email for v1.5.0',
];

export default function SandboxPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'screen' | 'terminal' | 'files'>('screen');
  const [screenLines, setScreenLines] = useState(SCREEN_LINES);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addScreenLine = (text: string, color = 'rgba(160,210,160,0.8)') => {
    setScreenLines(prev => [...prev.slice(-20), { color, text }]);
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    setLoading(true);

    const userMsg: Message = { role: 'user', content: text, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);

    addScreenLine(`$ task: ${text.slice(0, 50)}${text.length > 50 ? '…' : ''}`, 'rgba(200,200,80,0.8)');

    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history: messages }),
      });

      if (!res.ok) throw new Error('API error');
      if (!res.body) throw new Error('No stream');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let agentMsg: Message = { role: 'agent', content: '', steps: [], timestamp: new Date() };
      setMessages(prev => [...prev, agentMsg]);

      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'step') {
              agentMsg = { ...agentMsg, steps: [...(agentMsg.steps ?? []), data.step] };
              addScreenLine(`→ ${data.step.text}`, data.step.type === 'done' ? 'rgba(160,210,160,0.8)' : 'rgba(200,200,80,0.8)');
            } else if (data.type === 'text') {
              agentMsg = { ...agentMsg, content: agentMsg.content + data.delta };
            } else if (data.type === 'done') {
              agentMsg = { ...agentMsg, content: data.content, steps: data.steps };
            }
            setMessages(prev => [...prev.slice(0, -1), agentMsg]);
          } catch {}
        }
      }
    } catch (e) {
      const errMsg: Message = {
        role: 'agent',
        content: 'Something went wrong. Make sure ANTHROPIC_API_KEY is set in your .env.local file.',
        steps: [{ type: 'error', text: 'Request failed' }],
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errMsg]);
      addScreenLine('✗ error — check API key', 'rgba(255,100,100,0.8)');
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Topbar */}
      <div className="flex items-center px-5 gap-3 flex-shrink-0"
        style={{ height: 52, borderBottom: '1px solid rgba(100,160,255,0.1)', background: 'rgba(8,16,38,0.7)', backdropFilter: 'blur(8px)' }}>
        <Bot size={15} style={{ color: '#93c5fd' }} />
        <span className="text-sm font-medium" style={{ color: 'rgba(200,220,255,0.9)' }}>Agent Sandbox</span>
        <div className="flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-full"
          style={{ background: 'rgba(16,185,129,0.1)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.2)' }}>
          <div className="live-dot" style={{ width: 6, height: 6 }} />
          container running
        </div>
        <div className="ml-auto text-[11px]" style={{ color: 'rgba(100,140,200,0.45)' }}>
          2GB / 2GB storage · Ubuntu 24.04
        </div>
      </div>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">

        {/* Chat */}
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-6">
                <div className="text-center">
                  <Bot size={40} className="mx-auto mb-3" style={{ color: 'rgba(80,120,200,0.3)' }} />
                  <div className="text-sm mb-1" style={{ color: 'rgba(160,190,240,0.7)' }}>Agent is ready</div>
                  <div className="text-[12px]" style={{ color: 'rgba(100,140,200,0.45)' }}>
                    Give it a task — it can browse the web, run shell commands, read/write files, and send email
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 w-full max-w-lg">
                  {EXAMPLE_PROMPTS.map(p => (
                    <button key={p} onClick={() => setInput(p)}
                      className="text-left text-[12px] px-3 py-2.5 rounded-lg transition-all"
                      style={{ background: 'rgba(15,28,65,0.5)', border: '1px solid rgba(60,100,200,0.15)', color: 'rgba(140,180,240,0.7)', lineHeight: 1.4 }}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={clsx('flex flex-col gap-1.5', msg.role === 'user' ? 'items-end' : 'items-start')}>
                {msg.steps && msg.steps.length > 0 && (
                  <div className="flex flex-col gap-1 w-full max-w-md">
                    {msg.steps.map((s, si) => (
                      <div key={si} className="flex items-center gap-2 text-[12px]"
                        style={{ color: s.type === 'done' ? 'rgba(100,210,140,0.8)' : s.type === 'error' ? 'rgba(255,100,100,0.8)' : 'rgba(150,190,255,0.7)' }}>
                        {s.type === 'done' && <CheckCircle size={13} />}
                        {s.type === 'running' && <Loader size={13} className="animate-spin" />}
                        {s.type === 'error' && <AlertCircle size={13} />}
                        {s.text}
                      </div>
                    ))}
                  </div>
                )}
                <div className={clsx('text-[13px] leading-relaxed px-3 py-2 rounded-xl max-w-lg',
                  msg.role === 'user' ? 'rounded-br-sm' : 'rounded-bl-sm')}
                  style={msg.role === 'user'
                    ? { background: 'rgba(37,99,235,0.25)', border: '1px solid rgba(96,165,250,0.2)', color: 'rgba(180,210,255,0.9)' }
                    : { background: 'rgba(15,30,65,0.7)', border: '1px solid rgba(60,100,200,0.15)', color: 'rgba(160,200,255,0.85)' }}>
                  {msg.content || (loading && i === messages.length - 1 && (
                    <div className="flex gap-1 items-center py-0.5">
                      {[0,1,2].map(j => (
                        <div key={j} className="w-1.5 h-1.5 rounded-full typing-dot"
                          style={{ background: 'rgba(130,170,240,0.6)', animationDelay: `${j * 0.15}s` }} />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="px-4 py-3 flex gap-2 items-center flex-shrink-0"
            style={{ borderTop: '1px solid rgba(100,160,255,0.1)' }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="Give the agent a task…"
              className="flex-1 text-sm px-4 py-2.5 rounded-xl outline-none"
              style={{
                background: 'rgba(12,22,55,0.8)',
                border: '1px solid rgba(70,120,220,0.2)',
                color: 'rgba(180,210,255,0.9)',
                caretColor: '#93c5fd',
              }}
            />
            <button onClick={sendMessage} disabled={loading || !input.trim()}
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all"
              style={{
                background: input.trim() && !loading ? 'rgba(37,99,235,0.5)' : 'rgba(37,99,235,0.15)',
                border: '1px solid rgba(96,165,250,0.3)',
                color: input.trim() && !loading ? '#93c5fd' : 'rgba(96,165,250,0.3)',
                cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
              }}>
              <ArrowUp size={16} />
            </button>
          </div>
        </div>

        {/* Right: screen + tabs */}
        <div className="w-80 flex-shrink-0 flex flex-col overflow-hidden"
          style={{ borderLeft: '1px solid rgba(100,160,255,0.1)', background: 'rgba(6,12,32,0.7)' }}>

          {/* Tabs */}
          <div className="flex px-3 flex-shrink-0" style={{ borderBottom: '1px solid rgba(100,160,255,0.1)' }}>
            {(['screen','terminal','files'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={clsx('text-[12px] px-3 py-3 capitalize border-b-2 -mb-px transition-colors',
                  activeTab === tab ? 'border-blue-400 text-[#93c5fd]' : 'border-transparent')}
                style={{ color: activeTab === tab ? '#93c5fd' : 'rgba(100,140,200,0.5)' }}>
                {tab === 'screen' && <Monitor size={12} className="inline mr-1.5" />}
                {tab === 'terminal' && <Terminal size={12} className="inline mr-1.5" />}
                {tab === 'files' && <FolderOpen size={12} className="inline mr-1.5" />}
                {tab}
              </button>
            ))}
          </div>

          {/* Screen view */}
          {activeTab === 'screen' && (
            <div className="flex-1 flex flex-col overflow-hidden p-2.5 gap-2">
              {/* Fake browser chrome */}
              <div className="rounded-lg overflow-hidden flex-1 flex flex-col"
                style={{ background: '#060d1e', border: '1px solid rgba(50,90,200,0.25)' }}>
                <div className="flex items-center gap-1.5 px-2 py-1.5 flex-shrink-0"
                  style={{ background: 'rgba(15,28,65,0.9)', borderBottom: '1px solid rgba(50,90,200,0.2)' }}>
                  <div className="w-2 h-2 rounded-full" style={{ background: '#ef4444' }} />
                  <div className="w-2 h-2 rounded-full" style={{ background: '#f59e0b' }} />
                  <div className="w-2 h-2 rounded-full" style={{ background: '#10b981' }} />
                  <div className="flex-1 mx-2 h-4 rounded text-[9px] flex items-center px-2 overflow-hidden"
                    style={{ background: 'rgba(25,45,100,0.7)', border: '1px solid rgba(60,100,200,0.2)', color: 'rgba(120,160,220,0.6)', fontFamily: 'monospace' }}>
                    {loading ? 'agent://browsing...' : 'agent://ready'}
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2.5 font-mono text-[10px] leading-relaxed">
                  {screenLines.map((line, i) => (
                    <div key={i} style={{ color: line.color }}>{line.text}</div>
                  ))}
                  {loading && (
                    <div style={{ color: 'rgba(200,200,80,0.8)' }}>
                      processing<span className="cursor-blink">_</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="text-[10px] text-center" style={{ color: 'rgba(80,110,170,0.5)' }}>
                Live agent screen · Xvfb + noVNC
              </div>
            </div>
          )}

          {activeTab === 'terminal' && (
            <div className="flex-1 overflow-y-auto p-3 font-mono text-[11px] leading-relaxed"
              style={{ color: 'rgba(160,220,160,0.85)' }}>
              <div style={{ color: 'rgba(80,160,255,0.7)' }}>agent@sandbox:~$ </div>
              <div style={{ color: 'rgba(100,140,200,0.5)' }}>Terminal output will appear here during tasks</div>
            </div>
          )}

          {activeTab === 'files' && (
            <div className="flex-1 overflow-y-auto p-3">
              <div className="text-[11px] mb-2 font-mono" style={{ color: 'rgba(100,140,200,0.5)' }}>/storage</div>
              {[].length === 0 && (
                <div className="text-[12px]" style={{ color: 'rgba(80,110,170,0.5)' }}>
                  Files created by the agent will appear here
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
