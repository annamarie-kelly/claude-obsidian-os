// Scheduling helpers shared by drag-to-drop and "add to next open slot".
// Pure functions so they can be unit-tested without a React tree.

import type { CalendarEvent, Loop, Timeblock } from './types';
import { DAY_END_MIN, DAY_START_MIN, SLOT_MIN } from './ui';

export type Interval = { start: number; end: number };

// Build the list of busy intervals on a given date from calendar events
// and OTHER loops' timeblocks. The skipLoopId parameter lets callers
// exclude the loop being scheduled so it doesn't collide with itself.
// Closed loops still occupy the canvas and count as busy.
export function busyIntervals(
  date: string,
  events: CalendarEvent[] | undefined,
  loops: Loop[],
  skipLoopId: string | null,
): Interval[] {
  const out: Interval[] = [];
  for (const e of events ?? []) {
    if (e.date !== date) continue;
    out.push({ start: e.startMinute, end: e.endMinute });
  }
  for (const l of loops) {
    if (l.id === skipLoopId) continue;
    for (const tb of l.timeblocks) {
      if (tb.date !== date) continue;
      out.push({ start: tb.startMinute, end: tb.endMinute });
    }
  }
  return mergeIntervals(out);
}

// Standard interval merge so "free interval" computation doesn't
// accidentally straddle an overlap.
export function mergeIntervals(intervals: Interval[]): Interval[] {
  if (intervals.length === 0) return [];
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  const out: Interval[] = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const last = out[out.length - 1];
    const cur = sorted[i];
    if (cur.start <= last.end) {
      last.end = Math.max(last.end, cur.end);
    } else {
      out.push({ ...cur });
    }
  }
  return out;
}

// Subtract busy intervals from [windowStart, windowEnd] and return the
// free intervals in chronological order. Each free interval is snapped
// so its start is at or after windowStart.
export function freeIntervals(
  windowStart: number,
  windowEnd: number,
  busy: Interval[],
): Interval[] {
  const out: Interval[] = [];
  let cursor = windowStart;
  for (const b of busy) {
    if (b.end <= cursor) continue;
    if (b.start >= windowEnd) break;
    if (b.start > cursor) {
      out.push({ start: cursor, end: Math.min(b.start, windowEnd) });
    }
    cursor = Math.max(cursor, b.end);
    if (cursor >= windowEnd) break;
  }
  if (cursor < windowEnd) {
    out.push({ start: cursor, end: windowEnd });
  }
  return out.filter((iv) => iv.end - iv.start >= SLOT_MIN);
}

// Greedy fill: walk free intervals in order and carve off chunks until
// we've placed `durationMinutes` total. Returns the emitted blocks.
// If total free capacity < duration, emits what fits (partial commit).
export function splitAroundConflicts(
  date: string,
  startMinute: number,
  durationMinutes: number,
  events: CalendarEvent[] | undefined,
  loops: Loop[],
  skipLoopId: string | null,
): Timeblock[] {
  const busy = busyIntervals(date, events, loops, skipLoopId);
  // Quick path: if nothing overlaps the naive placement, emit a single
  // block. This preserves the "drop lands exactly where the user pointed"
  // feel in the common uncluttered case.
  const naiveEnd = Math.min(startMinute + durationMinutes, DAY_END_MIN);
  const naiveConflict = busy.some((b) => b.start < naiveEnd && b.end > startMinute);
  if (!naiveConflict && naiveEnd - startMinute >= durationMinutes) {
    return [{ date, startMinute, endMinute: naiveEnd }];
  }

  const window = freeIntervals(Math.max(startMinute, DAY_START_MIN), DAY_END_MIN, busy);
  const out: Timeblock[] = [];
  let remaining = durationMinutes;
  for (const iv of window) {
    if (remaining <= 0) break;
    const take = Math.min(iv.end - iv.start, remaining);
    if (take < SLOT_MIN) continue;
    out.push({ date, startMinute: iv.start, endMinute: iv.start + take });
    remaining -= take;
  }
  // If we couldn't place anything (rare: user dropped at the very end of
  // the day into a packed window), fall back to a single trimmed block at
  // the drop point so the UI still registers the intent.
  if (out.length === 0) {
    const end = Math.min(startMinute + durationMinutes, DAY_END_MIN);
    if (end > startMinute) {
      out.push({ date, startMinute, endMinute: end });
    }
  }
  return out;
}
