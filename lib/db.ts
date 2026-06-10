import { neon } from '@neondatabase/serverless';
import { randomUUID } from 'crypto';

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

function sql() {
  const url = process.env.STORE_DATABASE_URL;
  if (!url) throw new Error('STORE_URL environment variable is not set.');
  return neon(url);
}

// Create all tables if they don't exist yet
export async function ensureTables() {
  const db = sql();
  await db`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `;
  await db`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    )
  `;
  await db`
    CREATE TABLE IF NOT EXISTS repos (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      owner TEXT NOT NULL,
      name TEXT NOT NULL,
      full_name TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `;
  await db`
    CREATE TABLE IF NOT EXISTS sandbox_messages (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      steps JSONB,
      timestamp TEXT NOT NULL
    )
  `;
  await db`
    CREATE TABLE IF NOT EXISTS releasify_drafts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      repo TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `;
}

// ── Users ──────────────────────────────────────────────────────────────────

export async function dbGetUserByEmail(email: string): Promise<UserRecord | null> {
  const db = sql();
  const rows = await db`SELECT * FROM users WHERE email = ${email} LIMIT 1`;
  if (!rows[0]) return null;
  return rowToUser(rows[0]);
}

export async function dbGetUserById(id: string): Promise<UserRecord | null> {
  const db = sql();
  const rows = await db`SELECT * FROM users WHERE id = ${id} LIMIT 1`;
  if (!rows[0]) return null;
  return rowToUser(rows[0]);
}

export async function dbCreateUser(user: UserRecord): Promise<void> {
  const db = sql();
  await db`
    INSERT INTO users (id, email, name, password_hash, salt, created_at)
    VALUES (${user.id}, ${user.email}, ${user.name}, ${user.passwordHash}, ${user.salt}, ${user.createdAt})
  `;
}

// ── Sessions ───────────────────────────────────────────────────────────────

export async function dbCreateSession(session: SessionRecord): Promise<void> {
  const db = sql();
  await db`
    INSERT INTO sessions (id, user_id, created_at, expires_at)
    VALUES (${session.id}, ${session.userId}, ${session.createdAt}, ${session.expiresAt})
  `;
}

export async function dbGetSession(id: string): Promise<SessionRecord | null> {
  const db = sql();
  const rows = await db`SELECT * FROM sessions WHERE id = ${id} LIMIT 1`;
  if (!rows[0]) return null;
  return rowToSession(rows[0]);
}

export async function dbDeleteSession(id: string): Promise<void> {
  const db = sql();
  await db`DELETE FROM sessions WHERE id = ${id}`;
}

// ── Repos ──────────────────────────────────────────────────────────────────

export async function dbGetReposByUser(userId: string): Promise<RepoRecord[]> {
  const db = sql();
  const rows = await db`SELECT * FROM repos WHERE user_id = ${userId} ORDER BY created_at DESC`;
  return rows.map(rowToRepo);
}

export async function dbCreateRepo(repo: RepoRecord): Promise<void> {
  const db = sql();
  await db`
    INSERT INTO repos (id, user_id, owner, name, full_name, created_at)
    VALUES (${repo.id}, ${repo.userId}, ${repo.owner}, ${repo.name}, ${repo.fullName}, ${repo.createdAt})
  `;
}

// ── Sandbox messages ───────────────────────────────────────────────────────

export async function dbGetSandboxMessages(userId: string): Promise<SandboxMessageRecord[]> {
  const db = sql();
  const rows = await db`SELECT * FROM sandbox_messages WHERE user_id = ${userId} ORDER BY timestamp ASC`;
  return rows.map(rowToSandboxMessage);
}

export async function dbSaveSandboxMessage(msg: SandboxMessageRecord): Promise<void> {
  const db = sql();
  await db`
    INSERT INTO sandbox_messages (id, user_id, role, content, steps, timestamp)
    VALUES (${msg.id}, ${msg.userId}, ${msg.role}, ${msg.content}, ${JSON.stringify(msg.steps ?? [])}, ${msg.timestamp})
    ON CONFLICT (id) DO UPDATE SET content = ${msg.content}, steps = ${JSON.stringify(msg.steps ?? [])}
  `;
}

// ── Releasify drafts ───────────────────────────────────────────────────────

export async function dbGetDraftsByUser(userId: string): Promise<ReleasifyDraftRecord[]> {
  const db = sql();
  const rows = await db`SELECT * FROM releasify_drafts WHERE user_id = ${userId} ORDER BY updated_at DESC`;
  return rows.map(rowToDraft);
}

