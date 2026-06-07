import { NextRequest } from 'next/server';
import { requireUser } from '@/lib/auth';
import { createId, updateDb } from '@/lib/db';

const MODEL = process.env.OLLAMA_MODEL ?? 'llama3.1';
const OLLAMA_HOST = process.env.OLLAMA_HOST ?? 'http://127.0.0.1:11434';

export async function POST(req: NextRequest) {
  const user = await requireUser(req);
  const { commits, repo, since } = await req.json();

  const safeCommits = Array.isArray(commits) ? commits : [];
  const commitList = safeCommits.map((c: { sha: string; message: string; author: string }) =>
    `- ${c.sha.slice(0, 7)} ${c.message} (${c.author})`
  ).join('\n');
  const fallback = generateFallbackChangelog(repo, safeCommits);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let output = '';

      try {
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

        if (!response.ok) throw new Error(`Ollama returned ${response.status}`);

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
              output += text;
              controller.enqueue(encoder.encode(text));
            }
          }
        }

        if (buffer.trim()) {
          try {
            const parsed = JSON.parse(buffer);
            const text = typeof parsed?.message?.content === 'string' ? parsed.message.content : '';
            if (text) {
              output += text;
              controller.enqueue(encoder.encode(text));
            }
          } catch {
            // ignore incomplete final JSON
          }
        }
      } catch {
        output = fallback;
        controller.enqueue(encoder.encode(fallback));
      }

      await updateDb(db => {
        const now = new Date().toISOString();
        db.releasifyDrafts.push({
          id: createId('draft'),
          userId: user.id,
          repo: String(repo || ''),
          title: `Changelog for ${repo || 'repo'}`,
          content: output,
          createdAt: now,
          updatedAt: now,
        });
      });

      controller.close();
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

function generateFallbackChangelog(repo: string, commits: { message?: string }[]) {
  const groups = {
    fixes: [] as string[],
    features: [] as string[],
    improvements: [] as string[],
    dependencies: [] as string[],
  };

  for (const commit of commits) {
    const message = String(commit.message || '').trim();
    if (!message) continue;
    const lower = message.toLowerCase();
    if (lower.includes('depend') || lower.startsWith('chore')) groups.dependencies.push(message);
    else if (lower.startsWith('fix')) groups.fixes.push(message);
    else if (lower.startsWith('feat')) groups.features.push(message);
    else groups.improvements.push(message);
  }

  const section = (title: string, items: string[]) => {
    if (items.length === 0) return `${title}\n- No notable updates in this category.`;
    return `${title}\n${items.slice(0, 8).map(item => `- ${item}`).join('\n')}`;
  };

  return [
    `## ${repo || 'Repository'} changelog draft`,
    '',
    section('### Bug Fixes', groups.fixes),
    '',
    section('### New Features', groups.features),
    '',
    section('### Improvements', groups.improvements),
    '',
    section('### Dependencies', groups.dependencies),
  ].join('\n');
}
