// GET /api/tend/state — richer state payload than /api/loops.
//
// Returns:
//   {
//     loopsFile: LoopsFile,                     // migrated on read
//     counts: {
//       p1_stakeholder: number,                 // active P1:<stakeholder>
//       p1_self: number,                        // active P1:self
//       p1_flat: number,                        // flat P1 active
//       p2_flat: number,                        // flat P2 active
//       triage: number,                         // status === 'triage'
//     },
//     caps: { p1_stakeholder: 8, p1_self: 5, p1_flat: 8, p2_flat: 20 },
//     recentEvents: AuditEntry[],               // tail of events.log.jsonl
//   }
//
// The endpoint never writes anything; it's safe to poll without a
// lock. Reads loops.json directly and the last ~50 lines of the
// events log.

import { NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import {
  resolveVaultRoot,
  loopsJsonPath,
  eventsLogPath,
  type AuditEntry,
} from '@/lib/tend-audit';
import { migrateLoopsFile } from '@/lib/types';
import {
  countActiveP1Stakeholder,
  countActiveP1Self,
  countFlatPriority,
  P1_STAKEHOLDER_MAX,
  P1_SELF_MAX,
  P1_FLAT_CAP,
  P2_FLAT_CAP,
} from '@/lib/tend-gates';

const RECENT_EVENT_TAIL = 50;

async function readRecentEvents(root: string): Promise<AuditEntry[]> {
  try {
    const raw = await fs.readFile(eventsLogPath(root), 'utf-8');
    const lines = raw.split('\n').filter(Boolean);
    const tail = lines.slice(-RECENT_EVENT_TAIL);
    const out: AuditEntry[] = [];
    for (const line of tail) {
      try {
        out.push(JSON.parse(line) as AuditEntry);
      } catch {
        /* skip malformed line */
      }
    }
    return out;
  } catch {
    return [];
  }
}

export async function GET() {
  try {
    const root = resolveVaultRoot();
    const raw = await fs.readFile(loopsJsonPath(root), 'utf-8');
    const parsed = JSON.parse(raw) as {
      lastScanned?: string;
      loops?: Parameters<typeof migrateLoopsFile>[0]['loops'];
    };
    const loopsFile = migrateLoopsFile(parsed);
    const loops = loopsFile.loops;
    const recentEvents = await readRecentEvents(root);
    return NextResponse.json({
      loopsFile,
      counts: {
        p1_stakeholder: countActiveP1Stakeholder(loops),
        p1_self: countActiveP1Self(loops),
        p1_flat: countFlatPriority(loops, 'P1'),
        p2_flat: countFlatPriority(loops, 'P2'),
        triage: loops.filter((l) => l.status === 'triage').length,
      },
      caps: {
        p1_stakeholder: P1_STAKEHOLDER_MAX,
        p1_self: P1_SELF_MAX,
        p1_flat: P1_FLAT_CAP,
        p2_flat: P2_FLAT_CAP,
      },
      recentEvents,
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Failed to read tend state: ${(err as Error).message}` },
      { status: 500 },
    );
  }
}
