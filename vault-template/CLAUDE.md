# CLAUDE.md — Personal OS

## What This Is
A domain-based personal operating system for capturing patterns, tracking projects, and compounding knowledge.

This vault is **personal**. Tasks live in your task manager (Linear, Jira, etc.). This is where thinking happens.

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
.claude/commands/  → Slash commands: /triage, /distill, /loops, /commitments, /review, /prune, /reindex
```

### The `_patterns.md` Convention
Every folder at any level can have a `_patterns.md` file — synthesized knowledge for that scope. The `/distill` command writes to these. They replace MOCs.

### Scaling Rule
> Flat until it hurts, then nest. Create subfolders when a domain hits 5+ clustered notes.

## Frontmatter Schema

Every note gets:
```yaml
---
created: YYYY-MM-DD
type: project | pattern | playbook | essay | reference | person | loop | seed | episode | failure | decision | convention | trail
status: (see below)
shelf-life: foundational | tactical | observational
tags: []
---
```

### Status Values
- **Pattern notes** (`type: pattern`): `seed` → `growing` → `evergreen`
- **Everything else**: `active` | `someday` | `done` | `archived`

### Shelf Life
Controls auto-pruning via `/prune`. Default is `foundational` if omitted.
- **foundational** — permanent retention. Patterns, decisions, conventions, people, projects
- **tactical** — 14-day expiration. Session-specific observations, "for now" notes, working state
- **observational** — 30-day expiration. Time-bounded context, meeting-specific notes, temporary references

`/prune` moves expired notes to `07-Archive/` based on `created` date + shelf-life.

### Record Type Guidance
When creating a note about something learned, pick the most specific type:
- **pattern** — a recurring approach that works (e.g. "X beats Y for Z")
- **failure** — a lesson from something that broke (e.g. "X breaks when Y because Z")
- **decision** — why you chose X over Y, with rationale preserved
- **convention** — a rule you follow (formatting, naming, workflow)
- **episode** — what happened on a specific date (meeting, session, incident)
- **playbook** — a step-by-step procedure ("How to X")
- **trail** — a named sequence of wikilinks (a reading path with a purpose)
- **reference** — pointer to external material
- **essay** — longer-form thinking piece

Failures and decisions used to get written as patterns, which conflated "observation about the world" with "hard-won lesson from a specific incident." Use the sharper type.

### `_patterns.md` files get extra fields:
```yaml
scope: building | thinking | working | etc.
last-distilled: YYYY-MM-DD
```

## The Two-Axis Model (Domain × Memory Type)

The vault runs on two axes, not one:

**Axis 1 — Domain** (folders): `01-Building / 02-Thinking / 03-Working / 04-Living / 05-Relating`

**Axis 2 — Memory type** (via `type:` frontmatter):
- **Episodic** (what happened when) — `type: episode`
- **Semantic** (what I know) — `type: pattern | decision | failure | convention | essay | reference`
- **Procedural** (how to do things) — `type: playbook`

Every note gets BOTH a folder AND a memory type. This makes cross-axis queries tractable: "show me all failures across building and working," "find procedural notes in 03-Working," "what episodes produced this pattern."

The consolidation loop — distilling episodic captures into semantic patterns — is the highest-value workflow in the vault. Your `/distill` command is already this.

**Exception:** `02-Thinking/` is structurally semantic-only by design. It's the durable thinking layer — patterns, essays, references, meta-observations. Episodic content about thinking belongs in `02-Thinking/episodic/` (a sub-carve-out for daily session records) or in the domain where the thinking was applied.

**Why two axes:** with one axis (domain only), the vault is a topical index. With two axes, it becomes a queryable memory system. The cost is tiny (one frontmatter field per note). The value is compound.

## Conventions

### Note Naming
- Patterns: Claim-style titles (e.g., "Streaming responses require careful async boundary management")
- Playbooks: "How to [verb]" (e.g., "How to run an effective code review")
- Projects: Project name (e.g., "API Redesign", "Landing Page v2")
- People: First name or full name

### Tags (use sparingly, link aggressively)
Customize these to your domains. Examples:
`#architecture` `#frontend` `#infrastructure` `#management` `#ai` `#meta`

