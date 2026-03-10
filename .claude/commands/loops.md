# Open Loops

Surface all open action items across the vault.

1. **Scan** every `.md` file for unchecked tasks (`- [ ]`). Exclude `Templates/`, `assets/`, and `.claude/commands/` — those are template/reference content, not real loops.
2. **Group by source** — which file/project/pattern does each loop belong to?
3. **Flag stale loops** — any `- [ ]` in a file that hasn't been modified in 7+ days.
4. **Number every loop sequentially** (1, 2, 3...) across all groups so the user can refer to them by number. Format as:
   ```
   ### [Source File] *(modified date or staleness note)*
   [1] - [ ] First task
   [2] - [ ] Second task
   ```
5. **Summarize** — present the full numbered list grouped by project/area.

## Actions

When the user responds with numbers:
- **close [n]**: Check off the task (`- [x]`) in the source file.
- **move [n] to [destination]**: Move the task line to the specified file.
- **escalate [n]**: Note that it should become a ticket in the task manager.
- **delete [n]**: Remove the task line from the source file.

**Ask**: "Give me numbers to close, move, or escalate (e.g., 'close 3, 6' or 'escalate 2')."

Remember: real task management lives in your task manager. These loops are things that surfaced during thinking/writing — quick captures and in-progress work, not managed tickets.
