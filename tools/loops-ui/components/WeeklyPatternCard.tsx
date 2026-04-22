'use client';

// WeeklyPatternCard: shows the result of the manual pattern scan.
// Renders in the ReflectionView. When no pattern has been generated
// (or it's dismissed) shows a "Scan week" CTA.

import type { WeeklyPattern } from '@/lib/types';

export function WeeklyPatternCard({
  pattern,
  onScan,
  onDismiss,
  onOpenDetail,
}: {
  pattern: WeeklyPattern | null;
  onScan: () => void;
  onDismiss: () => void;
  onOpenDetail: (id: string) => void;
}) {
  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <div className="text-[10px] uppercase tracking-[0.08em] text-ink-ghost">
          Weekly pattern scan
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onScan}
            className="text-[11px] text-ink-soft hover:text-ink bg-inset hover:bg-card px-2.5 py-1 rounded-md border-[0.5px] border-edge hover:border-edge-hover transition-colors"
          >
            {pattern ? 'Re-scan' : 'Scan last 7 days'}
          </button>
          {pattern && !pattern.dismissed && (
            <button
              type="button"
              onClick={onDismiss}
              className="text-[11px] text-ink-ghost hover:text-ink-soft px-2 py-1 rounded-md hover:bg-inset transition-colors"
            >
              Dismiss
            </button>
          )}
        </div>
      </div>

      {!pattern || pattern.dismissed ? (
        <div className="bg-card border border-edge rounded-lg px-4 py-5 text-[12px] text-ink-faint italic">
          {!pattern
            ? 'No scan yet. Click "Scan last 7 days" to surface recurring terms across your note activity.'
            : 'Dismissed. Re-scan to refresh.'}
        </div>
      ) : pattern.terms.length === 0 ? (
        <div className="bg-card border border-edge rounded-lg px-4 py-5 text-[12px] text-ink-faint italic">
          No terms repeated across 3+ loops in the last 7 days.
        </div>
      ) : (
        <div className="bg-card border border-edge rounded-lg p-4">
          <div className="text-[10px] text-ink-ghost tabular-nums font-mono mb-3">
            week of {pattern.week_start} · scanned{' '}
            {new Date(pattern.generated_at).toLocaleString()}
          </div>
          <ul className="flex flex-col gap-3">
            {pattern.terms.map((term) => (
              <li key={term.term}>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-[13px] text-ink font-medium">
                    {term.term}
                  </span>
                  <span className="text-[10px] text-ink-ghost tabular-nums font-mono">
                    {term.loop_ids.length} loops · {term.frequency} mentions
                  </span>
                </div>
                <ul className="flex flex-col gap-0.5 pl-3">
                  {term.loop_titles.slice(0, 5).map((title, idx) => (
                    <li key={term.loop_ids[idx]}>
                      <button
                        type="button"
                        onClick={() => onOpenDetail(term.loop_ids[idx])}
                        className="text-[11px] text-ink-soft hover:text-ink text-left"
                      >
                        · {title}
                      </button>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
