'use client';

// Triage gate — deterministic heuristic seeder.
//
// The spec calls for "AI seeding" but v1 is a pure signal-matching
// heuristic that runs locally. No LLM call, no browser → Claude
// bridge, no network. Every recommendation is reproducible given the
// same input, which matters for two reasons:
//   1. The user is training their intuition against a stable
//      baseline — reviewing an AI's noisy outputs teaches the wrong
//      thing.
//   2. The match-rate metric in the Reflection view is only
//      meaningful if the seeder doesn't drift between sessions.
//
// When a real LLM call replaces this, the public signature stays
// identical so the UI doesn't care.

import type {
  Loop,
  TriagePriority,
  TriageRecommendation,
} from './types';

// Canonical stakeholder matcher list. Built at startup from
// loops.config.json — the primary stakeholder plus any entries in
// `scannerStakeholders`. Each keyword is escaped and wrapped in word
// boundaries, so `keyword: "alice"` matches whole-word "alice" /
// "Alice" / "ALICE" but not "Alicent". Add extra patterns by editing
// loops.config.json and restarting the dev server.
import { config } from './config';

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const STAKEHOLDER_MATCHERS: { name: string; patterns: RegExp[] }[] = [
  {
    name: config.stakeholder.name,
    patterns: [new RegExp(`\\b${escapeRegex(config.stakeholder.tag.toLowerCase())}\\b`, 'i')],
  },
  ...config.scannerStakeholders.map((s) => ({
    name: s.name,
    patterns: [new RegExp(`\\b${escapeRegex(s.keyword.toLowerCase())}\\b`, 'i')],
  })),
];

const BLOCKED_PHRASES: RegExp[] = [
  /\bwaiting on\b/i,
  /\bwaiting for\b/i,
  /@waiting\b/i,
  /\bblocked by\b/i,
  /\bstuck on\b/i,
  /\bawaiting\b/i,
];

const SIZE_KEYWORDS = [
  'migration',
  'refactor',
  'audit',
  'pipeline',
  'overhaul',
  'rearchitect',
  'rewrite',
];

const STALE_DROP_DAYS = 60;
const STALE_SOMEDAY_DAYS = 30;
const FRESH_ACCEPT_HOURS = 48;

export interface SeedContext {
  // Current accepted backlog load. Used to bias the recommended
  // priority away from full buckets.
  p1Count: number;
  p2Count: number;
  p3Count: number;
  p1Cap: number;
  p2Cap: number;
  // ISO timestamp "now" — injected so tests are deterministic.
  now?: string;
  // Full loop list for duplicate detection. Optional because small
  // callers (unit tests) may not have it.
  allLoops?: Loop[];
}

function daysBetween(a: string, b: string): number {
  const ta = new Date(a).getTime();
  const tb = new Date(b).getTime();
  if (!Number.isFinite(ta) || !Number.isFinite(tb)) return 0;
  return Math.abs(ta - tb) / (1000 * 60 * 60 * 24);
}

function hoursBetween(a: string, b: string): number {
  return daysBetween(a, b) * 24;
}

function detectStakeholder(text: string): string | null {
  for (const { name, patterns } of STAKEHOLDER_MATCHERS) {
    for (const p of patterns) if (p.test(text)) return name;
  }
  return null;
}

function hasBlockedPhrase(text: string): boolean {
  return BLOCKED_PHRASES.some((p) => p.test(text));
}

function hasSizeKeyword(text: string): string | null {
  const lower = text.toLowerCase();
  for (const kw of SIZE_KEYWORDS) if (lower.includes(kw)) return kw;
  return null;
}

// Rough word-overlap similarity. Same shape as the server's fuzzy
// reconciler — kept local so the seeder stays self-contained.
// Fuzzy-match helpers are shared with the scanner / reconciler so
// the 0.7 threshold means the same thing everywhere.
import { similarity } from './fuzzy-match';

function findDuplicate(loop: Loop, all: Loop[] | undefined): Loop | null {
  if (!all) return null;
  let best: { loop: Loop; score: number } | null = null;
  for (const other of all) {
    if (other.id === loop.id) continue;
    if (other.done) continue;
    if (other.status === 'dropped') continue;
    const s = similarity(loop.text, other.text);
    if (s >= 0.8 && (!best || s > best.score)) best = { loop: other, score: s };
  }
  return best?.loop ?? null;
}

