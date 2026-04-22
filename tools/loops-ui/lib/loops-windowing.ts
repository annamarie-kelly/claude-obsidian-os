// Pure windowing helpers shared by the in-UI Tend layer and any CLI
// tooling (via the JSON mirrors in 06-Loops/). No localStorage, no
// React, no side effects.
//
// Contract: `buildStakeholderWindow` takes a loops array, a boundary
// log, and a "now" anchor, and returns the canonical
// Completed / Started / Blocked / Flags bucketing for the current
// week (Monday local -> now). External tooling reads the mirror file
// `06-Loops/stakeholder-window.json`, which is the serialized result
// of this function.
//
// Rules (intentionally small and explicit):
//   WINDOW_DAYS      = 7  (rolling window)
//   STALE_FLAG_DAYS  = config.stakeholder.staleDays
//
// Bucket rules:
//   Completed : done, doneAt within window, not dropped
//   Started   : NOT done, has a timeblock whose date falls in the
//               window, AND not already in Completed
//   Blocked   : NOT done, has blocker_reason (or blocked=true)
//   Flags     : boundary log entries whose timestamp is within the
//               current week (weekStartLocal -> now). Separate from
//               loop-derived "stale" flags below; the spec's "Flags"
//               channel is the boundary log.
//
// Note: the prose renderer in tend-stakeholder-draft.ts also computes
// a "stale P1:<stakeholder>" list. That list is preserved there as a
// prose annotation, but it is NOT part of the StakeholderWindow
// contract mirrored to disk. External tooling reads the mirror file's
// `flags` array as the authoritative boundary-log-derived flags for
// the week.

import type { BoundaryLogEntry, Loop } from './types';
import { config } from './config';

export const WINDOW_DAYS = 7;
export const STALE_FLAG_DAYS = config.stakeholder.staleDays;

export interface StakeholderWindow {
  week_start: string; // ISO date (YYYY-MM-DD) of Monday local
  window_start: string; // ISO timestamp of the 7-day cutoff
  window_end: string; // ISO timestamp of `now`
  completed: Loop[];
  started: Loop[];
  blocked: Loop[];
  flags: BoundaryLogEntry[];
}

// Local Monday anchor, mirroring lib/tend.ts::weekStartLocal. Kept
// inline here so this module has no client-only dependency on tend.ts.
export function weekStartLocalPure(reference: Date = new Date()): Date {
  const d = new Date(
    reference.getFullYear(),
    reference.getMonth(),
    reference.getDate(),
  );
  const dow = d.getDay();
  const daysSinceMon = (dow + 6) % 7;
  d.setDate(d.getDate() - daysSinceMon);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Does a loop have at least one timeblock whose ISO date falls in
// [windowStartMs, nowMs]? The canvas stores dates as "YYYY-MM-DD"
// strings, so we parse to local midnight for comparison.
function hasTimeblockInWindow(
  loop: Loop,
  windowStartMs: number,
  nowMs: number,
): boolean {
  const blocks = loop.timeblocks ?? [];
  for (const b of blocks) {
    const [y, m, d] = b.date.split('-').map(Number);
    if (!y || !m || !d) continue;
    const t = new Date(y, m - 1, d).getTime();
    if (t >= windowStartMs && t <= nowMs) return true;
  }
  return false;
}

export function buildStakeholderWindow(
  loops: Loop[],
  boundaryLog: BoundaryLogEntry[],
  now: Date = new Date(),
): StakeholderWindow {
  const nowMs = now.getTime();
  const windowStartMs = nowMs - WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const weekStart = weekStartLocalPure(now);
  const weekStartMs = weekStart.getTime();

  const completed: Loop[] = [];
  const started: Loop[] = [];
  const blocked: Loop[] = [];

  for (const l of loops) {
    const doneAt = l.doneAt ? new Date(l.doneAt).getTime() : 0;
    const isCompleted =
      !!l.done &&
      doneAt >= windowStartMs &&
      doneAt <= nowMs &&
      l.closedAs !== 'dropped';
    if (isCompleted) {
      completed.push(l);
      continue;
    }
    if (!l.done && hasTimeblockInWindow(l, windowStartMs, nowMs)) {
      started.push(l);
    }
    if (!l.done && (l.blocked || l.blocker_reason)) {
      blocked.push(l);
    }
  }

  const flags = boundaryLog.filter((e) => {
    const t = new Date(e.timestamp).getTime();
    return Number.isFinite(t) && t >= weekStartMs && t <= nowMs;
  });

  return {
    week_start: toISODate(weekStart),
    window_start: new Date(windowStartMs).toISOString(),
    window_end: new Date(nowMs).toISOString(),
    completed,
    started,
    blocked,
    flags,
  };
}
