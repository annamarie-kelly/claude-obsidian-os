# Annotation Intake

Parse annotated screenshots into structured, routable work items. The user draws on app screenshots to communicate what needs to change. Your job is to read the visual language, understand what they want, and tell them exactly where each change lives in the codebase.

**Input:** `$ARGUMENTS` contains the saved image path and annotation comments from the design board.

## The Annotation Language

### Numbers = Flow Order
Numbered callouts (1, 2, 3, 4) are the **sequence of a user flow or order of operations**. Read them as steps: "first this, then this, then this." They trace a path through screens, not a list of independent items.

### Colors = Grouping
Annotation colors (box outlines, highlights, circles) **group related observations**. Same color across multiple steps = same underlying issue showing up at different points. Different colors = different issues.

### Multiple Screens = Timeline
Side-by-side screens are a sequence. Read left to right as a flow unless annotations clearly indicate otherwise.

### Text Callouts = Intent
The text describes what the user wants. Read for intent:
- "delete this" / "remove" = feature change or cleanup
- "notice the..." / "this doesn't..." = bug report
- "should be..." / "make this..." = design update
- "move to..." / "restructure..." = architectural change

## How to Process

### 1. Read the saved image

The image path is in the arguments. Read it from the vault to see the annotated screenshots with boxes, numbers, and comments drawn on them.

### 2. Reconstruct the flow

Read all annotations in number order across all screens. Write a short narrative of what the user is showing you:

```
**Flow:** User opens home screen [screen 1], taps Take Medication to complete it [screen 2], opens the detail view [screen 3]. Annotations trace how the completion state fails to propagate across views.
```

### 3. Group by color

Identify which annotations share a color. Each color group is one work item. Standalone annotations (no color match) are their own items.

### 4. Classify each work item

For each group, determine **what kind of change this is**:

| Type | Signal | What it means |
|------|--------|---------------|
| Bug | Something is broken. Data doesn't match, state doesn't update, interaction fails. | Fix existing code that isn't working as intended. |
| Design/Style | Visual polish. Spacing, color, font, alignment, radius, shadow, animation. | CSS/style-only changes in the relevant UI layer. |
| Content Edit | Copy change, label update, placeholder text, microcopy. | String/copy change, usually in the component or a strings file. |
| Feature Change | Add, remove, or alter a behavior. "Delete this", "add swipe to X", "make this tappable." | Needs scoping. Could be small or could be a ticket. |
| Restructure | Rethink how something is organized, flows, or is architected. | Needs a plan before coding. |
| Investigate | Can't tell from the screenshot. Ambiguous, intermittent, or needs logs/reproduction. | Reproduce first, then reclassify. |

### 5. Route to codebase

Based on what the screenshot shows, route each item to the correct repo. Search the relevant codebase to find the specific file, component, or function involved. Be precise.

### 6. Present findings and ask what to do

## Output Format

```
## Flow

[One-paragraph narrative of what the annotated screenshots show]

---

## Work Items

### [A] [Short descriptive name]
**Type:** [type]
**Annotations:** #[numbers], [color] highlights
**What:** [Plain description of the change needed]
**Codebase:** [repo path]
**Where to look:** [Specific file/component/function found by searching]
**Size:** Tiny / Small / Medium / Large

### [B] ...

---

## Summary

| Item | Type | Codebase | Size |
|------|------|----------|------|
| A    | ...  | ...      | ...  |
```

After presenting the work items, **STOP and ask for human review:**

> "Does this match what you meant? Reply with corrections, or say **go** to proceed."

Wait for confirmation before doing anything else. The user may correct your interpretation — a "bug" might actually be intentional, or you may have misread an annotation.

Once confirmed, for each work item offer two options:

1. **Execute** — "I'll fix this now" (for Tiny/Small items you can handle directly)
2. **Copy** — Output a ready-to-paste terminal command that dispatches the fix via Claude Code:

```
claude -p "Fix [description]. File: [path]. [specific instructions]" --cwd [repo-path] --dangerously-skip-permissions
```

Group related items into a single command when they share a root cause. Let the user choose which items to execute vs copy.

## Guidelines

- Be opinionated about classification. If it's 80% likely a bug, call it a bug.
- When the same underlying issue shows up across multiple annotations (same color), consolidate into one work item.
- "Delete this" on a UI element is a feature change, not a bug.
- Data mismatches between views are almost always component logic bugs or API data flow issues.
- If you spot problems the user didn't annotate, mention them under "Also noticed" at the end.
- Keep it direct. The user is an engineer who wants to know where to look and what kind of work this is.
