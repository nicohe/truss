# Spec-driven development

The idea: write down what a change must do *before* implementing it, keep that description next to the code, and check the result against it. TRUSS does not define its own format for this. It requires [OpenSpec](../integrations/openspec.md), which keeps each change as a small set of files: a proposal, specs, a design and a task list.

## The path of a change

```text
idea → proposal → specs → design → tasks → implement → verify → review → archive
```

- **Before implementing**, the four planning artifacts describe the change. `truss new` creates the change; `truss continue` tells the agent which artifact to write next.
- **While implementing**, the task list is the progress meter. `truss status` shows `Tasks 1/3 complete`, and a change only counts as complete when every task is checked off.
- **Before finishing**, `truss verify` runs the deterministic checks, a review compares the result with the spec, and the change is archived through OpenSpec.

## Two ways to treat the spec

`spec.mode` decides what happens when implementation teaches you something the spec did not know.

| Mode | The spec is... | When you discover something |
|---|---|---|
| `anchored` (default) | the permanent anchor | you may refine the spec, design, tests or tasks, but the divergence must be explicit and reconciled before the change is finished |
| `source` | authoritative while you implement | you go back to the spec phase first and change the code only afterwards |

In both, code and specification never diverge silently. `anchored` suits most work, where discovery is normal. `source` suits work where the behavior is fixed in advance, such as a contract or a regulated feature. The details, with diagrams, are in [specification modes](../workflows/spec-modes.md).

## What TRUSS does about it

TRUSS checks the mechanical parts and asks the agent for the rest:

- **TRUSS checks:** that OpenSpec is installed and compatible, the phase of the active change, and, if you enable `verification.tasks_complete`, that no task is left open.
- **The agent is asked to:** follow the mode, reconcile discoveries, and keep the spec honest. Nothing in v0.2 stops an agent from ignoring the spec. `spec.zone_guard` only *declares* the intent to keep spec and code work apart.

See the [enforcement model](../reference/enforcement.md) for the exact boundary.
