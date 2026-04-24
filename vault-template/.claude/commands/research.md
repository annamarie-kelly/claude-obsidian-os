# Research — Multi-Agent Deep Research

Conduct deep research on a topic using parallel agents, then synthesize findings into a vault-native note in `02-Thinking/`.

$ARGUMENTS

## Integrity rules (non-negotiable)

1. **Never fabricate.** Every factual claim must trace to a source. If you can't find it, say so.
2. **URL or it didn't happen.** Primary sources > secondary. Reject SEO filler, content farms, and unsourced aggregation.
3. **Label confidence honestly.** Every finding is one of: `✓ verified` (primary source confirmed), `~ inferred` (strong evidence, not directly confirmed), or `? unresolved` (conflicting or insufficient evidence).

## Step 1: Scoping interview

Before doing anything, figure out what the user actually wants. Ask these questions (adapt based on the topic — not all questions apply every time):

**Depth:** How deep should this go?
- **Focused** — I have a specific question, just answer it well (skip agents, write a short reference note)
- **Applied** — Research this topic but focus on how it applies to something specific in my life/work
- **Encyclopedic** — Give me the full picture: theory, practice, history, everything

**Application:** If "Applied" — what specifically should this research serve? This becomes the lens that filters everything.

**Angles:** Which of these matter most? (multi-select)
- Theory & cognitive science (why does this work?)
- Practitioner examples (who does this well?)
- Actionable takeaways (what should I actually do?)
- Historical context (where did this come from?)

**Cost:** Light or full?
- **Light** — faster, cheaper, uses haiku subagents. Good for applied/focused research.
- **Full** — slower, thorough, uses default model subagents. Better for encyclopedic deep dives.

Skip questions that are obvious from context.

## Step 2: Assess and confirm

Based on the scoping answers, decide the deployment:

| Mode | Agents | Model | When |
|------|--------|-------|------|
| **Focused** | 0-1 (just answer + vault scout) | haiku | Narrow question with clear answer |
| **Applied** | 2 (web + vault scout, skip deep researcher) | haiku | Research filtered through a specific application |
| **Applied deep** | 2-3 (web + vault scout, maybe deep) | default or haiku | Applied but the topic benefits from theory |
| **Encyclopedic** | 3 (web + deep + vault scout) | default | User explicitly wants the full picture |

Show the user: the mode you picked, which agents you'll launch, what each covers, and estimated scope. **Wait for confirmation.**

## Step 3: Deploy research agents

Launch agents in parallel using the Task tool. Each agent gets a **non-overlapping dimension** of the topic. No two agents should search for the same thing.

**CRITICAL:** When the user specified an application, every agent brief must include it. Don't research the topic abstractly and hope to connect it later. The application IS the research lens.

### Agent 1 — Web Researcher
- **Subagent type:** `general-purpose`
- **Model (light mode):** `haiku`
- **Focus:** Current, practical information. Documentation, tools, recent articles, blog posts from practitioners.
- **Brief template:** Search the web for current information on [topic], specifically focused on [application if given]. Focus on practical, actionable findings. Prefer primary sources (official docs, author blogs, first-hand accounts) over aggregators. For each finding, record: the claim, the source URL, source type (docs/blog/article/forum), and your confidence level (verified/inferred/unresolved). Return findings as a structured list grouped by theme. Do NOT fabricate URLs. Do NOT write any files to the vault — return findings as text only.

### Agent 2 — Deep Researcher (skip in focused/light-applied mode)
- **Subagent type:** `general-purpose`
- **Model (light mode):** `haiku`
- **Focus:** Depth and rigor. Academic papers, books, primary research, foundational theory.
- **Brief template:** Research the deeper, foundational aspects of [topic], with emphasis on [application if given]. Look for academic sources, research papers, books, expert talks. Prioritize peer-reviewed and authoritative sources. For each finding, record: the claim, the source URL or citation, source type (paper/book/talk/study), and your confidence level. Return findings as a structured list grouped by theme. Do NOT fabricate citations. Do NOT write any files to the vault — return findings as text only.

