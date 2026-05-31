import { NextRequest } from 'next/server';

const MODEL = process.env.OLLAMA_MODEL ?? 'llama3.1';
const OLLAMA_HOST = process.env.OLLAMA_HOST ?? 'http://127.0.0.1:11434';

export async function POST(req: NextRequest) {
  const { commits, repo, since } = await req.json();

  const commitList = commits.map((c: { sha: string; message: string; author: string }) =>
    `- ${c.sha.slice(0, 7)} ${c.message} (${c.author})`
  ).join('\n');

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const response = await fetch(`${OLLAMA_HOST}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: MODEL,
          stream: true,
          messages: [
            {
              role: 'system',
              content: `You are an expert technical writer. Generate clean, human-readable changelogs from commit messages.\n` +
                `Format using markdown with sections: Bug Fixes, New Features, Improvements, Dependencies.\n` +
                `Use emoji section headers. Be concise but informative. Don't include trivial commits like "fix typo".`,
            },
            {
              role: 'user',
              content: `Generate a changelog for repo "${repo}" from commits since ${since ?? 'last release'}:\n\n${commitList}`,
            },
          ],
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Ollama API error ${response.status}: ${body}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Ollama response has no body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.trim()) continue;
          let parsed: any;
          try {
            parsed = JSON.parse(line);
          } catch {
            continue;
          }

          const text = typeof parsed?.message?.content === 'string' ? parsed.message.content : '';
          if (text) {
            controller.enqueue(encoder.encode(text));
          }
        }
      }

      if (buffer.trim()) {
        try {
          const parsed = JSON.parse(buffer);
          const text = typeof parsed?.message?.content === 'string' ? parsed.message.content : '';
          if (text) {
            controller.enqueue(encoder.encode(text));
          }
        } catch {
          // ignore incomplete final JSON
        }
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
