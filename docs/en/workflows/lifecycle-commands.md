# TRUSS v0.1 lifecycle commands

TRUSS v0.1 remains **agent-driven**. These commands make OpenSpec the operational source for change state without introducing the runtime orchestration planned for v0.2.

## `truss new "Change name" [--component name]`

- validates TRUSS configuration and the component;
- requires a compatible, initialized OpenSpec project;
- normalizes the title to a kebab-case change id;
- delegates scaffold creation to `openspec new change <id> --goal <title> --json`;
- never invents its own OpenSpec artifact layout;
- records only the active-change pointer in `.truss/state.json`.

## `truss status`

- reads the active change pointer from `.truss/state.json`;
- queries `openspec status --change <id> --json` every time;
- reports artifact readiness and planning progress from OpenSpec rather than stale TRUSS phase data;
- reports task progress (`Tasks 1/3 complete`) read from `openspec instructions apply`, i.e. the checkboxes of `tasks.md`;
- refreshes the local phase pointer:
  - `spec`: planning artifacts are still missing;
  - `implementation`: every artifact exists but at least one task is open (or task progress is unavailable);
  - `complete`: there are tasks and every one is checked off.

`openspec status` alone cannot tell `implementation` from `complete`: its `isComplete` means *all artifacts exist*, not *all tasks are done*. TRUSS therefore never reports `complete` unless task progress says so.

## `truss continue`

`continue` does not invoke a coding model in v0.1. It computes and prints the next agent action:

- no active change → create one;
- planning incomplete → create/refine the next ready OpenSpec artifact, using Grill when ambiguity remains;
- planning complete, tasks open → follow `.truss/workflows/execute-change.md`, BDD/TDD and verification policies, starting with the first incomplete task;
- all tasks complete → run deterministic verification, code review, then OpenSpec verification/archive.

This keeps the boundary explicit: OpenSpec owns change/artifact state; TRUSS owns engineering workflow policy; the coding agent performs non-deterministic implementation in v0.1.
