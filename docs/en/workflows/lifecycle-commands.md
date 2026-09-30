# Lifecycle commands

Three commands follow a change from an idea to a finished implementation: `new` starts it, `status` shows where it stands and `continue` tells your agent what to do next. TRUSS v0.2 is **agent-driven**: none of them runs a model. They read and write the state of the change, and your agent does the work.

The [getting started guide](../getting-started.md#5-take-one-change-through-the-workflow) walks through them once. This page is the reference for what each one prints and when to use it.

## The phases

A change is always in one phase, and `status` and `continue` show it:

| Phase | What it means | What moves it on |
|---|---|---|
| `spec` | planning artifacts are missing (by default proposal, specs, design and tasks) | the agent writes them, one at a time |
| `implementation` | every artifact exists and at least one task is open | the agent implements the tasks and checks each one off in `tasks.md` |
| `complete` | there are tasks and every one is checked off | verification, code review and archiving |

The phase is recomputed from OpenSpec each time you ask, so it cannot go stale. `complete` means *every task is checked off*, nothing more: it says nothing about whether the tasks were done well. That is what [`truss verify`](../reference/verify.md) and the review are for.

Archiving a change with `openspec archive` does not tell TRUSS, which finds out the next time you ask: `status` and `continue` say the active change was archived, and exit `0`; `handoff` writes no note for it, and the [`tasks_complete`](../reference/verify.md) gate reports it as archived instead of failing to read its tasks. Start the next one with `truss new`.

## `truss new "Change name" [--component name]`

Use it to start a change. It turns the title into an id (`Add retry policy` becomes `add-retry-policy`), asks OpenSpec to create the change, and remembers it as the **active change**. Only one change is active at a time.

```text
△ TRUSS · new

● OpenSpec change created
Change          add-retry-policy
Component       workspace
OpenSpec        openspec/changes/add-retry-policy
Planning        0/4 artifacts complete

Next: truss continue
```

With `--component api`, the change is created inside a component declared under `components` (see [components](../reference/components.md)).

It needs an initialized project. Without `.truss/config.yaml` it stops with `× invalid config` and `TRUSS config not found: .truss/config.yaml. Run truss init to create it.`, and exit code `2`: run [`truss init`](../reference/init.md) first.

## `truss status`

Use it whenever you want to know where the change stands, before you hand it to an agent or when you come back to it. It changes nothing except refreshing the phase it remembers.

```text
△ TRUSS · status

Change          add-retry-policy
Component       workspace
Phase           implementation
OpenSpec        openspec/changes/add-retry-policy
Planning        4/4 artifacts complete
Tasks           1/2 complete
  ● proposal           done
  ● specs              done
  ● design             done
  ● tasks              done
Tasks required   tasks

Next: truss continue
```

The markers next to each artifact are `●` done, `◐` ready to be written and `○` blocked until another artifact exists. `Tasks required` names the artifact OpenSpec needs before a task can be worked on. While planning is unfinished the `Tasks` line is absent, because there are no tasks yet.

With no active change it says so and points at the next step:

```text
△ TRUSS · status

No active change.
Next: truss new "Change name"
```

After the change was archived, it says so instead:

```text
△ TRUSS · status

The active change "add-retry-policy" was archived (openspec/changes/archive/2026-09-30-add-retry-policy).
Next: truss new "Change name"
```

If OpenSpec has lost the active change without archiving it (its folder was deleted, say), `status` fails with exit code `1` and names the missing folder.

## `truss continue`

Use it to get the next instruction for your agent. It computes the step from the state of the change and prints it, together with the files the agent should read. It never starts an agent: you give its output to one.

| The change is | The next action |
|---|---|
| none | create one with `truss new` |
| still planning | write or refine the next artifact that is ready, using Grill when something is still ambiguous |
| planned, tasks open | follow the [`execute-change`](execute-change.md) workflow, starting with the first task that is not checked off |
| every task checked off | run `truss verify`, then code review and OpenSpec verification and archiving |

For a change that is still planning:

```text
△ TRUSS · continue

Change          add-retry-policy
Phase           spec
OpenSpec        openspec/changes/add-retry-policy
Mode            agent-driven (TRUSS v0.2)

Next action
Create/refine the OpenSpec artifact "proposal" for add-retry-policy. Run openspec instructions proposal --change add-retry-policy for its format and path. Use Grill first if material ambiguity remains.
```

For a change whose tasks are all checked off:

```text
△ TRUSS · continue

Change          add-retry-policy
Phase           complete
OpenSpec        openspec/changes/add-retry-policy
Tasks           2/2 complete
Mode            agent-driven (TRUSS v0.2)

Next action
Implementation tasks for add-retry-policy are complete. Run truss verify, then perform code review, then openspec validate add-retry-policy and, once it passes, openspec archive add-retry-policy.
```

While the tasks are open, the output also lists a **Context to load** section with the real paths of the workflow, the policies and the change, as the getting started guide shows. A prompt that works with any agent is: "Implement the active TRUSS change. Run `truss continue` and follow the instructions and the files it lists."

## Which one, when

- **Starting something new:** `new`.
- **Coming back after a break, or before a handoff:** `status`, and `truss handoff` if the work is changing hands (see [handoff](../reference/handoff.md)).
- **Handing work to an agent:** `continue`, every time. Its output changes as the change moves.
- **You think you are done:** `status` to see that every task is checked off, then `verify`.

## How it works

TRUSS keeps only the pointer to the active change, in `.truss/state.json`. Everything else comes from OpenSpec every time: `new` runs `openspec new change`, `status` runs `openspec status` and reads task progress from `openspec instructions apply` (the checkboxes of `tasks.md`), and TRUSS never invents its own layout of OpenSpec artifacts.

`openspec status` alone cannot tell `implementation` from `complete`: its `isComplete` means *all artifacts exist*, not *all tasks are done*. TRUSS therefore reports `complete` only when task progress says so. This keeps the boundary explicit: OpenSpec owns the state of the change and its artifacts, TRUSS owns the engineering workflow policy, and the coding agent does the non-deterministic implementation. Who does what is spelled out in [Who does what](../concepts/who-does-what.md).
