# Focus — Start a Work Session on a Loop

Lock in on a specific loop (task), set up the repo, create a branch, and start working.

**Input:** `$ARGUMENTS` — a loop title, loop ID, spec task description, or just a description of what you're about to work on.

## What this does

1. Finds (or creates) the matching loop
2. Identifies which repo the work belongs in
3. Creates a git branch named after the loop
4. When the session ends, updates progress

## Process

### Step 1: Identify the loop

Parse `$ARGUMENTS`:

- **If it matches an existing task** in the vault: use that task
- **If it's a file path to a spec**: read the spec, list its `- [ ]` tasks, ask which one to focus on
- **If it's a free-text description**: search for a match in open tasks. If none found, create a new `- [ ]` item in the appropriate file.

Show the matched/created loop and confirm before proceeding.

### Step 2: Identify the repo

Based on the loop's domain, tags, or text, determine which repo to work in. If the work is vault-only (writing, planning, notes) — skip branch creation, just mark the loop active.

### Step 3: Create the branch

In the target repo:

```bash
cd [repo-path]
git checkout main  # or master — check which exists
git pull origin main
git checkout -b focus/[slugified-loop-title]
```

Branch naming: `focus/` prefix + slugified title (lowercase, hyphens, max 60 chars).
Example: `focus/add-thinking-pattern-schemas`

If a branch with that name already exists, check it out instead of creating.

### Step 4: Set up the session

Tell the user:

```
Focus locked on: "[loop title]"
Repo: [repo-name] ([repo-path])
Branch: focus/[slug]

Ready to work. When you're done, say "done" or "/focus done" and I'll:
- Summarize what changed
- Update the loop with progress notes
- Optionally mark it complete
```

Then switch the working directory to the repo so all subsequent commands run there.

### Step 5: End the session

When the user says "done", "ship it", "/focus done", or closes the conversation:

1. **Summarize changes**:
```bash
cd [repo-path]
git diff --stat main...HEAD
git log --oneline main...HEAD
```

2. **Ask about completion**:
   - "Mark this loop done?" → close the loop
   - "Keep it active?" → leave as-is for next session
   - "Create follow-up?" → create a new loop with the remaining work

3. **Offer to push**:
   - "Push the branch and create a PR?" → `git push -u origin focus/[slug]` + `gh pr create`
   - "Just push?" → `git push -u origin focus/[slug]`
   - "Not yet" → skip

## Multi-repo sessions

If the work spans multiple repos (e.g., backend API + web frontend):

1. Create branches in BOTH repos with the same name (`focus/[slug]`)
2. Work in whichever repo is relevant to the current subtask
3. On "done", summarize changes across both repos

## Rules

- **Always confirm the loop and repo** before creating branches — don't guess wrong
- **Never force-push or push to main** — only push the focus branch
- **Branch names are deterministic** — same loop title always produces the same branch slug, so resuming a focus session checks out the existing branch
- **Don't create loops for trivial work** — if the user says "focus on fixing this typo", just do it without the ceremony
- **Vault-only work skips git** — if the work is writing notes, planning, or editing vault files, don't create branches. Just mark the loop active and work in the vault
- **Today's date:** use actual current date in YYYY-MM-DD format
