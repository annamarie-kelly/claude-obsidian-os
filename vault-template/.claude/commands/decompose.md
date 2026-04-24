# Decompose — Break a Spec into Atomic Tasks

Turn an Agent Spec into independently executable build tasks.

**Input:** A spec file path as `$ARGUMENTS` (relative to vault root, e.g. `01-Building/Agent Specs/Some Spec — Agent Spec.md`)

## Process

1. **Read** the spec file. If no path provided, list specs in `01-Building/Agent Specs/` and ask which one to decompose.

2. **Analyze** the spec's Requirements and architecture sections. Identify discrete implementation tasks.

3. **Decompose** into atomic tasks following these rules:
   - Each task is **independently executable** — no task depends on another inflight task
   - Each task is **testable in isolation** — you can verify it works without the others
   - Each task is **reviewable in under 20 minutes** — small enough to reason about
   - Each task is **mergeable independently** — doesn't break anything if shipped alone

4. **Write tasks** as `- [ ]` checkboxes in the spec's `## Decomposition` section:

```markdown
## Decomposition

- [ ] Add batch config to extraction pipeline — new YAML prompt, schema, config entry
- [ ] Implement 3-stage reasoning pipeline — separate fact from interpretation, weigh evidence, identify patterns
- [ ] Add schema for new entity nodes and relationships
- [ ] Wire new entities into query layer — surface patterns when relevant
- [ ] Add safety constraints — system notices, growth-oriented language
- [ ] Write tests — unit tests for extraction, integration test for full pipeline
```

5. **Update spec status** from `ready` (or `drafting`) to `building` in the frontmatter.

## Rules

- Right granularity is a moving target — if a task would take more than 2-3 hours, break it further
- Include a test task for each functional chunk
- Don't create tasks for things already done (checked `- [x]` items)
- Each task title should be a clear imperative: "Add X to Y" not "X needs to be added"
- Include the file/module context in the task title when helpful: "Add `ThinkingPattern` model to `extraction/schemas.py`"
- Tasks land in triage status — the user reviews and prioritizes them
