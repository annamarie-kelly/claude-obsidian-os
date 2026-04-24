---
name: spec
description: Write implementation specs for Claude Code agents to execute. Use this skill whenever the user asks for a spec, agent prompt, brief, or handoff — especially for frontend, backend, or full-stack work, parallel multi-agent dispatches (iOS + web, mobile + desktop), and recon-before-implementation workflows. Also use when the user says "write the agent prompt," "give me a spec," "brief the agent," or describes a feature they want built by agents rather than by you directly. This skill enforces the patterns that make agent-driven development actually work: ontology before UI, backend before frontend, capability parity across surfaces, behavior-as-deliverable, explicit non-goals, reconnaissance before code. Do not skip this skill just because you think you can write a spec from memory — the guardrails here exist because agents silently drift without them.
---

# /spec — Agent-Ready Implementation Specs

Agents produce working features when the spec they receive is structured. They produce plausible-looking code that misses the point when the spec is a wishlist. This skill codifies the structure.

Every spec you write with this skill is built on six principles. They are not stylistic preferences. They are the difference between agents shipping and agents wasting cycles.

## The six principles

**1. Context before requirements.** Agents perform dramatically better when they understand *why* a feature exists before they know *what* to build. Every spec opens by explaining the product vocabulary, the ontology or mental model the agent must respect, and what decisions are already settled upstream. Without this, agents make reasonable-looking choices that violate implicit product constraints.

**2. Behavior is the deliverable, not structure.** Agents are excellent at satisfying structural checklists — add this field, create this endpoint, wire this component — and prone to considering themselves done once structure exists, even when the behavior it was supposed to enable doesn't work. Every spec includes behavioral acceptance tests: specific user-observable or API-observable behaviors that must all be true. A field being added is not the same as a feature shipping. Write the spec so the agent cannot satisfy it with structure alone.

**3. Reconnaissance before implementation.** For any non-trivial spec, the agent's first deliverable is a plan document, not code. The plan surfaces architecture decisions, where existing code gets modified vs. extended, migration paths, and assumptions. The user reviews, approves or redirects, and *then* the agent implements. This catches 80% of the disasters that happen when agents commit to an approach early and can't course-correct. Recon is not optional for feature-sized work. For trivial specs (single-file fix, one-endpoint addition) it can be skipped — default is always include it.

**4. Capability parity, ergonomic divergence.** For multi-surface work (iOS + web, mobile + desktop, native + API), specs must enforce that every surface supports the same verbs with the same semantics. Surfaces differ in *how* they support those verbs (thumb-scale vs. keyboard-scale), not *whether*. Parallel dispatches share a preamble locking the ontology and capability parity, then diverge into surface-specific sections. This is the mechanism that prevents drift — you're not relying on the user to catch it, the preamble enforces it.

**5. Explicit non-goals.** Agents are expansive. They'll infer that nearby work "should probably also be done." Every spec names what is NOT in scope, including both "deferred to later cycle" work and "considered and decided against" work, with brief reasoning. This is the single most effective section for preventing scope creep.

**6. Explain the why, not just the what.** Every significant requirement carries a brief rationale. Not because agents can't follow rules, but because agents that understand *why* a rule exists will apply it correctly in situations the spec didn't anticipate. "Do not use localStorage" stops at the letter of the rule. "Do not use localStorage — it's not supported in this runtime and code using it will fail" lets the agent reason correctly about sessionStorage, IndexedDB, and other adjacent traps.

## Spec structure

Every spec follows this structure. Omit a section only when it genuinely doesn't apply — the default is include them all.

### Frame for the agent

Two to four sentences. What this agent is building, the ergonomic or architectural target, any top-level context for making good local decisions. Written to the agent in imperative or second-person voice. Gives the agent a *target* they'll carry through the whole task.

The worst frame restates the spec. The best frame gives the agent something like "iOS is the primary surface. Sessions are short. Every core action is reachable with the thumb." That lets them make correct decisions the spec didn't explicitly cover.

