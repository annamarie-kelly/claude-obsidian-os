# Reindex

Regenerate the per-folder memory-type index files (`_patterns.md`, `_episodes.md`, `_playbooks.md`) from note frontmatter. Keeps the generated views in sync with the underlying notes after additions, edits, or type changes.

**Usage**: `/reindex [folder]`
- `/reindex` — reindex all domain folders (01-Building, 02-Thinking, 03-Working, 04-Living, 05-Relating)
- `/reindex 01-Building` — reindex a single folder
- `/reindex --dry-run` — show what would change, make no edits

The argument is: $ARGUMENTS

## What this does

For each target folder, scan all `.md` files' frontmatter `type:` field and group into three memory types:

| Memory type | `type:` values | Index file |
|---|---|---|
| **Semantic** | `pattern`, `decision`, `failure`, `convention`, `essay`, `reference` | `_patterns.md` |
| **Episodic** | `episode` | `_episodes.md` |
| **Procedural** | `playbook` | `_playbooks.md` |

Other types (`project`, `person`, `loop`, `seed`, `inbox`, `trail`) are excluded from memory-type indexes — they have their own navigation.

## Process

1. **Scan** every `.md` file in the target folder(s), excluding `07-Archive/` and `Templates/`. Extract frontmatter `type:`, `status:`, `shelf-life:`, `created:`, and the first line of the body.

2. **Group by memory type** using the table above.

3. **Preserve the existing hand-curated structure** of `_patterns.md`:
   - These files have manually organized sections with `**Why:**` annotations and rich context
   - Do NOT flatten them into generated lists
   - Instead: update only the *links* within existing sections to match current notes, add a "Recently added (unsorted)" section at the bottom for new notes that haven't been placed in a section yet, and flag any notes that exist in the folder but aren't linked anywhere in `_patterns.md` as orphans
   - This preserves the human curation while surfacing gaps

4. **For `_episodes.md`**: generate fresh each time. Chronological (newest first). Group by month (`## 2026-04`, `## 2026-03`). Each entry: date, title, one-line summary, shelf-life indicator.
   ```markdown
   - **2026-04-13** — [[episode-title]] — one-line summary *(shelf-life: observational, 17d remaining)*
   ```

5. **For `_playbooks.md`**: generate fresh each time. Alphabetical by title. Each entry: title, one-line purpose, last-updated date, linked patterns.
   ```markdown
   - [[How to X]] — purpose line *(used in [[pattern-a]], [[pattern-b]])*
   ```

6. **Update frontmatter** of the index files:
   ```yaml
   ---
   type: pattern
   status: evergreen
   scope: building | thinking | working | etc.
   last-reindexed: YYYY-MM-DD
   ---
   ```
   Note: `_patterns.md` keeps its existing `last-distilled` field in addition; `/reindex` updates `last-reindexed`, `/distill` updates `last-distilled`. They're different signals.

7. **Report** at the end:
   - Count of notes per memory type per folder
   - Orphans flagged (notes in the folder but not in any index)
   - Shelf-life warnings (notes expiring within 7 days)
   - Any `type:` frontmatter missing or invalid

## When to run this

- After bulk imports or distill sessions
- After `/prune` to clean up links to archived notes
- Weekly, as part of `/review`
- Anytime `_patterns.md` feels stale or out of date
- Before publishing anything from the vault (so the underlying indexes are current)

## Rules

- Never delete hand-written content from `_patterns.md`. Only update links and add orphan warnings.
- Regenerate `_episodes.md` and `_playbooks.md` fresh each run — these are fully generated, not curated.
- Flag, don't fix, frontmatter problems. The user decides whether to retype a note.
- On `--dry-run`, output the full report without writing any files.
