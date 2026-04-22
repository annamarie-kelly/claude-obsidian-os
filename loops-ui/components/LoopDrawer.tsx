'use client';

// LoopDrawer: compact scrollable list of Now + Soon loops for Plan mode.
// Lives in a left rail. Drag a row onto the day canvas to block it.
//
// The old "Scheduled" section was removed: it duplicated what the week
// canvas already shows 200px to the right. Unscheduled work is the only
// thing here now, which is the decision the sidebar is actually for.
//
// A persistent search bar pins to the top of the list and filters titles
// in real-time. Empty-query matches everything. Results that collapse a
// whole tier section auto-hide the section header.

import { useMemo, useState, useEffect, useRef } from 'react';
import type { Loop, Tier } from '@/lib/types';
import { formatMinutes, weekDates } from '@/lib/types';
import { LoopRow } from './LoopRow';
import { LoopForm } from './LoopForm';
import { TierDot } from './PriorityDot';

type ScheduleFilter = 'all' | 'unscheduled' | 'scheduled';
const LS_SCHEDULE_FILTER = 'loops-ui:schedule-filter';

export function LoopDrawer({
  loops,
  selectedIds,
  focusedId,
  editingId,
  onToggleSelect,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onCreate,
  onKill,
  onQuickSchedule,
}: {
  loops: Loop[];
  selectedIds: Set<string>;
  focusedId: string | null;
  editingId: string | null;
  onToggleSelect: (id: string, shiftKey: boolean, cmdKey: boolean) => void;
  onStartEdit: (id: string) => void;
  onCancelEdit: () => void;
  onSaveEdit: (id: string, patch: Partial<Loop>) => Promise<void>;
  onCreate?: (draft: Omit<Loop, 'id'>) => Promise<void>;
  onKill?: (id: string) => void;
  onQuickSchedule?: (id: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [scheduleFilter, setScheduleFilter] = useState<ScheduleFilter>('all');
  const [adding, setAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const week = useMemo(() => new Set(weekDates()), []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_SCHEDULE_FILTER);
      if (raw === 'all' || raw === 'unscheduled' || raw === 'scheduled') {
        setScheduleFilter(raw);
      }
    } catch {}
  }, []);
  const setScheduleFilterPersist = (f: ScheduleFilter) => {
    setScheduleFilter(f);
    try {
      localStorage.setItem(LS_SCHEDULE_FILTER, f);
    } catch {}
  };

  // Focus sidebar search on `/` from anywhere outside inputs.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== '/') return;
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      e.preventDefault();
      inputRef.current?.focus();
      inputRef.current?.select();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Active set: everything except done. Tag each loop as on-calendar
  // for this week (has any timeblock in [Sun..Sat]) so the filter and
  // per-row badge can use the same signal.
  const active = useMemo(() => {
    return loops
      .filter((l) => !l.done)
      .map((l) => ({
        loop: l,
        onCalendar: l.timeblocks.some((tb) => week.has(tb.date)),
      }));
  }, [loops, week]);

  // Apply the scheduled-state filter first, then the text query.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return active
      .filter(({ onCalendar }) => {
        if (scheduleFilter === 'unscheduled') return !onCalendar;
        if (scheduleFilter === 'scheduled') return onCalendar;
        return true;
      })
      .filter(({ loop }) => {
        if (!q) return true;
        const hay =
          `${loop.text} ${loop.pLevel ?? ''} ${loop.subGroup ?? ''}`.toLowerCase();
        return hay.includes(q);
      });
  }, [active, query, scheduleFilter]);

  // Group by tier so Now sits on top, then Soon, then Someday.
  const grouped = useMemo(() => {
    const g: Record<Tier, { loop: Loop; onCalendar: boolean }[]> = {
      now: [],
      soon: [],
      someday: [],
    };
    for (const row of filtered) g[row.loop.tier].push(row);
    return g;
  }, [filtered]);

  // Counts for the filter pills (show what each filter would contain so
  // the user never wonders why a section is empty).
  const counts = useMemo(() => {
    let all = 0;
    let unsched = 0;
    let sched = 0;
    for (const { onCalendar } of active) {
      all += 1;
      if (onCalendar) sched += 1;
      else unsched += 1;
    }
    return { all, unsched, sched };
  }, [active]);

  const sections: { tier: Tier; label: string }[] = [
    { tier: 'now', label: 'Now' },
    { tier: 'soon', label: 'Soon' },
    { tier: 'someday', label: 'Someday' },
  ];

  const isFiltering = query.trim().length > 0;
  const matchCount = filtered.length;
  const headerTotalMinutes = active.reduce(
    (sum, r) => sum + (r.loop.timeEstimateMinutes ?? 0),
    0,
  );

  const filterOptions: { value: ScheduleFilter; label: string; n: number }[] = [
    { value: 'all', label: 'All', n: counts.all },
    { value: 'unscheduled', label: 'Unscheduled', n: counts.unsched },
    { value: 'scheduled', label: 'Scheduled', n: counts.sched },
  ];

  return (
    <aside className="flex flex-col min-w-0 h-full bg-page border-r border-edge">
      <div className="px-4 py-3 border-b border-edge shrink-0">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[13px] font-medium text-ink">Work</h2>
          <span className="text-[11px] text-ink-ghost tabular-nums">
            {isFiltering
              ? `${matchCount} / ${counts.all}`
              : `${counts.all} · ${formatMinutes(headerTotalMinutes)}`}
          </span>
        </div>
        <p className="text-[10px] text-ink-ghost mt-0.5">
          click to open · drag to block · / search · ⌘K everywhere
        </p>
      </div>

      {/* Persistent search bar */}
      <div className="px-3 pt-2 pb-2 shrink-0 relative">
        <div className="relative">
          <span
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-ghost text-[11px] pointer-events-none"
            aria-hidden
          >
            ⌕
          </span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setQuery('');
                (e.target as HTMLInputElement).blur();
              }
            }}
            placeholder="Search loops"
            className="w-full pl-7 pr-7 py-1.5 text-[13px] bg-inset border border-edge rounded-md text-ink placeholder:text-ink-ghost focus:outline-none focus:border-[var(--slate)] focus:bg-card transition-colors"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-ghost hover:text-ink-soft text-[11px] w-4 h-4 flex items-center justify-center rounded-full hover:bg-card"
              title="Clear search"
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Schedule-state filter: All · Open · On cal */}
      <div className="px-3 pb-2 shrink-0">
        <div className="flex items-center gap-0 rounded-md bg-inset p-0.5">
          {filterOptions.map((opt) => {
            const isActive = scheduleFilter === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setScheduleFilterPersist(opt.value)}
                className={`flex-1 px-2 py-1 rounded text-[11px] transition-all flex items-center justify-center gap-1 ${
                  isActive
                    ? 'bg-card text-ink font-medium shadow-[0_1px_2px_rgba(0,0,0,0.06)]'
                    : 'text-ink-soft hover:text-ink'
                }`}
                title={`${opt.label} (${opt.n})`}
              >
                <span>{opt.label}</span>
                <span className="text-[10px] text-ink-ghost tabular-nums">
                  {opt.n}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-scroll scrollbar-visible">
        {sections.map(({ tier, label }) => {
          const list = grouped[tier];
          if (list.length === 0) return null;
          // Secondary grouping: bucket by subGroup so the sidebar is
          // scannable by project/theme rather than a flat priority list.
          const bySubgroup = new Map<string, { loop: Loop; onCalendar: boolean }[]>();
          for (const row of list) {
            const key = (row.loop.subGroup ?? 'Other').trim() || 'Other';
            if (!bySubgroup.has(key)) bySubgroup.set(key, []);
            bySubgroup.get(key)!.push(row);
          }
          return (
            <div key={tier} className="border-b border-edge-subtle last:border-b-0 pb-3">
              <div className="sticky top-0 z-10 px-4 py-1.5 bg-page/95 backdrop-blur border-b border-edge-subtle flex items-center gap-2">
                <TierDot tier={tier} size="sm" />
                <span className="text-[11px] uppercase tracking-[0.04em] text-ink-soft font-medium">
                  {label}
                </span>
                <span className="text-[10px] text-ink-ghost tabular-nums ml-auto">
                  {list.length}
                </span>
              </div>
              {[...bySubgroup.entries()].map(([sub, rows], subIdx) => (
                <div key={sub} className={subIdx > 0 ? 'mt-3' : 'mt-1'}>
                  <div className="px-4 pt-1 pb-0.5 flex items-baseline justify-between">
                    <span className="text-[10px] uppercase tracking-[0.04em] text-ink-ghost font-normal truncate">
                      {sub}
                    </span>
                    <span className="text-[9px] text-ink-ghost tabular-nums shrink-0 ml-2">
                      {rows.length}
                    </span>
                  </div>
                  <ul className="flex flex-col gap-[1px]">
                    {rows.map(({ loop, onCalendar }) =>
                      editingId === loop.id ? (
                        <li
                          key={loop.id}
                          className="px-3 py-2 border-b border-edge-subtle bg-inset"
                        >
                          <LoopForm
                            initial={loop}
                            onSave={(patch) => onSaveEdit(loop.id, patch)}
                            onCancel={onCancelEdit}
                          />
                        </li>
                      ) : (
                        <LoopRow
                          key={loop.id}
                          loop={loop}
                          selected={selectedIds.has(loop.id)}
                          focused={focusedId === loop.id}
                          density="sidebar"
                          onCalendar={onCalendar}
                          onToggleSelect={onToggleSelect}
                          onStartEdit={onStartEdit}
                          onKill={onKill}
                          onQuickSchedule={onQuickSchedule}
                        />
                      ),
                    )}
                  </ul>
                </div>
              ))}
            </div>
          );
        })}
        {isFiltering && matchCount === 0 && (
          <div className="text-[12px] text-ink-ghost italic px-4 py-10 text-center">
            no loops match &ldquo;{query}&rdquo;
          </div>
        )}
        {!isFiltering && matchCount === 0 && (
          <div className="text-[12px] text-ink-ghost italic px-4 py-10 text-center">
            nothing here
          </div>
        )}
      </div>

      {/* Quick-add affordance. Opens an inline form rooted at the bottom
          of the sidebar so captured work drops straight into 00-Inbox/
          without leaving plan mode. New tasks default to the Now tier
          so they show up immediately in the list above. */}
      {onCreate && (
        <div className="px-3 py-2 border-t border-edge shrink-0">
          {adding ? (
            <div className="rounded-md border border-[var(--slate)] bg-slate-fill px-3 py-2">
              <LoopForm
                initial={{
                  tier: 'now',
                  text: '',
                  pLevel: null,
                  difficulty: null,
                  timeEstimateMinutes: null,
                  subGroup: 'Manual loops',
                  domain: 'working',
                  source: { file: '00-Inbox/manual-loops.md', line: 0 },
                  timeblocks: [],
                }}
                onSave={async (patch) => {
                  await onCreate({
                    tier: 'now',
                    text: patch.text ?? '',
                    pLevel: patch.pLevel ?? null,
                    difficulty: patch.difficulty ?? null,
                    timeEstimateMinutes: patch.timeEstimateMinutes ?? null,
                    subGroup: 'Manual loops',
                    domain: 'working',
                    source: { file: '00-Inbox/manual-loops.md', line: 0 },
                    timeblocks: [],
                  });
                  setAdding(false);
                }}
                onCancel={() => setAdding(false)}
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="w-full text-[12px] text-ink-ghost hover:text-ink-soft hover:bg-inset rounded-md border border-dashed border-edge hover:border-edge-hover px-3 py-2 transition-colors"
            >
              + add task
            </button>
          )}
        </div>
      )}
    </aside>
  );
}
