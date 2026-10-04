# Lifecycle commands

Three commands follow a change from an idea to a finished implementation: `new` starts it, `status` shows where it stands and `continue` tells your agent what to do next. A fourth, `use`, makes a change that is already open the active one again. TRUSS v0.2 is **agent-driven**: none of them runs a model. They read and write the state of the change, and your agent does the work.

The [getting started guide](../getting-started.md#5-take-one-change-through-the-workflow) walks through them once. This page is the reference for what each one prints and when to use it.

## The phases

A change is always in one phase, and `status` and `continue` show it:

| Phase | What it means | What moves it on |
|---|---|---|
| `spec` | planning artifacts are missing (by default proposal, specs, design and tasks) | the agent writes them, one at a time |
| `implementation` | every artifact exists and at least one task is open | the agent implements the tasks and checks each one off in `tasks.md` |
| `complete` | there are tasks and every one is checked off | verification, code review and archiving |

The phase is recomputed from OpenSpec each time you ask, so it cannot go stale. `complete` means *every task is checked off*, nothing more: it says nothing about whether the tasks were done well. That is what [`truss verify`](../reference/verify.md) and the review are for.

Archiving a change with `openspec archive` does not tell TRUSS, which finds out the next time you ask: `status` and `continue` say the active change was archived (and list the changes that are still open), and exit `0`; `handoff` writes no note for it and lists the open ones too, and the [`tasks_complete`](../reference/verify.md) gate reports it as archived instead of failing to read its tasks. Start the next one with `truss new`, or go back to one that is still open with [`truss use`](#truss-use).

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

If another change is still open in OpenSpec, `new` creates the new one and makes it the active change, and warns you that the other was left behind:

```text
○ "add-retry-policy" is still open in OpenSpec (openspec/changes/add-retry-policy) and is no longer the active change: TRUSS follows one change at a time. Go back to it with: truss use add-retry-policy
```

Nothing is lost: the first change stays in OpenSpec exactly as it was, and `openspec list` still shows it. [`truss use`](#truss-use) makes it the active change again. There is no warning when the previous change was archived or is gone from OpenSpec, since nothing is left behind.

When no change is active at all (a fresh clone, for instance, since `.truss/state.json` is local to each checkout) and some are open in OpenSpec, `new` still creates the new one, and says which ones it walks past:

```text
○ Also open in OpenSpec: add-retry-policy. None was the active change, and "second-change" is now: TRUSS follows one change at a time. Go back to one with: truss use add-retry-policy
```

With several open the command reads `truss use <change>`, and a change in a component is named with it (`add-retry-policy (component api)`). This line and the one above never appear together: `new` says the first when it replaces an active change that is still open, and this one when there was none to replace. A first change in a project with nothing open prints neither.

It needs an initialized project. Without `.truss/config.yaml` it stops with `× invalid config` and `TRUSS config not found: .truss/config.yaml. Run truss init to create it.`, and exit code `2`: run [`truss init`](../reference/init.md) first.

## `truss use`

`truss use <change> [--component name]`: use it to go back to a change that is already open in OpenSpec, typically one that `new` left behind. It makes that change the active one and prints where it stands:

```text
△ TRUSS · use

● Active change set
Change          add-retry-policy
Component       workspace
Phase           implementation
OpenSpec        openspec/changes/add-retry-policy
Planning        4/4 artifacts complete
Tasks           1/3 complete

Next: truss continue
```

`use` creates and changes nothing in OpenSpec. It only moves the record of which change is active, so you can run it as often as you like, including on the change that is already active. The change has to be open: one that does not exist, or that was archived, is an error (exit code `1`), and the message lists the changes that are open, for example `There is no open change "nope" in openspec/changes. Open there: add-retry-policy, second-change.`

A change in a component's own `openspec/` is found through that component: `truss use add-retry-policy --component api`. Without `--component`, `use` looks in the workspace's OpenSpec, and if the name exists in a component, the error says so and gives the command. No name, or a name that is not a change id (`../x`, `archive`), is a usage error (exit code `2`).

`.truss/state.json` is local to each checkout, so a fresh clone or a CI machine has no active change even when OpenSpec has changes in flight. `use` is how it picks one up, and [`truss status`](#truss-status) lists what is open.

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

When changes are open in OpenSpec, `status` lists them and points at [`truss use`](#truss-use) first. This is what a fresh clone or a CI checkout shows, because the record of the active change is local to each checkout:

```text
△ TRUSS · status

No active change.
Open changes    add-retry-policy, second-change
Next: truss use <change>, or truss new "Change name" for a new one
```

With a single open change the command names it (`truss use add-retry-policy`). A change in a component's own `openspec/` is listed as `add-retry-policy (component api)`, and the command then says `truss use add-retry-policy --component api`. The list reads the `openspec/changes` folders, so it does not need the OpenSpec CLI, and a component that does not resolve is left out instead of failing.

After the change was archived, it says so instead, followed by the same two lines when other changes are still open:

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
| none | go back to one that is open in OpenSpec with `truss use`, or create one with `truss new` |
| still planning | write or refine the next artifact that is ready, using Grill when something is still ambiguous |
| planned, tasks open | follow the [`execute-change`](execute-change.md) workflow, starting with the first task that is not checked off |
| every task checked off | run `truss verify`, then code review and OpenSpec verification and archiving |

With no active change and changes open in OpenSpec, `continue` lists them before it offers `truss new`, so an agent on a fresh checkout goes back to the change in flight instead of starting a duplicate of it:

```text
△ TRUSS · continue

No active change. Open in OpenSpec: add-retry-policy, second-change.
Make one of them the active change with: truss use <change>, or create a new one with: truss new "Change name"
```

With a single open change the command names it, as in `status`. After an archive it says `The change "x" was archived.` first and offers `create the next one`.

When `spec.mode` is `source`, or `spec.zone_guard` is on, the next action of a change that is being implemented also says what that asks of the agent: the spec is read-only while it implements, and spec work and code work are kept in separate steps. See [specification modes](spec-modes.md). The same goes for a development loop that is switched off: with `development.bdd: false` or `development.tdd: false` it says `BDD is off` or `TDD is off` and that the loop is not mandatory, because the workflow only says "if BDD is enabled" and does not say where that is set. Both on, the default, adds nothing.

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

While the tasks are open, the output also lists a **Context to load** section with the real paths of the workflow, the policies, the change and the project's `.truss/config.yaml`, as the getting started guide shows. It lists the project's `AGENTS.md` (the component's own, or else the workspace's) only when one exists: `init` does not create it. With Graphify enabled, the output ends with a **Code graph** section: one sentence that tells the agent to use the graph when it is fresh and what to run when it is stale, missing or damaged (see the [Graphify lifecycle](../integrations/graphify-lifecycle.md)). It says nothing when Graphify is off, or optional and not installed. A prompt that works with any agent is: "Implement the active TRUSS change. Run `truss continue` and follow the instructions and the files it lists."

## Reopening a finished change

A change is `complete` when every task is checked off. If a review or a later look turns up more work before you archive, do not edit the code and leave `tasks.md` as it is: `status`, the `tasks_complete` gate and the next reader would all say the work was finished. Add a **new task group** to `tasks.md` instead:

```markdown
## 2. Review follow-ups
- [ ] 2.1 Handle the timeout case
```

The phase goes back to `implementation` (`Tasks 2/3 complete`), and `continue` names the new task as the first incomplete one. This was run on a change that had reached `complete`. Check the tasks off as you finish them, run `truss verify` again, and the change returns to `complete`. If the new work changes behavior, update the spec and the design too. Once a change has been archived, it cannot be reopened this way: start a new one with `truss new`.

Before `openspec archive`, check that the tasks, the spec, the design and the proposal still agree, and that what you decided to leave for later is written down somewhere durable.

## Which one, when

- **Starting something new:** `new`.
- **Going back to a change `new` left behind:** `use`.
- **A fresh clone or a CI checkout, where nothing is active:** `status` lists what is open in OpenSpec, and `use` picks it up.
- **Coming back after a break, or before a handoff:** `status`, and `truss handoff` if the work is changing hands (see [handoff](../reference/handoff.md)).
- **Handing work to an agent:** `continue`, every time. Its output changes as the change moves.
- **You think you are done:** `status` to see that every task is checked off, then `verify`.

## How it works

TRUSS keeps only the pointer to the active change, in `.truss/state.json`. Everything else comes from OpenSpec every time: `new` runs `openspec new change`, `status` runs `openspec status` and reads task progress from `openspec instructions apply` (the checkboxes of `tasks.md`), and TRUSS never invents its own layout of OpenSpec artifacts.

`openspec status` alone cannot tell `implementation` from `complete`: its `isComplete` means *all artifacts exist*, not *all tasks are done*. TRUSS therefore reports `complete` only when task progress says so. This keeps the boundary explicit: OpenSpec owns the state of the change and its artifacts, TRUSS owns the engineering workflow policy, and the coding agent does the non-deterministic implementation. Who does what is spelled out in [Who does what](../concepts/who-does-what.md).
