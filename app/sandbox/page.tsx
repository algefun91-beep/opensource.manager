'use client';
import { useState, useRef, useEffect } from 'react';
import { Bot, Send, Monitor, Terminal, FolderOpen, CheckCircle, Loader, AlertCircle, ArrowUp } from 'lucide-react';
import clsx from 'clsx';
import { renderMessageWithCodeBlocks } from '../../components/ui/MessageRenderer';

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
  const STORAGE_KEY = 'sandbox-persistence-v1';

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'screen' | 'terminal' | 'files'>('screen');
  const [screenLines, setScreenLines] = useState(SCREEN_LINES);
  const [terminalLines, setTerminalLines] = useState<{ text: string; color: string }[]>([]);
  const [puterReady, setPuterReady] = useState(false);
  const [puterError, setPuterError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadSandboxState = () => {
    if (typeof window === 'undefined') return;
    try {
      const json = window.localStorage.getItem(STORAGE_KEY);
      if (!json) return;
      const data = JSON.parse(json);
      if (Array.isArray(data?.messages)) {
        setMessages(data.messages.map((msg: any) => ({
          ...msg,
          timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
        })));
      }
      if (typeof data?.input === 'string') setInput(data.input);
      if (['screen', 'terminal', 'files'].includes(data?.activeTab)) setActiveTab(data.activeTab);
      if (Array.isArray(data?.screenLines)) setScreenLines(data.screenLines);
      if (Array.isArray(data?.terminalLines)) setTerminalLines(data.terminalLines);
    } catch {
      // ignore invalid persisted state
    }
  };

  const saveSandboxState = () => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
        messages: messages.map(msg => ({ ...msg, timestamp: msg.timestamp.toISOString() })),
        input,
        activeTab,
        screenLines,
        terminalLines,
      }));
    } catch {
      // ignore storage failures
    }
  };

  useEffect(() => {
    loadSandboxState();
  }, []);

  useEffect(() => {
    saveSandboxState();
  }, [messages, input, activeTab, screenLines, terminalLines]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ((window as any).puter?.ai?.chat) {
      setPuterReady(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://js.puter.com/v2/';
    script.async = true;
    script.onload = () => {
      if ((window as any).puter?.ai?.chat) {
        setPuterReady(true);
      } else {
        setPuterError('Loaded Puter script but failed to initialize.');
      }
    };
    script.onerror = () => setPuterError('Failed to load Puter.com AI library.');
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const addScreenLine = (text: string, color = 'rgba(160,210,160,0.8)') => {
    setScreenLines(prev => [...prev.slice(-20), { color, text }]);
  };

  const appendTerminalOutput = (command: string, output: string) => {
    setActiveTab('terminal');
    setTerminalLines(prev => [
      ...prev,
      { text: `$ ${command}`, color: 'rgba(110,170,255,0.95)' },
      ...String(output || '(no output)').split('\n').map(line => ({ text: line, color: 'rgba(160,220,160,0.9)' })),
    ]);
  };

  const extractBashCommands = (text: string) => {
    const regex = /```(?:bash|sh)\n([\s\S]*?)```/gi;
    const commands: string[] = [];
    let match: RegExpExecArray | null = null;
    while ((match = regex.exec(text))) {
      if (match[1]?.trim()) {
        commands.push(match[1].trim());
      }
    }
    return commands;
  };

  const executeCommand = async (command: string) => {
    const response = await fetch('/api/agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command }),
    });

    if (!response.ok) {
      const txt = await response.text();
      throw new Error(txt || 'Execution failed');
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/event-stream')) {
      const data = await response.json();
      if (!data?.success) throw new Error(data?.error || 'Execution failed');
      const result = Array.isArray(data.results) ? data.results[0] : data;
      if (result?.error) throw new Error(result.error);
      return result?.output ?? '';
    }

    const reader = response.body?.getReader();
    if (!reader) return '';
    const decoder = new TextDecoder();
    let buffer = '';
    let accumulatedOutput = '';

    const flushEvent = (raw: string) => {
      const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      const dataLines = lines.filter(l => l.startsWith('data:')).map(l => l.slice(5).trim());
      if (dataLines.length === 0) return;
      const payload = dataLines.join('\n');
      try {
        const parsed = JSON.parse(payload);
        if (parsed.type === 'terminal') {
          const cmd = parsed.command || command;
          const out = parsed.output || '';
          appendTerminalOutput(cmd, out);
          accumulatedOutput += out + '\n';
        } else if (parsed.type === 'step') {
          const stepText = parsed.step?.text || JSON.stringify(parsed.step || parsed);
          addScreenLine(stepText, 'rgba(150,190,255,0.7)');
        } else if (parsed.type === 'error') {
          appendTerminalOutput(command, `ERROR: ${parsed.error}`);
        } else if (parsed.type === 'done') {
          if (parsed.content) addScreenLine(parsed.content, 'rgba(160,220,160,0.9)');
        }
      } catch (err) {
        // ignore parse errors
      }
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split(/\n\n/);
      buffer = parts.pop() ?? '';
      for (const part of parts) {
        flushEvent(part);
      }
    }

    if (buffer.trim()) flushEvent(buffer);
    return accumulatedOutput.trim();
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    setLoading(true);

    const userMsg: Message = { role: 'user', content: text, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    addScreenLine(`$ task: ${text.slice(0, 50)}${text.length > 50 ? '…' : ''}`, 'rgba(200,200,80,0.8)');

    if (!puterReady) {
      const errMsg: Message = {
        role: 'agent',
        content: 'Waiting for Puter.com to initialize. Please try again in a moment.',
        steps: [{ type: 'error', text: 'Puter unavailable' }],
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errMsg]);
      setLoading(false);
      return;
    }

    const puter = (window as any).puter;
    if (!puter?.ai?.chat) {
      const errMsg: Message = {
        role: 'agent',
        content: 'Puter is loaded but the AI interface is unavailable.',
        steps: [{ type: 'error', text: 'Puter AI not ready' }],
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errMsg]);
      setLoading(false);
      return;
    }

    const systemPrompt = `You are a sandbox assistant with access to a Linux terminal. Only execute shell commands when needed. When you do, output them inside a fenced bash code block exactly like:\n\n\`\`\`bash\n<command>\n\`\`\`\n\nDo not include extra backticks around the command. Keep the rest of your response in natural language, and do not invent commands that are not required.`;
    let agentMsg: Message = { role: 'agent', content: '', steps: [{ type: 'running', text: 'Thinking…' }], timestamp: new Date() };
    setMessages(prev => [...prev, agentMsg]);

    const updateAgentMessage = (next: Message) => {
      setMessages(prev => [...prev.slice(0, -1), next]);
    };

    try {
      const response = await puter.ai.chat(`${systemPrompt}\n\n${text}`, {
        model: 'gpt-5.4-nano',
        stream: true,
      });

      if (response[Symbol.asyncIterator]) {
        for await (const part of response) {
          const delta = typeof part === 'string'
            ? part
            : typeof part?.text === 'string'
              ? part.text
              : typeof part?.message?.content === 'string'
                ? part.message.content
                : '';

          if (!delta) continue;
          agentMsg = { ...agentMsg, content: agentMsg.content + delta };
          updateAgentMessage(agentMsg);
        }
      } else if (typeof response?.text === 'string') {
        agentMsg = { ...agentMsg, content: response.text };
        updateAgentMessage(agentMsg);
      } else if (typeof response === 'string') {
        agentMsg = { ...agentMsg, content: response };
        updateAgentMessage(agentMsg);
      }

      agentMsg = { ...agentMsg, steps: [{ type: 'done', text: 'Response complete' }] };
      updateAgentMessage(agentMsg);

      const commands = extractBashCommands(agentMsg.content);
      if (commands.length > 0) {
        addScreenLine(`Detected ${commands.length} shell command(s), executing…`, 'rgba(140,210,255,0.8)');
        for (const command of commands) {
          try {
            await executeCommand(command);
            addScreenLine(`Command completed: ${command}`, 'rgba(140,255,160,0.85)');
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            appendTerminalOutput(command, `ERROR: ${message}`);
            addScreenLine(`Command failed: ${message}`, 'rgba(255,140,140,0.9)');
          }
        }
      } else {
        addScreenLine('No bash command block detected in the AI response.', 'rgba(180,180,220,0.65)');
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      const errMsg: Message = {
        role: 'agent',
        content: `Something went wrong while querying Puter: ${message}`,
        steps: [{ type: 'error', text: 'Puter request failed' }],
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errMsg]);
      addScreenLine(`✗ Puter error — ${message}`, 'rgba(255,100,100,0.8)');
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
<div className="ml-auto flex items-center gap-2">
            <div className="text-[11px]" style={{ color: 'rgba(100,140,200,0.45)' }}>
              {'Sandbox AI ready'}
            </div>
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
              <div key={i} className={clsx('flex flex-col gap-1.5 w-full', msg.role === 'user' ? 'items-end' : 'items-start')}>
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
                <div className={clsx('text-[13px] leading-relaxed px-3 py-2 rounded-xl max-w-2xl overflow-hidden',
                  msg.role === 'user' ? 'rounded-br-sm' : 'rounded-bl-sm')}
                  style={msg.role === 'user'
                    ? { background: 'rgba(37,99,235,0.25)', border: '1px solid rgba(96,165,250,0.2)', color: 'rgba(180,210,255,0.9)' }
                    : { background: 'rgba(15,30,65,0.7)', border: '1px solid rgba(60,100,200,0.15)', color: 'rgba(160,200,255,0.85)' }}>
                  {msg.content ? renderMessageWithCodeBlocks(msg.content) : (loading && i === messages.length - 1 && (
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
              disabled={loading}
              placeholder='Give the agent a task…'
              className="flex-1 text-sm px-4 py-2.5 rounded-xl outline-none"
              style={{
                background: 'rgba(12,22,55,0.8)',
                border: '1px solid rgba(70,120,220,0.2)',
                color: '#e2e8f0',
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
              {terminalLines.length === 0 ? (
                <>
                  <div style={{ color: 'rgba(80,160,255,0.7)' }}>agent@sandbox:~$ </div>
                  <div style={{ color: 'rgba(100,140,200,0.5)' }}>Terminal output will appear here during tasks</div>
                </>
              ) : (
                terminalLines.map((line, index) => (
                  <div key={index} style={{ color: line.color, whiteSpace: 'pre-wrap' }}>{line.text}</div>
                ))
              )}
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
