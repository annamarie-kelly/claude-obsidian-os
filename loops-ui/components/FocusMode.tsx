'use client';

// FocusMode: two-step picker → focus flow.
//
// Step 1 (picker): up to 5 **project clusters** surfaced by the
// auto-pick rules — each row represents a source file (project), not
// an individual loop. The row shows the suggested next action inside
// that project plus a sibling count so the parent context is visible.
// Pick by click or 1–5.
// Step 2 (focus): title, progress bar, notes jot surface, Done. Esc or
// "Back to picker" returns to step 1.

import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  CalendarFile,
  ContextFile,
  Loop,
  LoopNote,
} from '@/lib/types';
import { formatMinutes, todayISO } from '@/lib/types';
import {
  effectiveWorkMode,
  pLevelRank,
  pPillClass,
  stripInlineMarkdown,
  WORK_MODE_META,
} from '@/lib/ui';
import { CloseGateModal, type CloseGateProceedResult } from './CloseGateModal';

export type FocusKind =
  | 'active'
  | 'upcoming'
  | 'now-tier'
  | 'soon-tier'
  | null;

export type FocusCluster = {
  file: string; // source.file path (cluster key)
  projectName: string; // display name (file stem)
  topLoop: Loop; // suggested next action within the project
  topLoopTb: Loop['timeblocks'][number] | null;
  kind: Exclude<FocusKind, null>;
  reason: string;
  siblingCount: number; // total active loops in this file
  siblingScheduledToday: number; // how many have a block today
  topPLevel: string | null;
};

function projectNameFromFile(file: string): string {
  const stem = file.split('/').pop() ?? file;
  return stem.replace(/\.md$/i, '');
}

// Legacy single-pick helper — kept so page.tsx's prefetch logic keeps
// compiling even though it inlines its own copy of the rules.
export function pickFocusLoop(
  loops: Loop[],
  today: string,
  nowMin: number,
): {
  loop: Loop | null;
  tb: Loop['timeblocks'][number] | null;
  kind: FocusKind;
} {
  const first = pickFocusClusters(loops, today, nowMin)[0];
  if (!first) return { loop: null, tb: null, kind: null };
  return { loop: first.topLoop, tb: first.topLoopTb, kind: first.kind };
}

