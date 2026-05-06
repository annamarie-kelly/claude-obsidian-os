'use client';

// CapturePopup — centered modal capture surface that replaces the
// older bottom-of-screen CaptureBar. Same trigger surface (`c` key,
// parent state `captureOpen`), same `onCapture(draft)` prop. Unlike
// the bar, the popup lets the user set priority on the spot and
// optionally pick a stakeholder, so a P0/P1 capture can skip the
// triage queue entirely.
//
// Modal shape mirrors CapacityGateModal: scrim with backdrop blur,
// centered card with stop-propagation, Esc to close, click-outside
// to close. After submit the popup STAYS open with the priority pill
// still selected (chained capture pattern from the old CaptureBar) so
// the user can rattle off several captures in a row.

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Loop, TriagePriority, TriageStatus } from '@/lib/types';

const DEFAULT_TAGS = ['task', 'read', 'research', 'idea', 'design'];
const STAKEHOLDER_SELF = 'self';

interface CapturePopupProps {
  open: boolean;
  onClose: () => void;
  onCapture: (draft: Omit<Loop, 'id'>) => void | Promise<void>;
  // From loops.config.json's stakeholder.name. May be empty when the
  // public template hasn't been customized; in that case the
  // stakeholder picker collapses to "self" only.
  stakeholderName?: string;
}

