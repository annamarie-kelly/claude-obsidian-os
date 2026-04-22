// Tiny token-overlap helpers used wherever we need to match a stored
// loop against its line in a markdown file (text can drift after the
// initial scan because of edits, inlined wikilinks, etc).
//
// Pure functions. No imports beyond the language itself, safe to pull
// into server routes, client components, CLI scripts, and pure tests.

// Bag-of-words tokenizer. Lowercases, strips common markdown noise,
// drops tokens shorter than four characters (reduces false overlap on
// filler words like "and", "for").
export function wordSet(s: string): Set<string> {
  return new Set(
    (s || '')
      .toLowerCase()
      .replace(/[`*_~[\]()\-]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 4),
  );
}

// Asymmetric Jaccard-style similarity: what fraction of `a`'s tokens
// also appear in `b`. Returns 0..1. Callers typically threshold at 0.7
// to decide "these are the same loop, text just drifted."
export function similarity(a: string, b: string): number {
  const A = wordSet(a);
  if (A.size === 0) return 0;
  const B = wordSet(b);
  let hits = 0;
  for (const w of A) if (B.has(w)) hits++;
  return hits / A.size;
}
