# Distill

Take raw input (brain dump, conversation excerpt, meeting notes, session harvest, or a topic) and distill it into one or more notes typed by **memory type**. Updated to support the two-axis vault (domain × memory type).

## Memory Type Routing

Before creating any notes, classify the input against the three memory types:

| Memory type | Signals in input | Note `type:` to use |
|---|---|---|
| **Episodic** (what happened) | Dated events, meeting transcripts, "today I learned," session harvests, project state snapshots, specific incidents | `episode` |
| **Semantic** (what I know) | Claims, patterns, "X beats Y," decisions with rationale, lessons from failures, rules/conventions | `pattern`, `decision`, `failure`, `convention`, `essay`, `reference` |
| **Procedural** (how to do things) | Step-by-step workflows, "how to X," checklists, operational procedures | `playbook` |

**A single input often contains all three.** Default behavior: extract and separate. One meeting note can produce one `episode` + two `pattern` notes + one `playbook`.

## Process

1. **Classify.** Read the input and identify which memory types are present. State them back briefly before writing any files.

2. **For each memory type present, create a note in the appropriate domain folder** (`01-Building/`, `02-Thinking/`, `03-Working/`, `04-Living/`, `05-Relating/`) with:
   - Frontmatter: `type: [episode | pattern | decision | failure | convention | playbook | essay | reference]`
   - `status: seed` (for semantic) or `status: active` (for episode/playbook)
   - `shelf-life: foundational | tactical | observational` (default `foundational` for patterns/decisions/conventions/playbooks, `observational` for episodes unless they're load-bearing)
   - Relevant tags
   - `[[wikilinks]]` to related patterns, people, projects
   - **Episode notes**: lead with the date and context, then what happened, then what was learned
   - **Semantic notes (pattern/decision/failure/convention)**: claim-style title, the insight stated clearly, context for how it was discovered, why it matters, and a `**Why:**` line if it's a pattern that needs scope
   - **Playbook notes**: "How to [verb]" title, numbered steps, prerequisites, common failure modes

3. **Update the right index files.**
   - For semantic notes → append to the domain folder's `_patterns.md`
   - For episode notes → append to the domain folder's `_episodes.md` (create if missing)
   - For playbook notes → append to the domain folder's `_playbooks.md` (create if missing)
   - If a new section is needed, create it.

4. **Cross-link aggressively.**
   - Patterns should link to the episodes they came from (traceability: "this pattern emerged from [[episode]]")
   - Episodes should link to the patterns they produced (productivity: "this episode yielded [[pattern]]")
   - Playbooks should link to the patterns they embody

5. **Consolidation loop.** If the input is an episode and you notice a pattern *already exists* that this episode confirms, update the existing pattern's "evidence" section instead of creating a duplicate. Episodic → semantic consolidation is the highest-value workflow in this vault; be aggressive about it.

## When to ask clarifying questions

- If the input is vague about *what* memory type it is, ask.
- If the input is long and mixes types, summarize your classification back before writing files.
- Never silently write the wrong type — the two-axis structure depends on consistent typing.

## Why this changed

The vault moved from a one-axis (domain only) structure to a two-axis (domain × memory type) structure. See the rationale in `CLAUDE.md`. Every note needs a memory type so cross-axis queries become tractable.
