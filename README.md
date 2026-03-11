# Claude Code + Obsidian: A Personal OS

An AI-native personal operating system built on Obsidian and Claude Code. It's a **capture-and-compound loop** where raw thinking goes in messy and comes out structured, connected, and actionable.

This isn't a note-taking system. It's a thinking system with an AI processing engine on top.

**Built for anyone who thinks for a living** — engineers, investors, analysts, marketers, researchers, operators. If your work involves capturing ideas, tracking commitments, and compounding knowledge across projects and people, this is for you.

## How It Works

```
Capture fast → Triage into domains → Distill into patterns → Connect → Review → Compound
```

You dump raw thoughts, meeting notes, ideas, and brain dumps into a single inbox. Claude Code processes them: routing notes to the right domain, extracting patterns as claim-style insights, linking related ideas, surfacing open loops, and running weekly metacognition passes.

Over time, your vault accumulates not just *what you did* but *what you learned* and *how your thinking evolved*.

## Vault Structure

```
00-Inbox/          → Single capture point. Everything lands here first.
01-Building/       → Anything being constructed: projects, technical patterns, playbooks
02-Thinking/       → Intellectual life: essays, ideas, references, meta-patterns
03-Working/        → How the business runs: workflow, stakeholders, operations
04-Living/         → Personal life (grows over time)
05-Relating/       → People notes
06-Loops/          → Auto-generated open items dashboard (read-only lens)
07-Archive/        → Done/dead/inactive. Never deleted.
Templates/         → Note templates
.claude/commands/  → Slash commands for Claude Code
```

Organized by **life domain**, not by content type. This means patterns that cut across projects naturally cluster together.

### The `_patterns.md` Convention

Every folder can have a `_patterns.md` file — a synthesized knowledge map for that scope. The `/distill` command writes to these. They replace traditional Maps of Content (MOCs) with something more dynamic: a living index of what you've learned in each domain.

### Scaling Rule

> Flat until it hurts, then nest. Create subfolders when a domain hits 5+ clustered notes.

## The Commands

Nine slash commands power the system. Each maps to a different cognitive operation:

| Command | What it does | When to use |
|---|---|---|
| `/triage` | Route inbox notes to the right domain folders; delegate investigations to background agents | Multiple times/day |
| `/inbox [source]` | Pull external context from MCP sources (calendar, CRM, task board) into inbox | ~Once a day |
| `/distill` | Extract claim-style patterns from raw input | After learning something |
| `/loops` | Surface all open `- [ ]` items, sorted by inferred priority with domain emojis | As needed |
| `/commitments` | Track what you owe people and what they owe you — grouped by urgency and person | As needed |
| `/conductor` | Scan git worktrees for in-progress branches, stashes, uncommitted work | As needed |
| `/find-connections` | Find orphaned notes and suggest missing links | Maintenance |
| `/review` | Weekly synthesis: what changed, what's emerging, promote pattern seeds | Once a week |

### `/triage` — The Workhorse

The most-used command. Reads everything in `00-Inbox/` and for each note:
- Determines what type it is (pattern, reference, project update, action item, person note, investigation request, brain dump)
- Routes it to the right domain folder with proper frontmatter
- Extracts action items as `- [ ]` checkboxes (so they surface in `/loops`)
- **Delegates investigation requests to background agents** — captures like "research competitor pricing" or "look into X framework" get kicked off as async research that writes a structured report to `02-Thinking/reports/`
- Cross-links to related notes
- Asks before deleting the original

Key principle: **inbox notes are captured fast with typos — Claude focuses on extracting signal, not correcting spelling.**

### `/inbox` — External Context Pull

Connects to your work tools via MCP servers and pulls context into the inbox. Designed to be run once a day as a "what happened?" sweep. The template includes hooks for:
- **Meeting transcripts** (Granola) — extracts action items, decisions, commitments
- **CRM/pipeline** (Sonar or your tool of choice) — attention flags, stale interactions, deal updates
- **Task board** (Linear/Jira via Notion) — assigned tickets, recent updates

Customize the MCP tool calls in `.claude/commands/inbox.md` to match your stack.

### `/distill` — Pattern Extraction

The metacognition engine. Takes raw input (brain dump, conversation excerpt, meeting notes) and extracts **claim-style insights** — patterns titled as assertions:

