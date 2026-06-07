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
// Optional agent API key: when set, the server requires the 'x-agent-api-key'
// header to match for requests that will execute shell commands.
const AGENT_API_KEY = process.env.AGENT_API_KEY ?? '';
const USE_DOCKER = process.env.USE_DOCKER === 'true';
const DOCKER_IMAGE = process.env.DOCKER_IMAGE ?? 'ubuntu:22.04';

// Ensure storage dir exists
fs.mkdir(STORAGE_DIR, { recursive: true }).catch(() => {});

let dockerContainerId: string | null = null;
let dockerContainerName: string | null = null;
let dockerAvailable = false;

// Initialize Docker container on startup
async function initializeDockerContainer() {
  if (!USE_DOCKER) return;
  try {
    // Ensure the docker CLI is available before attempting to run containers
    try {
      await execAsync('command -v docker');
      dockerAvailable = true;
    } catch (err) {
      console.warn('[Docker] docker CLI not found in PATH; skipping Docker initialization.');
      dockerAvailable = false;
      dockerContainerId = null;
      dockerContainerName = null;
      return;
    }
    dockerContainerName = `agent_sandbox_${Date.now()}`;
    const { stdout } = await execAsync(
      `docker run -d --name ${dockerContainerName} --rm -v "${STORAGE_DIR}:/storage" ${DOCKER_IMAGE} sleep infinity`
    );
    // docker prints the container id; store the name for easier control
    dockerContainerId = (stdout || '').trim().split(/\s+/)[0] || dockerContainerName;
    console.log(`[Docker] Container started: name=${dockerContainerName} id=${dockerContainerId}`);
  } catch (err) {
    console.error('[Docker] Failed to start container:', err);
    dockerContainerId = null;
    dockerContainerName = null;
    dockerAvailable = false;
  }
}

async function cleanupDockerContainer() {
  if (!USE_DOCKER || !dockerContainerName) return;
  try {
    await execAsync(`docker kill ${dockerContainerName}`);
    console.log(`[Docker] Container stopped: ${dockerContainerName}`);
  } catch (err) {
    console.error('[Docker] Failed to stop container:', err);
  }
}

initializeDockerContainer();

