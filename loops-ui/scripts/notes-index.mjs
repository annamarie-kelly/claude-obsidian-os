#!/usr/bin/env node
/**
 * notes-index.mjs — aggregate every in-loop note into a single
 * scannable markdown file at `06-Loops/notes.md`.
 *
 * Why this exists: the Tend UI lets you drop inline notes on a loop
 * while you're working it (context, blockers, who said what). Those
 * notes live in `loops.json` only, which is fine for the UI but
 * invisible to Obsidian search and to terminal Claude. This script
 * denormalizes them into a flat markdown index that:
 *
 *   - Shows up in Obsidian's global search
 *   - Is grep-able from the terminal (`rg "card attachments" 06-Loops`)
 *   - Is surfaced into every terminal Claude prompt by the loops-context
 *     hook (see .claude/hooks/loops-context.sh)
 *
 * Runs as an idempotent write — safe to call on every /loops refresh
 * or as a one-shot when you want a fresh dump. Writes atomically and
 * preserves the YAML frontmatter Obsidian needs.
 *
 * Usage:
 *   node loops-ui/scripts/notes-index.mjs         # write
 *   node loops-ui/scripts/notes-index.mjs --dry   # stdout preview
 */

import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const VAULT = process.env.LOOPS_UI_VAULT_ROOT
  ? path.resolve(process.env.LOOPS_UI_VAULT_ROOT)
  : path.resolve(__dirname, '../../vault-template');
const LOOPS_JSON = path.join(VAULT, '06-Loops/loops.json');
const OUT = path.join(VAULT, '06-Loops/notes.md');

function stripMd(s) {
  return (s || '')
    .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_m, tgt, alias) => {
      const raw = alias || tgt;
      return raw.split('/').pop() ?? raw;
    })
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .trim();
}

function relativeTime(iso) {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return '';
  const diff = Date.now() - then;
  const min = Math.round(diff / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.round(hr / 24);
  if (d < 7) return `${d}d ago`;
  const w = Math.round(d / 7);
  if (w < 5) return `${w}w ago`;
  return new Date(iso).toLocaleDateString();
}

function main() {
  const dry = process.argv.includes('--dry');
  const data = JSON.parse(fs.readFileSync(LOOPS_JSON, 'utf-8'));
  const loops = data.loops ?? [];

  // Collect (loop, note) pairs and sort by note createdAt desc so the
  // most recent thinking bubbles to the top.
  const rows = [];
  for (const loop of loops) {
    for (const note of loop.notes ?? []) {
      rows.push({ loop, note });
    }
  }
  rows.sort((a, b) =>
    (b.note.createdAt ?? '').localeCompare(a.note.createdAt ?? ''),
  );

  // Stats
  const userNoteCount = rows.filter((r) => !r.note.system).length;
  const systemNoteCount = rows.length - userNoteCount;
  const loopsWithNotes = new Set(rows.map((r) => r.loop.id)).size;

  const lines = [];
  lines.push('---');
  lines.push('type: reference');
  lines.push('status: active');
  lines.push(`last-scanned: ${new Date().toISOString().slice(0, 16)}`);
  lines.push('tags: [loops, notes, index]');
  lines.push('shelf-life: tactical');
  lines.push('---');
  lines.push('');
  lines.push('# Loop notes index');
  lines.push('');
  lines.push(
    `Auto-generated from \`06-Loops/loops.json\`. Do not hand-edit — run \`npm --prefix loops-ui run notes-index\` to regenerate. Source of truth for notes is the Tend UI detail drawer; this file is a scannable denormalization so Obsidian search and terminal Claude can find them.`,
  );
  lines.push('');
  lines.push(
    `**${userNoteCount}** user notes · **${systemNoteCount}** system notes · across **${loopsWithNotes}** loops`,
  );
  lines.push('');

  if (rows.length === 0) {
    lines.push('_No notes yet._');
  } else {
    // Group by loop so multi-note loops stay together, preserving the
    // global newest-first order by anchoring on the loop's most recent
    // note.
    const seenLoopIds = new Set();
    const orderedLoops = [];
    for (const { loop } of rows) {
      if (seenLoopIds.has(loop.id)) continue;
      seenLoopIds.add(loop.id);
      orderedLoops.push(loop);
    }

    for (const loop of orderedLoops) {
      const loopNotes = (loop.notes ?? [])
        .slice()
        .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
      if (loopNotes.length === 0) continue;

      const title = stripMd(loop.text);
      const src = loop.source?.file
        ? `[[${loop.source.file.replace(/\.md$/, '')}]]`
        : '';
      const tierLabel = { now: '🔴 Now', soon: '🟡 Next', someday: '🟢 Later' }[
        loop.tier
      ] ?? loop.tier;
      const doneLabel = loop.done
        ? loop.closedAs === 'dropped'
          ? ' · dropped'
          : ' · done'
        : '';
      const meta = [tierLabel, loop.pLevel, loop.workMode, doneLabel]
        .filter(Boolean)
        .join(' · ');

      lines.push(`## ${title}`);
      lines.push('');
      lines.push(`_${meta}${src ? ` · ${src}` : ''}_`);
      lines.push('');
      for (const n of loopNotes) {
        const ts = n.createdAt
          ? `${relativeTime(n.createdAt)} · ${n.createdAt.slice(0, 16)}`
          : '';
        const prefix = n.system ? '>' : '-';
        const body = (n.text ?? '').split('\n').join(`\n${prefix} `);
        lines.push(`${prefix} ${body}`);
        if (ts) lines.push(`${prefix} _${ts}_`);
        lines.push('');
      }
    }
  }

  const out = lines.join('\n');
  if (dry) {
    process.stdout.write(out);
    return;
  }
  const tmp = OUT + '.tmp';
  fs.writeFileSync(tmp, out, 'utf-8');
  fs.renameSync(tmp, OUT);
  console.log(
    `✓ wrote ${path.relative(VAULT, OUT)} · ${rows.length} notes across ${loopsWithNotes} loops`,
  );
}

main();
