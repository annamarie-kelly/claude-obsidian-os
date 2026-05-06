# Weekly Priorities

Set the week's hard commitments. 5-7 items max. Everything else waits.

This is the highest-leverage skill in the system. It maps your time against your declared roles. It refuses to let your week be reactive.

## When to run

- Sunday evening or Monday morning, before email opens.
- Whenever the loops state has drifted (more P1s than your cap, scattered focus, no clear week shape).
- Whenever a stakeholder asks "what are you focused on this week?" and you don't have a one-paragraph answer.

## Inputs

The skill reads:

1. **Your role definition.** A short paragraph in `03-Working/_patterns.md` (or wherever your role lives) describing the 2-4 jobs you actually do. If this doesn't exist, ask the user to write it before continuing. Without it, "priorities" reduces to triage.
2. **Open loops.** From `06-Loops/loops.json`, all `status: 'active'` items grouped by P-level and stakeholder.
3. **Last week's checkpoints.** From `06-Loops/checkpoints.json` (or the equivalent), to surface what carried over and what got dropped.
4. **The calendar.** From `06-Loops/calendar-today.json` (and any week-ahead view), to see what time is actually free.

## What to produce

A short markdown file at `03-Working/priorities-<YYYY-Www>.md` (or wherever the user prefers), with three sections:

### 1. The shape of the week

Two to four sentences naming the week's center of gravity. NOT a task list. The argument the week is making. Example:

> This week is about shipping the new triage flow and getting the design review out of the queue. Everything else holds.

### 2. The 5-7 commitments

A bulleted list. Each item maps to one of the user's declared roles. Format:

- `[role tag]` — concrete deliverable, with the artifact / file / outcome named.

Example:

- `[engineering]` — Ship the triage flow refactor (PR merged, spec closed)
- `[stakeholder]` — Send weekly status update by Friday EOD
- `[self]` — Read 2 chapters of the systems book

If a commitment can't be tagged to a declared role, flag it. Either the role definition is incomplete, or the commitment shouldn't be on this list.

### 3. What waits

A second short list of items the user wanted to do this week but is consciously deferring. Naming them is the discipline; the goal is to make the deferral visible, not to optimize the list.

## Refusing to deliver

Refuse to produce a priorities doc in three cases:

1. **No role definition exists.** Ask the user to write one. Two paragraphs is enough. Without it, you're listing tasks, not setting priorities.
2. **More than 7 commitments make the cut.** Push back. "You're listing 9 items. Which two are not actually this week?" Don't collapse to 7 by squeezing; collapse by cutting.
3. **No clear "what waits" list.** If everything is on the list, nothing is. Surface this and ask the user to defer at least 3 things explicitly.

The skill's value is not in producing a doc. It's in forcing the conversation about what the week is actually for.

## After it ships

- Append a one-line entry to `06-Loops/boundary_log.json` recording the priorities-set event with timestamp.
- Optionally announce in the chat panel: "5 commitments set for [week-of]. Defer list: [n] items."
- Surface at end of week (Friday `/reflect`): how many of the 5-7 actually shipped, what carried over, what got dropped.
