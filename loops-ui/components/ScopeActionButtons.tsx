'use client';

// ScopeActionButtons: rendered inside DetailDrawer when a loop has
// `scope_questions`. Each question can be Acknowledged (stamps a
// timestamp) or "Log boundary" (opens an inline text input; on save
// writes to the boundary log and attaches a blocker_reason on the
// loop).
//
// Visual rules:
//   - unacknowledged: regular text, dot = berry
//   - acknowledged: opacity 0.5 + line-through + dot = sage
//   - NO emoji — all dots/icons drawn via CSS spans

import { useState } from 'react';
import type { Loop, ScopeQuestion } from '@/lib/types';
import { appendBoundaryLog } from '@/lib/tend';

export function ScopeActionButtons({
  loop,
  onUpdateLoop,
  disabled,
}: {
  loop: Loop;
  onUpdateLoop: (id: string, patch: Partial<Loop>) => Promise<void>;
  disabled?: boolean;
}) {
  const questions = loop.scope_questions;
  const [boundaryFor, setBoundaryFor] = useState<number | null>(null);
  const [draft, setDraft] = useState('');

  if (!questions || questions.length === 0) return null;

  const acknowledge = async (idx: number) => {
    const next = questions.map((q, i) =>
      i === idx ? { ...q, acknowledged_at: new Date().toISOString() } : q,
    );
    await onUpdateLoop(loop.id, { scope_questions: next });
    appendBoundaryLog({
      type: 'scope_acknowledge',
      context: `Acknowledged scope question on "${loop.text}"`,
      reason: questions[idx].text,
      loop_id: loop.id,
    });
  };

  const logBoundary = async (idx: number, reason: string) => {
    const trimmed = reason.trim();
    if (trimmed.length === 0) return;
    await onUpdateLoop(loop.id, { blocker_reason: trimmed });
    appendBoundaryLog({
      type: 'scope_boundary',
      context: `Logged boundary on "${loop.text}"`,
      reason: `${questions[idx].text} — ${trimmed}`,
      loop_id: loop.id,
    });
    setBoundaryFor(null);
    setDraft('');
  };

  return (
    <div className="px-5 pt-3 pb-3 border-t border-edge-subtle">
      <div className="text-[10px] uppercase tracking-[0.08em] text-ink-ghost mb-2">
        Scope questions
      </div>
      <ul className="flex flex-col gap-2">
        {questions.map((q: ScopeQuestion, idx: number) => {
          const ack = !!q.acknowledged_at;
          const editing = boundaryFor === idx;
          return (
            <li
              key={idx}
              className="flex flex-col gap-1.5"
              style={ack ? { opacity: 0.5 } : undefined}
            >
              <div className="flex items-start gap-2">
                <span
                  className="w-[6px] h-[6px] rounded-full shrink-0 mt-1.5"
                  style={{
                    background: ack ? 'var(--sage)' : 'var(--berry)',
                  }}
                  aria-hidden
                />
                <span
                  className="flex-1 text-[12px] text-ink leading-relaxed"
                  style={ack ? { textDecoration: 'line-through' } : undefined}
                >
                  {q.text}
                </span>
              </div>
              {!ack && !editing && !disabled && (
                <div className="pl-[14px] flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => acknowledge(idx)}
                    className="text-[11px] text-ink-soft hover:text-ink bg-inset hover:bg-sage-fill hover:text-sage-text px-2 py-0.5 rounded-md border-[0.5px] border-edge hover:border-[var(--sage)]/40 transition-colors"
                  >
                    Acknowledge
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBoundaryFor(idx);
                      setDraft('');
                    }}
                    className="text-[11px] text-ink-soft hover:text-ink bg-inset hover:bg-berry-fill hover:text-berry-text px-2 py-0.5 rounded-md border-[0.5px] border-edge hover:border-[var(--berry)]/40 transition-colors"
                  >
                    Log boundary
                  </button>
                </div>
              )}
              {editing && (
                <div className="pl-[14px] flex flex-col gap-1.5">
                  <input
                    type="text"
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        logBoundary(idx, draft);
                      } else if (e.key === 'Escape') {
                        e.preventDefault();
                        setBoundaryFor(null);
                        setDraft('');
                      }
                    }}
                    placeholder="Why is this a boundary? (Enter to save)"
                    className="w-full text-[11px] text-ink bg-card border border-edge rounded-md px-2 py-1 placeholder:text-ink-ghost/60 focus:outline-none focus:border-[var(--berry)]/50"
                  />
                  <div className="flex items-center gap-2 text-[10px] text-ink-ghost font-mono">
                    <span>
                      <kbd className="border border-edge rounded px-1">↵</kbd> save
                      <span className="mx-1.5 opacity-40">·</span>
                      <kbd className="border border-edge rounded px-1">esc</kbd> cancel
                    </span>
                  </div>
                </div>
              )}
              {ack && (
                <div className="pl-[14px] text-[10px] text-ink-ghost font-mono tabular-nums">
                  acknowledged {new Date(q.acknowledged_at!).toLocaleString()}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
