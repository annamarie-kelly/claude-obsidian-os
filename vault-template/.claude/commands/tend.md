# Tend — terminal-side write surface

Use this whenever a task would mutate Tend state: creating a loop, accepting or dropping a triage item, closing a loop, snoozing, scheduling a timeblock, adding a note, logging a checkpoint, or recording a boundary. Every sub-command flows through the same `lib/tend-events.ts` pipeline the web UI uses, so the capacity gate, triage gate, close-out gate, and audit log (`06-Loops/events.log.jsonl`) stay consistent across surfaces.

**Prefer this over editing `06-Loops/loops.json` or vault markdown directly.** Direct file edits bypass the gates and produce nothing in the audit trail. If the user says "add a task" or "mark this done," default to a `/tend` sub-command.

All sub-commands wrap `tools/loops-ui/scripts/tend-event.mjs`. The CLI prints a compact `ApplyResult` JSON to stdout and exits `0` applied / `1` gated / `2` rejected.

## Reading state

### `/tend state`

Get fresh state mid-session (richer than the loops context hook).

```bash
curl -s http://localhost:3456/api/tend/state 2>/dev/null || cat 06-Loops/loops.json
```

Returns loops, counts, cap ceilings, and the tail of recent audit events when the web server is up. Falls back to reading `loops.json` directly if the server isn't running.

## Writes

Every command below runs from the vault root.

### `/tend create <title>` — create a new loop (lands in triage)

Use when the user says "add a task," "capture this as a loop," "start tracking X," or dictates a new item mid-session.

```bash
node tools/loops-ui/scripts/tend-event.mjs \
  create_loop '{"title":"<title>","priority":"P2","stakeholder":"<name>","notes":"<optional>","sourceFile":"00-Inbox/manual-loops.md"}'
```

Optional payload fields: `priority` (P0|P1|P2|P3), `stakeholder`, `notes`, `sourceFile`, `sourceLine`, `subGroup`, `timeEstimateMinutes`, `skipTriage` (only for P0), `override_reason` (skips the capacity gate, records the reason on the audit entry).

New loops land in `status: triage` by default. Accept them separately via `/tend accept` when the user confirms.

### `/tend accept <loop_id>` — promote a triage loop to active

Use when the user decides to take on a specific triage loop: "accept that," "let's do the Acme review," etc.

```bash
node tools/loops-ui/scripts/tend-event.mjs \
  accept_loop '{"loop_id":"<id>","priority":"P2","stakeholder":"<name>"}'
```

Required: `loop_id`, `priority`. Optional: `stakeholder`, `override_reason`.

If the capacity gate fires, the CLI exits `1` and prints a JSON body with `gate`, `suggestion`, and counts. Surface the gate reason to the user and suggest one of: (a) accept at P2 instead, (b) drop an existing P1 to free capacity, (c) pass `--override-reason '<reason>'` to force.

### `/tend close <loop_id>` — close a loop (runs the close-out gate)

Use when the user says "ship it," "I'm done with X," "mark Y complete."

```bash
node tools/loops-ui/scripts/tend-event.mjs \
  close_loop '{"loop_id":"<id>","closeout":{"docs":"<short>","stakeholder_notified":"<name>","artifact_path":"<url-or-path>","follow_through_date":"2026-04-22","note":"<optional>"}}'
```

Only `stakeholder_notified` is a hard gate — closing without it returns exit `1` with `gate: "close_out_missing_stakeholder"`. Docs, artifact, and follow-through are advisory; they get recorded on the audit entry as context but don't block. If the user hasn't named a stakeholder, ask "who should I record as notified?" before running this command. Pass `'self'` for solo work.

### `/tend drop <loop_id>` — drop a loop without completing it

Use for "let that go," "kill that one," "deprioritize X to nothing."

```bash
node tools/loops-ui/scripts/tend-event.mjs \
  drop_loop '{"loop_id":"<id>","reason":"<short why>"}'
```

Marks the loop `closedAs: dropped`, flips the source markdown to `- [-]`. Optional `reason` is recorded on the audit entry.

### `/tend snooze <loop_id>` — push a loop out of triage until a date

Use for "not now, next week" or "remind me after the team sync."

```bash
node tools/loops-ui/scripts/tend-event.mjs \
  snooze_loop '{"loop_id":"<id>","until":"2026-04-22"}'
```

`until` is required, must be a future `YYYY-MM-DD`. Past dates are rejected with `gate: "snooze_date_in_past"`.

### `/tend schedule <loop_id>` — add a timeblock

Use when the user wants to put a loop on the week canvas: "block this for tomorrow 10am," "schedule X for Thursday morning."

