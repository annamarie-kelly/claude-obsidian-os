'use client';

// BoundaryLogPanel: right-edge slide-out that shows the boundary log
// chronologically (newest first). Matches the DetailDrawer overlay
// pattern so the chrome feels consistent.

import { useEffect, useState } from 'react';
import type { BoundaryLogEntry, CloseOutEntry } from '@/lib/types';
import {
  readBoundaryLog,
  readBoundaryLogArchive,
  readCloseOuts,
  TEND_EVENT,
} from '@/lib/tend';
import { P1_STAKEHOLDER } from '@/lib/config';

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return '';
  const diff = Date.now() - then;
  const min = Math.round(diff / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.round(hr / 24);
  if (d < 7) return `${d}d ago`;
  const w = Math.round(d / 7);
  if (w < 5) return `${w}w ago`;
  return new Date(iso).toLocaleDateString();
}

const TYPE_LABEL: Record<BoundaryLogEntry['type'], string> = {
  capacity_override: 'Capacity override',
  scope_acknowledge: 'Scope acknowledged',
  scope_boundary: 'Scope boundary',
  linear_conflict: 'Linear conflict',
  checkpoint_skip: 'Checkpoint skipped',
};

// Semantic color per event type. Everything is drawn with the existing
// palette — no raw hex, no emoji.
const TYPE_ACCENT: Record<BoundaryLogEntry['type'], string> = {
  capacity_override: 'var(--rose)',
  scope_acknowledge: 'var(--sage)',
  scope_boundary: 'var(--berry)',
  linear_conflict: 'var(--tan)',
  checkpoint_skip: 'var(--mauve)',
};

