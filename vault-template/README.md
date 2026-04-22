# vault-template

The Obsidian vault scaffolding Loops was built around. This is both:

1. **The example vault** Loops runs against out of the box. When you `cd loops-ui && npm run dev` from a fresh clone, this is the directory the app points at.
2. **A starter you can adopt** for your own Obsidian vault. Copy the folder structure, the `Templates/`, the `.claude/commands/`, and `CLAUDE.md` into any existing (or new) Obsidian vault to pick up the two-axis memory model and the eleven slash commands.

## Structure

```
00-Inbox/       Single capture point. Everything lands here first.
01-Building/    Anything being constructed: projects, technical patterns, playbooks.
02-Thinking/    Intellectual life: essays, ideas, references, meta-patterns.
03-Working/     How the business runs: workflow, stakeholders, operations.
04-Living/      Personal life (grows over time).
05-Relating/    People notes.
06-Loops/       Auto-generated open-items dashboard + Loops UI data directory.
07-Archive/     Done / dead / inactive. Never deleted — parked.
Templates/      Note templates.
.claude/        Slash commands (and Claude Code per-project settings).
CLAUDE.md       Vault-level instructions: the two-axis model, frontmatter schema,
                record-type guidance, conventions.
```

## Using this as your vault

Option A — **copy it in**. Copy everything here into your Obsidian vault directory (merge with what's already there, taking care not to overwrite your actual notes). Set `LOOPS_UI_VAULT_ROOT` to point at that vault and run Loops as normal.

Option B — **point Loops at your own layout**. If you already have an Obsidian vault with a different folder scheme, edit [`loops-ui/loops.config.json`](../loops-ui/loops.config.json) under `vault.scanFolders` to list whichever top-level folders should be scanned. The only hard requirement is that Loops can write to a `06-Loops/` directory in your vault.

Option C — **use it as-is for the demo**. Run the bundled `npm run seed-loops` and walk through the UI against the template's folders. Nothing in this directory is personal to anyone; it's example data for first-run.

## Full vault conventions

See [`CLAUDE.md`](./CLAUDE.md) for the two-axis memory model, the expanded `type:` enum, the `shelf-life` field, and the full record-type guidance (when to pick `pattern` vs `failure` vs `decision` vs `convention`).
