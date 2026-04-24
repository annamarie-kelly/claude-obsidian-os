# Triage Inbox

Process notes sitting in `00-Inbox/`. Route what's already captured to the right domain.

Read all notes in `00-Inbox/` (skip daily notes — those stay) and for each one:

1. Read the content and determine what type of note it is.
2. If it's a **pattern** (insight, learning, realization): Create a note in the appropriate domain folder with a claim-style title. Add frontmatter with `type: pattern`, `status: seed`, relevant tags, and links.
3. If it's a **reference** (something I read/watched/found): Move to `02-Thinking/` with reference frontmatter. Extract any patterns as separate notes.
4. If it's a **project update**: Append to the relevant project note in `01-Building/`.
5. If it's an **action item / task**: Add as `- [ ]` item to the relevant note so it surfaces in `/loops`. Life admin goes to `04-Living/`, making tasks to `01-Building/`, etc.
6. If it's a **person note**: Create or update in `05-Relating/`.
7. If it's **life admin** (health, finances, appointments, errands): Route to `04-Living/`.
8. If it's a **raw brain dump**: Pull out any patterns, action items, or project updates. What's left gets archived to `07-Archive/`.
9. After processing, confirm before deleting the original inbox note.

## Domain routing

- Making something? → `01-Building/`
- Learning/reading/intellectual? → `02-Thinking/`
- Life logistics, health, money? → `04-Living/`
- About a person? → `05-Relating/`
- Done/stale? → `07-Archive/`

## Career notes

If a note is career-related, add the `#career` tag but still route to the appropriate domain. Career cuts across all domains — a ceramics commission is `01-Building/` with `#career`, a networking contact is `05-Relating/` with `#career`.

Don't enforce formatting on inbox notes — they're captured fast with typos. Focus on extracting signal.

Always show me what you plan to do with each item and ask before making changes.
