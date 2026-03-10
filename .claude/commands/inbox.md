# Pull Inbox from MCP Sources

Pull context from connected external tools into the inbox. Run this ~once a day.

**Usage**: `/inbox [source]` where source is one of your configured MCP sources, or `all`

The argument is: $ARGUMENTS

## How to Customize

Replace the MCP tool calls below with your own. Common sources:
- **Meeting transcripts**: Granola, Fireflies, Otter.ai
- **CRM / Pipeline**: Salesforce, HubSpot, or your internal tool
- **Task board**: Linear, Jira, Asana (often accessible via Notion connected sources)
- **Calendar**: Google Calendar, Outlook

## Example: Pull from all sources

For each configured source:
1. Call the relevant MCP tools to gather recent data
2. Extract action items, decisions, changes, and attention flags
3. Create an inbox note with the format below

## Output Format

Create a note file in `00-Inbox/` with this structure:

```markdown
---
created: YYYY-MM-DD
type: inbox
source: [source name]
tags: []
---

# Inbox Pull — [Source] (YYYY-MM-DD)

## Meetings & Decisions
[Meeting titles, key decisions, who was there]

## Action Items
- [ ] [things I owe]
- [ ] @waiting [person] [things blocked on others]

## Needs Attention
[Attention flags, stale items, overdue reminders]

## Recent Changes
[Portfolio changes, ticket updates, notable shifts]

## Raw Notes
[Any additional context that didn't fit above]
```

### Rules:
- Action items always use `- [ ]` so they surface in `/loops`
- Use `- [ ] @waiting [person] ...` for items blocked on others
- Include [[wikilinks]] to people in `05-Relating/` when names come up
- If a source is unavailable, note it: `> [Source] was unavailable during this pull.`
- Keep it concise — this is a capture point, not a finished document
- After generating, write the note to `00-Inbox/` and confirm with the user

## After Writing

Tell me:
1. What was pulled and from which sources
2. How many action items were extracted
3. Anything that looks urgent or time-sensitive