### Agent 3 — Vault Scout (always runs)
- **Subagent type:** `Explore`
- **Model:** `haiku` (always — vault search doesn't need heavy reasoning)
- **Focus:** What the vault already knows. Existing notes, patterns, projects, people, and `- [ ]` tasks that connect to this topic.
- **Brief template:** Search the vault for anything related to [topic] and [application if given]. Check all domain folders: `01-Building/`, `02-Thinking/`, `04-Living/`, `05-Relating/`, and `00-Inbox/`. Look for: existing notes on this or related topics, pattern notes with relevant insights, projects that touch this area, people connected to this topic, and open `- [ ]` tasks that relate. For each finding, record: the file path, what it contains that's relevant, and suggested `[[wikilinks]]`. Return a structured list. Do NOT write any files — return findings as text only.

## Step 4: Evaluate and fill gaps

Once all agents return:

1. **Merge findings by theme** — group across agents, don't organize by agent.
2. **Filter through the application lens** — if the user specified an application, ruthlessly cut findings that don't connect to it. A fascinating tangent that doesn't serve the application gets one sentence at most, not a full section.
3. **Identify gaps** — are there obvious questions the agents missed? Contradictions?
4. **One gap-filling round** (if needed) — launch 1 targeted agent to resolve a specific gap. Don't over-deploy.
5. **Spot-check 2-3 key claims** — for the most important or surprising findings, verify by fetching the actual source URL.

## Step 5: Synthesize into vault note

Draft the note using this template:

```markdown
---
created: YYYY-MM-DD
type: reference
status: active
tags: []
---
# [Topic Title — descriptive, not generic]

[1-2 sentence framing: why this matters, what question drove the research]

## Key findings

[Organize by THEME, not by source or agent. Each major claim gets a confidence label and inline citation like [1]. Write in clear prose — this should read like a good reference note, not a list of bullet points dumped from search results.]

### [Theme 1]

[Findings with inline [1] [2] references and confidence labels]

### [Theme 2]

[More findings...]

## What the vault already knows

[Vault Scout findings woven into prose. Use [[wikilinks]] generously. How does this connect to existing notes, patterns, projects, or people?]

## Open questions

- [ ] [Real questions that emerged — these become tasks surfaced by /loops]
- [ ] [Each one should be specific enough to act on]

## Pattern candidates

- "Claim-style insight that might be worth running /distill on"
- "Another potential pattern — stated as a belief, not a fact"

## Sources

| # | Source | URL | Type | Confidence |
|---|--------|-----|------|------------|
| 1 | [Author/Org — Title] | [URL] | docs/paper/blog/study | ✓/~/? |
| 2 | ... | ... | ... | ... |
```

**Before writing the file**, show the user:
- The proposed title and filename
- A summary of key findings (3-5 bullets)
- The vault connections found
- Any open questions or pattern candidates

**Wait for confirmation** before writing to the vault.

## Step 6: Write and clean up

1. Write the note to `02-Thinking/[Topic Title].md`
2. Add relevant tags based on content (use vault tag conventions)
3. If the Vault Scout found related notes, consider adding a backlink in those notes (ask first)
4. Delete any intermediate/temporary files created during research

## Rules

- Organize findings by insight, not by source — the body is thematic, sources live in the table
- Use `[[wikilinks]]` to connect to existing vault notes, not markdown links
- `- [ ]` items in Open Questions are real commitments — only include questions worth pursuing
- Pattern candidates are suggestions, not auto-created notes — the user runs `/distill` on them
- Keep the user's voice — don't over-formalize. Clear and direct, not academic
- If the topic is already well-covered by an existing vault note, say so and suggest updating it instead of creating a duplicate
- Today's date for frontmatter: use the actual current date in YYYY-MM-DD format
- **Agents must NEVER write files to the vault.** Only the lead (you) writes the final note. Agents return text.
- When application is specified, the note should feel like it was written *for* that application, not like a general article with an application section tacked on