### Linking
- Use `[[wikilinks]]` for internal connections
- Link to people with `[[05-Relating/Name]]`
- Link to projects with `[[01-Building/Project Name]]`
- Cross-reference patterns liberally

### Where Notes Go — Decision Framework
Ask: "What domain of my life does this belong to?"
- Building software → `01-Building/`
- Intellectual ideas, reading, writing → `02-Thinking/`
- Business operations, stakeholders → `03-Working/`
- Personal life → `04-Living/`
- About a person → `05-Relating/`
- Not sure yet → `00-Inbox/`

## Open Loops — Priority Inference

`/loops` infers priority from natural language — no tags or annotations needed. The system reads task text and context to sort items into 🔴 Now / 🟡 Soon / 🟢 Someday.

**How it works:**
- Tasks with deadlines are ranked by proximity to today's date
- Day names are resolved relative to the current day ("due Thursday" on Wednesday = 🔴 Now, on Monday = 🟡 Soon)
- Keywords like "urgent", "blocking", "pressing" escalate; "brainstorm", "explore", "Phase 3" de-escalate
- Stale items (7+ days untouched) drift to 🟢 Someday
- `@waiting` items are always 🟢 (blocked on someone else)

**Domain emojis** on sub-group headers show which life domain each item comes from:
🔨 Building · 🧠 Thinking · 📋 Working · 🏠 Living · 👤 Relating · 🗂️ Archive

## Commitments — Relationship View

`/commitments` is a separate lens on the same `- [ ]` data, filtered for interpersonal obligations. It answers: "What do I owe people? What do people owe me?"

Groups by urgency (⚠️ Overdue → 🔴 Due Today → 📅 This Week → 📆 Coming Up → 🔄 Waiting → 📋 Undated), then by person within each group.

## Background Agents & Reports

When `/triage` encounters an investigation request ("investigate X", "research Y"), it delegates to a background agent that:
1. Researches the topic using available tools (MCP, web, codebase)
2. Writes a structured report to `02-Thinking/reports/` using `Templates/Report.md`
3. Links the report back to the triggering project or note
4. Deletes the inbox note after kickoff

This turns quick inbox captures like "look into competitor pricing models" into full research reports without blocking your workflow.

## Claude Code Instructions

### Core Principles
1. **Inbox is sacred.** It's the only capture point. The owner captures things fast with typos — don't enforce formatting on raw inbox notes. Focus on extracting signal, not correcting spelling.
2. **Tasks live in your task manager, not here.** Obsidian surfaces open loops (`- [ ]` items) but is not the task management system.
3. **Never delete without asking.** Always confirm before removing content.
4. **Link > tag.** Connections between notes matter more than categories.

### When creating or editing notes:
1. Always include frontmatter with the full schema
2. Prefer claim-style titles for patterns
3. Add `[[wikilinks]]` to related concepts
4. Tag with relevant domain tags
5. Set appropriate status
6. Add to relevant `_patterns.md` if the note fits an existing section

### When triaging inbox (`/triage`):
1. Read the raw capture — don't judge the formatting
2. Determine domain (Building, Thinking, Working, Living, Relating)
3. Determine type (pattern, project update, reference, person, action item)
4. Route to the right folder with proper frontmatter
5. Add `- [ ]` for any action items so they surface in `/loops`
6. Ask before deleting the inbox note

### When distilling (`/distill`):
1. Extract claim-style insights from raw input
2. Create pattern notes in the appropriate domain folder
3. Update the relevant `_patterns.md` file with links to new patterns
4. Cross-link to projects and other patterns

### When researching or summarizing:
1. Save references to `02-Thinking/`
2. Extract patterns to the relevant domain folder
3. Link back to the source
4. Update project notes if applicable
