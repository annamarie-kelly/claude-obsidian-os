# Today — Daily Focus

Quick snapshot of what matters today. Run this to start your day or when you feel scattered.

## Steps

1. **Today's daily note** — read today's daily note from `00-Inbox/` (filename format: `YYYY-MM-DD.md`). Show the tasks and morning mind if present.

2. **Overdue tasks** — run a quick `/loops`-style scan. Surface any `- [ ]` items from files not modified in 7+ days. These are slipping.

3. **Life admin due today** — check `04-Living/` for anything time-sensitive (appointments, deadlines, bills). These are the things most likely to be forgotten.

4. **Active project pulse** — for each active project in `01-Building/`, show the most recent log entry or status. One line each.

5. **Inbox count** — how many unprocessed notes are sitting in `00-Inbox/`? If more than 5, suggest running `/triage`.

6. **Focus suggestion** — based on what's overdue, what's active, and what's been neglected, suggest 1-3 things to focus on today. Keep it honest and actionable.

## Output format

Keep it tight. This should be scannable in 30 seconds:

```
## Today: YYYY-MM-DD

### Focus
1. [most important thing]
2. [second thing]
3. [third thing]

### Tasks from daily note
- [ ] ...

### Overdue (stale)
- [ ] ... (from File.md, 12 days ago)

### Life admin
- [anything time-sensitive today]

### Projects
- Project A: [last status]
- Project B: [last status]

### Inbox: X notes waiting
```
