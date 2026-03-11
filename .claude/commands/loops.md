# Open Loops

Surface all open action items across the vault, sorted by inferred priority.

1. **Scan** every `.md` file for unchecked tasks (`- [ ]`). Exclude `Templates/`, `assets/`, and `.claude/commands/` — those are template/reference content, not real loops.
2. **Infer priority** using today's date (from system context) for time-aware ranking:
   - **🔴 Now** — due today or tomorrow, "pressing", "urgent", "blocking", overdue
   - **🟡 Soon** — due this week (but not tomorrow), "this week", active project recently touched, no urgency signal
   - **🟢 Someday** — "depends on", "brainstorm", "Phase 3", "explore", stale files (7+ days untouched), `@waiting`

   **Within each priority level, sort by time urgency**: tasks with explicit deadlines come first (nearest deadline on top), then tasks with implicit urgency keywords, then undated tasks. Always check: what day of the week is it today? "Due Thursday" on a Wednesday is 🔴 Now, but on a Monday it's 🟡 Soon.
3. **Group by priority first**, then sub-group by source file within each priority level. Add a **domain emoji** to each sub-group header based on which vault domain the source file lives in:
   - 🔨 **Building** — source in `01-Building/`
   - 🧠 **Thinking** — source in `02-Thinking/`
   - 📋 **Working** — source in `03-Working/`
   - 🏠 **Living** — source in `04-Living/`
   - 👤 **Relating** — source in `05-Relating/`
   - 🗂️ **Archive** — source in `07-Archive/`
4. **Number every loop sequentially** (1, 2, 3...) across all groups so the user can refer to them by number. Format as:
   ```
   ## 🔴 Now

   ### 📋 Project Alpha
   [1] - [ ] First task
   [2] - [ ] Second task

   ### 🔨 API Redesign
   [3] - [ ] Third task

   ## 🟡 Soon

   ### 🔨 API Redesign
   [4] - [ ] Fourth task

   ### 🧠 Research Notes
   [5] - [ ] Fifth task

   ## 🟢 Someday

   ### 🗂️ Weekly Review
   [6] - [ ] Sixth task
   ```
   **Formatting rule**: Always leave a blank line before every `##` and `###` header, and after every code block. No header should touch a code block or task list directly.
5. **Summarize** — total count per priority level.

## Actions

When the user responds with numbers:
- **close [n]**: Check off the task (`- [x]`) in the source file. If the task references a ticket ID from the task manager (e.g., ID-1234, PROJ-456), also close that ticket via MCP automatically.
- **move [n] to [destination]**: Move the task line to the specified file.
- **escalate [n]**: Note that it should become a ticket in the task manager (remind user to create it there since tasks live in the task manager).
- **delete [n]**: Remove the task line from the source file.
- **bump [n] up/down**: Override inferred priority (e.g., "bump 5 up" moves it to 🔴 Now). Add a keyword hint to the task text so it infers correctly next time.

**Ask**: "Give me numbers to close, move, escalate, or bump (e.g., 'close 3, 6' or 'bump 5 up')."

Remember: real task management lives in your task manager. These loops are things that surfaced during thinking/writing in Obsidian — quick captures and in-progress work, not managed tickets.
