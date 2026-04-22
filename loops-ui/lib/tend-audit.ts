// Tend audit trail — pure Node / TypeScript. No React, no Next, no
// browser APIs. Safe to import from the CLI script and from API route
// handlers alike.
//
// Owns three responsibilities:
//   1. Locating the vault root (env var or upward default).
//   2. A simple POSIX-style file lock (`06-Loops/.loops.lock`) with
//      exponential backoff retries. Used to serialize concurrent
//      writers (web UI and CLI racing on the same loops.json).
//   3. Append-only JSONL writer for `06-Loops/events.log.jsonl` with
//      10 MB rotation (tail moves to `.1`, keeping at most 3 rotations).
//
// The audit entry shape is defined in this file so the CLI can import
// types from one place without pulling in the larger `tend-events`
// module.

import fs from 'node:fs/promises';
import path from 'node:path';

// ─── Vault root resolution ──────────────────────────────────────────
// Matches the logic in app/api/loops/route.ts and action/route.ts so
// CLI + HTTP callers resolve identical paths.
export function resolveVaultRoot(): string {
  if (process.env.LOOPS_UI_VAULT_ROOT) {
    return path.resolve(process.env.LOOPS_UI_VAULT_ROOT);
  }
  return path.resolve(process.cwd(), '../vault-template');
}

export function loopsJsonPath(root: string = resolveVaultRoot()): string {
  return path.join(root, '06-Loops/loops.json');
}

export function eventsLogPath(root: string = resolveVaultRoot()): string {
  return path.join(root, '06-Loops/events.log.jsonl');
}

export function lockPath(root: string = resolveVaultRoot()): string {
  return path.join(root, '06-Loops/.loops.lock');
}

// ─── ULID ───────────────────────────────────────────────────────────
// Self-contained ULID implementation so we don't take on a new runtime
// dependency. Crockford base32, 10 timestamp chars + 16 randomness
// chars, total 26 chars. Lexically sortable by time.
const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

function encodeTime(ms: number, len: number): string {
  let out = '';
  let t = ms;
  for (let i = len - 1; i >= 0; i--) {
    const mod = t % 32;
    out = CROCKFORD[mod] + out;
    t = (t - mod) / 32;
  }
  return out;
}

function encodeRandom(len: number): string {
  let out = '';
  for (let i = 0; i < len; i++) {
    out += CROCKFORD[Math.floor(Math.random() * 32)];
  }
  return out;
}

export function ulid(now: number = Date.now()): string {
  return encodeTime(now, 10) + encodeRandom(16);
}

// ─── Audit entry shape ──────────────────────────────────────────────
export type Actor =
  | 'web'
  | 'terminal'
  | 'refresh'
  | 'hook'
  | `agent:${string}`;

export interface AuditEntry {
  event_id: string;
  timestamp: string;
  actor: Actor;
  kind: string;
  result: 'applied' | 'gated' | 'rejected';
  loop_id?: string;
  summary?: string;
  // Optional free-form context (gate reason code, error message, etc.)
  // that the CLI and BoundaryLogPanel can surface for debugging.
  context?: Record<string, unknown>;
}

// ─── File lock ──────────────────────────────────────────────────────
// Simple lockfile: exclusive create, contents = `{pid, acquired}`. We
// retry every ~100ms × 20 (≈ 2s total) before giving up. Stale locks
// older than 30 s are considered abandoned and get forcibly cleared.
//
// Not bulletproof against a process crash — but good enough for a
// single-user tool where the only contenders are the web server and
// at most one CLI call at a time.
const LOCK_RETRY_COUNT = 20;
const LOCK_RETRY_BASE_MS = 100;
const LOCK_STALE_MS = 30_000;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function ensureLoopsDir(root: string): Promise<void> {
  await fs.mkdir(path.join(root, '06-Loops'), { recursive: true });
}

async function tryAcquire(lockFile: string): Promise<boolean> {
  try {
    const payload = JSON.stringify({ pid: process.pid, acquired: Date.now() });
    // 'wx' = fail if exists. Atomic create on POSIX and Windows.
    await fs.writeFile(lockFile, payload, { flag: 'wx' });
    return true;
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException)?.code !== 'EEXIST') throw err;
    return false;
  }
}