export async function dbSaveDraft(draft: ReleasifyDraftRecord): Promise<void> {
  const db = sql();
  await db`
    INSERT INTO releasify_drafts (id, user_id, repo, title, content, created_at, updated_at)
    VALUES (${draft.id}, ${draft.userId}, ${draft.repo}, ${draft.title}, ${draft.content}, ${draft.createdAt}, ${draft.updatedAt})
    ON CONFLICT (id) DO UPDATE SET title = ${draft.title}, content = ${draft.content}, updated_at = ${draft.updatedAt}
  `;
}

// ── Legacy readDb / updateDb shim ─────────────────────────────────────────
// Keeps lib/auth.ts and any other callers working without changes.

export async function readDb(): Promise<AppDatabase> {
  await ensureTables();
  const db = sql();
  const [users, sessions, repos, sandboxMessages, releasifyDrafts] = await Promise.all([
    db`SELECT * FROM users`,
    db`SELECT * FROM sessions`,
    db`SELECT * FROM repos`,
    db`SELECT * FROM sandbox_messages`,
    db`SELECT * FROM releasify_drafts`,
  ]);
  return {
    users: users.map(rowToUser),
    sessions: sessions.map(rowToSession),
    repos: repos.map(rowToRepo),
    sandboxMessages: sandboxMessages.map(rowToSandboxMessage),
    releasifyDrafts: releasifyDrafts.map(rowToDraft),
  };
}

export async function updateDb<T>(updater: (db: AppDatabase) => T | Promise<T>): Promise<T> {
  await ensureTables();
  const db = await readDb();
  const result = await updater(db);

  const sql_ = sql();

  // sync users
  for (const user of db.users) {
    await sql_`
      INSERT INTO users (id, email, name, password_hash, salt, created_at)
      VALUES (${user.id}, ${user.email}, ${user.name}, ${user.passwordHash}, ${user.salt}, ${user.createdAt})
      ON CONFLICT (id) DO NOTHING
    `;
  }

  // sync sessions
  for (const session of db.sessions) {
    await sql_`
      INSERT INTO sessions (id, user_id, created_at, expires_at)
      VALUES (${session.id}, ${session.userId}, ${session.createdAt}, ${session.expiresAt})
      ON CONFLICT (id) DO NOTHING
    `;
  }
  const sessionIds = db.sessions.map(s => s.id);
  if (sessionIds.length > 0) {
    await sql_`DELETE FROM sessions WHERE id != ALL(${sessionIds})`;
  } else {
    await sql_`DELETE FROM sessions`;
  }

  // sync repos
  for (const repo of db.repos) {
    await sql_`
      INSERT INTO repos (id, user_id, owner, name, full_name, created_at)
      VALUES (${repo.id}, ${repo.userId}, ${repo.owner}, ${repo.name}, ${repo.fullName}, ${repo.createdAt})
      ON CONFLICT (id) DO NOTHING
    `;
  }
  // sync sandbox messages
  for (const msg of db.sandboxMessages) {
    await sql_`
      INSERT INTO sandbox_messages (id, user_id, role, content, steps, timestamp)
      VALUES (${msg.id}, ${msg.userId}, ${msg.role}, ${msg.content}, ${JSON.stringify(msg.steps ?? [])}, ${msg.timestamp})
      ON CONFLICT (id) DO UPDATE SET content = ${msg.content}, steps = ${JSON.stringify(msg.steps ?? [])}
    `;
  }
  const repoIds = db.repos.map(r => r.id);
  if (repoIds.length > 0) {
    await sql_`DELETE FROM repos WHERE user_id = ANY(${db.users.map(u => u.id)}) AND id != ALL(${repoIds})`;
  }

  return result;
}

// ── Row mappers ────────────────────────────────────────────────────────────

function rowToUser(row: Record<string, unknown>): UserRecord {
  return {
    id: row.id as string,
    email: row.email as string,
    name: row.name as string,
    passwordHash: row.password_hash as string,
    salt: row.salt as string,
    createdAt: row.created_at as string,
  };
}

function rowToSession(row: Record<string, unknown>): SessionRecord {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    createdAt: row.created_at as string,
    expiresAt: row.expires_at as string,
  };
}

function rowToRepo(row: Record<string, unknown>): RepoRecord {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    owner: row.owner as string,
    name: row.name as string,
    fullName: row.full_name as string,
    createdAt: row.created_at as string,
  };
}

function rowToSandboxMessage(row: Record<string, unknown>): SandboxMessageRecord {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    role: row.role as 'user' | 'agent',
    content: row.content as string,
    steps: row.steps as SandboxMessageRecord['steps'],
    timestamp: row.timestamp as string,
  };
}

function rowToDraft(row: Record<string, unknown>): ReleasifyDraftRecord {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    repo: row.repo as string,
    title: row.title as string,
    content: row.content as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function createId(prefix: string) {
  return `${prefix}_${randomUUID().replace(/-/g, '')}`;
}