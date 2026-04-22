// POST /api/tend/event — thin wrapper around applyEventToDisk. Takes a
// TendEvent body, runs it through the gate + lock + audit pipeline,
// returns the ApplyResult as JSON. HTTP status codes:
//   200 applied
//   409 gated
//   400 rejected
// so a caller using only the status code still gets the right signal.
//
// The `actor` field defaults to 'web' but can be overridden by the
// caller (e.g. a hook posting as 'hook'). Agent actors must be prefixed
// with `agent:` per the type definition.

import { NextResponse } from 'next/server';
import { applyEventToDisk } from '@/lib/tend-events';
import type { TendEvent } from '@/lib/tend-events';
import type { Actor } from '@/lib/tend-audit';

export async function POST(request: Request) {
  let body: { event?: TendEvent; actor?: Actor };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { status: 'rejected', error: 'invalid_json' },
      { status: 400 },
    );
  }
  const event = body?.event;
  const actor: Actor = body?.actor ?? 'web';
  if (!event || typeof event.kind !== 'string') {
    return NextResponse.json(
      { status: 'rejected', error: 'missing_event' },
      { status: 400 },
    );
  }
  const result = await applyEventToDisk(event, actor);
  if (result.status === 'applied') {
    // Strip the full state from the successful response — callers
    // that want fresh state should hit GET /api/tend/state or
    // /api/loops. Keeps the response compact.
    return NextResponse.json({
      status: 'applied',
      loop_id: result.loop_id,
      audit: result.audit,
    });
  }
  if (result.status === 'gated') {
    return NextResponse.json(result, { status: 409 });
  }
  return NextResponse.json(result, { status: 400 });
}
