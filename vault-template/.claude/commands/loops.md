# Open Loops — Task Dashboard

This vault IS the task manager. Surface all open action items.

1. **Scan** every `.md` file for unchecked tasks (`- [ ]`). Exclude `Templates/`, `.obsidian/`, and `.claude/` — those are template/config content, not real tasks.

2. **Group by domain:**
   ```
   ## Building (01-Building/)
   ## Thinking (02-Thinking/)
   ## Working (03-Working/)
   ## Living (04-Living/)
   ## Relating (05-Relating/)
   ## Inbox (00-Inbox/ — daily notes & uncaptured)
   ```

3. **Flag stale tasks** — any `- [ ]` in a file that hasn't been modified in 7+ days gets a warning marker.

4. **Living gets special attention** — life admin tasks (health appointments, bills, errands) slip through cracks. Call these out prominently.

5. **Number every task sequentially** (1, 2, 3...) across all groups:
   ```
   ## Living
   ### finances.md (last modified 12 days ago)
   [1] - [ ] Pay quarterly taxes
   [2] - [ ] Review investment allocations

   ## Building
   ### My Project.md (modified today)
   [3] - [ ] Sketch homepage wireframe
   ```

6. **Summarize** at the top:
   - Total open tasks
   - Stale tasks count
   - Domain with most open items

## Actions

When I respond with numbers:
- **close [n]**: Check off the task (`- [x]`) in the source file.
- **defer [n] to [date or note]**: Move the task to a specific note or add a defer date.
- **move [n] to [destination]**: Move the task line to the specified file.
- **delete [n]**: Remove the task line from the source file (confirm first).

**Ask**: "Give me numbers to close, defer, move, or delete (e.g., 'close 3, 6' or 'defer 2 to next week')."
