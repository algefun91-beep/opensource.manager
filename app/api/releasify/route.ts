import Anthropic from '@anthropic-ai/sdk';
import { NextRequest } from 'next/server';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const { commits, repo, since } = await req.json();

  const commitList = commits.map((c: { sha: string; message: string; author: string }) =>
    `- ${c.sha.slice(0, 7)} ${c.message} (${c.author})`
  ).join('\n');

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        stream: true,
        system: `You are an expert technical writer. Generate clean, human-readable changelogs from commit messages.
Format using markdown with sections: Bug Fixes, New Features, Improvements, Dependencies.
Use emoji section headers. Be concise but informative. Don't include trivial commits like "fix typo".`,
        messages: [{
          role: 'user',
          content: `Generate a changelog for repo "${repo}" from commits since ${since ?? 'last release'}:\n\n${commitList}`,
        }],
      });

      for await (const event of response) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          controller.enqueue(encoder.encode(event.delta.text));
        }
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