function cleanTag(raw: string): string {
  return raw
    .trim()
    .replace(/^#/, '')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, 32);
}

export function CapturePopup({
  open,
  onClose,
  onCapture,
  stakeholderName,
}: CapturePopupProps) {
  const [text, setText] = useState('');
  const [pLevel, setPLevel] = useState<TriagePriority>('P3');
  const [stakeholder, setStakeholder] = useState<string>(STAKEHOLDER_SELF);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInputOpen, setTagInputOpen] = useState(false);
  const [tagInputValue, setTagInputValue] = useState('');
  const [justCaptured, setJustCaptured] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const tagInputRef = useRef<HTMLInputElement>(null);
  const fadeTimerRef = useRef<number | null>(null);

  const hasStakeholder = !!(stakeholderName && stakeholderName.trim().length > 0);

  // Reset transient state on each open. Priority pill stays at the
  // user's last choice across re-opens within the same session.
  useEffect(() => {
    if (open) {
      setText('');
      setTags([]);
      setTagInputOpen(false);
      setTagInputValue('');
      setJustCaptured(false);
      requestAnimationFrame(() => textRef.current?.focus());
    }
  }, [open]);

  // Esc closes.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Auto-grow textarea between 3 and 5 rows.
  useEffect(() => {
    const el = textRef.current;
    if (!el) return;
    el.style.height = 'auto';
    // ~20px per line at our font size. Cap at ~5 rows worth of growth
    // beyond the min height; the textarea's CSS sets min height.
    el.style.height = `${Math.min(el.scrollHeight, 130)}px`;
  }, [text]);

  // Fade the "captured" indicator after a moment.
  useEffect(() => {
    if (!justCaptured) return;
    if (fadeTimerRef.current != null) window.clearTimeout(fadeTimerRef.current);
    fadeTimerRef.current = window.setTimeout(() => {
      setJustCaptured(false);
    }, 1500);
    return () => {
      if (fadeTimerRef.current != null) window.clearTimeout(fadeTimerRef.current);
    };
  }, [justCaptured]);

  const togglePill = useCallback((tag: string) => {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }, []);

  const openTagInput = useCallback(() => {
    setTagInputOpen(true);
    setTagInputValue('');
    requestAnimationFrame(() => tagInputRef.current?.focus());
  }, []);

  const commitTagInput = useCallback(() => {
    const raw = tagInputValue;
    if (raw.trim()) {
      const fresh = raw
        .split(/[,\s]+/)
        .map(cleanTag)
        .filter(Boolean);
      setTags((prev) => {
        const next = [...prev];
        for (const t of fresh) {
          if (!next.includes(t)) next.push(t);
        }
        return next;
      });
    }
    setTagInputValue('');
    setTagInputOpen(false);
  }, [tagInputValue]);

  const submit = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed) {
      // Empty submit is a no-op so chained capture doesn't get
      // accidentally torn down.
      return;
    }
    const isP1 = pLevel === 'P1';
    const finalPLevel = isP1 ? `P1:${stakeholder}` : pLevel;
    const tagSuffix =
      tags.length > 0 ? '\n\n' + tags.map((t) => `#${t}`).join(' ') : '';
    const now = new Date().toISOString();
    // P0 / P1 skip triage and land active. P2 / P3 enter the triage
    // queue as before. createLoop in app/page.tsx also defaults P0 to
    // active, but we set status explicitly so P1 follows the same
    // path — without this, P1 would still flow through triage.
    const status: TriageStatus =
      pLevel === 'P0' || pLevel === 'P1' ? 'active' : 'triage';
    const draft: Omit<Loop, 'id'> = {
      tier: 'now',
      text: trimmed + tagSuffix,
      pLevel: finalPLevel,
      difficulty: null,
      timeEstimateMinutes: null,
      subGroup: null,
      domain: 'personal',
      source: { file: '00-Inbox/captured.md', line: 1 },
      timeblocks: [],
      done: false,
      updatedAt: now,
      tendSource: 'manual',
      status,
    };
    await onCapture(draft);
    // Chained-capture reset. Priority pill stays at the user's last
    // choice; stakeholder also persists so 5 P1:Boss captures in a
    // row don't make them re-pick on each one.
    setText('');
    setTags([]);
    setTagInputOpen(false);
    setTagInputValue('');
    setJustCaptured(true);
    requestAnimationFrame(() => textRef.current?.focus());
  }, [text, pLevel, stakeholder, tags, onCapture]);

  if (!open) return null;

  const skipsTriage = pLevel === 'P0' || pLevel === 'P1';
  const statusHint = skipsTriage
    ? 'Goes to Backlog (skips triage)'
    : 'Goes to Triage';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Capture"
      className="fixed inset-0 z-[60] flex items-center justify-center px-4"
      onClick={onClose}
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        aria-hidden
      />
      <div
        className="relative w-[520px] max-w-[calc(100vw-32px)] bg-elevated border border-edge rounded-xl shadow-2xl p-5 flex flex-col gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Eyebrow */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-[0.12em] text-ink-ghost">
            Capture
          </span>
          <span className="text-[10px] text-ink-ghost font-mono">
            <kbd className="border border-edge rounded px-1">esc</kbd> close
          </span>
        </div>

        {/* Textarea */}
        <textarea
          ref={textRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
              e.preventDefault();
              void submit();
            }
          }}
          rows={3}
          placeholder="Capture a thought."
          className="w-full text-[13px] text-ink bg-card border border-edge rounded-lg px-3 py-2.5 placeholder:text-ink-ghost/60 focus:outline-none focus:border-[var(--mauve)]/50 focus:ring-2 focus:ring-[var(--mauve)]/15 transition-all leading-relaxed resize-none"
          style={{ minHeight: 78, maxHeight: 130 }}
        />

        {/* Priority pill row + (conditional) stakeholder picker */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1 bg-inset border border-edge rounded-full p-[2px]">
            {(['P0', 'P1', 'P2', 'P3'] as TriagePriority[]).map((p) => {
              const active = pLevel === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPLevel(p)}
                  className={
                    active
                      ? 'text-[10px] leading-none px-2.5 py-1 rounded-full bg-[var(--mauve)]/15 border border-[var(--mauve)] text-mauve-text'
                      : 'text-[10px] leading-none px-2.5 py-1 rounded-full bg-transparent border border-transparent text-ink-ghost hover:text-ink transition-colors'
                  }
                  aria-pressed={active}
                >
                  {p}
                </button>
              );
            })}
          </div>

          {pLevel === 'P1' && (
            <label className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-[0.08em] text-ink-ghost">
                for
              </span>
              <select
                value={stakeholder}
                onChange={(e) => setStakeholder(e.target.value)}
                className="text-[11px] text-ink bg-inset border border-edge rounded-full px-2.5 py-1 focus:outline-none focus:border-[var(--mauve)]/50"
              >
                <option value={STAKEHOLDER_SELF}>self</option>
                {hasStakeholder && (
                  <option value={stakeholderName!}>{stakeholderName}</option>
                )}
              </select>
            </label>
          )}
        </div>

        {/* Tag pills */}
        <div className="flex flex-wrap gap-1.5 items-center">
          {DEFAULT_TAGS.map((t) => {
            const active = tags.includes(t);
            return (
              <button
                key={t}
                type="button"
                onClick={() => togglePill(t)}
                className={
                  active
                    ? 'text-[11px] leading-none px-2.5 py-1 rounded-full bg-[var(--mauve)]/15 border border-[var(--mauve)] text-mauve-text'
                    : 'text-[11px] leading-none px-2.5 py-1 rounded-full bg-transparent border border-edge text-ink-ghost hover:text-ink hover:border-edge-hover transition-colors'
                }
                aria-pressed={active}
              >
                {t}
              </button>
            );
          })}
          {/* Custom user-added tags */}
          {tags
            .filter((t) => !DEFAULT_TAGS.includes(t))
            .map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => togglePill(t)}
                className="text-[11px] leading-none px-2.5 py-1 rounded-full bg-[var(--mauve)]/15 border border-[var(--mauve)] text-mauve-text"
                aria-pressed
              >
                {t}
              </button>
            ))}
          {!tagInputOpen ? (
            <button
              type="button"
              onClick={openTagInput}
              title="Add a custom tag"
              aria-label="Add tag"
              className="text-[11px] leading-none px-2 py-1 rounded-full bg-transparent border border-edge text-ink-ghost hover:text-ink hover:border-edge-hover transition-colors"
            >
              +
            </button>
          ) : (
            <input
              ref={tagInputRef}
              type="text"
              value={tagInputValue}
              onChange={(e) => setTagInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  commitTagInput();
                  // Re-open immediately to chain.
                  setTimeout(() => openTagInput(), 0);
                } else if (e.key === ',' || e.key === ' ') {
                  e.preventDefault();
                  commitTagInput();
                  setTimeout(() => openTagInput(), 0);
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  setTagInputValue('');
                  setTagInputOpen(false);
                  textRef.current?.focus();
                } else if (e.key === 'Backspace' && tagInputValue === '') {
                  // Empty Backspace nukes the most recent custom tag.
                  e.preventDefault();
                  setTags((prev) => {
                    const customs = prev.filter(
                      (t) => !DEFAULT_TAGS.includes(t),
                    );
                    if (customs.length === 0) return prev;
                    const last = customs[customs.length - 1];
                    return prev.filter((t) => t !== last);
                  });
                }
              }}
              onBlur={() => {
                if (tagInputValue.trim()) commitTagInput();
                else setTagInputOpen(false);
              }}
              placeholder="tag..."
              autoComplete="off"
              className="text-[11px] leading-none px-2.5 py-1 w-[100px] rounded-full bg-transparent border border-[var(--mauve)] text-ink placeholder:text-ink-ghost/60 focus:outline-none"
            />
          )}
        </div>

        {/* Status + submit row */}
        <div className="flex items-center justify-between pt-1 border-t border-edge-subtle mt-1">
          <div className="flex items-center gap-1.5 text-[11px] text-ink-ghost">
            <span
              className="w-[6px] h-[6px] rounded-full"
              style={{ background: 'var(--mauve)' }}
              aria-hidden
            />
            <span>
              {justCaptured ? 'captured' : statusHint}
              <span className="ml-1 opacity-60">
                {justCaptured ? ' ->' : ''}
              </span>
            </span>
          </div>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={!text.trim()}
            className="text-[12px] text-ink bg-inset hover:bg-[var(--mauve)]/10 hover:text-mauve-text px-3 py-1.5 rounded-md border-[0.5px] border-edge hover:border-[var(--mauve)]/40 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-inset disabled:hover:text-ink disabled:hover:border-edge transition-all flex items-center gap-2"
          >
            <span>Capture</span>
            <kbd className="text-[10px] font-mono opacity-70 border border-edge rounded px-1">
              {'⌘↵'}
            </kbd>
          </button>
        </div>
      </div>
    </div>
  );
}
