# Plan — Research-Backed Goal Planning

Turn a goal, application, project, or ambition into a structured, researched action plan with checkboxes you can work through.

**Input:** A goal or project description as `$ARGUMENTS` (e.g., "YC application due May 4", "ceramics studio setup", "launch newsletter")

## What this is NOT

- NOT `/decompose` — that's for breaking code specs into implementation tasks
- NOT `/research` — that's for learning about a topic
- NOT `/spec` — that's for writing agent specs

`/plan` is for **goals that need structured thinking**: applications, launches, life transitions, creative projects, business decisions. The output is a working document you iterate on, not a one-shot report.

## Process

### Step 1: Understand the goal

Read `$ARGUMENTS`. If a file path is given, read it for context. Then ask the user:

- **What's the deadline?** (or is this open-ended?)
- **What does done look like?** (submitted application? launched product? decision made?)
- **What do you already have?** (existing notes, prior work, materials)

Skip questions that are obvious from context.

### Step 2: Research what's needed

Launch 2-3 agents in parallel:

**Agent 1 — External Research** (general-purpose, haiku)
- Search the web for what this goal actually requires
- For applications: find the actual questions, requirements, deadlines, tips from people who succeeded
- For projects: find checklists, common pitfalls, best practices
- For decisions: find frameworks, comparable examples, trade-offs
- Return structured findings — don't write files

**Agent 2 — Vault Scout** (Explore, haiku)
- Search the vault for anything relevant to this goal
- Check all domains: 00-Inbox through 07-Archive
- Look for: existing notes on the topic, related projects, people involved, prior thinking, open `- [ ]` tasks
- Find material that could answer questions or provide content
- Return file paths + what's relevant about each

**Agent 3 — Gap Analysis** (general-purpose, haiku) — only if the goal is complex
- Given the external research results and vault findings, identify:
  - What's already answered by vault content
  - What needs new thinking or creation
  - What's blocked on external factors
  - What order to tackle things in

### Step 3: Build the plan

Synthesize all findings into a structured plan document. Use this template:

```markdown
---
created: YYYY-MM-DD
type: project
status: active
tags: []
---
# [Goal Title] — Plan

**Deadline:** [date or "open-ended"]
**Done when:** [clear completion criteria]

## What I already have

[Vault findings — wikilink to existing notes that are relevant]

## The plan

### Phase 1: [Name] (by [date if applicable])

- [ ] [Specific action item]
  - *What this needs:* [brief context]
  - *Vault material:* [[existing note]] or "needs new thinking"
- [ ] [Another action item]
  - *What this needs:* [context]
- [ ] [...]

### Phase 2: [Name]

- [ ] [...]

### Final: [Submit / Launch / Decide]

- [ ] [Final action]

## Questions to think through

For each question below, write your answer directly beneath it. These are the hard questions — the ones where your thinking matters more than research.

### [Question 1 from the research]
*Context: [why this question matters, what good answers look like]*

[Space for the user to write]

### [Question 2]
*Context: [...]*

[Space for the user to write]

## Resources found

| Source | What it tells you | Link |
|--------|-------------------|------|
| [source] | [relevance] | [url or [[vault note]]] |

## Open loops

- [ ] [Things that are blocked or need follow-up]
```

### Step 4: Present and confirm

Before writing the file, show the user:
- The proposed plan structure (phases + key questions)
- What vault material was found
- Any gaps or concerns
- The proposed file location

**Wait for confirmation.**

### Step 5: Write and register

1. Write the plan to the appropriate domain folder:
   - Career/business goals → `01-Building/[Goal Title] — Plan.md`
   - Life admin goals → `04-Living/[Goal Title] — Plan.md`
   - Learning goals → `02-Thinking/[Goal Title] — Plan.md`
   - Not sure → `00-Inbox/[Goal Title] — Plan.md`

2. If the goal came from an existing spec (like `$ARGUMENTS` is a file path), update that spec's status and add a link to the plan.

## Rules

- **Research before structuring** — don't guess what the application asks; look it up
- **Check the vault first** — don't make the user re-answer questions they've already written about
- **Questions > tasks** — for goals like applications, the hard part is the thinking, not the logistics. Prioritize surfacing the right questions over creating busywork checkboxes
- **Realistic phasing** — if there's a deadline, work backward. Don't create a 40-item plan for something due in 3 days
- **One plan per goal** — if a plan already exists for this goal, update it instead of creating a duplicate
- **Agents must NEVER write files** — only the lead (you) writes the final plan. Agents return text.
- **Use [[wikilinks]]** to connect to existing vault notes
- **Today's date:** use actual current date in YYYY-MM-DD format
