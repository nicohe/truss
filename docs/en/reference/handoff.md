# `truss handoff`

`truss handoff` writes a short note about the active change, for when work moves to another agent, runtime, session or person. Use it only at a real boundary, not between every step; see [context management](../concepts/context-management.md).

```text
△ TRUSS · handoff

● .truss/handoffs/add-retry-policy.md
```

## What it does

- It needs an active change (see [`truss new`](../workflows/lifecycle-commands.md)). Without one it prints `No active change.`, writes nothing and exits `0`. The same holds when the active change was archived with `openspec archive`: it says so, points to `truss new`, and writes nothing, because a finished change has nothing to hand off.
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

## Running it again keeps your note

If a note for the change already exists, `truss handoff` leaves it exactly as it is and says so:

```text
△ TRUSS · handoff

○ .truss/handoffs/add-retry-policy.md already exists and was not changed.
  Edit it, or delete it to start a new note.
```

The exit code is `0`, as for a note that was written. To start over, delete the file first. Releases up to 0.2.2 replaced an existing note with the empty template instead, and lost what was written in it.

## Where the note lives

In `.truss/handoffs/`, which is local state that Git ignores. A handoff is ephemeral: move anything durable, such as a discovery that changes the spec or a decision worth an ADR, into OpenSpec, an ADR or the docs first. See [durable vs ephemeral state](../concepts/durable-vs-ephemeral.md).

## Exit codes

| Code | Meaning |
|---|---|
| `0` | The note was written, an existing note was kept as it is, or there is no active change (or it was archived). |
| `2` | `.truss/state.json` is unreadable. |
