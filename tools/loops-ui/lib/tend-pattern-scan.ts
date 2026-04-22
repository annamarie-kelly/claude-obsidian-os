'use client';

// TF-style pattern scan over the last 7 days of loop notes.
//
// Tokenize non-system notes whose `createdAt` is within the last 7
// days. Filter stopwords, short words (<4 chars), and word shapes
// that aren't worth surfacing (pure numerics, urls). Count per-term
// distinct loop hits; surface any term that appears in ≥3 distinct
// loops.

import type { Loop, WeeklyPattern, WeeklyPatternTerm } from './types';
import { weekStartLocal } from './tend';

const STOPWORDS = new Set<string>([
  'the', 'and', 'for', 'that', 'this', 'with', 'from', 'have', 'into',
  'about', 'were', 'will', 'would', 'should', 'there', 'their', 'them',
  'they', 'then', 'than', 'what', 'when', 'where', 'which', 'while',
  'your', 'yours', 'mine', 'just', 'also', 'like', 'some', 'more',
  'most', 'very', 'over', 'still', 'been', 'being', 'because', 'after',
  'before', 'each', 'other', 'only', 'same', 'here', 'onto', 'once',
  'does', 'done', 'doing', 'having', 'make', 'made', 'take',
  'took', 'need', 'needs', 'want', 'wants', 'know', 'knew', 'look',
  'loop', 'loops', 'note', 'notes', 'task', 'tasks', 'today', 'yesterday',
  'tomorrow',
]);

const MIN_DISTINCT_LOOPS = 3;

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[`*_~[\]()\-.,;:!?"'/<>{}|\\]+/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !STOPWORDS.has(w) && !/^\d+$/.test(w));
}

export function scanWeeklyPattern(loops: Loop[]): WeeklyPattern {
  const weekStart = weekStartLocal();
  const weekStartISO = weekStart.toISOString().slice(0, 10);
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;

  const termHits = new Map<
    string,
    { frequency: number; loopIds: Set<string>; titles: Map<string, string> }
  >();

  for (const l of loops) {
    const notes = l.notes ?? [];
    for (const n of notes) {
      if (n.system) continue;
      const t = new Date(n.createdAt).getTime();
      if (!Number.isFinite(t) || t < cutoff) continue;
      const tokens = tokenize(n.text);
      const seen = new Set<string>();
      for (const tk of tokens) {
        if (seen.has(tk)) continue;
        seen.add(tk);
        let entry = termHits.get(tk);
        if (!entry) {
          entry = { frequency: 0, loopIds: new Set(), titles: new Map() };
          termHits.set(tk, entry);
        }
        entry.frequency += 1;
        entry.loopIds.add(l.id);
        entry.titles.set(l.id, l.text);
      }
    }
  }

  const terms: WeeklyPatternTerm[] = [];
  for (const [term, entry] of termHits.entries()) {
    if (entry.loopIds.size < MIN_DISTINCT_LOOPS) continue;
    terms.push({
      term,
      frequency: entry.frequency,
      loop_ids: [...entry.loopIds],
      loop_titles: [...entry.loopIds].map((id) => entry.titles.get(id) ?? id),
    });
  }
  terms.sort(
    (a, b) =>
      b.loop_ids.length - a.loop_ids.length || b.frequency - a.frequency,
  );

  return {
    week_start: weekStartISO,
    generated_at: new Date().toISOString(),
    terms: terms.slice(0, 12),
    dismissed: false,
  };
}
