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
.claude/commands/  → Slash commands: /triage, /distill, /loops, /review
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
type: project | pattern | playbook | essay | reference | person | loop | seed
status: (see below)
tags: []
---
```

### Status Values
- **Pattern notes** (`type: pattern`): `seed` → `growing` → `evergreen`
- **Everything else**: `active` | `someday` | `done` | `archived`

### `_patterns.md` files get extra fields:
```yaml
scope: building | thinking | working | etc.
last-distilled: YYYY-MM-DD
```

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
