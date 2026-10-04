# `truss handoff`

`truss handoff` writes a short note about the active change, for when work moves to another agent, runtime, session or person. Use it only at a real boundary, not between every step; see [context management](../concepts/context-management.md).

```text
△ TRUSS · handoff

● .truss/handoffs/add-retry-policy.md
```

## What it does

- It needs an active change (see [`truss new`](../workflows/lifecycle-commands.md)). Without one it prints `No active change.`, writes nothing and exits `0`. If changes are open in OpenSpec (a fresh clone has none active, since `.truss/state.json` is local to each checkout) it lists them and points to `truss use`, as [`truss status`](../workflows/lifecycle-commands.md#truss-status) does:

  ```text
  No active change.
  Open changes    add-retry-policy
  Next: truss use add-retry-policy, or truss new "Change name" for a new one
  ```

  With nothing open it stays the one line. The same holds when the active change was archived with `openspec archive`: it says so, lists what is still open (or points to `truss new`), and writes nothing, because a finished change has nothing to hand off.
- It writes `.truss/handoffs/<change>.md` and prints the path.
- It fills in what TRUSS knows (the change, the component, the phase, the OpenSpec path and the current Git branch, or `unknown`) and leaves the rest empty. The phase is asked from OpenSpec when the note is written, so it is the one `truss status` would show now. If OpenSpec or the configuration cannot be used, `handoff` still writes the note, with the phase last recorded and a line saying so (`Phase: implementation (last recorded; OpenSpec could not be asked)`):

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

## A filled-in note

TRUSS writes the header; the agent writes the rest. A note for a change that moves to a reviewer can look like this (the contents are an illustration):

```markdown
# Handoff: add-retry-policy

- Component: workspace
- Phase: implementation
- OpenSpec: openspec/changes/add-retry-policy
- Branch: feature/add-retry-policy

## Completed
- Tasks 1.1 to 1.4 done and checked off; `truss verify` passes (5 of 5 commands).
- Retry with exponential backoff in `src/retry.ts`; scenarios 1 to 3 of the spec pass.

## Discoveries
- The timeout case is not in the spec: a request that times out is retried like a failure. Decide whether that is intended before archiving.

## Verification
- `truss verify` passed at the last commit; evidence in `.truss/verification/latest.json`.
- Not run: `openspec validate add-retry-policy`.

## Blockers
- None.

## Next action
- Review against the spec with `.truss/.truss/skills/code-review.SKILL.md`; start from the timeout question above.
```

Write it briefly: the [`caveman`](../skills/overview.md#caveman) skill applies to a note like this one, which is read once, and not to the spec or the review report. A handoff is for the boundary between the implementer and the reviewer; the reviewer's findings come back as a report, not as a handoff (see [review in a separate session](../guides/agents.md#review-in-a-separate-session-then-back-to-the-implementer)).

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
