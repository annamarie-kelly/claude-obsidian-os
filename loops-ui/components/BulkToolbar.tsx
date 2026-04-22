'use client';

import type { Tier } from '@/lib/types';
import { TierDot } from './PriorityDot';

export function BulkToolbar({
  count,
  onClose,
  onDelete,
  onMoveTier,
  onClear,
}: {
  count: number;
  onClose: () => void;
  onDelete: () => void;
  onMoveTier: (tier: Tier) => void;
  onClear: () => void;
}) {
  if (count === 0) {
    return (
      <div className="text-[11px] text-ink-ghost font-mono hidden md:flex items-center gap-2">
        <kbd className="text-ink-faint">j/k</kbd>
        <span>nav</span>
        <span className="text-ink-ghost opacity-50">/</span>
        <kbd className="text-ink-faint">x</kbd>
        <span>select</span>
        <span className="text-ink-ghost opacity-50">/</span>
        <kbd className="text-ink-faint">space</kbd>
        <span>close</span>
        <span className="text-ink-ghost opacity-50">/</span>
        <kbd className="text-ink-faint">1 2 3</kbd>
        <span>tier</span>
      </div>
    );
  }

  const btn = 'px-2.5 py-1 rounded-md text-xs font-medium transition-colors';
  const tiers: Tier[] = ['now', 'soon', 'someday'];

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-ink-soft mr-1 tabular-nums">{count} selected</span>
      <button
        onClick={onClose}
        className={`${btn} bg-sage-fill text-sage-text hover:bg-[var(--sage)]/20`}
      >
        Close
      </button>
      <div className="flex items-center gap-0.5 rounded-md bg-inset p-0.5">
        {tiers.map((t) => (
          <button
            key={t}
            onClick={() => onMoveTier(t)}
            className={`${btn} flex items-center gap-1.5 hover:bg-card text-ink-soft capitalize`}
          >
            <TierDot tier={t} size="xs" />
            {t}
          </button>
        ))}
      </div>
      <button
        onClick={onDelete}
        className="px-2 py-1 text-[11px] text-ink-ghost hover:text-rose-text transition-colors"
        title="Delete from source files (irreversible)"
      >
        delete
      </button>
      <button onClick={onClear} className={`${btn} text-ink-ghost hover:text-ink-soft`}>
        Clear
      </button>
    </div>
  );
}
