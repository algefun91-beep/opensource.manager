import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const DEFAULT_PATH = '/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:/opt/homebrew/bin';
const OLLAMA_HOST = process.env.OLLAMA_HOST ?? 'http://127.0.0.1:11434';
const MODEL = process.env.OLLAMA_MODEL ?? 'llama3.1';
const OLLAMA_CLI = process.env.OLLAMA_CLI ?? 'ollama';
const TIMEOUT_MS = 2000;

function getExecEnv() {
  return {
    ...process.env,
    PATH: process.env.PATH ? `${process.env.PATH}:${DEFAULT_PATH}` : DEFAULT_PATH,
  };
}

async function getInstalledModels() {
  try {
    const { stdout } = await execAsync(`${OLLAMA_CLI} list`, {
      env: getExecEnv(),
      timeout: 10000,
    });
    return stdout
      .split(/\r?\n/)
      .slice(1)
      .filter(Boolean)
      .map((line) => line.trim().split(/\s+/)[0]);
  } catch {
    return [];
  }
}

export async function GET() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${OLLAMA_HOST}/api/version`, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return NextResponse.json({ available: false, error: `status ${response.status}` }, { status: 503 });
    }

    const body = await response.json();
    const models = await getInstalledModels();
    const modelAvailable = models.includes(MODEL);

    if (!modelAvailable) {
      return NextResponse.json(
        {
          available: false,
          version: body?.version ?? null,
          models,
          modelAvailable,
          error: `Model ${MODEL} is not installed.`,
        },
        { status: 503 }
      );
    }

    return NextResponse.json({ available: true, version: body?.version ?? null, models, modelAvailable });
  } catch (error: any) {
    clearTimeout(timeoutId);
    return NextResponse.json({ available: false, error: error?.message ?? 'unavailable' }, { status: 503 });
  }
}
