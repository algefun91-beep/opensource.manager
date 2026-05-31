import { NextResponse } from 'next/server';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const INSTALL_COMMAND = `if command -v brew >/dev/null 2>&1; then brew install ollama; else curl -fsSL https://ollama.com/install.sh | sh; fi`;
const DEFAULT_OLLAMA_HOST = '127.0.0.1:11434';
const DEFAULT_PATH = '/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:/opt/homebrew/bin';
const OLLAMA_HOST = (process.env.OLLAMA_HOST ?? DEFAULT_OLLAMA_HOST).replace(/^https?:\/\//, '');
const MODEL = process.env.OLLAMA_MODEL ?? 'llama3.1';
const OLLAMA_CLI = process.env.OLLAMA_CLI ?? 'ollama';

function getExecEnv() {
  return {
    ...process.env,
    PATH: process.env.PATH ? `${process.env.PATH}:${DEFAULT_PATH}` : DEFAULT_PATH,
    OLLAMA_HOST,
  };
}

async function resolveOllamaPath(): Promise<string | null> {
  try {
    const { stdout } = await execAsync(`command -v ${OLLAMA_CLI}`, {
      env: getExecEnv(),
      timeout: 10000,
    });
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

async function waitForOllama(timeoutMs = 20000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(`http://${OLLAMA_HOST}/api/version`, { cache: 'no-store' });
      if (response.ok) return true;
    } catch {
      // ignore
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return false;
}

async function ensureModelInstalled(ollamaPath: string): Promise<string> {
  try {
    const { stdout } = await execAsync(`${ollamaPath} list`, {
      env: getExecEnv(),
      timeout: 10000,
    });
    const models = stdout
      .split(/\r?\n/)
      .slice(1)
      .filter(Boolean)
      .map((line) => line.trim().split(/\s+/)[0]);

    if (models.includes(MODEL)) {
      return `Model ${MODEL} already installed.`;
    }

    const pullResult = await execAsync(`${ollamaPath} pull ${MODEL}`, {
      env: getExecEnv(),
      timeout: 10 * 60 * 1000,
    });
    return `${pullResult.stdout || ''}${pullResult.stderr || ''}`.trim() || `Pulled model ${MODEL}.`;
  } catch (error: any) {
    throw new Error(`Failed to install model ${MODEL}: ${error?.stderr || error?.stdout || error?.message || String(error)}`);
  }
}

export async function POST() {
  let installOutput = '';
  try {
    let ollamaPath = await resolveOllamaPath();

    if (!ollamaPath) {
      const { stdout, stderr } = await execAsync(INSTALL_COMMAND, {
        env: getExecEnv(),
        timeout: 10 * 60 * 1000,
      });
      installOutput += `${stdout || ''}${stderr || ''}`.trim();
      ollamaPath = await resolveOllamaPath();
    }

    if (!ollamaPath) {
      throw new Error('Ollama CLI was not found after installation.');
    }

    const modelOutput = await ensureModelInstalled(ollamaPath);
    installOutput = [installOutput, modelOutput].filter(Boolean).join('\n').trim();

    const serveProcess = spawn(ollamaPath, ['serve'], {
      detached: true,
      stdio: 'ignore',
      env: getExecEnv(),
    });
    serveProcess.unref();

    const serviceStarted = await waitForOllama();
    if (!serviceStarted) {
      return NextResponse.json(
        {
          success: false,
          output: installOutput || 'Ollama installed, but the service did not become available in time.',
          error: 'service_timeout',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, output: installOutput || 'Ollama installed, model pulled, and service started successfully.' });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        output: `${installOutput ? installOutput + '\n' : ''}${error?.message || 'install failed'}`.trim(),
        error: error?.message,
      },
      { status: 500 }
    );
  }
}