### Context and ontology

The product vocabulary the agent needs to work fluently. What words mean what. What's allowed to change vs. what's invariant. What user-facing behavior follows from the data model.

This section is not a design-doc rehash. It's the minimum context the agent needs to make good local decisions. If there's a shared preamble (multi-agent dispatch), reference it; otherwise inline the relevant parts. Never make the agent guess.

A table is often right when the ontology has discrete modes or types that affect behavior. Prose is right when the ontology is about relationships or principles.

### Deliverables

The specific work the agent is doing, organized by logical grouping (data model, services, endpoints, components, screens) — not by chronological order. Order-of-operations is implicit in dependencies; the agent figures it out.

For each deliverable:
- What it is (one sentence)
- Why it's needed (brief rationale — this is what prevents mechanical compliance)
- Specific constraints or gotchas (only if non-obvious)
- Interactions with other deliverables (only if the agent needs to know)

Don't write code. Write what the code must do.

### Explicit non-goals

What is NOT in scope. Two categories:
- **Deferred** — belongs to a later cycle, flagged so the agent doesn't do it speculatively
- **Decided against** — considered and rejected, with brief reasoning

Brief rationale for each. No long explanations. Common non-goals to include: deferred verbs/features, speculative optimizations, adjacent features that could creep in, design-pattern temptations ("don't add a command palette yet even though web is keyboard-centric").

### Quality bar

The behavioral acceptance tests. Things that must all be true for the work to be considered complete. User-observable or API-observable behaviors a human could verify — not a checklist of files modified.

Usually 3–5 tests. Each specific enough that the agent knows what to verify and the user knows what to check. Written from the user's or tester's perspective: what can you verify by using the feature, by hitting the API with curl, by reading the code's behavior on a small test case?

If the quality bar reads like the structural checklist, you're doing it wrong. The checklist is "these files exist." The quality bar is "this API call produces this kind of output, and if you change the input this way, the output changes this way."

### Deliverable checklist

The structural checklist the agent uses to self-verify. Allowed to be mechanical — a list of fields, endpoints, components, tests. Make clear that the checklist being complete is **necessary but not sufficient** — the quality bar is the real acceptance test.

One useful pattern: end the checklist with "Integration tests cover: [key behaviors]." Bridges structural to behavioral without confusing them.

### Reconnaissance before implementation

What the agent produces *before* writing code. Usually a plan document covering:
- Architecture decisions with downstream consequences
- Where existing code will be modified vs. extended
- Migration paths for existing data (if applicable)
- Assumptions being made that should be reviewed

The agent does not begin implementation until the user approves the plan. This is the single biggest lever for agent-driven development quality.

For trivial specs, replace this section with: "No recon needed for this cycle — proceed to implementation." Default is include it.

## Multi-agent dispatch (parallel frontends, backend + frontends, etc.)

When dispatching multiple agents in parallel — most commonly iOS + web, or backend + multiple frontends — write a **shared preamble** first and paste it verbatim into the top of each agent's spec. This is the enforcement mechanism for capability parity.

The shared preamble contains:
1. **The ontology** — product vocabulary, data model, verbs
2. **Capability parity** — a table of verbs every surface must support with identical semantics
3. **Cross-surface rules** — behavior identical regardless of ergonomics
4. **Shared microcopy** — specific strings that must be the same across surfaces
5. **Shared non-goals** — what no surface builds

The preamble is usually 1–2 pages, never contains surface-specific instructions. Both agents see the same reference, so when they make local decisions they make them against the same definitions. You're not relying on the user to catch divergence — the preamble is the enforcement.

Where this fails: if the preamble is vague, agents interpret it differently. "Mode label appears near the collection title, tapping opens an override sheet" is enforceable. "Mode is visible somewhere on the UI" is not.

**Backend + frontend dispatch is usually sequential, not parallel.** Backend recon → backend plan → backend implementation → frontend dispatch against stable contract. Parallel frontend work on an unstable backend wastes double the agent time when the contract changes. If the user pushes for parallel, only proceed if the backend work is extending existing stable endpoints (additive, not reshape).

