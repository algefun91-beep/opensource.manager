import { NextRequest } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);
const STORAGE_DIR = process.env.AGENT_STORAGE_DIR ?? '/tmp/agent-storage';
const MODEL = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';
const OPENAI_API_URL = process.env.OPENAI_API_URL ?? 'https://api.openai.com/v1/chat/completions';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? '';

// Ensure storage dir exists
fs.mkdir(STORAGE_DIR, { recursive: true }).catch(() => {});

type ToolDef = {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, { type: string; description: string }>;
    required: string[];
  };
};

const TOOLS: ToolDef[] = [
  {
    name: 'shell',
    description: 'Run a shell command inside the sandbox. Use for file ops, git, npm, python, etc.',
    input_schema: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'The shell command to run' },
      },
      required: ['command'],
    },
  },
  {
    name: 'write_file',
    description: 'Write content to a file in /storage',
    input_schema: {
      type: 'object',
      properties: {
        filename: { type: 'string', description: 'Filename relative to /storage' },
        content: { type: 'string', description: 'File content' },
      },
      required: ['filename', 'content'],
    },
  },
  {
    name: 'read_file',
    description: 'Read a file from /storage',
    input_schema: {
      type: 'object',
      properties: {
        filename: { type: 'string', description: 'Filename relative to /storage' },
      },
      required: ['filename'],
    },
  },
  {
    name: 'web_search',
    description: 'Search the web and return results',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
      },
      required: ['query'],
    },
  },
  {
    name: 'fetch_url',
    description: 'Fetch the content of a URL',
    input_schema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL to fetch' },
      },
      required: ['url'],
    },
  },
];

async function runTool(name: string, input: Record<string, string>): Promise<string> {
  try {
    switch (name) {
      case 'shell': {
        const { stdout, stderr } = await execAsync(input.command, {
          cwd: STORAGE_DIR,
          timeout: 15000,
          env: { ...process.env, HOME: STORAGE_DIR },
        });
        return (stdout + stderr).slice(0, 3000) || '(no output)';
      }
      case 'write_file': {
        const fp = path.join(STORAGE_DIR, path.basename(input.filename));
        await fs.writeFile(fp, input.content, 'utf8');
        return `Written ${input.filename} (${input.content.length} chars)`;
      }
      case 'read_file': {
        const fp = path.join(STORAGE_DIR, path.basename(input.filename));
        const content = await fs.readFile(fp, 'utf8');
        return content.slice(0, 4000);
      }
      case 'web_search': {
        const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(input.query)}&format=json&no_html=1`;
        const res = await fetch(url, { headers: { 'User-Agent': 'opensource-manager/0.1' } });
        const json = await res.json();
        const results = [
          json.AbstractText,
          ...(json.RelatedTopics ?? []).slice(0, 5).map((t: { Text?: string }) => t.Text),
        ].filter(Boolean).join('\n\n');
        return results || 'No results found.';
      }
      case 'fetch_url': {
        const res = await fetch(input.url, {
          headers: { 'User-Agent': 'Mozilla/5.0 opensource-manager/0.1' },
          signal: AbortSignal.timeout(10000),
        });
        const html = await res.text();
        return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 4000);
      }
      default:
        return `Unknown tool: ${name}`;
    }
  } catch (err: unknown) {
    return `Error: ${err instanceof Error ? err.message : String(err)}`;
  }
}

async function streamOpenAIChat(
  messages: unknown[],
  apiKey: string,
  onDelta: (delta: string) => void
): Promise<string> {
  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      stream: true,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${body}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('OpenAI response has no body');

  const decoder = new TextDecoder();
  let buffer = '';
  let content = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split(/\n\n/);
    buffer = chunks.pop() ?? '';

    for (const chunk of chunks) {
      const line = chunk.trim();
      if (!line.startsWith('data:')) continue;
      const payload = line.slice(5).trim();
      if (payload === '[DONE]') continue;

      let parsed: any;
      try {
        parsed = JSON.parse(payload);
      } catch {
        continue;
      }

      const delta = parsed?.choices?.[0]?.delta?.content;
      if (typeof delta === 'string' && delta.length > 0) {
        content += delta;
        onDelta(delta);
      }
    }
  }

  if (buffer.trim().startsWith('data:')) {
    const payload = buffer.trim().slice(5).trim();
    if (payload !== '[DONE]') {
      try {
        const parsed = JSON.parse(payload);
        const delta = parsed?.choices?.[0]?.delta?.content;
        if (typeof delta === 'string' && delta.length > 0) {
          content += delta;
          onDelta(delta);
        }
      } catch {
        // ignore
      }
    }
  }

  return content;
}

function parseToolCall(text: string): { name: string; input: Record<string, string> } | null {
  const trimmed = text.trim();
  try {
    const candidate = trimmed.startsWith('{') && trimmed.endsWith('}') ? trimmed : trimmed.slice(trimmed.indexOf('{'), trimmed.lastIndexOf('}') + 1);
    const parsed = JSON.parse(candidate);
    if (parsed?.tool && parsed?.input && typeof parsed.tool === 'string' && typeof parsed.input === 'object') {
      return { name: parsed.tool, input: parsed.input };
    }
  } catch {
    return null;
  }
  return null;
}

type HistoryMessage = { role: 'user' | 'assistant'; content: string };

export async function POST(req: NextRequest) {
  const { message, history = [], apiKey } = await req.json();
  const openAiKey = (typeof apiKey === 'string' && apiKey.trim()) ? apiKey.trim() : OPENAI_API_KEY.trim();

  if (!openAiKey) {
    return new Response(JSON.stringify({ error: 'Missing OpenAI API key.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      const steps: Array<{ type: string; text: string }> = [];

      const messages: HistoryMessage[] = [
        ...history.map((m: { role: string; content: string }) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content })),
        { role: 'user', content: message },
      ];

      const systemPrompt = `You are a capable AI agent running inside a sandboxed Linux environment.\n` +
        `You have access to the following tools: ${TOOLS.map((tool) => `${tool.name} (${tool.description})`).join('; ')}.\n` +
        `Storage is at /storage (${STORAGE_DIR} on host).\n` +
        `When you want to use a tool, respond with a single JSON object exactly like:\n` +
        `{
  "tool": "shell",
  "input": {"command": "ls /storage"}
}\n` +
        `Only output JSON when invoking a tool. When you finish, reply with the final answer text only.`;

      let continueLoop = true;
      let finalText = '';

      while (continueLoop) {
        let toolCallPayload: any = null;

        const content = await streamOpenAIChat(
          [{ role: 'system', content: systemPrompt }, ...messages],
          openAiKey,
          (delta) => send({ type: 'text', delta })
        );

        const toolCall = parseToolCall(content);
        if (toolCall || toolCallPayload) {
          const tool = toolCall ?? {
            name: toolCallPayload?.function?.name,
            input: toolCallPayload?.function?.arguments ?? {},
          };
          const stepText = `${tool.name}: ${JSON.stringify(tool.input).slice(0, 80)}`;
          steps.push({ type: 'running', text: stepText });
          send({ type: 'step', step: steps[steps.length - 1] });

          const result = await runTool(tool.name, tool.input);

          steps[steps.length - 1] = { type: 'done', text: stepText };
          send({ type: 'step', step: steps[steps.length - 1] });

          if (tool.name === 'shell') {
            send({ type: 'terminal', command: tool.input.command, output: result });
          }

          messages.push({ role: 'assistant', content });
          messages.push({ role: 'user', content: `Tool result: ${result}` });
          continue;
        }

        finalText = content;
        continueLoop = false;
      }

      send({ type: 'done', content: finalText, steps });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
