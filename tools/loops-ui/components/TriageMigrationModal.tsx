'use client';

// TriageMigrationModal — one-time prompt on first launch after the
// Triage Gate ships. Detects pre-existing loops (status !== triage,
// no triage_decision) and offers two paths:
//
//   1. "Seed & review" — flip them all to triage so they run through
//      the normal seeder + card flow. Progress persists because each
//      decision is written back to loops.json.
//   2. "Accept all as P3" — bulk-set pre-existing loops to
//      status=active, priority=P3, stakeholder untouched. The escape
//      hatch for "I don't have 2 hours."
//
// Flag lives in localStorage so the modal never appears twice. This
// is not the capacity gate, it's a migration prompt — dismissing it
// without choosing still marks it as seen.

import { useEffect, useMemo, useState } from 'react';
import type { Loop } from '@/lib/types';

const LS_MIGRATION_SEEN = 'loops-ui:tend:triage_migration_seen';

export function TriageMigrationModal({
  loops,
  onBulkUpdate,
}: {
  loops: Loop[];
  onBulkUpdate: (patches: { id: string; patch: Partial<Loop> }[]) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  // Anything that isn't already triaged and wasn't already closed.
  const candidates = useMemo(
    () =>
      loops.filter(
        (l) =>
          !l.done &&
          l.status !== 'triage' &&
          l.status !== 'someday' &&
          l.status !== 'dropped' &&
          l.status !== 'completed' &&
          !l.triage_decision,
      ),
    [loops],
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let seen = false;
    try {
      seen = window.localStorage.getItem(LS_MIGRATION_SEEN) === '1';
    } catch {}
    if (!seen && candidates.length > 0) setOpen(true);
  }, [candidates.length]);

  const markSeen = () => {
    try {
      window.localStorage.setItem(LS_MIGRATION_SEEN, '1');
    } catch {}
    setOpen(false);
  };

  const handleSeedAndReview = async () => {
    setBusy(true);
    await onBulkUpdate(
      candidates.map((l) => ({
        id: l.id,
        patch: { status: 'triage' },
      })),
    );
    setBusy(false);
    markSeen();
  };

  const handleAcceptAll = async () => {
    setBusy(true);
    await onBulkUpdate(
      candidates.map((l) => ({
        id: l.id,
        patch: {
          status: 'active',
          priority: l.priority ?? 'P3',
          triage_decision: {
            disposition: 'accept',
            priority: l.priority ?? 'P3',
            stakeholder: l.stakeholder ?? null,
            matched_ai: false,
            decided_at: new Date().toISOString(),
          },
        },
      })),
    );
    setBusy(false);
    markSeen();
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Triage gate migration"
      className="fixed inset-0 z-[70] flex items-start justify-center pt-[12vh] px-4"
    >
      <div className="absolute inset-0 bg-black/35 backdrop-blur-[3px]" aria-hidden />
      <div className="relative w-[560px] max-w-full max-h-[80vh] bg-elevated border border-edge rounded-xl shadow-2xl flex flex-col overflow-hidden">
        <div className="px-6 pt-6 pb-4 border-b border-edge-subtle">
          <div className="text-[10px] uppercase tracking-[0.12em] text-ink-ghost mb-2">
            Triage gate migration
          </div>
          <h2 className="text-[16px] text-ink font-medium leading-snug">
            You have {candidates.length} loops that predate the triage gate.
          </h2>
          <p className="text-[12px] text-ink-soft leading-relaxed mt-2">
            These need to be processed before the gate can work properly.
            Triage separates capture from commitment so your active backlog
            only contains work you&apos;ve explicitly accepted.
          </p>
        </div>

        <div className="px-6 py-4 flex flex-col gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={handleSeedAndReview}
            className="text-left p-4 rounded-lg bg-card border border-edge hover:border-[var(--sage)]/50 hover:bg-sage-fill/40 transition-all disabled:opacity-40"
          >
            <div className="text-[13px] text-ink font-medium mb-1">
              Seed and review
            </div>
            <div className="text-[11px] text-ink-soft leading-relaxed">
              The heuristic analyzes each loop and seeds a recommendation.
              You process at your own pace across sessions; progress is
              saved after every card.
            </div>
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={handleAcceptAll}
            className="text-left p-4 rounded-lg bg-card border border-edge hover:border-[var(--slate)]/50 hover:bg-slate-fill/40 transition-all disabled:opacity-40"
          >
            <div className="text-[13px] text-ink font-medium mb-1">
              Accept all as P3
            </div>
            <div className="text-[11px] text-ink-soft leading-relaxed">
              Bulk-accept everything into the backlog at P3. Re-prioritize
              later. The escape hatch for &ldquo;I don&apos;t have two hours
              right now.&rdquo;
            </div>
          </button>
        </div>

        <div className="px-6 py-3 border-t border-edge-subtle flex items-center justify-end">
          <button
            type="button"
            onClick={markSeen}
            disabled={busy}
            className="text-[11px] text-ink-ghost hover:text-ink-soft px-3 py-1.5 rounded hover:bg-inset transition-colors disabled:opacity-40"
          >
            Dismiss (decide later)
          </button>
        </div>
      </div>
    </div>
  );
}
