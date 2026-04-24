# Quick Capture

Fast capture to inbox. No formatting required — just get it down.

$ARGUMENTS

## What this does

Creates a spark note in `00-Inbox/` from whatever you give me. Use this when you want to capture something fast without thinking about where it goes.

**Usage examples:**
- `/inbox idea about glazing technique for the new series`
- `/inbox book rec from a friend: "The Creative Act" by Rick Rubin`
- `/inbox need to schedule dentist appointment`
- `/inbox interesting pattern: the best studio sessions start with cleanup`

## How it works

1. Take the input (argument text, or ask if none provided)
2. Create a spark note in `00-Inbox/` with minimal frontmatter
3. Use a descriptive filename based on the content
4. Don't over-format — capture the raw thought
5. If it's clearly an action item, make it a `- [ ]` task so `/loops` picks it up
6. Confirm what was captured

This is the fast path. `/triage` will sort it later.
