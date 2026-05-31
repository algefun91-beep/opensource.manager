import Anthropic from '@anthropic-ai/sdk';
import { NextRequest } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);
const STORAGE_DIR = process.env.AGENT_STORAGE_DIR ?? '/tmp/agent-storage';

// Ensure storage dir exists
fs.mkdir(STORAGE_DIR, { recursive: true }).catch(() => {});

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Tool definitions
const TOOLS: Anthropic.Tool[] = [
  {
    name: 'shell',
    description: 'Run a shell command inside the sandbox. Use for file ops, git, npm, python, etc.',
    input_schema: {
      type: 'object' as const,
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
      type: 'object' as const,
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
      type: 'object' as const,
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
      type: 'object' as const,
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
      type: 'object' as const,
      properties: {
        url: { type: 'string', description: 'URL to fetch' },
      },
      required: ['url'],
    },
  },
];

// Tool executors
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
        // Use DuckDuckGo instant answers (no API key needed)
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
        // Strip HTML tags for a rough text extract
        return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 4000);
      }
      default:
        return `Unknown tool: ${name}`;
    }
  } catch (err: unknown) {
    return `Error: ${err instanceof Error ? err.message : String(err)}`;
  }
}

export async function POST(req: NextRequest) {
  const { message, history = [] } = await req.json();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      const steps: Array<{ type: string; text: string }> = [];

      // Build messages
      const messages: Anthropic.MessageParam[] = [
        ...history.map((m: { role: string; content: string }) => ({
          role: m.role === 'user' ? 'user' as const : 'assistant' as const,
          content: m.content,
        })),
        { role: 'user', content: message },
      ];

      let continueLoop = true;
      let finalText = '';

      while (continueLoop) {
        const response = await client.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4096,
          system: `You are a capable AI agent running inside a sandboxed Linux environment.
You have access to tools: shell commands, file read/write, web search, and URL fetching.
Storage is at /storage (${STORAGE_DIR} on host).
Be concise in your responses. Use tools to actually complete tasks, not just describe them.
When you finish a task, summarize what you did.`,
          tools: TOOLS,
          messages,
        });

        // Process response blocks
        for (const block of response.content) {
          if (block.type === 'text') {
            finalText = block.text;
            send({ type: 'text', delta: block.text });
          } else if (block.type === 'tool_use') {
            const step = { type: 'running', text: `${block.name}: ${JSON.stringify(block.input).slice(0, 80)}` };
            steps.push(step);
            send({ type: 'step', step });

            // Execute tool
            const result = await runTool(block.name, block.input as Record<string, string>);

            // Update step to done
            steps[steps.length - 1] = { type: 'done', text: step.text };
            send({ type: 'step', step: steps[steps.length - 1] });

            // Add to messages for next iteration
            messages.push({ role: 'assistant', content: response.content });
            messages.push({
              role: 'user',
              content: [{ type: 'tool_result', tool_use_id: block.id, content: result }],
            });
          }
        }

        if (response.stop_reason === 'end_turn' || response.stop_reason === 'max_tokens') {
          continueLoop = false;
        } else if (response.stop_reason !== 'tool_use') {
          continueLoop = false;
        }
      }

      send({ type: 'done', content: finalText, steps });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
