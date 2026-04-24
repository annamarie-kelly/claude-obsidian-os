---
name: handoff
description: Hand a spec off to an isolated agent for implementation. Use when the user has a finalized spec and wants an agent to build it without touching their working tree. Creates an isolated git worktree, dispatches one or more agents against the spec, and reports back with the branch name for review. Supports single-repo, multi-repo, and parallel dispatches.
---

# /handoff — Dispatch Spec to Isolated Agent

Take a spec and send it to an agent that works in an isolated git worktree. The user's working tree stays clean. The agent's work lands on a branch they can review and merge.

**Input:** `$ARGUMENTS` — a spec file path (relative to vault root) or a spec title to search for.

## Process

### 1. Read and validate the spec

Read the spec file. If no path given, list specs in `01-Building/Agent Specs/` with status `drafting` or `ready` and ask which one.

Validate it's ready for handoff — all three gates must pass:

**Gate 1: Spec is fleshed out**
- Has a filled-in **Requirements** section (not just placeholder checkboxes)
- Has a **Quality bar** or behavioral acceptance tests
- Has a **Deliverables** section or equivalent
- If the spec looks skeletal (stub with no real content), stop: "This spec isn't ready for handoff — run `/spec` first to flesh it out."

**Gate 2: Decomposition exists**
- The `## Decomposition` section must contain actual `- [ ]` task items, not just "To be filled by /decompose"
- If decomposition is missing, stop: "This spec hasn't been decomposed yet — run `/decompose` first to break it into tasks, then `/handoff` individual tasks or the full spec."

**Gate 3: Tasks are right-sized**
- Each decomposed task should be implementable in a single agent session (~2-3 hours of work)
- If any task looks too large (multiple systems, multiple endpoints, multiple screens), suggest further decomposition
- Flag but don't block — the user decides: "Task '[X]' looks large — want me to break it down further, or hand it off as-is?"

### 2. Resolve open questions from other repos

Before dispatching, check if the spec has open questions or references that can be answered from the codebase:

- If the spec mentions API endpoints → read URL configs and relevant serializers to get the actual contract
- If the spec mentions data models → read the relevant model files to get field names, types, relationships
- If the spec references other specs → read them from `01-Building/Agent Specs/`
- If the spec has `## Open Questions` → try to answer them from docs and existing code

Append any resolved context to the agent prompt so it doesn't waste tokens re-discovering what you already found. Unresolved questions get flagged to the user before dispatch.

### 3. Determine the target repo(s)

Infer from the spec content which codebase(s) are involved. If ambiguous, ask the user.

For **multi-repo specs** (e.g. backend + web, or iOS + web parallel):
- Backend always goes first unless the spec is purely additive to stable endpoints
- Confirm with the user: "I'll dispatch backend first, then frontend once the contract is stable. Sound right?"
- For parallel frontends: dispatch both simultaneously with the shared preamble pattern

### 4. Confirm with the user

Before dispatching, summarize:
- **Spec:** [title]
- **Target:** [repo name] at [path]
- **Branch:** `agent/[spec-slug]` (e.g. `agent/thinking-pattern-extraction`)
- **Approach:** [single agent / sequential backend→frontend / parallel]

Ask: "Ready to hand off? The agent will work in an isolated worktree and won't touch your working tree."

### 5. Dispatch the agent

Use the **Agent tool** with `isolation: "worktree"` to spawn the implementation agent.

Build the agent prompt from the spec. The prompt must include:

```
You are implementing a spec in an isolated git worktree. Your work will land on a feature branch for review.

## The spec

[paste full spec content here — everything from the vault file, frontmatter stripped]

## Your working context

- Repo: [repo name]
- Working directory: [the worktree path — Agent tool handles this]
- Branch: you're on an isolated branch, commit freely

## Cross-repo context (read these FIRST to save tokens)

Before reading application code, pull context from lightweight sources. They answer most open questions about API contracts, data models, and architecture without reading thousands of lines of source.

Read docs/ files, URL configs, models, serializers, and sibling specs as needed to understand the contract you're building against.

**Token budget:** docs/ files are small HTML/markdown — read them fully. For source code, use Glob and Grep to find specific files rather than reading directories.

## Implementation protocol

1. **Recon first** (unless the spec says otherwise). Start by reading the cross-repo context files above. Then read the relevant existing code in your target repo. Produce a brief plan as a commit message or markdown file. Do NOT skip this — understanding the existing patterns prevents rework.

2. **Implement** the deliverables. Follow existing code patterns in this repo. Match the style, naming conventions, and architecture you observe.

3. **Test** your work. Run existing tests to make sure nothing breaks. Add tests for new functionality where the spec calls for them.

4. **Commit** with clear messages. Each commit should be a logical unit. Use conventional commit style: `feat:`, `fix:`, `refactor:`, `test:`.

5. **Self-verify** against the quality bar in the spec. Go through each behavioral acceptance test. If something doesn't pass, fix it before finishing.

## Rules

- Do NOT modify files outside the scope of the spec
- Do NOT add dependencies without strong justification
- Do NOT refactor adjacent code "while you're in there"
- If you hit a blocker (missing dependency, unclear requirement, architectural question), document it clearly and move on to what you can do
```

For **parallel dispatches**, launch multiple Agent calls in a single message, each with `isolation: "worktree"` and repo-specific context.

### 6. Report back

When the agent completes, report to the user:

```
## Handoff complete

**Spec:** [title]
**Branch:** `agent/[slug]` at [repo path]
**Worktree:** [path if changes were made]

### What was done
[summary from agent output — key files changed, features implemented]

### What to review
[any concerns, blockers, or decisions the agent flagged]

### Next steps
- `cd [repo] && git diff main..agent/[slug]` to review
- `git merge agent/[slug]` when satisfied
- Or open a PR: `gh pr create --head agent/[slug]`
```

### 7. Update spec status

After successful handoff, update the spec's frontmatter:
- Set `status: building`
- Add `handoff_branch: agent/[slug]`
- Add `handoff_date: YYYY-MM-DD`

## Multi-agent dispatch patterns

### Backend → Frontend (sequential)

1. Dispatch backend agent with `isolation: "worktree"`
2. Wait for completion
3. Show the user the backend branch for review
4. If approved, dispatch frontend agent(s) — reference the backend branch so the agent knows the contract

### Parallel frontends (e.g. iOS + Web)

1. Extract the shared preamble from the spec (ontology, capability parity, shared non-goals)
2. Dispatch two agents simultaneously, each with `isolation: "worktree"`:
   - Agent A → repo A with shared preamble + platform-specific section
   - Agent B → repo B with shared preamble + platform-specific section
3. Report both results together so the user can review for parity

## Edge cases

- **Spec has no quality bar:** Warn the user, suggest running `/spec` to add one. Proceed only if they confirm.
- **Repo has uncommitted changes:** The worktree isolates from this, but mention it: "Note: your working tree has uncommitted changes — the agent's worktree starts from HEAD."
- **Agent hits a blocker:** Report what was completed and what was blocked. Don't silently skip requirements.
- **Spec is too large:** If the spec has >10 deliverables, suggest decomposing first with `/decompose` and handing off individual tasks instead.