- "In-process tool calls beat MCP transport for latency-sensitive UIs"
- "Good internal tools hide complexity from users"
- "Knowing is horizontal, understanding is vertical"

Each pattern note gets a lifecycle: `seed` → `growing` → `evergreen`. The `/review` command prompts you to promote patterns as they mature.

### `/loops` — Open Items Dashboard (Priority-Inferred)

Scans every `.md` file for unchecked `- [ ]` tasks and **infers priority from natural language** — no tags or annotations needed:

- **🔴 Now** — due today/tomorrow, "urgent", "blocking", "pressing", overdue deadlines
- **🟡 Soon** — due this week, active projects, no urgency signal
- **🟢 Someday** — "depends on", "brainstorm", "explore", stale items, `@waiting`

Priority is **time-aware**: "due Thursday" on a Wednesday is 🔴 Now, but on a Monday it's 🟡 Soon. Each sub-group gets a **domain emoji** (🔨 Building, 🧠 Thinking, 📋 Working, 🏠 Living, 👤 Relating) so you can see at a glance which area of your life each item belongs to.

Actions: close (auto-closes linked task manager tickets via MCP), move, escalate, delete, bump up/down.

### `/commitments` — Relationship Tracker

A different lens on the same `- [ ]` data, filtered for **interpersonal obligations**. Answers: "What do I owe people? What do people owe me?"

Detects commitment signals (person names, deadlines, "promised", "waiting on", `@waiting`) and groups by urgency:

- **⚠️ Overdue** → **🔴 Due Today/Tomorrow** → **📅 This Week** → **📆 Coming Up** → **🔄 Waiting On Others** → **📋 Undated**

Within each urgency level, items are grouped by person. Use `/loops` for the priority view, `/commitments` for the relationship view.

### `/conductor` — Git Worktree Scanner

For engineers: scans your git repos for in-progress work — feature branches, uncommitted changes, stashes, open PRs. Surfaces forgotten work-in-progress.

### `/find-connections` — Link Discovery

Scans for notes that should be linked but aren't. Finds orphans (zero inbound links) and suggests specific `[[wikilinks]]` to add. This is how the vault's knowledge graph stays connected.

### `/review` — Weekly Metacognition

The synthesis pass. Assumes triage and loops have already been run. Focuses on:
- What domains got attention this week
- What patterns are emerging (suggest claim-style titles)
- What seeds are ready to promote to `growing` or `evergreen`
- What notes are orphaned and need connecting
- What felt neglected

## Background Agents & Reports

One of the most powerful patterns: **turning quick inbox captures into full research reports without blocking your workflow.**

When `/triage` encounters an investigation request ("investigate X", "look into Y", "research Z"), it:
1. Spins up a background agent to research the topic
2. The agent uses available tools (MCP integrations, web search, codebase search)
3. Writes a structured report to `02-Thinking/reports/` using `Templates/Report.md`
4. Links the report back to the triggering project or note
5. Deletes the inbox note after kickoff

This means your inbox can contain both quick tasks ("send invoice") and deep questions ("research how competitors handle onboarding") — triage handles both, routing investigations to async research while you keep working.

Reports follow a standard structure: Context, Key Findings, Evidence, Connections, Open Questions. They become permanent reference notes in your vault, cross-linked to the projects and patterns they relate to.

## The Frontmatter Schema

Every note gets structured metadata:

```yaml
---
created: YYYY-MM-DD
type: project | pattern | playbook | essay | reference | person | loop | seed
status: seed | growing | evergreen | active | someday | done | archived
tags: []
---
```

Pattern notes have a lifecycle (`seed → growing → evergreen`). Everything else uses `active | someday | done | archived`.

## Note Naming Conventions

- **Patterns**: Claim-style titles — "Good internal tools hide complexity from users"
- **Playbooks**: "How to [verb]" — "How to audit MCP tool reliability"
- **Projects**: Project name — "Landing Page v2"
- **People**: First name or full name
- **References**: Descriptive title — "System Design Case Studies"

## Core Principles

1. **Inbox is sacred.** Single capture point. Don't enforce formatting on raw captures.
2. **Link > tag.** Connections between notes matter more than categories.
3. **Never delete without asking.** Always confirm before removing content.
4. **Claim-style titles.** Patterns are assertions, not topics. "Authentication is hard" → "JWT cookie auth bridges Django sessions and Next.js cleanly."
5. **Flat until it hurts.** Don't create structure you don't need yet.

