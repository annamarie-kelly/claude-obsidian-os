'use client';

// OverrideBadge: a small clickable chip in the Header that shows how
// many capacity overrides were logged this week. Clicking it opens
// the BoundaryLogPanel.
//
// Rendering rules:
//   0 overrides → a quiet outline chip labelled "boundary log"
//   1+          → a tan/rose-tinted chip with a CSS dot and the count
//
// NO EMOJI. The dot is a CSS span.

import { useEffect, useState } from 'react';
import { overrideCountThisWeek, TEND_EVENT } from '@/lib/tend';

export function OverrideBadge({ onOpen }: { onOpen: () => void }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const refresh = () => setCount(overrideCountThisWeek());
    refresh();
    const handler = () => refresh();
    window.addEventListener(TEND_EVENT, handler);
    // Also refresh on visibility change so a tab re-focused after
    // midnight Monday sees a reset count.
    const onVis = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener(TEND_EVENT, handler);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  const active = count > 0;
  // Color ramp: 1-2 tan (soft heads-up), 3+ rose (over-line).
  const toneClass = !active
    ? 'text-ink-ghost border-edge hover:border-edge-hover hover:text-ink-soft'
    : count >= 3
      ? 'text-rose-text border-[var(--rose)]/40 bg-rose-fill'
      : 'text-tan-text border-[var(--tan)]/40 bg-tan-fill';

  return (
    <button
      type="button"
      onClick={onOpen}
      title={
        active
          ? `${count} capacity override${count === 1 ? '' : 's'} this week — open boundary log (⌘⇧B)`
          : 'Open boundary log (⌘⇧B)'
      }
      className={`flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-md border-[0.5px] transition-colors ${toneClass}`}
      aria-label="Boundary log"
    >
      {active && (
        <span
          className="w-[6px] h-[6px] rounded-full shrink-0"
          style={{
            background:
              count >= 3 ? 'var(--rose)' : 'var(--tan)',
          }}
          aria-hidden
        />
      )}
      {active ? (
        <span className="tabular-nums">
          {count} override{count === 1 ? '' : 's'}
        </span>
      ) : (
        <span>boundary log</span>
      )}
    </button>
  );
}
