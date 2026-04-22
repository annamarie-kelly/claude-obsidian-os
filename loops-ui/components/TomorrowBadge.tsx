'use client';

// TomorrowBadge: a small inline chip that marks a loop as "tagged
// yesterday for today." Reads the prior day's checkpoint (keyed by
// local YYYY-MM-DD) and shows a quiet mauve pill if this loop's id
// is in `tomorrow_intent`.
//
// NO EMOJI — just text inside a pill.

import { useEffect, useState } from 'react';
import {
  readCheckpoint,
  TEND_EVENT,
  yesterdayLocalDate,
} from '@/lib/tend';

export function TomorrowBadge({ loopId }: { loopId: string }) {
  const [hit, setHit] = useState(false);

  useEffect(() => {
    const refresh = () => {
      const cp = readCheckpoint(yesterdayLocalDate());
      setHit(!!cp && cp.tomorrow_intent.includes(loopId));
    };
    refresh();
    const handler = () => refresh();
    window.addEventListener(TEND_EVENT, handler);
    return () => window.removeEventListener(TEND_EVENT, handler);
  }, [loopId]);

  if (!hit) return null;

  return (
    <span
      className="text-[9px] font-mono px-1.5 py-[1px] rounded bg-mauve-fill text-mauve-text shrink-0"
      title="You chose this as a tomorrow-intent yesterday"
    >
      tagged
    </span>
  );
}
