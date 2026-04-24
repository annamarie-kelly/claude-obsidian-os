# Artifact — Research to Visual Artifact Pipeline

Turn a research note into a visual decision-making HTML artifact.

**Input:** A research note path as `$ARGUMENTS` (e.g. `02-Thinking/The Integrated Person Model.md`)

## Process

1. **Read** the research note. If no path provided, list recent reference docs in `02-Thinking/` and ask which one to use.

2. **Classify** every major finding:

| Verdict | Meaning |
|---------|---------|
| **Agent spec** | Concrete enough to build → create via `/spec` |
| **Theory** | Informs system thinking, no separate pipeline needed |
| **Theory → enrichment** | Lightweight metadata on existing entities |
| **Theory → later** | Real but blocked or needs more data |

Present the classification table to the user and confirm before proceeding.

3. **Read** any design system skeleton or CSS variables file for component patterns.

4. **Build** the HTML artifact with this structure:
   - Sidebar nav with section links (color-coded dots if categories exist)
   - The problem/gap — why this research matters
   - Conceptual diagram — rings, flow charts, or relationship maps (pure CSS/HTML)
   - Layer/component cards — each color-coded with status tags (`built` / `new` / `later`)
   - Decision table — component / verdict / rationale
   - Data model — color-coded graph visualization
   - Phase timeline — what ships when, dependencies visible
   - Example outputs — dark cards showing what the user experiences, with annotation tags

5. **Write** the artifact to `01-Building/[Topic].html`

## Design system rules

**Use as-is:** `--canvas`, `--ink`, `--earth`, `--surface`, `--border`, `--accent` CSS vars. Typography: `--serif` (Libre Baskerville), `--sans` (Inter), `--mono` (SF Mono). Components: `.card`, `.callout`, `.tag`, `pre code`. Layout: `.wrap` grid with `.nav` + `.main`.

**Extend when needed:** domain-specific colors (`--sage`, `--ocean`, `--plum`, `--terra`), layer-colored card variants, custom components following the same patterns.

**Color-coding carries through** — if you assign colors to categories, use them everywhere (nav dots, cards, graph nodes, annotation tags).

## Rules

- Status tags on every card: `built` / `new` / `spec` / `theory` / `later`
- Dark reflection blocks show real user-facing output with system annotation tags
- Tables for decisions — scannable, comparable, with rationale column
- Timelines for phasing — dependencies visible, not flat lists
- If agent specs are identified in step 2, offer to create them via the `/spec` flow
