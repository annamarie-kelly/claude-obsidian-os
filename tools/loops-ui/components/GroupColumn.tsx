'use client';

// GroupColumn: generic column used by TriageMode.
// Drives a single bucket of loops under whichever grouping dimension is
// active (mode / size / person / subgroup). Not tier-aware — tier is no
// longer the primary axis of the triage view.

import { useMemo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import type { Loop } from '@/lib/types';
import { formatMinutes, weekDates } from '@/lib/types';
import { LoopRow } from './LoopRow';
import { LoopForm } from './LoopForm';

export interface GroupColumnMeta {
  subline?: string;     // mode: "N scheduled · M open" · person: "P pressing · S stale"
  warning?: string;     // size: "N loops have no estimate..."
  progress?: number;    // subgroup: [0..1]
  progressLabel?: string;
}

export function GroupColumn({
  groupKey,
  title,
  accent,
  loops,
  meta,
  collapseSubgroups,
  selectedIds,
  focusedId,
  editingId,
  onToggleSelect,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onKill,
  onQuickSchedule,
}: {
  groupKey: string;
  title: string;
  accent?: string;
  loops: Loop[];
  meta?: GroupColumnMeta;
  collapseSubgroups: boolean;
  selectedIds: Set<string>;
  focusedId: string | null;
  editingId: string | null;
  onToggleSelect: (id: string, shiftKey: boolean, cmdKey: boolean) => void;
  onStartEdit: (id: string) => void;
  onCancelEdit: () => void;
  onSaveEdit: (id: string, patch: Partial<Loop>) => Promise<void>;
  onKill?: (id: string) => void;
  onQuickSchedule?: (id: string) => void;
}) {
  const total = loops.reduce((sum, l) => sum + (l.timeEstimateMinutes ?? 0), 0);
  const { setNodeRef, isOver } = useDroppable({ id: `group-${groupKey}` });
  const week = useMemo(() => new Set(weekDates()), []);

  const bySubgroup = useMemo(() => {
    if (!collapseSubgroups) return null;
    const map = new Map<string, Loop[]>();
    for (const l of loops) {
      const key = (l.subGroup ?? 'Other').trim() || 'Other';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(l);
    }
    return [...map.entries()];
  }, [loops, collapseSubgroups]);

  if (loops.length === 0) return null;

  return (
    <section
      ref={setNodeRef}
      className={`relative flex flex-col min-w-0 min-h-0 rounded-xl border bg-card transition-colors overflow-hidden ${
        isOver ? 'border-[var(--mauve)]/60 bg-mauve-fill' : 'border-edge'
      }`}
    >
      {/* Accent strip: a 2px top bar rendered as an absolutely-positioned
          child so the rounded-xl corner clipping doesn't hide it the
          way a border-top would. */}
      {accent && (
        <div
          className="absolute top-0 left-0 right-0 h-[2px] pointer-events-none"
          style={{ background: `var(${accent})` }}
          aria-hidden
        />
      )}
      <div className="px-4 py-3 border-b border-edge-subtle shrink-0">
        <div className="flex items-center justify-between">
          <h2
            className="text-[12px] font-medium text-ink-soft truncate"
            style={accent ? { color: `var(${accent})` } : undefined}
            title={title}
          >
            {title}
          </h2>
          <span className="text-[11px] text-ink-ghost tabular-nums ml-2 shrink-0">
            {loops.length} · {formatMinutes(total)}
          </span>
        </div>
        {meta?.subline && (
          <div className="mt-0.5 text-[10px] text-ink-ghost tabular-nums">
            {meta.subline}
          </div>
        )}
        {meta?.warning && (
          <div className="mt-0.5 text-[10px] text-rose-text/80">{meta.warning}</div>
        )}
        {meta?.progress != null && (
          <div className="mt-1.5">
            <div className="h-1 rounded-full bg-inset overflow-hidden">
              <div
                className="h-full bg-[var(--sage)]"
                style={{ width: `${Math.round(meta.progress * 100)}%` }}
              />
            </div>
            {meta.progressLabel && (
              <div className="mt-0.5 text-[10px] text-ink-ghost tabular-nums">
                {meta.progressLabel}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-subtle">
        {collapseSubgroups && bySubgroup ? (
          bySubgroup.map(([sub, list], idx) => (
            <div key={sub} className={idx > 0 ? 'mt-3' : 'mt-1'}>
              <div className="px-4 pt-2 pb-1 flex items-baseline justify-between">
                <div className="text-[10px] uppercase tracking-[0.04em] text-ink-ghost truncate">
                  {sub}
                </div>
                <div className="text-[10px] text-ink-ghost tabular-nums shrink-0 ml-2">
                  {list.length}
                </div>
              </div>
              <ul className="flex flex-col gap-[2px]">
                {list.map((loop) => renderRow(loop))}
              </ul>
            </div>
          ))
        ) : (
          <ul className="flex flex-col gap-[2px] mt-1">
            {loops.map((loop) => renderRow(loop))}
          </ul>
        )}
      </div>
    </section>
  );

  function renderRow(loop: Loop) {
    if (editingId === loop.id) {
      return (
        <li key={loop.id} className="px-4 py-2 border-b border-edge-subtle bg-inset">
          <LoopForm
            initial={loop}
            onSave={(patch) => onSaveEdit(loop.id, patch)}
            onCancel={onCancelEdit}
          />
        </li>
      );
    }
    return (
      <LoopRow
        key={loop.id}
        loop={loop}
        selected={selectedIds.has(loop.id)}
        focused={focusedId === loop.id}
        density="default"
        onCalendar={loop.timeblocks.some((tb) => week.has(tb.date))}
        onToggleSelect={onToggleSelect}
        onStartEdit={onStartEdit}
        onKill={onKill}
        onQuickSchedule={onQuickSchedule}
      />
    );
  }
}
