'use client';

// Tend self-protection layer — shared client-side store.
//
// This module owns the boundary log, the daily checkpoint store, the
// cross-tab checkpoint lock, and the capacity constants. Everything
// lives in localStorage; the UI is the system of record. Nothing here
// touches loops.json.
//
// All writes dispatch a `window` CustomEvent named `tend:change` so
// components that care about the boundary log / checkpoints can refresh
// without prop-drilling.

import type {
  BoundaryLogEntry,
  Checkpoint,
  CloseOutEntry,
  WeeklyPattern,
} from './types';
import {
  mirrorBoundaryLogToFile,
  mirrorCheckpointsToFile,
} from './tend-mirror';

// ─── Capacity thresholds ─────────────────────────────────────────────
// Structural ceilings enforced by the capacity gate and surfaced in
// the checkpoint's Section 3. Sourced from loops.config.json so users
// can retune without touching code.
import { config, P1_STAKEHOLDER, P1_SELF } from './config';
export const P1_STAKEHOLDER_MAX = config.stakeholder.capacityMax;
export const P1_SELF_MAX = config.self.capacityMax;

// ─── Triage Gate caps (flat priority model) ──────────────────────────
// Absolute caps on the flat priority axis, regardless of stakeholder.
// Checked by the triage accept flow; the capacity gate modal fires
// when accepting a loop at the cap.
export const P1_FLAT_CAP = config.priorityCaps.P1Flat;
export const P2_FLAT_CAP = config.priorityCaps.P2Flat;

// Count active (non-done) loops at a flat priority. Used by the
// Triage Gate accept flow.
export function countFlatPriority(
  loops: import('./types').Loop[],
  priority: import('./types').TriagePriority,
): number {
  return loops.filter(
    (l) =>
      !l.done &&
      l.status !== 'triage' &&
      l.status !== 'someday' &&
      l.status !== 'dropped' &&
      l.priority === priority,
  ).length;
}

// ─── LocalStorage keys ───────────────────────────────────────────────
export const LS_BOUNDARY_LOG = 'loops-ui:tend:boundary_log';
export const LS_BOUNDARY_LOG_ARCHIVE = 'loops-ui:tend:boundary_log_archive';
export const LS_CHECKPOINTS = 'loops-ui:tend:checkpoints';
export const LS_WEEKLY_PATTERN = 'loops-ui:tend:weekly_pattern';
export const LS_CHECKPOINT_LOCK = 'loops-ui:tend:checkpoint_lock';
export const LS_CLOSE_OUTS = 'loops-ui:tend:close_outs';

const BOUNDARY_LOG_LIMIT = 500;
const CLOSE_OUT_LIMIT = 500;
const CHECKPOINT_LOCK_MS = 2 * 60 * 1000; // 2 minutes

// ─── Event bus ───────────────────────────────────────────────────────
export const TEND_EVENT = 'tend:change';

export type TendEventKind =
  | 'boundary_log'
  | 'checkpoint'
  | 'weekly_pattern'
  | 'close_out';

function emit(kind: TendEventKind) {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent(TEND_EVENT, { detail: { kind } }));
  } catch {
    /* no-op */
  }
}

// ─── Safe storage helpers ────────────────────────────────────────────
function safeRead<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeWrite<T>(key: string, value: T) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota exceeded — drop silently */
  }
}

// ─── Boundary log ────────────────────────────────────────────────────

export function readBoundaryLog(): BoundaryLogEntry[] {
  return safeRead<BoundaryLogEntry[]>(LS_BOUNDARY_LOG, []);
}

export function readBoundaryLogArchive(): BoundaryLogEntry[] {
  return safeRead<BoundaryLogEntry[]>(LS_BOUNDARY_LOG_ARCHIVE, []);
}