```bash
node tools/loops-ui/scripts/tend-event.mjs \
  schedule_block '{"loop_id":"<id>","block":{"date":"2026-04-16","startMinute":600,"endMinute":660}}'
```

`startMinute` and `endMinute` are minutes from midnight (600 = 10:00, 660 = 11:00). Converting "10am" requires `10*60=600`.

### `/tend note <loop_id> <text>` — append a note to a loop

Use when the user wants to record a thought, blocker, or progress update on an existing loop.

```bash
node tools/loops-ui/scripts/tend-event.mjs \
  add_note '{"loop_id":"<id>","text":"<note text>"}'
```

### `/tend priority <loop_id>` — change a loop's priority (runs capacity gate)

Use when the user wants to promote or demote an existing loop.

```bash
node tools/loops-ui/scripts/tend-event.mjs \
  update_priority '{"loop_id":"<id>","priority":"P1","stakeholder":"Boss"}'
```

Any of `priority`, `pLevel`, or `stakeholder` can be set. If the change would promote the loop into a full P1:Boss / P1:self / flat-P1 / flat-P2 bucket, the capacity gate fires (exit `1`). Same treatment as `/tend accept`: surface the gate reason, offer override with `--override-reason`.

### `/tend checkpoint <pressure>` — log today's pressure read

Use when the user reflects on their day: "today was reactive," "I chose well today," or when wrapping a 3pm checkpoint from the terminal.

```bash
node tools/loops-ui/scripts/tend-event.mjs \
  log_checkpoint '{"pressure":"chose","source":"terminal","tomorrow_intent":["<intent 1>","<intent 2>"]}'
```

`pressure` must be one of `chose`, `reactive`, `task_monkey`. Writes to `06-Loops/checkpoints.json` so the web UI's PressureHeatmap surfaces the cell on the next poll.

### `/tend boundary <type> <context>` — append to the boundary log

Use when the user says "log a boundary," "I had to push back on X," or when the agent wants to record that it itself declined a request (e.g. refusing to open a 9th P1:Boss loop).

```bash
node tools/loops-ui/scripts/tend-event.mjs \
  log_boundary '{"type":"capacity_override","context":"<short description>","reason":"<why>"}'
```

`type` values to reach for: `capacity_override`, `checkpoint_skip`, `scope_pushback`, `self_protect`.

## Handling gates

When the CLI exits `1`, the stdout JSON has `status: gated`, a `gate` code, and a `suggestion` string. Surface the gate to the user in plain language and offer the suggested path. Examples:

- `capacity_p1_boss_cap` — "the stakeholder's P1 list is at 8/8. I can accept this as P2 instead, or you can override with a reason."
- `capacity_p1_flat_cap` — "Your P1 bucket is at 8/8. I can accept this as P2 instead, or we can drop a stale P1 first."
- `close_out_missing_stakeholder` — "Closing this loop needs a stakeholder on record. Who should I note as notified? (Pass 'self' for solo work.)"
- `snooze_date_in_past` — "That snooze date is in the past — give me a future date."
- `already_accepted` / `already_closed` — the action was a no-op; tell the user the loop is already in that state.

## Common patterns

**Capture a new task under triage, then accept it at P2:**
```bash
node tools/loops-ui/scripts/tend-event.mjs create_loop '{"title":"Review Acme output","priority":"P2","stakeholder":"Boss"}'
# -> {"status":"applied","loop_id":"abc123","audit":{...}}
node tools/loops-ui/scripts/tend-event.mjs accept_loop '{"loop_id":"abc123","priority":"P2","stakeholder":"Boss"}'
```

**Close a loop with a full close-out:**
```bash
node tools/loops-ui/scripts/tend-event.mjs close_loop '{"loop_id":"abc123","closeout":{"docs":"01-Building/Acme.md","stakeholder_notified":"Boss","artifact_path":"artifacts/acme-review-2026-04-15.html","follow_through_date":"2026-04-22"}}'
```

**Terminal check-in at end of day:**
```bash
node tools/loops-ui/scripts/tend-event.mjs log_checkpoint '{"pressure":"chose","source":"terminal","tomorrow_intent":["Finish waterfall v5","Review triage queue"]}'
```

## Why this exists

Before phase 6-7 of the Tend Write Unification work, agents editing from the terminal had to write directly to `06-Loops/loops.json` or to vault markdown, which bypassed every gate (capacity, triage, close-out) and left no audit trail. This skill routes every mutation through `applyEventToDisk`, which holds the same file lock the web UI does, runs the same gates, and writes an authoritative record to `06-Loops/events.log.jsonl`. Use it instead of file edits whenever the user is asking you to change Tend state.