process.on('exit', () => { cleanupDockerContainer().catch(() => {}); });
process.on('SIGINT', () => { cleanupDockerContainer().then(() => process.exit(0)).catch(() => process.exit(1)); });
process.on('SIGTERM', () => { cleanupDockerContainer().then(() => process.exit(0)).catch(() => process.exit(1)); });

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
        const cmdRaw = String(input.command || '');

        // Basic server-side sanitization to reduce obvious dangerous operations.
        // If you need broader capabilities, set AGENT_API_KEY and run in Docker in a trusted environment.
        const unsafePatterns: Array<{ re: RegExp; reason: string }> = [
          { re: /\brm\s+-rf\b/i, reason: 'recursive remove' },
          { re: /\bshutdown\b|\breboot\b|\bhalt\b/i, reason: 'system control' },
          { re: /\bmkfs\b|\bdd\b/i, reason: 'disk operations' },
          { re: /[`$()]|\|\||&&|;|\|/i, reason: 'command chaining or substitution' },
          { re: /\/dev\//i, reason: 'device access' },
        ];
        for (const p of unsafePatterns) {
          if (p.re.test(cmdRaw)) {
            return `Error: command blocked by server policy (${p.reason})`;
          }
        }

        let cmd = cmdRaw;
        if (USE_DOCKER) {
          if (!dockerAvailable) {
            return `Error: Docker requested but docker CLI is not available on the server.`;
          }
          if (dockerContainerName) {
            // run inside container with working dir /storage
            cmd = `docker exec -w /storage ${dockerContainerName} bash -lc ${JSON.stringify(cmdRaw)}`;
          } else {
            return `Error: Docker requested but no sandbox container is available.`;
          }
        }
        const { stdout, stderr } = await execAsync(cmd, {
          cwd: USE_DOCKER ? undefined : STORAGE_DIR,
          timeout: 15000,
          env: USE_DOCKER ? process.env : { ...process.env, HOME: STORAGE_DIR },
          maxBuffer: 10 * 1024 * 1024,
        });
        return (stdout + stderr).slice(0, 3000) || '(no output)';
      }
      case 'write_file': {
        const filename = path.basename(input.filename);
        const fp = path.join(STORAGE_DIR, filename);
        await fs.writeFile(fp, input.content, 'utf8');
        return `Written ${filename} (${input.content.length} chars)`;
      }
      case 'read_file': {
        const filename = path.basename(input.filename);
        const fp = path.join(STORAGE_DIR, filename);
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
  const reqBody: any = await req.json();
  const message = typeof reqBody.message === 'string' ? reqBody.message : typeof reqBody.command === 'string' ? reqBody.command : '';
  const history = Array.isArray(reqBody.history) ? reqBody.history : [];
  const apiKey = typeof reqBody.apiKey === 'string' ? reqBody.apiKey : undefined;
  const openAiKey = (typeof apiKey === 'string' && apiKey.trim()) ? apiKey.trim() : OPENAI_API_KEY.trim();
  const hasOpenAI = Boolean(openAiKey && openAiKey.length > 0);
  // Agent API key check: if AGENT_API_KEY is set on the server, require the client
  // to provide a matching 'x-agent-api-key' header to allow shell execution.
  const providedAgentKey = req.headers.get('x-agent-api-key') || '';
  const isAgentAuthenticated = AGENT_API_KEY ? providedAgentKey === AGENT_API_KEY : true;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

        try {
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

      // If there's no OpenAI key configured, or the request explicitly provided a `command`,
      // allow direct execution of explicit shell commands provided by the user in fenced
      // bash blocks or a `run: <cmd>` prefix. This lets the frontend drive the sandbox
      // without requiring an OpenAI key.
      if (!hasOpenAI || (typeof (reqBody?.command) === 'string' && reqBody.command.trim())) {
        const codeRegex = /```(?:bash|sh)?\n([\s\S]*?)```/gi;
        const commands: string[] = [];
        let m: RegExpExecArray | null = null;
        while ((m = codeRegex.exec(message))) {
          if (m[1] && m[1].trim()) commands.push(m[1].trim());
        }

        // support a simple "run: <command>" single-line shorthand
        const runMatch = message.match(/^run:\s*(.+)$/im);
        if (runMatch && runMatch[1]) commands.push(runMatch[1].trim());

        // If the request explicitly provided a `command` and we didn't find fenced blocks
        // or a run: shorthand, treat the entire message as the command to run.
        if (commands.length === 0 && typeof reqBody.command === 'string' && reqBody.command.trim()) {
          commands.push(message.trim());
        }

        if (commands.length > 0) {
          if (!isAgentAuthenticated) {
            send({ type: 'error', error: 'Unauthorized: server requires x-agent-api-key to execute commands' });
            controller.close();
            return;
          }
          const steps: Array<{ type: string; text: string }> = [];
          for (const cmd of commands) {
            const stepText = `shell: ${cmd.slice(0, 120)}`;
            steps.push({ type: 'running', text: stepText });
            send({ type: 'step', step: steps[steps.length - 1] });

            const result = await runTool('shell', { command: cmd });

            steps[steps.length - 1] = { type: 'done', text: stepText };
            send({ type: 'step', step: steps[steps.length - 1] });
            send({ type: 'terminal', command: cmd, output: result });
          }

          finalText = `Executed ${commands.length} command(s).`;
          send({ type: 'done', content: finalText, steps });
          controller.close();
          return;
        }
      }

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

          // Enforce agent auth for executing shell tools when server requires it
          if (tool.name === 'shell' && !isAgentAuthenticated) {
            send({ type: 'error', error: 'Unauthorized: server requires x-agent-api-key to execute shell commands' });
            controller.close();
            return;
          }

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
        } catch (err: unknown) {
          try {
            send({ type: 'error', error: String(err instanceof Error ? err.message : err) });
          } catch (_) {
            // ignore send failures
          }
          controller.close();
          throw err;
        }
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