export function appendBoundaryLog(
  entry: Omit<BoundaryLogEntry, 'id' | 'timestamp'> & {
    id?: string;
    timestamp?: string;
  },
): BoundaryLogEntry {
  const full: BoundaryLogEntry = {
    id: entry.id ?? makeId(),
    timestamp: entry.timestamp ?? new Date().toISOString(),
    type: entry.type,
    context: entry.context,
    reason: entry.reason,
    loop_id: entry.loop_id,
    counts_at_time: entry.counts_at_time,
  };
  const current = readBoundaryLog();
  const next = [...current, full];
  if (next.length > BOUNDARY_LOG_LIMIT) {
    const overflow = next.slice(0, next.length - BOUNDARY_LOG_LIMIT);
    const archive = readBoundaryLogArchive();
    safeWrite(LS_BOUNDARY_LOG_ARCHIVE, [...archive, ...overflow]);
    safeWrite(LS_BOUNDARY_LOG, next.slice(-BOUNDARY_LOG_LIMIT));
  } else {
    safeWrite(LS_BOUNDARY_LOG, next);
  }
  emit('boundary_log');
  // Fire-and-forget mirror to 06-Loops/boundary_log.json so the CLI
  // skills see the same entries. Errors are swallowed inside
  // tend-mirror.
  void mirrorBoundaryLogToFile(readBoundaryLog());
  return full;
}

// Week-window helper — returns entries in the current Monday→Sunday
// week local time. Used by the OverrideBadge count and by the
// checkpoint modal's "weekly override count" line.
export function weekStartLocal(reference: Date = new Date()): Date {
  const d = new Date(
    reference.getFullYear(),
    reference.getMonth(),
    reference.getDate(),
  );
  const dow = d.getDay(); // 0=Sun..6=Sat
  const daysSinceMon = (dow + 6) % 7;
  d.setDate(d.getDate() - daysSinceMon);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function boundaryLogThisWeek(
  reference: Date = new Date(),
): BoundaryLogEntry[] {
  const start = weekStartLocal(reference).getTime();
  return readBoundaryLog().filter((e) => {
    const t = new Date(e.timestamp).getTime();
    return Number.isFinite(t) && t >= start;
  });
}

export function overrideCountThisWeek(
  reference: Date = new Date(),
): number {
  return boundaryLogThisWeek(reference).filter(
    (e) => e.type === 'capacity_override',
  ).length;
}

// ─── Checkpoints ─────────────────────────────────────────────────────

export type CheckpointMap = Record<string, Checkpoint>;

export function readCheckpoints(): CheckpointMap {
  return safeRead<CheckpointMap>(LS_CHECKPOINTS, {});
}

export function readCheckpoint(date: string): Checkpoint | null {
  return readCheckpoints()[date] ?? null;
}

export function writeCheckpoint(cp: Checkpoint) {
  const all = readCheckpoints();
  all[cp.date] = cp;
  safeWrite(LS_CHECKPOINTS, all);
  emit('checkpoint');
  // Mirror the full checkpoint map + current weekly pattern to
  // 06-Loops/tend-export.json. The CLI /reflect command reads this.
  void mirrorCheckpointsToFile(all, readWeeklyPattern());
}

export function todayLocalDate(reference: Date = new Date()): string {
  const y = reference.getFullYear();
  const m = String(reference.getMonth() + 1).padStart(2, '0');
  const d = String(reference.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Yesterday's local date — used by the TomorrowBadge to look up the
// prior checkpoint's `tomorrow_intent` list.
export function yesterdayLocalDate(reference: Date = new Date()): string {
  const d = new Date(
    reference.getFullYear(),
    reference.getMonth(),
    reference.getDate() - 1,
  );
  return todayLocalDate(d);
}

// ─── Cross-tab checkpoint lock ───────────────────────────────────────
// Multiple tabs race to show the checkpoint at 5pm. The first tab that
// takes the lock (via localStorage AND BroadcastChannel election) owns
// the modal for 2 minutes; after that the lock expires and re-election
// runs. Returns true if the caller now owns the lock.
export function acquireCheckpointLock(tabId: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = window.localStorage.getItem(LS_CHECKPOINT_LOCK);
    const now = Date.now();
    if (raw) {
      const parsed = JSON.parse(raw) as { tabId: string; expires: number };
      if (parsed.expires > now && parsed.tabId !== tabId) return false;
    }
    window.localStorage.setItem(
      LS_CHECKPOINT_LOCK,
      JSON.stringify({ tabId, expires: now + CHECKPOINT_LOCK_MS }),
    );
    return true;
  } catch {
    return false;
  }
}

export function releaseCheckpointLock(tabId: string) {
  if (typeof window === 'undefined') return;
  try {
    const raw = window.localStorage.getItem(LS_CHECKPOINT_LOCK);
    if (!raw) return;
    const parsed = JSON.parse(raw) as { tabId: string; expires: number };
    if (parsed.tabId === tabId) {
      window.localStorage.removeItem(LS_CHECKPOINT_LOCK);
    }
  } catch {
    /* no-op */
  }
}

// ─── Weekly pattern store ────────────────────────────────────────────

export function readWeeklyPattern(): WeeklyPattern | null {
  return safeRead<WeeklyPattern | null>(LS_WEEKLY_PATTERN, null);
}

export function writeWeeklyPattern(p: WeeklyPattern | null) {
  if (p == null) {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(LS_WEEKLY_PATTERN);
      } catch {
        /* no-op */
      }
    }
  } else {
    safeWrite(LS_WEEKLY_PATTERN, p);
  }
  emit('weekly_pattern');
  // Mirror alongside the checkpoint map so CLI /reflect has the
  // latest weekly pattern in the same export file.
  void mirrorCheckpointsToFile(readCheckpoints(), p);
}

