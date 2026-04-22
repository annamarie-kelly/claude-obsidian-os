// Solid colored dot used in place of emoji status dots.
// Sizes: xs (1.5 rem * 0.3), sm default, md for headers.

import { pBarColor } from '@/lib/ui';
import type { Tier } from '@/lib/types';

const SIZE: Record<string, string> = {
  xs: 'w-1.5 h-1.5',
  sm: 'w-2 h-2',
  md: 'w-2.5 h-2.5',
};

export function PriorityDot({
  pLevel,
  size = 'sm',
}: {
  pLevel: string | null;
  size?: 'xs' | 'sm' | 'md';
}) {
  return (
    <span
      aria-label={pLevel ?? 'no priority'}
      className={`inline-block rounded-full ${SIZE[size]} ${pBarColor(pLevel)}`}
    />
  );
}

const TIER_DOT: Record<Tier, string> = {
  now: 'bg-[var(--rose)]',
  soon: 'bg-[var(--tan)]',
  someday: 'bg-[var(--text-ghost)]',
};

export function TierDot({ tier, size = 'sm' }: { tier: Tier; size?: 'xs' | 'sm' | 'md' }) {
  return (
    <span
      aria-label={tier}
      className={`inline-block rounded-full ${SIZE[size]} ${TIER_DOT[tier]}`}
    />
  );
}
