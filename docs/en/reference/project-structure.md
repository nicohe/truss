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
| `state.json` | The active change pointer. |
| `verification/latest.json` | Evidence of the last `truss verify`. |
| `handoffs/` | Local handoff notes. |

`openspec/` holds the durable change artifacts when OpenSpec is used. Local state is ignored by Git; specs, tests and documentation are committed. Project application code must remain usable if `.truss/` is removed.

When TRUSS is used on its own repository, the installation and the project are the same directory.