// Core seeder — pure function from (loop, context) to
// TriageRecommendation. Export shape matches the spec so swapping in
// a real LLM call later is trivial.
export function seedLoop(loop: Loop, context: SeedContext): TriageRecommendation {
  const now = context.now ?? new Date().toISOString();
  const lastTouched = loop.updatedAt ?? now;
  const ageDays = daysBetween(now, lastTouched);
  const ageHours = hoursBetween(now, lastTouched);
  const combinedText = `${loop.text ?? ''} ${loop.subGroup ?? ''} ${
    loop.notes?.map((n) => n.text).join(' ') ?? ''
  }`;

  const signals: string[] = [];
  const matchedStakeholder = detectStakeholder(combinedText);
  const blockedPhrase = hasBlockedPhrase(combinedText);
  const sizeKeyword = hasSizeKeyword(combinedText);
  const hasLinear = !!loop.linear_ticket_id;
  const duplicate = findDuplicate(loop, context.allLoops);

  // ── Step 1: disposition lean ───────────────────────────────────
  let disposition: TriageRecommendation['suggested_disposition'] = 'accept';
  let reasoning = '';

  if (duplicate) {
    disposition = 'drop';
    reasoning = `Possible duplicate of "${duplicate.text.slice(0, 60)}".`;
    signals.push('duplicate-match');
  } else if (blockedPhrase) {
    disposition = 'snooze';
    reasoning = 'Mentions waiting or blocked — snoozing pending the blocker.';
    signals.push('blocked-phrase');
  } else if (ageDays >= STALE_DROP_DAYS) {
    disposition = 'drop';
    reasoning = `${Math.round(ageDays)} days stale. If it mattered it would have surfaced.`;
    signals.push(`stale-${Math.round(ageDays)}d`);
  } else if (ageDays >= STALE_SOMEDAY_DAYS) {
    disposition = 'someday';
    reasoning = `${Math.round(ageDays)} days stale — parking in Someday for the monthly review.`;
    signals.push(`stale-${Math.round(ageDays)}d`);
  } else if (ageHours <= FRESH_ACCEPT_HOURS) {
    disposition = 'accept';
    reasoning = 'Freshly captured — you just thought of this, worth a look.';
    signals.push('fresh-capture');
  } else {
    disposition = 'accept';
    reasoning = 'Recent enough to keep moving; no stale or blocked signals.';
  }

  // ── Step 2: priority recommendation (only if accepting) ───────
  //
  // The heuristic never recommends P0 (reserved for on-fire) and
  // never auto-recommends P1 just because a stakeholder was named
  // (per spec: stakeholder rank is NOT auto-priority). So this
  // function only ever emits P2 or P3 for the seeded case. A future
  // LLM seeder can widen the range freely.
  let suggested_priority: TriagePriority | undefined;
  if (disposition === 'accept') {
    let priority: 'P2' | 'P3' = 'P3';
    if (hasLinear) {
      priority = 'P2';
      signals.push('linear-linked');
    }
    if (matchedStakeholder && matchedStakeholder !== 'Self') {
      priority = 'P2';
      signals.push(`stakeholder-${matchedStakeholder}`);
    }
    if (sizeKeyword) {
      // Big work never lives on P2 in v1 — it's either accepted as
      // the bigger project it is (user overrides up) or parked as
      // P3 until it gets broken down.
      priority = 'P3';
      signals.push(`size-${sizeKeyword}`);
    }
    if (priority === 'P2' && context.p2Count >= context.p2Cap) {
      priority = 'P3';
      reasoning += ` P2 is at ${context.p2Count}/${context.p2Cap} — recommending P3.`;
      signals.push('p2-saturated');
    }
    suggested_priority = priority;
  }

  // ── Step 3: confidence ────────────────────────────────────────
  // High: multiple strong signals agree.
  // Medium: one strong signal.
  // Low: title-only, no meaningful signals.
  let confidence: TriageRecommendation['confidence'] = 'low';
  const strongSignalCount =
    (hasLinear ? 1 : 0) +
    (matchedStakeholder ? 1 : 0) +
    (blockedPhrase ? 1 : 0) +
    (ageDays >= STALE_DROP_DAYS ? 1 : 0) +
    (duplicate ? 1 : 0);
  if (strongSignalCount >= 2) confidence = 'high';
  else if (strongSignalCount === 1) confidence = 'medium';

  return {
    suggested_disposition: disposition,
    suggested_priority,
    suggested_stakeholder: matchedStakeholder,
    confidence,
    reasoning: reasoning.trim(),
    signals,
    seeded_at: now,
  };
}

// Batch helper used by the TriageView's loading flow. Processes a
// slice of loops and returns (loop id → recommendation) so the
// caller can patch them into state and persist.
export function seedBatch(
  loops: Loop[],
  context: SeedContext,
): Map<string, TriageRecommendation> {
  const out = new Map<string, TriageRecommendation>();
  for (const l of loops) out.set(l.id, seedLoop(l, context));
  return out;
}
