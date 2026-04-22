#!/usr/bin/env node
// tend-event.mjs — CLI entry point for the Tend write library.
//
// Usage:
//   node scripts/tend-event.mjs <kind> <json-payload>
//   node scripts/tend-event.mjs --actor agent:abc create_loop '{"title":"..."}'
//
// Writes an `ApplyResult` JSON to stdout. Exit codes:
//   0 applied
//   1 gated
//   2 rejected
//
// The script uses the `tsx` esm loader (already a devDependency) so we
// can import `lib/tend-events.ts` directly without a compile step.

import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const SELF_URL = import.meta.url;
const SELF_PATH = new URL(SELF_URL).pathname;

// Re-exec under tsx if we weren't launched with it. tsx handles the
// .ts import transparently; without it, Node 22+ refuses to load
// TypeScript files. We detect the first run via an env flag so the
// re-exec is strictly one level deep.
if (!process.env.TEND_EVENT_TSX) {
  const loopsUiRoot = path.resolve(path.dirname(SELF_PATH), '..');
  const tsxBin = path.join(loopsUiRoot, 'node_modules/.bin/tsx');
  const result = spawnSync(
    process.execPath,
    ['--import', 'tsx', SELF_PATH, ...process.argv.slice(2)],
    {
      stdio: 'inherit',
      env: { ...process.env, TEND_EVENT_TSX: '1' },
    },
  );
  // Fallback for systems where --import tsx isn't recognized — shell
  // out to the tsx CLI binary directly.
  if (result.status === null && tsxBin) {
    const r2 = spawnSync(tsxBin, [SELF_PATH, ...process.argv.slice(2)], {
      stdio: 'inherit',
      env: { ...process.env, TEND_EVENT_TSX: '1' },
    });
    process.exit(r2.status ?? 2);
  }
  process.exit(result.status ?? 2);
}

const SCRIPT_DIR = path.dirname(new URL(import.meta.url).pathname);
const LOOPS_UI_ROOT = path.resolve(SCRIPT_DIR, '..');

function parseArgs(argv) {
  const out = { actor: 'terminal', kind: null, payload: null };
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--actor') {
      out.actor = argv[++i];
    } else if (a === '--help' || a === '-h') {
      out.help = true;
    } else {
      rest.push(a);
    }
  }
  if (rest.length >= 1) out.kind = rest[0];
  if (rest.length >= 2) out.payload = rest.slice(1).join(' ');
  return out;
}

function printHelpAndExit() {
  process.stdout.write(
    [
      'tend-event.mjs — CLI wrapper around applyEventToDisk',
      '',
      'Usage:',
      '  node scripts/tend-event.mjs [--actor <actor>] <kind> <json-payload>',
      '',
      'Examples:',
      '  node scripts/tend-event.mjs create_loop \'{"title":"Try out the CLI","priority":"P3"}\'',
      '  node scripts/tend-event.mjs --actor agent:cc276374 accept_loop \'{"loop_id":"abc123","priority":"P2"}\'',
      '  node scripts/tend-event.mjs log_checkpoint \'{"pressure":"chose","source":"terminal"}\'',
      '',
      'Event kinds:',
      '  create_loop, accept_loop, update_priority, update_stakeholder,',
      '  update_status, add_note, schedule_block, clear_block, close_loop,',
      '  drop_loop, snooze_loop, log_checkpoint, log_boundary, scan_detected_loop',
      '',
      'Exit codes: 0 applied, 1 gated, 2 rejected',
      '',
    ].join('\n'),
  );
  process.exit(0);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.kind) {
    printHelpAndExit();
  }
  let payload;
  try {
    payload = args.payload ? JSON.parse(args.payload) : {};
  } catch (err) {
    process.stderr.write(
      `[tend-event] invalid JSON payload: ${err.message}\n`,
    );
    process.exit(2);
  }

  const mod = await import(
    pathToFileURL(path.join(LOOPS_UI_ROOT, 'lib/tend-events.ts')).href
  );
  const applyEventToDisk = mod.applyEventToDisk;
  if (typeof applyEventToDisk !== 'function') {
    process.stderr.write(
      '[tend-event] applyEventToDisk export missing from lib/tend-events.ts\n',
    );
    process.exit(2);
  }

  const event = { kind: args.kind, payload };
  let result;
  try {
    result = await applyEventToDisk(event, args.actor);
  } catch (err) {
    const out = {
      status: 'rejected',
      error: err?.message ?? 'unknown_error',
    };
    process.stdout.write(JSON.stringify(out) + '\n');
    process.exit(2);
  }

  // Strip the full state from the stdout payload — the caller (agent
  // or shell script) rarely wants the whole file back. Keep audit +
  // loop_id so downstream code can correlate.
  const compact =
    result.status === 'applied'
      ? {
          status: 'applied',
          loop_id: result.loop_id,
          audit: result.audit,
        }
      : result;
  process.stdout.write(JSON.stringify(compact) + '\n');
  if (result.status === 'applied') process.exit(0);
  if (result.status === 'gated') process.exit(1);
  process.exit(2);
}

main().catch((err) => {
  process.stderr.write(`[tend-event] ${err?.stack ?? err?.message ?? err}\n`);
  process.exit(2);
});