// Build up to 5 project clusters, in priority order:
//   1. clusters containing an active timeblock now
//   2. clusters with an upcoming block today
//   3. clusters with loops in Now tier (by top pLevel, then cluster size)
//   4. clusters with loops in Soon tier (by top pLevel, then cluster size)
// Deduped by file path, capped at 5. Within each cluster the "top
// loop" is the active/upcoming block if present, else the highest
// pLevel loop, breaking ties by most-recently-updated.
export function pickFocusClusters(
  loops: Loop[],
  today: string,
  nowMin: number,
  limit = 50,
): FocusCluster[] {
  const live = loops.filter((l) => !l.done);

  // Group everything by source file up front.
  const byFile = new Map<string, Loop[]>();
  for (const l of live) {
    const f = l.source?.file ?? '(unknown)';
    const arr = byFile.get(f);
    if (arr) arr.push(l);
    else byFile.set(f, [l]);
  }

  const out: FocusCluster[] = [];
  const seenFile = new Set<string>();

  const rank = (l: Loop): number => {
    const p = pLevelRank(l.pLevel);
    // Break ties with updatedAt (more recent = smaller rank bump).
    const t = l.updatedAt ? new Date(l.updatedAt).getTime() : 0;
    return p * 1e13 - t;
  };

  const topPLevelOf = (siblings: Loop[]): string | null => {
    let best: string | null = null;
    let bestRank = Infinity;
    for (const s of siblings) {
      const r = pLevelRank(s.pLevel);
      if (r < bestRank) {
        bestRank = r;
        best = s.pLevel;
      }
    }
    return best;
  };

  const scheduledTodayCount = (siblings: Loop[]): number => {
    let n = 0;
    for (const s of siblings) {
      if (s.timeblocks.some((tb) => tb.date === today)) n++;
    }
    return n;
  };

  const push = (c: FocusCluster) => {
    if (seenFile.has(c.file)) return;
    if (out.length >= limit) return;
    seenFile.add(c.file);
    out.push(c);
  };

  // 1. Active timeblock now.
  for (const [file, siblings] of byFile) {
    for (const l of siblings) {
      for (const tb of l.timeblocks) {
        if (
          tb.date === today &&
          tb.startMinute <= nowMin &&
          tb.endMinute > nowMin
        ) {
          push({
            file,
            projectName: projectNameFromFile(file),
            topLoop: l,
            topLoopTb: tb,
            kind: 'active',
            reason: 'active timeblock now',
            siblingCount: siblings.length,
            siblingScheduledToday: scheduledTodayCount(siblings),
            topPLevel: topPLevelOf(siblings),
          });
          break;
        }
      }
      if (seenFile.has(file)) break;
    }
  }

  // 2. Next upcoming block today — sorted by soonest start. A cluster
  // can only appear once; its earliest upcoming block wins.
  const upcoming: { file: string; loop: Loop; tb: Loop['timeblocks'][number] }[] = [];
  for (const [file, siblings] of byFile) {
    for (const l of siblings) {
      for (const tb of l.timeblocks) {
        if (tb.date === today && tb.startMinute > nowMin) {
          upcoming.push({ file, loop: l, tb });
        }
      }
    }
  }
  upcoming.sort((a, b) => a.tb.startMinute - b.tb.startMinute);
  for (const u of upcoming) {
    if (seenFile.has(u.file)) continue;
    const siblings = byFile.get(u.file) ?? [u.loop];
    const starts = u.tb.startMinute - nowMin;
    push({
      file: u.file,
      projectName: projectNameFromFile(u.file),
      topLoop: u.loop,
      topLoopTb: u.tb,
      kind: 'upcoming',
      reason: `next block in ${formatMinutes(starts)}`,
      siblingCount: siblings.length,
      siblingScheduledToday: scheduledTodayCount(siblings),
      topPLevel: topPLevelOf(siblings),
    });
  }

  // 3 + 4: build one candidate per cluster that has Now/Soon loops.
  // A cluster's "top loop" for picker purposes is its highest-ranked
  // live loop regardless of tier. The reason label reflects whether
  // the cluster has any Now presence.
  const clusterRows: {
    file: string;
    siblings: Loop[];
    topLoop: Loop;
    kind: 'now-tier' | 'soon-tier';
  }[] = [];
  for (const [file, siblings] of byFile) {
    if (seenFile.has(file)) continue;
    const hasNow = siblings.some((l) => l.tier === 'now');
    const hasSoon = siblings.some((l) => l.tier === 'soon');
    if (!hasNow && !hasSoon) continue;
    const ranked = siblings.slice().sort((a, b) => rank(a) - rank(b));
    clusterRows.push({
      file,
      siblings,
      topLoop: ranked[0],
      kind: hasNow ? 'now-tier' : 'soon-tier',
    });
  }
  // Now-tier clusters first, then Soon-tier. Within each bucket sort
  // by top loop rank, then by cluster size (bigger projects = more
  // context debt = surface first).
  clusterRows.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'now-tier' ? -1 : 1;
    const r = rank(a.topLoop) - rank(b.topLoop);
    if (r !== 0) return r;
    return b.siblings.length - a.siblings.length;
  });
  for (const row of clusterRows) {
    push({
      file: row.file,
      projectName: projectNameFromFile(row.file),
      topLoop: row.topLoop,
      topLoopTb: null,
      kind: row.kind,
      reason: row.kind === 'now-tier' ? 'top of Now' : 'top of Soon',
      siblingCount: row.siblings.length,
      siblingScheduledToday: scheduledTodayCount(row.siblings),
      topPLevel: topPLevelOf(row.siblings),
    });
  }

  return out;
}

function latestUserNote(loop: Loop): LoopNote | null {
  const notes = (loop.notes ?? []).filter((n) => !n.system);
  if (notes.length === 0) return null;
  let latest = notes[0];
  for (const n of notes) {
    if (new Date(n.createdAt).getTime() > new Date(latest.createdAt).getTime())
      latest = n;
  }
  return latest;
}

