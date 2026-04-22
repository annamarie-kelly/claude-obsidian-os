// Tend gate policy — pure functions, no React, no Next. Safe to import
// from both the CLI and server-side API routes. Modal components
// (CapacityGateModal, CloseGateModal) continue to own the UX but read
// their "does the gate fire?" decision from this module.
//
// Every gate returns the same discriminated shape so applyEvent can
// uniformly forward a gated ApplyResult to the caller.

import type {
  Loop,
  LoopsFile,
  TriagePriority,
} from './types';
import { config, P1_STAKEHOLDER, P1_SELF } from './config';

// ─── Capacity constants ─────────────────────────────────────────────
// Sourced from loops.config.json. Re-read here rather than re-imported
// from lib/tend.ts because tend.ts is `'use client'`-only and cannot
// be imported from server / CLI contexts.
export const P1_STAKEHOLDER_MAX = config.stakeholder.capacityMax;
export const P1_SELF_MAX = config.self.capacityMax;
export const P1_FLAT_CAP = config.priorityCaps.P1Flat;
export const P2_FLAT_CAP = config.priorityCaps.P2Flat;

// ─── Gate reason codes ──────────────────────────────────────────────
export type GateReason =
  | 'capacity_p1_stakeholder_cap'
  | 'capacity_p1_self_cap'
  | 'capacity_p1_flat_cap'
  | 'capacity_p2_flat_cap'
  | 'triage_requires_acceptance'
  | 'close_out_missing_stakeholder'
  | 'duplicate_loop_id'
  | 'already_closed'
  | 'already_accepted'
  | 'snooze_date_in_past'
  | 'loop_not_found';

export type GateResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      reason: GateReason;
      suggestion?: string;
      context?: Record<string, unknown>;
    };

// ─── Counting helpers (mirrored from lib/tend.ts for server use) ────
export function countActiveP1Stakeholder(loops: Loop[]): number {
  return loops.filter((l) => !l.done && l.pLevel === P1_STAKEHOLDER).length;
}

export function countActiveP1Self(loops: Loop[]): number {
  return loops.filter((l) => !l.done && l.pLevel === P1_SELF).length;
}

export function countFlatPriority(
  loops: Loop[],
  priority: TriagePriority,
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

// ─── Capacity gate ──────────────────────────────────────────────────
// Fires when a create or promotion would push a priority bucket past
// its structural ceiling. Two axes:
//   1. Stakeholder pLevel buckets (P1:<stakeholder>, P1:self) — so
//      existing page.tsx create/update flows keep firing at the same
//      thresholds.
//   2. Flat priority caps (P1, P2) — the Triage Gate spec's absolute
//      caps regardless of stakeholder.
//
// `target.pLevel` is the legacy string the caller is trying to write.
// `target.priority` is the new flat-axis value the triage flow cares
// about. Callers supply whichever applies.
//
// The function assumes the call is a genuine promotion: the caller is
// responsible for skipping no-op patches before invoking the gate.
export interface CapacityTarget {
  pLevel?: string | null;
  priority?: TriagePriority | null;
  stakeholder?: string | null;
}

export function checkCapacityGate(
  state: LoopsFile,
  target: CapacityTarget,
): GateResult {
  // Stakeholder-embedded model — fires from createLoop / updateLoop
  // in page.tsx. Both buckets are configurable via loops.config.json.
  if (target.pLevel === P1_STAKEHOLDER) {
    const current = countActiveP1Stakeholder(state.loops);
    if (current >= P1_STAKEHOLDER_MAX) {
      return {
        ok: false,
        reason: 'capacity_p1_stakeholder_cap',
        suggestion:
          "Cancel, change priority to P2, or explicitly override with a reason.",
        context: { current, max: P1_STAKEHOLDER_MAX },
      };
    }
  } else if (target.pLevel === P1_SELF) {
    const current = countActiveP1Self(state.loops);
    if (current >= P1_SELF_MAX) {
      return {
        ok: false,
        reason: 'capacity_p1_self_cap',
        suggestion:
          "Cancel, change priority to P2, or explicitly override with a reason.",
        context: { current, max: P1_SELF_MAX },
      };
    }
  }

  // Flat-axis caps — fire from the triage accept flow (P1 ≤ 8 total,
  // P2 ≤ 20 total regardless of stakeholder).
  if (target.priority === 'P1') {
    const current = countFlatPriority(state.loops, 'P1');
    if (current >= P1_FLAT_CAP) {
      return {
        ok: false,
        reason: 'capacity_p1_flat_cap',
        suggestion:
          "Accept at P2 instead, or free up capacity by dropping / shipping an existing P1.",
        context: { current, max: P1_FLAT_CAP },
      };
    }
  } else if (target.priority === 'P2') {
    const current = countFlatPriority(state.loops, 'P2');
    if (current >= P2_FLAT_CAP) {
      return {
        ok: false,
        reason: 'capacity_p2_flat_cap',
        suggestion:
          "Demote to P3 or drop a stale P2 — the two-week window is full.",
        context: { current, max: P2_FLAT_CAP },
      };
    }
  }

  return { ok: true };
}

// ─── Triage gate ────────────────────────────────────────────────────
// A freshly created loop must land in `triage` status unless the
// caller explicitly marks it as bypassing triage (P0 or refresh-
// origin). The gate fires when a create event tries to skip triage
// without permission.
export function checkTriageGate(opts: {
  skipTriage?: boolean;
  priority?: TriagePriority | null;
  pLevel?: string | null;
}): GateResult {
  if (opts.skipTriage) return { ok: true };
  if (opts.priority === 'P0' || opts.pLevel === 'P0') return { ok: true };
  // For the create path, the applyEvent handler sets status to
  // 'triage' automatically; checkTriageGate is the guardrail for a
  // caller that explicitly tries to set status: 'active'. Currently
  // the only enforcement point is inside applyEvent's `create_loop`
  // handler; this helper exists so a future caller (e.g. the agent
  // skill) can ask "would this land in triage?" before firing.
  return { ok: true };
}

// ─── Close-out gate ─────────────────────────────────────────────────
// Advisory in the UI, but the spec lists `close_out_missing_stakeholder`
// as a concrete reason code. We fire it when the close-out payload
// has no stakeholder_notified field. Everything else stays advisory
// (docs, artifact, follow-through all roll through to applied with
// gaps recorded on the audit entry).
export interface CloseoutPayload {
  docs?: string;
  stakeholder_notified?: string;
  artifact_path?: string;
  follow_through_date?: string;
  note?: string;
}

export function checkCloseOutGate(
  _state: LoopsFile,
  loop: Loop,
  closeout: CloseoutPayload,
): GateResult {
  if (loop.done) {
    return {
      ok: false,
      reason: 'already_closed',
      suggestion: 'Loop is already marked done. No-op.',
    };
  }
  const stakeholder = (closeout.stakeholder_notified ?? '').trim();
  if (stakeholder.length === 0) {
    return {
      ok: false,
      reason: 'close_out_missing_stakeholder',
      suggestion:
        "Pass --stakeholder-notified <name> (or 'self') to record who was told.",
    };
  }
  return { ok: true };
}
