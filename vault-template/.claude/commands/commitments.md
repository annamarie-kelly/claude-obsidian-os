# Commitments

Surface ongoing commitments — things you owe people and things people owe you.

1. **Scan** every `.md` file for unchecked tasks (`- [ ]`) that have commitment signals. Exclude `Templates/`, `assets/`, and `.claude/commands/`. Commitment signals include:
   - **Person references**: "for [name]", "to [name]", "[name] wants", "[name] asked", mentions of people in `05-Relating/`
   - **Deadlines**: "due [date]", "by [date]", "before [date]", day names ("Thursday", "Monday"), "this week", "end of week", "EOD"
   - **Waiting signals**: `@waiting`, "waiting on", "blocked on", "need [name] to"
   - **Promise language**: "promised", "committed", "told [name]", "owe", "need to send", "need to share"

2. **Use today's date** (from system context) to calculate urgency:
   - **⚠️ Overdue** — deadline has passed
   - **🔴 Due Today / Tomorrow** — immediate
   - **📅 This Week** — due before end of current week
   - **📆 Coming Up** — has a deadline but not this week
   - **🔄 Waiting On Others** — `@waiting` or "waiting on" signals (things blocked on someone else)
   - **📋 Undated** — commitment to a person but no explicit deadline

3. **Group by urgency first, then by person** within each urgency level. Format:
   ```
   ## ⚠️ Overdue

   ### [Person Name]
   [1] Task description — was due [date] *(source file)*

   ## 🔴 Due Today / Tomorrow

   ### [Person Name]
   [2] Task description — due [date] *(source file)*

   ## 📅 This Week

   ### [Person Name]
   [3] Task description *(source file)*

   ## 📆 Coming Up

   ### [Person Name]
   [4] Task description — due [date] *(source file)*

   ## 🔄 Waiting On Others

   ### @waiting [Person Name]
   [5] What you're waiting for *(source file)*

   ## 📋 Undated Commitments

   ### [Person Name]
   [6] Task description *(source file)*
   ```
   **Formatting rule**: Always leave a blank line before every `##` and `###` header.

4. **Number every commitment sequentially** so the user can refer to them by number.

5. **Summarize** — total commitments, how many overdue, how many due this week.

## Actions

When the user responds with numbers:
- **close [n]**: Check off the task (`- [x]`) in the source file. If it references a ticket ID from the task manager, also close that ticket via MCP.
- **move [n] to [date]**: Update the deadline in the task text.
- **remind [n]**: Add a note to follow up (for @waiting items).
- **delegate [n] to [person]**: Reassign the commitment in the source file.

**Ask**: "Give me numbers to close, move, or follow up on (e.g., 'close 1, 3' or 'move 2 to next Monday')."

Note: This is a lens on the same `- [ ]` items that `/loops` tracks, filtered for interpersonal commitments. Use `/loops` for all open items by priority/domain. Use `/commitments` for what you owe people and what they owe you.
