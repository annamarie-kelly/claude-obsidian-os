// Inline markdown renderer for task text.
//
// Task titles in the vault use `**bold**`, `` `code` ``, and `[[wiki]]`
// links. Rendering them as React nodes lets the UI show the author's
// formatting intent instead of leaking raw markdown into the card.
// Scoped to the subset that actually shows up in task titles — no
// headings, tables, images, or paragraph-level blocks.

import type { ReactNode } from 'react';

type Token =
  | { kind: 'text'; value: string }
  | { kind: 'bold'; value: ReactNode[] }
  | { kind: 'code'; value: string }
  | { kind: 'wiki'; value: string };

/**
 * Minimal inline parser. Handles (in order):
 *   - [[target]] / [[target|alias]] → alias or leaf
 *   - `code` → <code>code</code>
 *   - **bold** → <strong>bold</strong>  (recurses)
 * Unrecognized characters pass through as plain text.
 */
export function renderInlineMarkdown(text: string): ReactNode[] {
  if (!text) return [];
  const tokens: Token[] = [];
  let i = 0;
  const len = text.length;

  const pushText = (s: string) => {
    if (!s) return;
    const last = tokens[tokens.length - 1];
    if (last?.kind === 'text') last.value += s;
    else tokens.push({ kind: 'text', value: s });
  };

  while (i < len) {
    // [[wiki]] or [[wiki|alias]]
    if (text[i] === '[' && text[i + 1] === '[') {
      const end = text.indexOf(']]', i + 2);
      if (end > i) {
        const inner = text.slice(i + 2, end);
        const pipe = inner.indexOf('|');
        const display = pipe >= 0 ? inner.slice(pipe + 1) : inner;
        const leaf = display.split('/').pop() ?? display;
        tokens.push({ kind: 'wiki', value: leaf });
        i = end + 2;
        continue;
      }
    }
    // `inline code`
    if (text[i] === '`') {
      const end = text.indexOf('`', i + 1);
      if (end > i) {
        tokens.push({ kind: 'code', value: text.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }
    // **bold** (recurses so `code` and [[wiki]] inside bold still work)
    if (text[i] === '*' && text[i + 1] === '*') {
      const end = text.indexOf('**', i + 2);
      if (end > i + 2) {
        const inner = text.slice(i + 2, end);
        tokens.push({ kind: 'bold', value: renderInlineMarkdown(inner) });
        i = end + 2;
        continue;
      }
    }
    pushText(text[i]);
    i += 1;
  }

  const out: ReactNode[] = [];
  tokens.forEach((t, idx) => {
    if (t.kind === 'text') {
      out.push(t.value);
    } else if (t.kind === 'bold') {
      out.push(
        <strong key={`b${idx}`} className="font-semibold">
          {t.value}
        </strong>,
      );
    } else if (t.kind === 'code') {
      out.push(
        <code
          key={`c${idx}`}
          className="font-mono text-[0.92em] px-1 py-[1px] rounded bg-inset"
        >
          {t.value}
        </code>,
      );
    } else {
      out.push(
        <span key={`w${idx}`} className="text-ink-soft underline decoration-dotted decoration-ink-ghost/60 underline-offset-2">
          {t.value}
        </span>,
      );
    }
  });
  return out;
}
