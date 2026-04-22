'use client';

// Builds a terse plain-text weekly summary for the primary stakeholder.
// Sections: Completed · Started · Blocked · Flags.
//
// Windowing logic lives in `lib/loops-windowing.ts` so CLI tooling
// (which reads the mirror file `06-Loops/stakeholder-window.json`) and
// this UI-side formatter stay in sync. This file is purely the prose
// renderer around the shared window.
//
// The "Flags" section prints BOTH the boundary-log flags (canonical)
// AND any P1:<stakeholder> loops that have gone N+ days without an
// updatedAt bump (N = config.stakeholder.staleDays). Only the
// boundary-log flags are mirrored to disk; the stale-P1 list is a
// UI-only annotation.

import type { BoundaryLogEntry, Loop } from './types';
import { readBoundaryLog } from './tend';
import { config, P1_STAKEHOLDER } from './config';
import {
  buildStakeholderWindow,
  type StakeholderWindow,
} from './loops-windowing';

function short(s: string, n: number): string {
  return s.length > n ? s.slice(0, n).trimEnd() + '…' : s;
}

function computeStaleFlags(loops: Loop[], nowMs: number): Loop[] {
  const cutoff = config.stakeholder.staleDays * 24 * 60 * 60 * 1000;
  const out: Loop[] = [];
  for (const l of loops) {
    if (l.done) continue;
    if (l.pLevel !== P1_STAKEHOLDER) continue;
    const updated = l.updatedAt ? new Date(l.updatedAt).getTime() : 0;
    if (updated > 0 && nowMs - updated >= cutoff) out.push(l);
  }
  return out;
}

// Public: build the StakeholderWindow from live loops + live boundary
// log. Exposed so callers (e.g. ReflectionView) can mirror the window
// to the filesystem without re-reading tend state.
export function currentStakeholderWindow(loops: Loop[], now: Date = new Date()): StakeholderWindow {
  const log = safeReadBoundaryLog();
  return buildStakeholderWindow(loops, log, now);
}

function safeReadBoundaryLog(): BoundaryLogEntry[] {
  try {
    return readBoundaryLog();
  } catch {
    return [];
  }
}

export function buildStakeholderDraft(loops: Loop[]): string {
  const now = new Date();
  const window = currentStakeholderWindow(loops, now);
  const stale = computeStaleFlags(loops, now.getTime());

  const lines: string[] = [];
  lines.push('Weekly update');
  lines.push('');
  lines.push(`Completed (${window.completed.length}):`);
  if (window.completed.length === 0) {
    lines.push('  —');
  } else {
    for (const l of window.completed) lines.push(`  - ${short(l.text, 100)}`);
  }
  lines.push('');
  lines.push(`Started (${window.started.length}):`);
  if (window.started.length === 0) {
    lines.push('  —');
  } else {
    for (const l of window.started) lines.push(`  - ${short(l.text, 100)}`);
  }
  lines.push('');
  lines.push(`Blocked (${window.blocked.length}):`);
  if (window.blocked.length === 0) {
    lines.push('  —');
  } else {
    for (const l of window.blocked) {
      const reason = l.blocker_reason ? ` (${short(l.blocker_reason, 60)})` : '';
      lines.push(`  - ${short(l.text, 80)}${reason}`);
    }
  }
  lines.push('');
  const totalFlags = window.flags.length + stale.length;
  lines.push(`Flags (${totalFlags}):`);
  if (totalFlags === 0) {
    lines.push('  —');
  } else {
    for (const f of window.flags) {
      const reason = f.reason ? ` (${short(f.reason, 60)})` : '';
      lines.push(`  - ${f.type}: ${short(f.context, 70)}${reason}`);
    }
    const nowMs = now.getTime();
    for (const l of stale) {
      const days = Math.round(
        (nowMs - new Date(l.updatedAt!).getTime()) / 86_400_000,
      );
      lines.push(`  - ${short(l.text, 80)} (${days}d stale)`);
    }
  }

  return lines.join('\n');
}
