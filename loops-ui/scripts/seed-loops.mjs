#!/usr/bin/env node
// seed-loops.mjs — writes a small example `06-Loops/loops.json` so
// a fresh clone has something to look at. Generic, non-identifying
// data. Run once after cloning; any subsequent `npm run refresh-loops`
// will replace this with your own vault's open loops.
//
// Invocation:
//   node scripts/seed-loops.mjs

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOOPS_UI_ROOT = path.resolve(__dirname, '..');
const VAULT_ROOT = process.env.LOOPS_UI_VAULT_ROOT
  ? path.resolve(process.env.LOOPS_UI_VAULT_ROOT)
  : path.resolve(__dirname, '../../vault-template');
const OUT_DIR = path.join(VAULT_ROOT, '06-Loops');
const OUT = path.join(OUT_DIR, 'loops.json');

// Pull the configured stakeholder so seed data uses the same tag the
// app will filter on. Falls back gracefully if the config is missing.
let STAKEHOLDER_TAG = 'Stakeholder';
try {
  const raw = fs.readFileSync(path.join(LOOPS_UI_ROOT, 'loops.config.json'), 'utf-8');
  const cfg = JSON.parse(raw);
  if (cfg?.stakeholder?.tag) STAKEHOLDER_TAG = cfg.stakeholder.tag;
} catch {}

const hash = (file, text) =>
  crypto.createHash('sha256').update(`${file}|${text}`).digest('hex').slice(0, 6);

const loop = (tier, text, pLevel, difficulty, minutes, subGroup, domain, file, line) => ({
  id: hash(file, text),
  tier,
  text,
  pLevel,
  difficulty,
  timeEstimateMinutes: minutes,
  subGroup,
  domain,
  source: { file, line },
  timeblocks: [],
  done: false,
});

const P1S = `P1:${STAKEHOLDER_TAG}`;

const loops = [
  // Now — things the user has accepted as this-week priorities.
  loop('now',   'Draft response to stakeholder on scope reduction proposal',                     P1S,       3, 45,  'Priority asks',               'working',  '03-Working/scope-reduction.md',                1),
  loop('now',   'Wire up daily checkpoint reminder for the 3pm slot',                            'P1:self', 3, 60,  'Capacity protection',         'building', '01-Building/Checkpoint reminder.md',           1),
  loop('now',   'Review benchmark comparison output and flag gaps',                              P1S,       3, 60,  'Benchmarking',                'building', '01-Building/Benchmarking notes.md',            12),

  // Soon — near-term but not urgent.
  loop('soon',  'Audit templates folder, consolidate overlapping ones',                          'P3',      3, 90,  'Vault maintenance',           'thinking', '02-Thinking/Template audit.md',                 1),
  loop('soon',  'Write weekly stakeholder update email template',                                P1S,       2, 30,  'Recurring',                   'relating', '05-Relating/_patterns.md',                     10),
  loop('soon',  'Build /align pre-build alignment gate per spec',                                'P1:self', 3, 90,  'Pattern infrastructure',      'building', '01-Building/SPEC -- Pre-Build Alignment Gate.md', 1),

  // Someday — parked, not dropped.
  loop('someday', 'Sketch decision-velocity metric — time from first meeting to decision',      'P3',      8, 480, 'Pattern infrastructure',      'building', '01-Building/Pattern infrastructure.md',        39),
  loop('someday', '"What can this system do for you" onboarding guide with concrete examples',  'P3',      3, 120, 'Pattern infrastructure',      'building', '01-Building/Pattern infrastructure.md',        34),
  loop('someday', 'Weekend tripwire — prompt "is this P0/P1 or anxiety?" on weekend work',      'P1:self', 3, 60,  'Sanity infrastructure',       'thinking', '02-Thinking/Burnout and sloppiness.md',        110),
  loop('someday', 'Rebuild resume with current platform-engineering skillset',                  'P3',      3, 120, 'Career',                      'living',   '04-Living/Career.md',                          93),
];

const payload = {
  lastScanned: new Date().toISOString().slice(0, 16),
  loops,
};

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(payload, null, 2));
console.log(`Wrote ${loops.length} example loops to ${OUT}`);
console.log(`Primary stakeholder tag: ${STAKEHOLDER_TAG}`);
console.log('Run `npm run refresh-loops` once you have real `- [ ]` items in your vault.');
