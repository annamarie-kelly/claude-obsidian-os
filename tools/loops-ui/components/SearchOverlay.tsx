'use client';

// Cmd+K / Ctrl+K global search overlay.
// Centered modal, instant fuzzy-ish substring filter across all loops
// (including Someday), grouped by tier. Arrow keys navigate, Enter
// selects — which opens the existing Detail drawer via onPick.

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Loop } from '@/lib/types';
import { TIER_META, formatMinutes } from '@/lib/types';
import { pLevelRank, pPillClass } from '@/lib/ui';
import { renderInlineMarkdown } from '@/lib/markdown';

export function SearchOverlay({
  open,
  loops,
  onClose,
  onPick,
}: {
  open: boolean;
  loops: Loop[];
  onClose: () => void;
  onPick: (id: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Reset query + focus input each time the overlay opens.
  useEffect(() => {
    if (open) {
      setQuery('');
      setCursor(0);
      // Focus after paint so the transform doesn't swallow focus.
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [open]);

  type ScoredResult = {
    loop: Loop;
    // When the match landed on a note, store a clipped snippet so the
    // result row can show WHY it matched.
    noteSnippet: string | null;
  };

  const results: ScoredResult[] = useMemo(() => {
    const active = loops.filter((l) => !l.done);
    const q = query.trim().toLowerCase();

    // Empty query: return everything (title-matched, no snippet).
    if (!q) {
      return active.map((l) => ({ loop: l, noteSnippet: null }));
    }

    const matched: ScoredResult[] = [];
    for (const l of active) {
      const titleHay = `${l.text} ${l.pLevel ?? ''} ${l.subGroup ?? ''}`.toLowerCase();
      if (titleHay.includes(q)) {
        matched.push({ loop: l, noteSnippet: null });
        continue;
      }
      // Fall through: try the note content. Finds the first non-system
      // note whose text contains the query and keeps a ~80-char snippet
      // centered on the match.
      const hit = (l.notes ?? []).find(
        (n) => !n.system && n.text.toLowerCase().includes(q),
      );
      if (hit) {
        const lowerText = hit.text.toLowerCase();
        const hitIdx = lowerText.indexOf(q);
        const start = Math.max(0, hitIdx - 20);
        const end = Math.min(hit.text.length, hitIdx + q.length + 40);
        let snippet = hit.text.slice(start, end).replace(/\s+/g, ' ').trim();
        if (start > 0) snippet = '…' + snippet;
        if (end < hit.text.length) snippet = snippet + '…';
        matched.push({ loop: l, noteSnippet: snippet });
      }
    }

    // Sort: title matches first (noteSnippet null), then note matches,
    // within each group by tier → P-level → text.
    const TIER_ORDER: Record<string, number> = { now: 0, soon: 1, someday: 2 };
    matched.sort((a, b) => {
      if ((a.noteSnippet == null) !== (b.noteSnippet == null)) {
        return a.noteSnippet == null ? -1 : 1;
      }
      const ta = TIER_ORDER[a.loop.tier] ?? 9;
      const tb = TIER_ORDER[b.loop.tier] ?? 9;
      if (ta !== tb) return ta - tb;
      const pa = pLevelRank(a.loop.pLevel);
      const pb = pLevelRank(b.loop.pLevel);
      if (pa !== pb) return pa - pb;
      return a.loop.text.localeCompare(b.loop.text);
    });
    return matched.slice(0, 40);
  }, [loops, query]);

  // Clamp cursor when results change.
  useEffect(() => {
    if (cursor >= results.length) setCursor(Math.max(0, results.length - 1));
  }, [results, cursor]);

  // Keep the highlighted row in view as the cursor moves.
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-idx="${cursor}"]`,
    );
    el?.scrollIntoView({ block: 'nearest' });
  }, [cursor]);

  const pick = (id: string) => {
    onPick(id);
    onClose();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCursor((c) => Math.min(results.length - 1, c + 1));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor((c) => Math.max(0, c - 1));
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const target = results[cursor];
      if (target) pick(target.loop.id);
      return;
    }
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-label="Search loops"
      className="fixed inset-0 z-[60] flex justify-center pt-[16vh] px-4"
      onClick={onClose}
    >
      {/* Scrim */}
      <div className="absolute inset-0 bg-black/25 backdrop-blur-[2px]" aria-hidden />
      {/* Modal */}
      <div
        className="relative w-[560px] max-w-full max-h-[60vh] bg-elevated border border-edge rounded-xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-edge-subtle">
          <span className="text-ink-ghost text-[13px]" aria-hidden>
            ⌕
          </span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setCursor(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="Search loops…"
            className="flex-1 bg-transparent border-none outline-none text-[14px] text-ink placeholder:text-ink-ghost"
          />
          <span className="text-[10px] text-ink-ghost font-mono border border-edge rounded px-1.5 py-0.5">
            esc
          </span>
        </div>
        <div
          ref={listRef}
          className="flex-1 min-h-0 overflow-y-auto scrollbar-subtle py-1"
        >
          {results.length === 0 ? (
            <div className="px-4 py-10 text-center text-[12px] text-ink-ghost italic">
              {query ? `no loops match "${query}"` : 'no active loops'}
            </div>
          ) : (
            results.map(({ loop, noteSnippet }, idx) => {
              const active = idx === cursor;
              return (
                <button
                  key={loop.id}
                  data-idx={idx}
                  type="button"
                  onMouseEnter={() => setCursor(idx)}
                  onClick={() => pick(loop.id)}
                  className={`w-full text-left flex flex-col gap-1 px-3 py-2 mx-1 rounded-md transition-colors ${
                    active ? 'bg-inset' : 'hover:bg-inset/60'
                  }`}
                >
                  <span className="flex items-center gap-3 w-full">
                    <span className="text-[9px] uppercase tracking-wider text-ink-ghost w-14 shrink-0 font-mono">
                      {TIER_META[loop.tier].label.toLowerCase()}
                    </span>
                    <span className="flex-1 min-w-0 text-[12px] text-ink truncate">
                      {renderInlineMarkdown(loop.text)}
                    </span>
                    {noteSnippet && (
                      <span
                        className="text-[9px] font-mono px-1.5 py-[1px] rounded shrink-0 bg-mauve-fill text-mauve-text"
                        title="Matched in a note"
                      >
                        note
                      </span>
                    )}
                    {loop.pLevel && (
                      <span
                        className={`text-[10px] font-mono px-1.5 py-[1px] rounded shrink-0 ${pPillClass(loop.pLevel)}`}
                      >
                        {loop.pLevel}
                      </span>
                    )}
                    {loop.timeEstimateMinutes != null && (
                      <span className="text-[10px] text-ink-ghost tabular-nums shrink-0 w-10 text-right">
                        {formatMinutes(loop.timeEstimateMinutes)}
                      </span>
                    )}
                  </span>
                  {noteSnippet && (
                    <span className="pl-[72px] text-[11px] text-ink-faint italic leading-snug">
                      &ldquo;{noteSnippet}&rdquo;
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
        <div className="flex items-center justify-between px-4 py-2 border-t border-edge-subtle text-[10px] text-ink-ghost font-mono">
          <span>
            {results.length} result{results.length === 1 ? '' : 's'}
          </span>
          <span className="flex items-center gap-2">
            <kbd>↑↓</kbd> nav
            <span className="opacity-50">·</span>
            <kbd>↵</kbd> open
          </span>
        </div>
      </div>
    </div>
  );
}
