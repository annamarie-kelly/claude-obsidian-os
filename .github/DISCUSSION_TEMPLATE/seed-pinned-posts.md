# Discussion seed posts

These are draft posts to pin in Discussions once you enable the feature. Copy-paste each into a new discussion with the indicated category and pin it.

---

## 📌 Pinned post 1 — "Show & Tell"

**Category:** Show and tell
**Title:** How are you using Loops OS?

> If you've installed Loops OS and made it your own, share a screenshot, a workflow, or a one-paragraph "this is what I use it for." Quirky setups especially welcome — what folders did you add? What slash commands did you write? What broke down and what didn't?
>
> I'll seed this with how I use it: 38 active loops, P1 capped at 8, daily checkpoint at 3pm, capture from any tab via the Chrome extension. The vault has 06-Loops/ as the canonical state and a couple custom skills that pull from Granola and Affinity.
>
> Drop your version below.

---

## 📌 Pinned post 2 — "Ideas"

**Category:** Ideas
**Title:** Wanted: features you'd build next

> If you had a free Saturday and could ship one feature for Loops OS, what would it be?
>
> A few I'm circling but haven't committed to:
> - A Tauri / native app wrapper (drag-and-drop install instead of curl)
> - Native Windows installer
> - A `?` keyboard shortcut overlay
> - History-calibrated time estimates (loop closes at the actual minute, future estimates learn from it)
> - A per-stakeholder weekly "what shipped" view, generated from done loops
>
> Vote on the above with reactions, or post your own as a reply. Real friction beats clever invention — what's actually slowing you down?

---

## 📌 Pinned post 3 — "Q&A / FAQ"

**Category:** Q&A
**Title:** Frequently asked questions

> A running thread of questions I keep getting. If yours isn't here, post a new Q&A discussion.
>
> **Q: Is this a hosted service or self-hosted only?**
> Self-hosted only. The whole architecture assumes your data lives in a folder you control. Hosted is on the roadmap if there's signal but isn't shipping in v1.
>
> **Q: Do I need Obsidian?**
> No. Loops OS reads/writes a folder of markdown files. Obsidian happens to use the same folder shape, so they coexist nicely if you want both surfaces. But the app stands alone.
>
> **Q: Do I need an Anthropic API key?**
> Only if you want the in-app chat panel to work. The chat panel shells out to your local Claude Code CLI, which has its own auth. The rest of the app is independent.
>
> **Q: Why "loops"?**
> They're not tasks. A task implies a single discrete unit of work that you do and finish. A loop is "an open thing that needs my attention until it's closed" — could be a task, could be a question waiting on someone, could be a decision pending. The frame matters because the system is about closing loops, not ticking boxes.
>
> **Q: What's the relationship to Claude Code?**
> Claude Code is one of the substrates Loops OS runs on. The vault has a `.claude/commands/` folder full of slash commands (`/triage`, `/distill`, etc.) that Claude Code reads as skills. The in-app chat panel is an embedded Claude Code session. You can use Loops OS without Claude Code; you just lose the chat panel and the slash commands.
>
> **Q: Where's the data?**
> A folder on your disk. Default is `~/loops-os/vault-template/` (the bundled demo vault); set `LOOPS_UI_VAULT_ROOT` to point at your own. Markdown files everywhere except `06-Loops/` which has JSON state files.
