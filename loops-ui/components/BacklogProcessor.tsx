'use client';

// BacklogProcessor: a lightweight card-cycle overlay for walking the
// backlog and quickly reassigning priority / dropping / moving to
// someday. Smaller surface than TriageView — no capacity gates, no
// AI seeds, no history. Just: one card at a time, keyboard mutation,
// prev/next navigation.

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Loop } from '@/lib/types';
import { pPillClass, stripInlineMarkdown } from '@/lib/ui';
import { config, P1_STAKEHOLDER } from '@/lib/config';

type PickItem = { value: string; label: string };

const PRIORITY_OPTIONS: PickItem[] = [
  { value: P1_STAKEHOLDER, label: `P1 · ${config.stakeholder.name}` },
  { value: 'P1:self', label: 'P1 · self' },
  { value: 'P2', label: 'P2' },
  { value: 'P3', label: 'P3' },
];

function splitHeadline(text: string): { headline: string; body: string } {
  const cleaned = stripInlineMarkdown(text).trim();
  const emDash = cleaned.search(/ [—–] | -- /);
  if (emDash > 0 && emDash < 120) {
    return {
      headline: cleaned.slice(0, emDash).trim(),
      body: cleaned.slice(emDash).replace(/^[\s—–-]+/, '').trim(),
    };
  }
  const period = cleaned.search(/\.\s/);
  if (period > 0 && period < 140) {
    return {
      headline: cleaned.slice(0, period + 1).trim(),
      body: cleaned.slice(period + 1).trim(),
    };
  }
  if (cleaned.length <= 140) {
    return { headline: cleaned, body: '' };
  }
  const cut = cleaned.lastIndexOf(' ', 120);
  const at = cut > 60 ? cut : 120;
  return {
    headline: cleaned.slice(0, at).trim() + '…',
    body: cleaned.slice(at).trim(),
  };
}

