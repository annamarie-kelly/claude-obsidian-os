'use client';

// SomedayView — parked items. Loops with status === 'someday' live
// here. Intentionally boring: a sortable list with a single Reactivate
// action that kicks the loop back into `triage` for re-evaluation. The
// idea is that Someday is a real choice, not a graveyard — you come
// back monthly, skim the list, and either reactivate or let the prune
// path take it.

import { useMemo, useState } from 'react';
import type { Loop } from '@/lib/types';

type SortKey = 'updated' | 'created' | 'title' | 'stakeholder';

export function SomedayView({
  loops,
  onUpdateLoop,
  onOpenDetail,
}: {
  loops: Loop[];
  onUpdateLoop: (id: string, patch: Partial<Loop>) => Promise<void>;
  onOpenDetail: (id: string) => void;
}) {
  const [sortKey, setSortKey] = useState<SortKey>('updated');

  const someday = useMemo(
    () => loops.filter((l) => !l.done && l.status === 'someday'),
    [loops],
  );

  const sorted = useMemo(() => {
    const copy = [...someday];
    copy.sort((a, b) => {
      if (sortKey === 'title') return a.text.localeCompare(b.text);
      if (sortKey === 'stakeholder') {
        return (a.stakeholder ?? 'zzz').localeCompare(b.stakeholder ?? 'zzz');
      }
      if (sortKey === 'created') {
        return (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '');
      }
      // updated — most recently touched first
      return (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '');
    });
    return copy;
  }, [someday, sortKey]);

  const reactivate = async (id: string) => {
    await onUpdateLoop(id, { status: 'triage' });
  };

  return (
    <main className="flex-1 min-h-0 flex flex-col overflow-hidden">
      <div className="px-5 pt-4 pb-3 flex items-center gap-3 shrink-0">
        <div>
          <h2 className="text-[14px] font-medium text-ink">Someday</h2>
          <p className="text-[11px] text-ink-ghost">
            Parked items. Reviewed monthly. Reactivate to re-enter triage.
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[10px] text-ink-ghost tabular-nums">
            {someday.length} parked
          </span>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="text-[11px] bg-card border border-edge rounded-md px-2 py-1 text-ink-soft focus:outline-none focus:ring-1 focus:ring-[var(--slate)]"
          >
            <option value="updated">Recently updated</option>
            <option value="created">Oldest first</option>
            <option value="title">Title</option>
            <option value="stakeholder">Stakeholder</option>
          </select>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-5 scrollbar-subtle">
        {sorted.length === 0 ? (
          <div className="text-[12px] text-ink-ghost italic pt-10 text-center">
            Nothing parked.
          </div>
        ) : (
          <ul className="flex flex-col divide-y divide-[var(--border-subtle)] border-y border-edge-subtle">
            {sorted.map((l) => (
              <li
                key={l.id}
                className="flex items-center gap-3 py-2.5 hover:bg-inset/40 transition-colors group"
              >
                <button
                  type="button"
                  onClick={() => onOpenDetail(l.id)}
                  className="flex-1 min-w-0 text-left"
                >
                  <div className="text-[12px] text-ink truncate">{l.text}</div>
                  <div className="text-[10px] text-ink-ghost mt-0.5 flex items-center gap-2">
                    {l.priority && <span className="font-mono">{l.priority}</span>}
                    {l.stakeholder && l.stakeholder !== 'None' && (
                      <span>{l.stakeholder}</span>
                    )}
                    {l.subGroup && (
                      <span className="truncate max-w-[200px]">
                        · {l.subGroup}
                      </span>
                    )}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => reactivate(l.id)}
                  className="opacity-0 group-hover:opacity-100 text-[11px] text-ink-soft hover:text-ink px-2 py-1 rounded-md border border-edge hover:border-edge-hover bg-card transition-all"
                  title="Move back to triage for re-evaluation"
                >
                  Reactivate
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