// ─── Shared ids ──────────────────────────────────────────────────────
function makeId(): string {
  // 8-char base36 suffix keyed off Date.now + random. The boundary log
  // doesn't need cryptographic uniqueness — just local non-collision.
  return (
    Date.now().toString(36) +
    '-' +
    Math.random().toString(36).slice(2, 8)
  );
}

// ─── Loop counting helpers ───────────────────────────────────────────
// Count active (non-done) loops at a given priority label. Used by
// the capacity gate and the checkpoint's Section 3.
import type { Loop } from './types';

export function countActiveP1Stakeholder(loops: Loop[]): number {
  return loops.filter((l) => !l.done && l.pLevel === P1_STAKEHOLDER).length;
}

export function countActiveP1Self(loops: Loop[]): number {
  return loops.filter((l) => !l.done && l.pLevel === P1_SELF).length;
}

// ─── Close-out ledger ───────────────────────────────────────────────
// Fed by the in-UI CloseGateModal (the client-side mirror of the
// `/close` skill's 5-check gate). Capped FIFO at CLOSE_OUT_LIMIT; the
// BoundaryLogPanel reads back the tail as an audit trail.

export function readCloseOuts(): CloseOutEntry[] {
  return safeRead<CloseOutEntry[]>(LS_CLOSE_OUTS, []);
}

export function appendCloseOut(entry: CloseOutEntry): CloseOutEntry {
  const current = readCloseOuts();
  const next = [...current, entry];
  const trimmed =
    next.length > CLOSE_OUT_LIMIT ? next.slice(-CLOSE_OUT_LIMIT) : next;
  safeWrite(LS_CLOSE_OUTS, trimmed);
  emit('close_out');
  return entry;
}

// Matches the validation-work vocabulary the /close skill calls out:
// security reviews, audits, vulnerability chains, benchmarks, and any
// explicit check-in / follow-through phrasing. Case-insensitive, and
// tolerant of the hyphenated forms ("check-in", "follow-through").
export function detectFollowThroughKeywords(text: string): boolean {
  if (!text) return false;
  return /security|audit|vulnerab|benchmark|check[- ]?in|follow[- ]?through/i.test(
    text,
  );
}
