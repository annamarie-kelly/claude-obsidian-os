// Forward-only mirror of the in-UI Tend state into JSON files in
// `06-Loops/`. Any CLI tooling pointed at the same vault reads those
// files directly, which means it sees the same boundary-log /
// checkpoints / weekly-pattern / stakeholder-window state that the UI
// has just written.
//
// Mirror direction is strictly UI -> disk. External readers never
// write back, so there is no sync loop. Writes happen inside a small
// API route (app/api/tend/mirror/route.ts) because the browser cannot
// touch fs directly.
//
// All calls here are fire-and-forget with a console.warn on failure.
// A mirror write dropping is never fatal to the UI.

import type {
  BoundaryLogEntry,
  Checkpoint,
  WeeklyPattern,
} from './types';
import type { StakeholderWindow } from './loops-windowing';

export type MirrorKind = 'boundary_log' | 'tend_export' | 'stakeholder_window';

async function postMirror(kind: MirrorKind, data: unknown): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const res = await fetch('/api/tend/mirror', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ kind, data }),
    });
    if (!res.ok) {
      console.warn('[tend-mirror] non-ok response', kind, res.status);
    }
  } catch (err) {
    console.warn('[tend-mirror] write failed', kind, err);
  }
}

export function mirrorBoundaryLogToFile(
  entries: BoundaryLogEntry[],
): Promise<void> {
  return postMirror('boundary_log', {
    entries,
    updated_at: new Date().toISOString(),
  });
}

export function mirrorCheckpointsToFile(
  checkpoints: Record<string, Checkpoint>,
  weeklyPattern: WeeklyPattern | null,
): Promise<void> {
  // External readers consume `checkpoints` as a date-keyed map and
  // `weekly_patterns` as an array (always length 0 or 1 today, but
  // we keep the array shape so a future multi-week history doesn't
  // require a schema change).
  return postMirror('tend_export', {
    checkpoints,
    weekly_patterns: weeklyPattern ? [weeklyPattern] : [],
    updated_at: new Date().toISOString(),
  });
}

export function mirrorStakeholderWindowToFile(window: StakeholderWindow): Promise<void> {
  return postMirror('stakeholder_window', {
    ...window,
    updated_at: new Date().toISOString(),
  });
}
