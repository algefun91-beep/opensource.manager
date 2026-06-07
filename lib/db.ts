import { mkdir, readFile, writeFile } from 'fs/promises';
import { randomUUID } from 'crypto';
import path from 'path';

export type UserRecord = {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  salt: string;
  createdAt: string;
};

export type SessionRecord = {
  id: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
};

export type RepoRecord = {
  id: string;
  userId: string;
  owner: string;
  name: string;
  fullName: string;
  createdAt: string;
};

export type SandboxMessageRecord = {
  id: string;
  userId: string;
  role: 'user' | 'agent';
  content: string;
  steps?: { type: 'done' | 'running' | 'error'; text: string }[];
  timestamp: string;
};

export type ReleasifyDraftRecord = {
  id: string;
  userId: string;
  repo: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export type AppDatabase = {
  users: UserRecord[];
  sessions: SessionRecord[];
  repos: RepoRecord[];
  sandboxMessages: SandboxMessageRecord[];
  releasifyDrafts: ReleasifyDraftRecord[];
};

const DATA_DIR = path.join(process.cwd(), '.data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

const EMPTY_DB: AppDatabase = {
  users: [],
  sessions: [],
  repos: [],
  sandboxMessages: [],
  releasifyDrafts: [],
};

let writeQueue = Promise.resolve();

async function ensureDbFile() {
  await mkdir(DATA_DIR, { recursive: true });
  try {
    await readFile(DB_FILE, 'utf8');
  } catch {
    await writeFile(DB_FILE, JSON.stringify(EMPTY_DB, null, 2));
  }
}

export async function readDb(): Promise<AppDatabase> {
  await ensureDbFile();
  const raw = await readFile(DB_FILE, 'utf8');
  const parsed = JSON.parse(raw || '{}');
  return {
    users: Array.isArray(parsed.users) ? parsed.users : [],
    sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
    repos: Array.isArray(parsed.repos) ? parsed.repos : [],
    sandboxMessages: Array.isArray(parsed.sandboxMessages) ? parsed.sandboxMessages : [],
    releasifyDrafts: Array.isArray(parsed.releasifyDrafts) ? parsed.releasifyDrafts : [],
  };
}

export async function updateDb<T>(updater: (db: AppDatabase) => T | Promise<T>): Promise<T> {
  const run = async () => {
    const db = await readDb();
    const result = await updater(db);
    await writeFile(DB_FILE, JSON.stringify(db, null, 2));
    return result;
  };

  const next = writeQueue.then(run, run);
  writeQueue = next.then(() => undefined, () => undefined);
  return next;
}

export function createId(prefix: string) {
  return `${prefix}_${randomUUID().replace(/-/g, '')}`;
}
