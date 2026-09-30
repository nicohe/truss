# `truss handoff`

`truss handoff` writes a short note about the active change, for when work moves to another agent, runtime, session or person. Use it only at a real boundary, not between every step; see [context management](../concepts/context-management.md).

```text
△ TRUSS · handoff

● .truss/handoffs/add-retry-policy.md
```

## What it does

- It needs an active change (see [`truss new`](../workflows/lifecycle-commands.md)). Without one it prints `No active change.`, writes nothing and exits `0`.
- It writes `.truss/handoffs/<change>.md` and prints the path.
- It fills in what TRUSS knows (the change, the component, the phase, the OpenSpec path and the current Git branch, or `unknown`) and leaves the rest empty:

```markdown
# Handoff: add-retry-policy

- Component: workspace
- Phase: implementation
- OpenSpec: openspec/changes/add-retry-policy
- Branch: main

## Completed

## Discoveries

## Verification

## Blockers

## Next action
```

Filling in the sections is the agent's job. The `handoff` skill says what a good note contains: the first incomplete task, completed work, decisions not yet in a durable artifact, the verification status, blockers and the exact next action.

## Running it again replaces the file

If a note for the change already exists, `truss handoff` overwrites it with the empty template, and what was written in it is lost. Copy or rename a note you have filled in before running the command again.

## Where the note lives

In `.truss/handoffs/`, which is local state that Git ignores. A handoff is ephemeral: move anything durable, such as a discovery that changes the spec or a decision worth an ADR, into OpenSpec, an ADR or the docs first. See [durable vs ephemeral state](../concepts/durable-vs-ephemeral.md).

## Exit codes

| Code | Meaning |
|---|---|
| `0` | The note was written, or there is no active change. |
| `2` | `.truss/state.json` is unreadable. |
