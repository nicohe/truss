# Durable vs ephemeral state

Some of what surrounds a change is knowledge the project will need later. The rest is scaffolding. Commit the first kind; keep the second local.

## Durable: commit it

| What | Where |
|---|---|
| Source code and tests | your repository |
| Specs, designs, tasks and archived changes | `openspec/` |
| Architectural decisions (ADRs), when a decision deserves one | your docs |
| Stable project documentation and the agent guidance file | your docs, `AGENTS.md` |

If a future teammate or agent would be worse off without it, it belongs here.

## Ephemeral: keep it local

| What | Where |
|---|---|
| The active-change pointer | `.truss/state.json` |
| Evidence of the last `truss verify` | `.truss/verification/latest.json` |
| Handoff notes written by `truss handoff` | `.truss/handoffs/` |
| Any other session state, caches or logs | wherever your agent runtime keeps them |
| A Graphify index | `graphify-out/` |
| Your approval of a verification command list | `$TRUSS_HOME/trusted.json`, outside the repository on purpose |

These describe *this checkout, right now*. If one becomes worth keeping, such as a discovery from a handoff, move it into a durable place (OpenSpec, an ADR, the docs) instead of committing the scratch file.

## What the quick start does with `.truss/`

The [quick start](../getting-started.md) clones TRUSS into `.truss/` and ignores the whole directory. That keeps TRUSS out of your history, and it also means `.truss/config.yaml` is **local to each checkout**: it is not committed with the project. If your team needs one shared configuration, that is a manual arrangement today; TRUSS does not provide a mechanism for it yet.

Git ignores are also why nothing in this table should reach a commit by accident. `truss doctor` warns when `.truss/` is not ignored.
