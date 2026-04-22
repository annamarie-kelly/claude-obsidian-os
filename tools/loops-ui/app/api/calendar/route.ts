import { NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';

// Multi-day calendar source. File schema:
//   { lastSynced, events: [{id, date, title, startMinute, endMinute}] }
// Route accepts ?start=YYYY-MM-DD&end=YYYY-MM-DD and filters events to the range.
const VAULT_ROOT = process.env.LOOPS_UI_VAULT_ROOT
  ? path.resolve(process.env.LOOPS_UI_VAULT_ROOT)
  : path.resolve(process.cwd(), '../..');
const CAL_PATH = path.join(VAULT_ROOT, '06-Loops/calendar-today.json');

interface RawEvent {
  id: string;
  date: string;
  title: string;
  startMinute: number;
  endMinute: number;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const start = url.searchParams.get('start');
  const end = url.searchParams.get('end');

  try {
    const raw = await fs.readFile(CAL_PATH, 'utf-8');
    const data = JSON.parse(raw) as { lastSynced?: string; events: RawEvent[] };
    const all = data.events ?? [];
    const events =
      !start || !end
        ? all
        : all.filter((e) => e.date >= start && e.date <= end);

    return NextResponse.json({
      lastSynced: data.lastSynced ?? null,
      events,
      available: true,
    });
  } catch {
    return NextResponse.json({ lastSynced: null, events: [], available: false });
  }
}
