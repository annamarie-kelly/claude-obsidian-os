'use client';

// CapacityGateModal: blocking modal that appears when a P1:<stakeholder>
// or P1:self create would push the active count past the structural
// ceiling (P1_STAKEHOLDER_MAX / P1_SELF_MAX in lib/tend.ts).
//
// The user must type at least 10 characters of reason before the
// "Proceed anyway" button enables. "Cancel" closes the modal and
// abandons the pending loop.
//
// Modal pattern mirrors SearchOverlay: fixed inset-0 scrim + centered
// rounded card with stop-propagation. No emoji in any user-visible
// text — the over-capacity state is signalled via a rose-tinted
// header and a CSS-drawn dot.

import { useEffect, useRef, useState } from 'react';
import { config, P1_STAKEHOLDER } from '@/lib/config';

const MIN_REASON_LENGTH = 10;

// Capacity-gate kind. `P1:stakeholder` / `P1:self` are the
// stakeholder-embedded priority buckets. `P1-cap` and `P2-cap` are
// flat-model thresholds (P1 ≤ 8 total, P2 ≤ 20 total) and fire from
// the triage accept flow.
export type CapacityGateKind = 'P1:stakeholder' | 'P1:self' | 'P1-cap' | 'P2-cap';

export function CapacityGateModal({
  open,
  kind,
  currentCount,
  max,
  pendingTitle,
  onCancel,
  onProceed,
}: {
  open: boolean;
  kind: CapacityGateKind;
  currentCount: number;
  max: number;
  pendingTitle: string;
  onCancel: () => void;
  onProceed: (reason: string) => void | Promise<void>;
}) {
  const [reason, setReason] = useState('');
  const textRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setReason('');
      requestAnimationFrame(() => textRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  const trimmed = reason.trim();
  const canProceed = trimmed.length >= MIN_REASON_LENGTH;
  const kindLabel =
    kind === 'P1:stakeholder'
      ? P1_STAKEHOLDER
      : kind === 'P1:self'
        ? 'P1:self (capacity protection)'
        : kind === 'P1-cap'
          ? 'P1 (this week)'
          : 'P2 (this cycle)';
  const ceilingCopy =
    kind === 'P1:stakeholder'
      ? `${config.stakeholder.name}'s priority ceiling is ${max} active loops. You have ${currentCount}. Adding this one means one of the existing ones won't get real attention.`
      : kind === 'P1:self'
        ? `Your own P1 ceiling is ${max} active loops. You have ${currentCount}. Adding this one means one of the existing ones won't get real attention.`
        : kind === 'P1-cap'
          ? `Your P1 cap is ${max} active loops for the week. You have ${currentCount}. Accepting this one means something in P1 isn't really P1.`
          : `Your P2 cap is ${max} active loops for the cycle. You have ${currentCount}. Accepting this one pushes past what a two-week window can hold.`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Capacity gate"
      className="fixed inset-0 z-[60] flex items-start justify-center pt-[14vh] px-4"
      onClick={onCancel}
    >
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" aria-hidden />
      <div
        className="relative w-[520px] max-w-full max-h-[76vh] bg-elevated border border-edge rounded-xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-5 pb-4 border-b border-edge-subtle">
          <div className="flex items-center gap-2 mb-2">
            <span
              className="w-[8px] h-[8px] rounded-full"
              style={{ background: 'var(--rose)' }}
              aria-hidden
            />
            <span className="text-[10px] uppercase tracking-[0.12em] text-rose-text">
              Capacity gate
            </span>
          </div>
          <div className="text-[15px] text-ink font-medium leading-snug">
            Over the {kindLabel} ceiling.
          </div>
          <div className="text-[12px] text-ink-soft leading-relaxed mt-2">
            {ceilingCopy}
          </div>
          {pendingTitle && (
            <div className="text-[11px] text-ink-faint italic mt-3 leading-relaxed">
              Pending: &ldquo;{pendingTitle}&rdquo;
            </div>
          )}
        </div>

        <div className="px-5 py-4 flex flex-col gap-2">
          <label className="text-[10px] uppercase tracking-[0.08em] text-ink-ghost">
            Why is this one worth the override?
          </label>
          <textarea
            ref={textRef}
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && canProceed) {
                e.preventDefault();
                onProceed(trimmed);
              }
            }}
            placeholder="At least 10 characters — this will be logged."
            className="w-full text-[12px] text-ink bg-card border border-edge rounded-lg px-3 py-2.5 placeholder:text-ink-ghost/60 focus:outline-none focus:border-[var(--rose)]/50 focus:ring-2 focus:ring-[var(--rose)]/15 transition-all leading-relaxed"
          />
          <div className="flex items-center justify-between text-[10px] text-ink-ghost font-mono">
            <span>
              {trimmed.length}/{MIN_REASON_LENGTH}+ chars
            </span>
            <span>
              <kbd className="border border-edge rounded px-1">⌘↵</kbd> proceed
              <span className="mx-1.5 opacity-40">·</span>
              <kbd className="border border-edge rounded px-1">esc</kbd> cancel
            </span>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-edge-subtle flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="text-[12px] text-ink-soft hover:text-ink px-3 py-1.5 rounded-md hover:bg-inset transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onProceed(trimmed)}
            disabled={!canProceed}
            className="text-[12px] text-ink bg-inset hover:bg-rose-fill hover:text-rose-text px-3 py-1.5 rounded-md border-[0.5px] border-edge hover:border-[var(--rose)]/40 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-inset disabled:hover:text-ink disabled:hover:border-edge transition-all"
          >
            Proceed anyway
          </button>
        </div>
      </div>
    </div>
  );
}