**iOS + web parallel dispatch** is the most common parallel pattern. The ergonomic split:
- **iOS:** primary surface, short sessions, one-handed, thumb reach, swipes for reversible actions, taps for commits, haptics on meaningful actions, skeletons over spinners, offline graceful
- **Web:** deep-work surface, longer sessions, keyboard-native (shortcuts, focus management), multi-column layouts, responsive degradation that nudges to mobile app for phone viewports

Neither surface should try to be the other. iOS shouldn't replicate deep-work surfaces web does well. Web shouldn't try to be a phone-friendly mobile web app.

## Anti-patterns — watch for these in your own output

**The "already done" trap.** When recon comes back saying "80% built," resist reducing the spec to the remaining 20%. The remaining 20% is usually the *behavioral* layer that makes the 80% correct. If you don't spec it carefully, the agent adds a field and considers itself done. Weight the spec toward behavior change, not field addition.

**The dressed-up checklist.** A spec that is just "add X, create Y, wire Z" looks rigorous but produces mechanical output. Every deliverable needs rationale. If the agent could satisfy your spec without understanding the feature, the spec is too structural.

**Capability drift across parallel agents.** When writing parallel specs, easy to let them subtly diverge — "iOS supports this verb, web supports a richer version." This is how multi-surface products end up feeling broken. Verbs are in the shared preamble or they're not; ergonomics differ, not capabilities.

**Under-specified ontology.** The ontology section feels repetitive if you've been discussing the feature for a while — "the agent knows what a collection is by now." They don't. They have exactly what's in their prompt. Inline or reference the ontology explicitly, every time.

**Over-specified UI.** Specs that prescribe pixel layouts, exact color values, specific component names are over-specified. They constrain the agent without adding value. Specify behavior and structure (what surfaces exist, what they enable, what rules apply) — not implementation details. The frontend-design skill handles those correctly when given room.

**Missing the "why."** An agent that knows why a rule exists extends it correctly to new situations. An agent that only knows the rule follows it mechanically and misses adjacent problems. Every significant constraint should have at least a clause of rationale attached.

**Expansive scope.** Specs covering "everything we might want" produce scattered implementation. Every spec should have a clear answer to "what am I shipping this cycle?" If the answer is "everything," break it into staged cycles.

## How to use this skill in conversation

**Step 1: Understand what's being specced.** Don't jump into writing. Confirm with the user:
- What feature is this for?
- One agent or multiple (parallel dispatch)?
- Has any prior recon been done that should be incorporated?
- What's the runway pressure?
- Are there existing specs or ontology documents this should be consistent with?

**Step 2: Gather context from the conversation.** If the user has been brainstorming the feature in earlier turns, *that brainstorm IS the context section of the spec*. Don't re-derive it.

**Step 3: Draft the spec.** Use the structure above. Generous with rationale, stingy with prose. Each section does real work.

**Step 4: Flag the tradeoffs.** Every spec has them. In your response to the user (not inside the spec itself), call out:
- What parts are likely to be cut if runway gets tight
- What the agent is most likely to get wrong without extra attention
- What decisions you're less confident about and want the user to confirm

**Step 5: Offer dispatch guidance.** Tell the user how to actually *use* the spec — order of operations, what to review, how to enforce parity across parallel agents. This is what separates a spec from a spec-that-works.

## Final check before delivering

Read the spec through once more and verify:

1. Could an agent implement this without asking clarifying questions?
2. Does every requirement have a rationale? If not, add one or cut the requirement.
3. Are the behavioral acceptance tests genuinely observable?
4. Is there a recon step, or have you explicitly decided one isn't needed?
5. For multi-agent dispatches: is the shared preamble really shared, or are the specs subtly diverging?
6. Have you flagged what's likely to get cut under pressure?
7. Have you told the user how to dispatch and review, not just what to write?

If all seven check out, ship it. If any don't, fix before delivering.
