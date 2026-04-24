# Distill

Take raw input (brain dump, conversation excerpt, journal entry, studio notes, or a topic) and distill it into one or more pattern notes.

$ARGUMENTS

1. **Extract claims** — identify the core insights. Each one becomes a claim-style title (e.g., "Good ceramics comes from listening to the clay").
2. **Create pattern notes** in the appropriate domain folder with:
   - Frontmatter: `type: pattern`, `status: seed`, relevant tags
   - The insight stated clearly
   - Context for how it was discovered
   - Why it matters
   - Links to related patterns, projects, and people
3. **Update or create `_patterns.md`** — if the domain folder already has a `_patterns.md`, add a link to the new pattern. If this is the **first pattern** in that domain, create `_patterns.md` now with frontmatter (`scope`, `last-distilled`) and link to the new pattern.
4. **Update projects** — if the pattern relates to an active project, add a link in that project's key decisions section.

Domain routing for patterns:
- Making/craft/studio insights → `01-Building/`
- Intellectual/learning/reading insights → `02-Thinking/`
- Life wisdom/health/practical insights → `04-Living/`
- Relationship/people insights → `05-Relating/`

If the input is vague, ask clarifying questions before creating notes.