export function BacklogProcessor({
  loops,
  onUpdateLoop,
  onKill,
  onCloseLoop,
  onClose,
}: {
  loops: Loop[];
  onUpdateLoop: (id: string, patch: Partial<Loop>) => Promise<void>;
  onKill?: (id: string) => void;
  onCloseLoop?: (id: string) => Promise<void>;
  onClose: () => void;
}) {
  // Snapshot the queue on mount so mutations don't reorder under us
  // mid-process. Re-running would be jarring; the user explicitly
  // opened this overlay to process the set visible at that moment.
  const [queue] = useState<string[]>(() => loops.map((l) => l.id));
  const [idx, setIdx] = useState(0);

  const current = useMemo(() => {
    const id = queue[idx];
    return id ? loops.find((l) => l.id === id) ?? null : null;
  }, [queue, idx, loops]);

  const next = useCallback(() => {
    setIdx((i) => Math.min(queue.length - 1, i + 1));
  }, [queue.length]);
  const prev = useCallback(() => {
    setIdx((i) => Math.max(0, i - 1));
  }, []);

  const setPriority = useCallback(
    async (pLevel: string) => {
      if (!current) return;
      await onUpdateLoop(current.id, { pLevel });
    },
    [current, onUpdateLoop],
  );

  const moveSomeday = useCallback(async () => {
    if (!current) return;
    await onUpdateLoop(current.id, { tier: 'someday' });
    next();
  }, [current, onUpdateLoop, next]);

  const drop = useCallback(() => {
    if (!current || !onKill) return;
    onKill(current.id);
    next();
  }, [current, onKill, next]);

  const markDone = useCallback(async () => {
    if (!current || !onCloseLoop) return;
    await onCloseLoop(current.id);
    next();
  }, [current, onCloseLoop, next]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }
      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          onClose();
          return;
        case 'ArrowRight':
        case 'ArrowDown':
        case ' ':
          e.preventDefault();
          next();
          return;
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          prev();
          return;
        case '1':
          e.preventDefault();
          void setPriority(P1_STAKEHOLDER).then(next);
          return;
        case '2':
          e.preventDefault();
          void setPriority('P1:self').then(next);
          return;
        case '3':
          e.preventDefault();
          void setPriority('P2').then(next);
          return;
        case '4':
          e.preventDefault();
          void setPriority('P3').then(next);
          return;
        case 'm':
        case 'M':
          e.preventDefault();
          void moveSomeday();
          return;
        case 'd':
        case 'D':
          e.preventDefault();
          drop();
          return;
        case 'x':
        case 'X':
        case 'Enter':
          e.preventDefault();
          void markDone();
          return;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, next, prev, setPriority, moveSomeday, drop, markDone]);

  if (queue.length === 0) {
    return null;
  }

  const { headline, body } = current
    ? splitHeadline(current.text)
    : { headline: '', body: '' };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(0,0,0,0.55)]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl mx-6 rounded-xl bg-card border-[0.5px] border-edge shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-5 pb-3 flex items-center justify-between border-b border-edge-subtle">
          <div className="text-[10px] uppercase tracking-[0.12em] text-ink-ghost font-mono">
            Process backlog
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-ink-soft tabular-nums font-mono">
              {idx + 1} of {queue.length}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="text-[11px] text-ink-ghost hover:text-ink-soft transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {current ? (
          <div className="px-8 pt-6 pb-5">
            <h2 className="text-[22px] text-ink leading-snug mb-3">
              {headline}
            </h2>
            {body && (
              <p className="text-[12px] text-ink-soft leading-relaxed line-clamp-3 mb-5 whitespace-pre-wrap">
                {body}
              </p>
            )}

            <div className="flex items-center gap-2 mb-6">
              <span className="text-[10px] text-ink-ghost uppercase tracking-wider">
                current
              </span>
              {current.pLevel ? (
                <span
                  className={`text-[10px] font-mono px-2 py-[2px] rounded ${pPillClass(current.pLevel)}`}
                >
                  {current.pLevel}
                </span>
              ) : (
                <span className="text-[11px] text-ink-ghost italic">
                  no priority
                </span>
              )}
              <span className="text-ink-ghost opacity-40">·</span>
              <span className="text-[10px] text-ink-ghost capitalize">
                {current.tier}
              </span>
            </div>

            {/* Priority quick-set grid */}
            <div className="grid grid-cols-4 gap-2 mb-3">
              {PRIORITY_OPTIONS.map((opt, i) => {
                const isCurrent = current.pLevel === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      void setPriority(opt.value).then(next);
                    }}
                    className={`px-3 py-2 rounded-md border-[0.5px] text-[12px] transition-colors ${
                      isCurrent
                        ? 'border-[var(--mauve)] bg-mauve-fill text-mauve-text'
                        : 'border-edge text-ink-soft hover:border-[var(--mauve)] hover:bg-mauve-fill'
                    }`}
                  >
                    <span className="font-mono text-ink-ghost mr-1.5">
                      {i + 1}
                    </span>
                    {opt.label}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2">
              {onCloseLoop && (
                <button
                  type="button"
                  onClick={() => void markDone()}
                  className="flex-1 px-3 py-2 rounded-md border-[0.5px] border-sage bg-sage-fill text-sage-text text-[12px] hover:brightness-110 transition"
                >
                  <span className="font-mono text-ink-ghost mr-1.5">X</span>
                  Done
                </button>
              )}
              <button
                type="button"
                onClick={() => void moveSomeday()}
                className="flex-1 px-3 py-2 rounded-md border-[0.5px] border-edge text-[12px] text-ink-soft hover:border-[var(--tan)] hover:bg-tan-fill transition-colors"
              >
                <span className="font-mono text-ink-ghost mr-1.5">M</span>
                Someday
              </button>
              {onKill && (
                <button
                  type="button"
                  onClick={drop}
                  className="flex-1 px-3 py-2 rounded-md border-[0.5px] border-edge text-[12px] text-ink-soft hover:border-[var(--rose)] hover:bg-rose-fill transition-colors"
                >
                  <span className="font-mono text-ink-ghost mr-1.5">D</span>
                  Drop
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="px-8 py-12 text-center text-[13px] text-ink-faint">
            Done — no more loops in this queue.
          </div>
        )}

        {/* Footer / nav */}
        <div className="px-6 py-3 border-t border-edge-subtle flex items-center justify-between text-[10px] text-ink-ghost tabular-nums font-mono">
          <button
            type="button"
            onClick={prev}
            disabled={idx === 0}
            className="hover:text-ink-soft disabled:opacity-30 disabled:hover:text-ink-ghost transition-colors"
          >
            ← prev
          </button>
          <span>
            <kbd>1–4</kbd> priority · <kbd>X</kbd>/<kbd>↵</kbd> done ·{' '}
            <kbd>M</kbd> someday · <kbd>D</kbd> drop · <kbd>→</kbd> next ·{' '}
            <kbd>esc</kbd> close
          </span>
          <button
            type="button"
            onClick={next}
            disabled={idx >= queue.length - 1}
            className="hover:text-ink-soft disabled:opacity-30 disabled:hover:text-ink-ghost transition-colors"
          >
            next →
          </button>
        </div>
      </div>
    </div>
  );
}