export function BoundaryLogPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [entries, setEntries] = useState<BoundaryLogEntry[]>([]);
  const [closeOuts, setCloseOuts] = useState<CloseOutEntry[]>([]);
  const [showArchive, setShowArchive] = useState(false);
  const [tab, setTab] = useState<'boundary' | 'close_outs'>('boundary');

  useEffect(() => {
    if (!open) return;
    const refresh = () => {
      setEntries(readBoundaryLog());
      setCloseOuts(readCloseOuts());
    };
    refresh();
    const handler = () => refresh();
    window.addEventListener(TEND_EVENT, handler);
    return () => window.removeEventListener(TEND_EVENT, handler);
  }, [open]);

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

  if (!open) return null;

  const archive = showArchive ? readBoundaryLogArchive() : [];
  const all: BoundaryLogEntry[] = [...archive, ...entries];
  // Newest first.
  all.sort((a, b) => {
    const ta = new Date(a.timestamp).getTime() || 0;
    const tb = new Date(b.timestamp).getTime() || 0;
    return tb - ta;
  });

  const counts = entries.reduce<
    Partial<Record<BoundaryLogEntry['type'], number>>
  >((acc, e) => {
    acc[e.type] = (acc[e.type] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <>
      <div
        className="fixed inset-0 bg-black/20 z-40 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden
      />
      <aside
        role="dialog"
        aria-label="Boundary log"
        className="fixed top-0 right-0 bottom-0 w-[420px] max-w-[92vw] bg-elevated border-l border-edge shadow-2xl z-50 flex flex-col"
      >
        <div className="px-5 pt-4 pb-3 border-b border-edge shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-[10px] uppercase tracking-[0.12em] text-ink-ghost mb-1">
                Tend
              </div>
              <div className="text-[15px] font-medium text-ink">
                {tab === 'boundary' ? 'Boundary log' : 'Close-outs'}
              </div>
              <div className="text-[11px] text-ink-faint mt-1.5">
                {tab === 'boundary' ? (
                  <>
                    {entries.length} entr{entries.length === 1 ? 'y' : 'ies'}
                    {' · '}
                    {Object.entries(counts)
                      .map(
                        ([k, v]) =>
                          `${v} ${TYPE_LABEL[k as BoundaryLogEntry['type']].toLowerCase()}`,
                      )
                      .join(' · ') || 'no events yet'}
                  </>
                ) : (
                  <>
                    {closeOuts.length} close-out
                    {closeOuts.length === 1 ? '' : 's'} logged
                  </>
                )}
              </div>
              <div className="flex items-center gap-1 mt-2">
                <button
                  type="button"
                  onClick={() => setTab('boundary')}
                  className={`text-[10px] px-2 py-0.5 rounded-md border-[0.5px] transition-colors ${
                    tab === 'boundary'
                      ? 'border-[var(--mauve)]/40 bg-mauve-fill text-mauve-text'
                      : 'border-edge text-ink-ghost hover:text-ink-soft'
                  }`}
                >
                  Boundaries
                </button>
                <button
                  type="button"
                  onClick={() => setTab('close_outs')}
                  className={`text-[10px] px-2 py-0.5 rounded-md border-[0.5px] transition-colors ${
                    tab === 'close_outs'
                      ? 'border-[var(--sage)]/40 bg-sage-fill text-sage-text'
                      : 'border-edge text-ink-ghost hover:text-ink-soft'
                  }`}
                >
                  Close-outs
                </button>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-ink-ghost hover:text-ink text-xl leading-none shrink-0 w-7 h-7 flex items-center justify-center rounded-md hover:bg-inset"
              title="Close (esc)"
            >
              ×
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-subtle">
          {tab === 'close_outs' ? (
            <CloseOutList entries={closeOuts} />
          ) : all.length === 0 ? (
            <div className="px-5 py-10 text-center text-[12px] text-ink-ghost italic">
              No boundary events logged yet.
            </div>
          ) : (
            <ul className="flex flex-col">
              {all.map((e) => (
                <li
                  key={e.id}
                  className="px-5 py-3 border-b border-edge-subtle"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className="w-[8px] h-[8px] rounded-full shrink-0 mt-1.5"
                      style={{ background: TYPE_ACCENT[e.type] }}
                      aria-hidden
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[12px] text-ink font-medium">
                          {TYPE_LABEL[e.type]}
                        </span>
                        <span className="text-ink-ghost">·</span>
                        <span className="text-[10px] text-ink-ghost tabular-nums font-mono">
                          {relativeTime(e.timestamp)}
                        </span>
                      </div>
                      <div className="text-[11px] text-ink-soft leading-relaxed">
                        {e.context}
                      </div>
                      {e.reason && (
                        <div className="text-[11px] text-ink-faint italic leading-relaxed mt-1">
                          &ldquo;{e.reason}&rdquo;
                        </div>
                      )}
                      {e.counts_at_time && (
                        <div className="text-[10px] text-ink-ghost tabular-nums font-mono mt-1">
                          {P1_STAKEHOLDER} {e.counts_at_time.p1_stakeholder}
                          {' · '}
                          P1:self {e.counts_at_time.p1_self}
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="px-5 py-2 border-t border-edge-subtle flex items-center justify-between text-[10px] text-ink-ghost">
          <button
            type="button"
            onClick={() => setShowArchive((v) => !v)}
            disabled={tab === 'close_outs'}
            className="hover:text-ink-soft transition-colors disabled:opacity-30"
          >
            {showArchive ? 'hide archive' : 'show archive'}
          </button>
          <span className="font-mono">
            <kbd className="border border-edge rounded px-1">esc</kbd> close
          </span>
        </div>
      </aside>
    </>
  );
}

// ─── Close-out sub-list ─────────────────────────────────────────────
// Reverse-chronological view of the last 20 close-outs. Each row shows
// which of the five checks were green vs gap-accepted so the audit
// trail is scannable.
const CLOSE_CHECK_LABELS: Record<string, string> = {
  linear: 'Linear',
  docs: 'Docs',
  stakeholder: 'Stakeholder',
  handoff: 'Handoff',
  follow_through: 'Follow-through',
};

function closeStatusColor(s: string): string {
  if (s === 'green') return 'var(--sage)';
  if (s === 'red') return 'var(--rose)';
  if (s === 'accepted') return 'var(--tan)';
  return 'var(--edge)';
}

function CloseOutList({ entries }: { entries: CloseOutEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="px-5 py-10 text-center text-[12px] text-ink-ghost italic">
        No close-outs logged yet.
      </div>
    );
  }
  const recent = [...entries]
    .sort((a, b) => {
      const ta = new Date(a.timestamp).getTime() || 0;
      const tb = new Date(b.timestamp).getTime() || 0;
      return tb - ta;
    })
    .slice(0, 20);
  return (
    <ul className="flex flex-col">
      {recent.map((e) => (
        <li
          key={`${e.loop_id}-${e.timestamp}`}
          className="px-5 py-3 border-b border-edge-subtle"
        >
          <div className="flex items-start gap-3">
            <span
              className="w-[8px] h-[8px] rounded-full shrink-0 mt-1.5"
              style={{ background: 'var(--sage)' }}
              aria-hidden
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[12px] text-ink font-medium truncate">
                  {e.loop_title}
                </span>
                <span className="text-ink-ghost">·</span>
                <span className="text-[10px] text-ink-ghost tabular-nums font-mono shrink-0">
                  {relativeTime(e.timestamp)}
                </span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap mt-1">
                {(['linear', 'docs', 'stakeholder', 'handoff', 'follow_through'] as const).map(
                  (k) => {
                    const s = e.checks[k];
                    // `linear` is legacy — skip it entirely on newer
                    // entries that don't carry a Linear status.
                    if (s === undefined) return null;
                    return (
                      <span
                        key={k}
                        className="inline-flex items-center gap-1 text-[10px] text-ink-soft"
                        title={`${CLOSE_CHECK_LABELS[k]}: ${s}`}
                      >
                        <span
                          className="w-[6px] h-[6px] rounded-full"
                          style={{ background: closeStatusColor(s) }}
                          aria-hidden
                        />
                        {CLOSE_CHECK_LABELS[k]}
                      </span>
                    );
                  },
                )}
              </div>
              {e.gaps_accepted.length > 0 && e.reason && (
                <div className="text-[11px] text-ink-faint italic leading-relaxed mt-1.5">
                  &ldquo;{e.reason}&rdquo;
                </div>
              )}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
