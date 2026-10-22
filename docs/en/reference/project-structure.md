> Canonical TRUSS documentation.

# Project structure

TRUSS involves two locations. Keeping them apart explains where every file lives.

## The TRUSS installation

The clone of this repository (in the quick start, a clone inside the project's `.truss/`, but it may live anywhere). It holds the code (`bin/`, `lib/`) and, in its own `.truss/` directory, the **harness content** that ships with that version of the code:

| Path inside the installation | What it is |
|---|---|
| `.truss/schema/config.schema.json` | The configuration schema. It must match the code that validates with it, so it is read from the installation and never from the project. |
| `.truss/skills/` | The portable skills listed by `truss skills`. |
| `.truss/policies/` | BDD, TDD, spec, verification and review policies. |
| `.truss/workflows/` | Workflows such as `execute-change`. |

When the installation is a clone in the project's `.truss/`, that content is at `.truss/.truss/…`, and `truss continue` prints the real path to read. Update TRUSS by moving the clone to another release (see [Update or remove TRUSS](../guides/update-and-remove.md)).

## The project

The directory TRUSS runs in. It gets only its own files, all under `<project>/.truss/`:

| Path | What it is |
|---|---|
| `config.yaml` | The project configuration (`truss init` creates it). |
| `state.json` | The active change pointer, kept for each Git branch where a change was made active. |
| `verification/latest.json` | Evidence of the last `truss verify`. |
| `verification/working-tree.json` | The content id of each file at the last passing `verify`, so the warning can name what changed. |
| `verification/history.json` | The last ten passing runs, each with the fingerprint of its files. |
| `handoffs/` | Local handoff notes. |

### How these files behave

Measured in a throwaway repository with two branches and up to 1,005 files. None of them is committed: `.truss/` is ignored by Git, and what a teammate would miss goes into `openspec/` and the code (see [durable vs ephemeral state](../concepts/durable-vs-ephemeral.md)).

| File | Written by | Replaced or added to | Size | `truss use` | Change of branch |
|---|---|---|---|---|---|
| `state.json` | `new`, `use`, and `status` or `continue` when the phase of the change moved | replaced as a whole (temporary file, then rename) | about 400 bytes, plus about 200 for each branch with an entry | rewritten: it records the new active change | it holds one entry for each branch, so going back brings back that branch's change ([ADR 0004](../development/decisions/0004-active-change-per-branch.md)) |
| `verification/latest.json` | every `verify`, passed or failed | replaced | about 470 bytes with one command in the list, a little more for each further one; it does not grow with the project | untouched | untouched; it names the branch and the commit of the run |
| `verification/working-tree.json` | a `verify` that **passes**; a failing one leaves it as it was | replaced | grows with the number of files Git sees, not with time: 0.7 KB for 12 files, 12 KB for 212, 59 KB for 1,005 | untouched | untouched |
| `verification/history.json` | a `verify` that passes | newest first, one entry for each tree, at most ten | about 200 bytes an entry, 2 KB at the most | untouched | untouched; it is what makes files that already passed on another branch count as current |
| `handoffs/<change>.md` | `truss handoff` | never overwritten: a second run leaves it and says so | one file for each change, about 200 bytes before it is filled in | untouched | untouched; its `Branch` and `Commit` lines are those of the moment it was written, and `status` says when they differ |

Repeating `verify` on the same files changes none of these sizes. Moving between branches does not touch any of them either: `verify`, `use`, `new`, `handoff` and the phase refresh of `status` and `continue` are the only things that write them. In `truss use add-retry-policy`, `add-retry-policy` is a change id, the name `truss new "Add retry policy"` gives the folder under `openspec/changes/`; `openspec list` shows the ids.

`openspec/` holds the durable change artifacts when OpenSpec is used. Local state is ignored by Git; specs, tests and documentation are committed. Project application code must remain usable if `.truss/` is removed.

When TRUSS is used on its own repository, the installation and the project are the same directory.
