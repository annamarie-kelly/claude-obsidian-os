# Prune

Archive expired notes based on their `shelf-life` frontmatter field. Borrowed from structured expertise-management systems: not all knowledge is permanent, and accumulation is a failure mode.

## Shelf Life Rules

- **foundational** — never expires. Skip.
- **tactical** — expires 14 days after `created`
- **observational** — expires 30 days after `created`
- **missing `shelf-life` field** — treat as `foundational`, skip

## Process

1. **Scan** the vault for notes with `shelf-life: tactical` or `shelf-life: observational` in frontmatter. Check:
   - `00-Inbox/`
   - `01-Building/`, `02-Thinking/`, `03-Working/`, `04-Living/`, `05-Relating/`
   - Skip `07-Archive/` (already archived) and `Templates/`
2. **Compute expiry** for each: `created` date + shelf-life window. Compare against today.
3. **Build a report** before moving anything:
   - List expired notes grouped by folder
   - Show the `created` date, shelf-life, and first line of each
   - Count total
4. **Ask the user** to confirm before moving. Never auto-archive — the user may want to promote something to `foundational` instead of losing it.
5. **On confirmation**, move expired notes to `07-Archive/` preserving folder structure (e.g. `01-Building/foo.md` → `07-Archive/01-Building/foo.md`). Never delete.
6. **After moving**, scan the moved notes for any that were linked from `_patterns.md` files. Warn about broken links but don't auto-fix — the user decides whether to update or let them rot.

## Prompts the user might run first
- `/prune --dry-run` — only show the report, make no changes
- `/prune tactical` — only prune tactical notes, leave observational alone
- `/prune 00-Inbox/` — scope to a specific folder

## Why this exists

Without shelf-life tracking, vaults treat everything as permanent, which causes `_patterns.md` bloat and `00-Inbox/` accumulation. Not every observation needs to live forever. Session-specific notes and time-bounded context should age out automatically so the foundational layer stays legible.