## MCP Integration (Optional)

The `/inbox` command is designed to pull from external tools via MCP servers. This is optional — the system works without it. But if you connect your tools, Claude can:

- Pull meeting transcripts and extract action items, decisions, and commitments
- Surface CRM attention flags, stale interactions, deal updates
- Check your task board for assigned tickets
- Cross-reference inbox notes against external data

To customize, edit `.claude/commands/inbox.md` with your MCP tool calls.

## Getting Started

1. Clone this repo into your Obsidian vault directory
2. Install [Claude Code](https://claude.ai/claude-code) if you haven't
3. Open the vault directory in Claude Code and run **`/setup`**

The `/setup` command is an interactive walkthrough that will:

- **Ask about you** — your role, domains, and tools — and customize `CLAUDE.md` to match
- **Configure MCP connectors** — walk through connecting your calendar, email, CRM, task board, and docs (or skip for manual-only)
- **Set up data type conventions** — how action items, patterns, people, projects, references, and meeting notes flow through the system
- **Create starter content** — a project, a person, and a seed pattern from your answers
- **Run a live demo** — creates a messy inbox note and triages it so you can see the system in action

Everything the setup configures is just markdown files — you can edit any of it later.

### After Setup

Your daily rhythm:
- **Capture** to `00-Inbox/` throughout the day (fast, messy, no formatting needed)
- **`/inbox`** once to pull from connected tools (if configured)
- **`/triage`** to route and process inbox notes (investigations auto-delegate to background agents)
- **`/loops`** to check open items by priority
- **`/commitments`** to check what you owe people and what's overdue

Your weekly rhythm:
- **`/review`** — the metacognition pass (what changed, what's emerging, what's orphaned)

When you learn something:
- **`/distill`** — extract patterns from any raw input

Maintenance:
- **`/find-connections`** — keep the knowledge graph connected

## Customization

### Domains

The folder structure maps to life domains. Rename or add folders to match yours:

- `01-Building/` could be `01-Engineering/` or `01-Creating/`
- `03-Working/` could be `03-Business/` or `03-Career/`
- `04-Living/` could hold health, habits, personal goals
- Add `04-Reading/` if that's a major domain for you

### Templates

Edit the templates in `Templates/` to match your workflow. The frontmatter schema is what matters — the body is flexible.

### Commands

Every command in `.claude/commands/` is a markdown file that Claude Code reads as a prompt. Edit them freely — they're just instructions.

## Architecture Decisions

**Why domain-based, not content-type-based?** Because "where does this belong in my life?" is a more natural question than "is this a note or a reference?" Cross-cutting patterns emerge naturally when you organize by domain.

**Why claim-style titles?** Because "Authentication patterns" is a topic. "JWT cookie auth bridges Django sessions and Next.js cleanly" is a *reusable insight*. The title IS the takeaway.

**Why `_patterns.md` instead of MOCs?** MOCs are manually curated indexes. `_patterns.md` files are distillation targets — Claude writes to them during `/distill`, making them living documents that grow with your knowledge.

**Why separate `/triage` and `/inbox`?** Triage is fast and frequent (process what's already captured). Inbox pull is slow and daily (gather external context). Different cadences, different commands.

**Why `- [ ]` for loops instead of a task manager?** These aren't managed tasks — they're open items that surface during thinking. The real task manager (Linear, Jira, Todoist) handles execution. This handles the thinking layer above it.

**Why infer priority instead of tagging?** Inline tags like `#now` or `#someday` are noise in your notes. The system reads natural language signals ("due Thursday", "blocking", "brainstorm") and the current date to sort automatically. Zero annotation overhead.

**Why two views (`/loops` and `/commitments`)?** Same underlying data, different questions. `/loops` answers "what should I work on?" (priority view). `/commitments` answers "what do I owe people?" (relationship view). Both read `- [ ]` items — one groups by urgency/domain, the other by person/deadline.

**Why background agents for research?** Because "look into X" shouldn't block your triage flow. Delegating investigations to async agents means your inbox can contain both 5-second tasks and 5-minute research questions — triage handles both without slowing down.