async function clearStaleLock(lockFile: string): Promise<void> {
  try {
    const raw = await fs.readFile(lockFile, 'utf-8');
    const parsed = JSON.parse(raw) as { pid?: number; acquired?: number };
    if (
      typeof parsed.acquired === 'number' &&
      Date.now() - parsed.acquired > LOCK_STALE_MS
    ) {
      await fs.unlink(lockFile).catch(() => undefined);
    }
  } catch {
    // Missing / unparseable — treat as stale and attempt to remove.
    await fs.unlink(lockFile).catch(() => undefined);
  }
}

export async function acquireLock(
  root: string = resolveVaultRoot(),
): Promise<() => Promise<void>> {
  await ensureLoopsDir(root);
  const lockFile = lockPath(root);
  for (let attempt = 0; attempt < LOCK_RETRY_COUNT; attempt++) {
    if (await tryAcquire(lockFile)) {
      return async () => {
        await fs.unlink(lockFile).catch(() => undefined);
      };
    }
    // On the halfway point, check for a stale lock and reap it.
    if (attempt === Math.floor(LOCK_RETRY_COUNT / 2)) {
      await clearStaleLock(lockFile);
    }
    // Small backoff with a tiny jitter so contending writers don't
    // collide on the same retry tick.
    const delay = LOCK_RETRY_BASE_MS + Math.floor(Math.random() * 30);
    await sleep(delay);
  }
  throw new Error('lock_timeout');
}

export async function withLock<T>(
  fn: () => Promise<T>,
  root: string = resolveVaultRoot(),
): Promise<T> {
  const release = await acquireLock(root);
  try {
    return await fn();
  } finally {
    await release();
  }
}

// ─── Events log writer ──────────────────────────────────────────────
const EVENTS_LOG_MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const EVENTS_LOG_MAX_ROTATIONS = 3;

async function rotateIfNeeded(logFile: string): Promise<void> {
  let stat: Awaited<ReturnType<typeof fs.stat>> | null = null;
  try {
    stat = await fs.stat(logFile);
  } catch {
    return;
  }
  if (stat.size < EVENTS_LOG_MAX_BYTES) return;
  // Shift existing rotations .N -> .(N+1), dropping anything beyond
  // EVENTS_LOG_MAX_ROTATIONS.
  for (let i = EVENTS_LOG_MAX_ROTATIONS; i >= 1; i--) {
    const from = `${logFile}.${i}`;
    const to = `${logFile}.${i + 1}`;
    try {
      await fs.rename(from, to);
    } catch {
      /* doesn't exist — skip */
    }
  }
  try {
    await fs.rename(logFile, `${logFile}.1`);
  } catch {
    /* logFile vanished between stat and rename — ignore */
  }
  // Drop anything past the retention ceiling.
  try {
    await fs.unlink(`${logFile}.${EVENTS_LOG_MAX_ROTATIONS + 1}`);
  } catch {
    /* not present — no-op */
  }
}

export async function appendAuditEntry(
  entry: AuditEntry,
  root: string = resolveVaultRoot(),
): Promise<void> {
  await ensureLoopsDir(root);
  const logFile = eventsLogPath(root);
  await rotateIfNeeded(logFile);
  const line = JSON.stringify(entry) + '\n';
  await fs.appendFile(logFile, line, 'utf-8');
}

export function makeAuditEntry(
  kind: string,
  result: AuditEntry['result'],
  actor: Actor,
  extras?: { loop_id?: string; summary?: string; context?: Record<string, unknown> },
): AuditEntry {
  return {
    event_id: ulid(),
    timestamp: new Date().toISOString(),
    actor,
    kind,
    result,
    loop_id: extras?.loop_id,
    summary: extras?.summary,
    context: extras?.context,
  };
}

// ─── loops.json read / write ────────────────────────────────────────
// Shared helpers so every code path uses the same tmp-rename sequence.
// Returns the raw parsed object — caller decides whether to run it
// through migrateLoopsFile.
export async function readLoopsJson(
  root: string = resolveVaultRoot(),
): Promise<unknown> {
  const raw = await fs.readFile(loopsJsonPath(root), 'utf-8');
  return JSON.parse(raw);
}

export async function writeLoopsJson(
  data: unknown,
  root: string = resolveVaultRoot(),
): Promise<void> {
  const target = loopsJsonPath(root);
  const tmp = `${target}.${process.pid}.${Date.now()}.${Math.random()
    .toString(36)
    .slice(2, 8)}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), 'utf-8');
  await fs.rename(tmp, target);
}
