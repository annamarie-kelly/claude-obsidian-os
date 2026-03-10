# Conductor — Git Worktree Scanner

Scan git repos for in-progress work. Customize the path below to your workspace directory.

**Workspace path**: `/path/to/your/workspaces/`

For each repo, run:
- `git -C {path} branch --show-current` — current branch
- `git -C {path} status --short` — uncommitted changes
- `git -C {path} log -1 --format="%s (%ar)"` — last commit message + age
- `git -C {path} stash list --format="%gd: %s (stashed %ar)"` — stash descriptions
- `git -C {path} stash show stash@{N} --stat` — files in each stash (first 2 stashes max)

**Only show repos that have signal** — skip clean repos on main with no stashes.

A repo has signal if ANY of:
- It has uncommitted changes
- It has stashes
- It's on a feature branch (not main/master)

Format each as a numbered entry:
```
[1] {project} — {branch}
    Last commit: "{message}" ({age})
    {N} uncommitted: {file1}, {file2}, ...

[2] {project} — {branch}
    Last commit: "{message}" ({age}) | {N} stashes
    Stash: {description} ({age}) — {file summary}
```

Flag stale stashes (30+ days) and stale branches (14+ days since last commit).

## Actions

- **drop stash [n]**: Offer to run `git stash drop` (confirm first).
- **cleanup [n]**: For stale branches with no uncommitted work, offer to switch back to main.