function relativeShort(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return '';
  const diff = Date.now() - then;
  const min = Math.round(diff / 60_000);
  if (min < 1) return 'now';
  if (min < 60) return `${min}m`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h`;
  const d = Math.round(hr / 24);
  if (d < 7) return `${d}d`;
  const w = Math.round(d / 7);
  if (w < 5) return `${w}w`;
  return new Date(iso).toLocaleDateString();
}

function breadcrumbOf(loop: Loop): string {
  const parts = loop.source.file.split('/');
  parts.pop();
  return parts.join(' / ');
}

// Split a loop's text into a short headline and an optional body.
// Preference order for the split point:
//   1. The first " — " / " -- " em-dash separator (common pattern)
//   2. The first sentence boundary (". ")
//   3. The whole text if it's short enough to stand alone
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
  // Fallback: hard truncate at word boundary near 120 chars.
  const cut = cleaned.lastIndexOf(' ', 120);
  const at = cut > 60 ? cut : 120;
  return {
    headline: cleaned.slice(0, at).trim() + '…',
    body: cleaned.slice(at).trim(),
  };
}

// Render a text blob with URLs auto-linkified. Tiny helper — the
// detail drawer does more elaborate markdown rendering, but for the
// focus body we only care about making URLs clickable so the user
// can jump to referenced docs without opening the source file.
function renderLinkified(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const re = /(https?:\/\/[^\s)]+)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(
      <a
        key={key++}
        href={m[1]}
        target="_blank"
        rel="noreferrer"
        className="text-mauve-text underline decoration-dotted underline-offset-2 hover:decoration-solid"
      >
        {m[1]}
      </a>,
    );
    last = m.index + m[1].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export function FocusMode({
  loops,
  onUpdateLoop,
  onCloseLoop,
}: {
  loops: Loop[]; // active-only
  allLoops?: Loop[]; // unused in the picker flow — kept for prop compat
  calendar?: CalendarFile | null; // unused
  context?: ContextFile | null; // unused
  onOpenDetail?: (id: string) => void; // unused
  onUpdateLoop: (id: string, patch: Partial<Loop>) => Promise<void>;
  onAddToNextOpenSlot?: (id: string) => void; // unused
  onScheduleRemainder?: (id: string) => void; // unused
  onCloseLoop: (id: string) => Promise<void>;
  onDropLoop?: (id: string) => Promise<void> | void; // unused
  onSplitBlock?: (id: string, idx: number) => Promise<void>; // unused
  onRemoveBlock?: (id: string, idx: number) => Promise<void>; // unused
}) {
  const [nowMin, setNowMin] = useState<number>(() => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  });
  useEffect(() => {
    const id = setInterval(() => {
      const d = new Date();
      setNowMin(d.getHours() * 60 + d.getMinutes());
    }, 30_000);
    return () => clearInterval(id);
  }, []);

  const today = todayISO();
  const allClusters = useMemo(
    () => pickFocusClusters(loops, today, nowMin, 50),
    [loops, today, nowMin],
  );

  const PAGE = 5;
  const [offset, setOffset] = useState(0);
  // If the backing data shrinks past the current offset, reset to 0.
  useEffect(() => {
    if (offset >= allClusters.length) setOffset(0);
  }, [offset, allClusters.length]);
  const clusters = useMemo(
    () => allClusters.slice(offset, offset + PAGE),
    [allClusters, offset],
  );
  const nextOffset = offset + PAGE >= allClusters.length ? 0 : offset + PAGE;
  const hasMore = allClusters.length > PAGE;

  const [pickedId, setPickedId] = useState<string | null>(null);
  // Auto-jump to the active timeblock's loop whenever Focus mode is
  // idle on the picker. "Back to picker" stashes the loop id in
  // dismissedActiveId so we don't immediately bounce back into it — but
  // if the active block ROLLS OVER to a different loop, we re-jump.
  const [dismissedActiveId, setDismissedActiveId] = useState<string | null>(
    null,
  );
  useEffect(() => {
    if (pickedId) return;
    const active = allClusters.find((c) => c.kind === 'active');
    if (!active) return;
    if (active.topLoop.id === dismissedActiveId) return;
    setPickedId(active.topLoop.id);
  }, [allClusters, pickedId, dismissedActiveId]);
  const picked = useMemo(() => {
    if (!pickedId) return null;
    const live = loops.find((l) => l.id === pickedId && !l.done);
    if (!live) return null;
    // Re-derive the candidate-style block/kind for the picked loop so
    // the progress bar reflects the currently-running timeblock (if
    // any), not a stale snapshot from when it was picked.
    for (const tb of live.timeblocks) {
      if (
        tb.date === today &&
        tb.startMinute <= nowMin &&
        tb.endMinute > nowMin
      ) {
        return { loop: live, tb };
      }
    }
    return { loop: live, tb: null as Loop['timeblocks'][number] | null };
  }, [pickedId, loops, today, nowMin]);

  // If the picked loop disappears (closed elsewhere, tab restored), fall
  // back to the picker so the user isn't staring at a ghost.
  useEffect(() => {
    if (pickedId && !picked) setPickedId(null);
  }, [pickedId, picked]);

  // Keyboard: 1–5 picks a candidate while on the picker. Esc returns
  // from focus to picker. Ignored while typing in the notes textarea.
  const notesRef = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);
      if (typing) return;
      if (!picked) {
        const n = Number(e.key);
        if (Number.isInteger(n) && n >= 1 && n <= clusters.length) {
          e.preventDefault();
          setPickedId(clusters[n - 1].topLoop.id);
        }
      } else {
        if (e.key === 'Escape') {
          e.preventDefault();
          if (picked) setDismissedActiveId(picked.loop.id);
          setPickedId(null);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [picked, clusters]);

  const [closeOpen, setCloseOpen] = useState(false);

  if (!picked) {
    // ─── Step 1: project cluster picker ───────────────────────────
    if (clusters.length === 0) {
      return (
        <main className="flex-1 min-h-0 flex items-center justify-center px-8">
          <div className="max-w-md text-center">
            <div className="text-[11px] uppercase tracking-[0.08em] text-ink-ghost mb-4">
              Focus
            </div>
            <div className="text-[20px] text-ink leading-snug mb-3">
              Nothing to pick from.
            </div>
            <div className="text-[13px] text-ink-faint leading-relaxed">
              Drop a loop on the Plan canvas or promote something in Triage.
            </div>
          </div>
        </main>
      );
    }

    return (
      <main className="flex-1 min-h-0 flex items-start justify-center overflow-y-auto scrollbar-subtle">
        <div className="w-full max-w-2xl px-10 pt-20 pb-20">
          <div className="flex items-baseline justify-between mb-6">
            <div className="text-[10px] uppercase tracking-[0.12em] text-ink-ghost">
              Pick a project
            </div>
            {hasMore && (
              <button
                type="button"
                onClick={() => setOffset(nextOffset)}
                className="text-[10px] text-ink-ghost hover:text-ink-soft transition-colors tabular-nums"
                title="Show the next 5 projects"
              >
                ↻ refresh · {offset + 1}–
                {Math.min(offset + PAGE, allClusters.length)} of{' '}
                {allClusters.length}
              </button>
            )}
          </div>
          <ul className="flex flex-col gap-2">
            {clusters.map((c, idx) => {
              const est = c.topLoop.timeEstimateMinutes;
              const mode = effectiveWorkMode(c.topLoop);
              const modeMeta = WORK_MODE_META[mode];
              const note = latestUserNote(c.topLoop);
              const updated = c.topLoop.updatedAt
                ? relativeShort(c.topLoop.updatedAt)
                : null;
              const siblingExtra = c.siblingCount - 1;
              // Cluster meta line: reason, cluster size, scheduled‑today
              // count, then updated. Gives the user a sense of both
              // parent weight and freshness.
              const metaBits: string[] = [c.reason];
              if (siblingExtra > 0) {
                const sched =
                  c.siblingScheduledToday > 0
                    ? `, ${c.siblingScheduledToday} scheduled today`
                    : '';
                metaBits.push(`+${siblingExtra} more in project${sched}`);
              }
              if (updated) metaBits.push(`updated ${updated}`);
              return (
                <li key={c.file}>
                  <button
                    type="button"
                    onClick={() => setPickedId(c.topLoop.id)}
                    className="w-full flex items-start gap-4 px-4 py-3.5 rounded-lg border-[0.5px] border-edge hover:border-[var(--mauve)] hover:bg-mauve-fill text-left transition-colors"
                  >
                    <span className="text-[11px] font-mono text-ink-ghost w-4 shrink-0 tabular-nums pt-[2px]">
                      {idx + 1}
                    </span>
                    <span className="flex-1 min-w-0 flex flex-col gap-2">
                      {/* Project header row */}
                      <span className="flex items-baseline gap-2">
                        <span
                          className="w-[6px] h-[6px] rounded-full shrink-0 translate-y-[-1px]"
                          style={{ background: `var(${modeMeta.accent})` }}
                          aria-label={modeMeta.label}
                        />
                        <span className="text-[13px] text-ink font-medium leading-snug truncate">
                          {c.projectName}
                        </span>
                        <span className="text-[10px] text-ink-ghost font-mono tabular-nums shrink-0">
                          {c.siblingCount} loop{c.siblingCount === 1 ? '' : 's'}
                        </span>
                      </span>
                      {/* Top loop (the suggested action within the project) */}
                      <span className="text-[12px] text-ink-soft leading-snug line-clamp-2 pl-[14px]">
                        → {c.topLoop.text}
                      </span>
                      <span className="text-[10px] text-ink-ghost tabular-nums pl-[14px]">
                        {metaBits.join(' · ')}
                      </span>
                      {note && (
                        <span className="text-[11px] text-ink-faint italic leading-snug line-clamp-1 pl-[14px]">
                          “{note.text}”
                        </span>
                      )}
                    </span>
                    <span className="flex flex-col items-end gap-1 shrink-0 pt-[2px]">
                      {c.topLoop.pLevel && (
                        <span
                          className={`text-[9px] font-mono px-1.5 py-[1px] rounded ${pPillClass(c.topLoop.pLevel)}`}
                        >
                          {c.topLoop.pLevel}
                        </span>
                      )}
                      {est != null && (
                        <span className="text-[10px] text-ink-ghost font-mono tabular-nums">
                          {formatMinutes(est)}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="text-[10px] text-ink-ghost tabular-nums mt-6 pl-1">
            1–{clusters.length} to pick
          </div>
        </div>
      </main>
    );
  }

  // ─── Step 2: focus ────────────────────────────────────────────────
  const { loop, tb } = picked;
  const est = loop.timeEstimateMinutes;

  // Progress bar: if an active block is running, show elapsed/total of
  // that block. Otherwise show 0 over the estimate (or nothing if
  // neither exists).
  let barPct = 0;
  let barColor = 'var(--mauve)';
  let barLabel = '';
  if (tb) {
    const total = tb.endMinute - tb.startMinute;
    const elapsed = Math.max(0, Math.min(total, nowMin - tb.startMinute));
    barPct = total > 0 ? (elapsed / total) * 100 : 0;
    barColor =
      barPct >= 100
        ? 'var(--rose)'
        : barPct >= 80
          ? 'var(--tan)'
          : 'var(--mauve)';
    barLabel = `${formatMinutes(elapsed)} of ${formatMinutes(total)}`;
  } else if (est != null) {
    barLabel = `${formatMinutes(est)} estimate`;
  }

  return (
    <main className="flex-1 min-h-0 flex items-start justify-center overflow-y-auto scrollbar-subtle">
      <div className="w-full max-w-2xl px-10 pt-16 pb-20 relative">
        <button
          type="button"
          onClick={() => {
            // Stash the dismissed loop id so auto-jump respects the
            // user's choice to stay on the picker for this active
            // block. If a new active block starts, we'll re-jump.
            if (picked) setDismissedActiveId(picked.loop.id);
            setPickedId(null);
          }}
          className="absolute top-6 right-10 text-[10px] text-ink-ghost hover:text-ink-soft transition-colors"
        >
          ← Back to picker
        </button>

        <div className="text-[10px] uppercase tracking-[0.12em] text-ink-ghost mb-3 font-mono">
          {breadcrumbOf(loop)}
        </div>
        <FocusHeadline text={loop.text} />


        {barLabel && (
          <div className="mb-10">
            <div className="h-[4px] rounded-full bg-inset overflow-hidden">
              <div
                className="h-full transition-all duration-300"
                style={{
                  width: `${Math.max(2, barPct)}%`,
                  background: barColor,
                }}
              />
            </div>
            <div className="mt-2 text-[10px] text-ink-ghost tabular-nums font-mono">
              {barLabel}
            </div>
          </div>
        )}

        <FocusNotes
          loop={loop}
          notesRef={notesRef}
          onUpdateLoop={onUpdateLoop}
        />

        <div className="mt-10 flex items-center">
          <button
            type="button"
            onClick={() => setCloseOpen(true)}
            className="px-4 py-2 rounded-md bg-sage-fill text-sage-text border-[0.5px] border-sage text-[13px] hover:brightness-110 transition"
          >
            Done
          </button>
        </div>
      </div>

      <CloseGateModal
        open={closeOpen}
        loop={loop}
        onCancel={() => setCloseOpen(false)}
        onProceed={async (_result: CloseGateProceedResult) => {
          setCloseOpen(false);
          await onCloseLoop(loop.id);
          // Clear dismissal: the loop is gone, so if the next active
          // block points elsewhere (or is the same id stashed earlier)
          // we should jump fresh.
          setDismissedActiveId(null);
          setPickedId(null);
        }}
      />
    </main>
  );
}

// ─── Headline + collapsible body ──────────────────────────────────────

function FocusHeadline({ text }: { text: string }) {
  const { headline, body } = useMemo(() => splitHeadline(text), [text]);
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="mb-8">
      <h1 className="text-[28px] text-ink leading-snug">{headline}</h1>
      {body && (
        <div className="mt-3">
          <p
            className={`text-[13px] text-ink-soft leading-relaxed whitespace-pre-wrap ${
              expanded ? '' : 'line-clamp-2'
            }`}
          >
            {renderLinkified(body)}
          </p>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="mt-2 text-[10px] text-ink-ghost hover:text-ink-soft transition-colors"
          >
            {expanded ? 'show less' : 'show more'}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Minimal notes jot surface ────────────────────────────────────────

function FocusNotes({
  loop,
  notesRef,
  onUpdateLoop,
}: {
  loop: Loop;
  notesRef: React.MutableRefObject<HTMLTextAreaElement | null>;
  onUpdateLoop: (id: string, patch: Partial<Loop>) => Promise<void>;
}) {
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  const userNotes = (loop.notes ?? [])
    .filter((n) => !n.system)
    .slice()
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

  const submit = async () => {
    const text = draft.trim();
    if (!text || saving) return;
    setSaving(true);
    const newNote: LoopNote = {
      id: Math.random().toString(36).slice(2, 10),
      createdAt: new Date().toISOString(),
      text,
    };
    try {
      await onUpdateLoop(loop.id, {
        notes: [...(loop.notes ?? []), newNote],
      });
      setDraft('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section>
      <div className="text-[10px] uppercase tracking-[0.12em] text-ink-ghost mb-3">
        Notes
      </div>
      <textarea
        ref={notesRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            e.preventDefault();
            void submit();
          }
        }}
        placeholder="Jot as you work… ⌘↵ to save"
        rows={4}
        className="w-full resize-none px-3 py-2 rounded-md bg-inset border-[0.5px] border-edge text-[13px] text-ink placeholder:text-ink-ghost focus:outline-none focus:border-[var(--mauve)] transition-colors"
      />
      {userNotes.length > 0 && (
        <ul className="mt-4 flex flex-col gap-1">
          {userNotes.map((n) => (
            <li
              key={n.id}
              className="text-[12px] text-ink bg-inset rounded-md px-3 py-2 whitespace-pre-wrap leading-snug"
            >
              {n.text}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
