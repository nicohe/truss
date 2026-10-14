# ADR 0003: `status` and `continue` warn when spec files and code files are both changed and uncommitted

- **Status:** accepted, 2026-10-13.
- **Decision by:** the maintainer.

## Context

`spec.zone_guard: true` declares that spec work and code work are kept apart: while a change is implemented the spec is read-only, and when the behavior has to change the work goes back to the spec, then returns to the code. In v0.2 nothing checks it. `truss continue` reminds the agent in words, and the option is listed as declarative in the [enforcement model](../../reference/enforcement.md).

The [intent-driven-template](https://github.com/intent-driven-dev/intent-driven-template) (MIT license) asks its agent for a stricter form of the same idea: a unit of work edits either the spec zone (`openspec/`) or the code zone, never both while changes are uncommitted, and `tasks.md` is exempt. It checks it by reading `git status --porcelain`. This ADR takes that observation, not the template's files.

TRUSS can state one fact about this without running the agent: whether the work tree has uncommitted changes in both zones at this moment.

## Decision

When `spec.zone_guard` is `true`, `status` and `continue` print one warning if the uncommitted changes touch both zones. It only warns.

**The check** reads Git, read-only: `git status --porcelain=v1 -z`, with renames counted by both paths. It runs from the project root, and sees staged, unstaged and untracked files. What Git ignores is out by definition.

**The spec zone** is every path under an `openspec/` folder at any depth (the same rule as the [fingerprint of ADR 0002](0002-stale-evidence-warning.md)).

**The code zone** is every other path.

**In neither zone:**
- any file named `tasks.md` under `openspec/`, because ticking a task is how the work is recorded and is done from either zone;
- `openspec/changes/archive/`, whose contents are produced by `openspec archive` and should be committed as a unit with the sync it comes with;
- `.truss/` (the local clone and its evidence, normally ignored).

**Shown** as one line only when both zones have at least one changed path, with up to three paths of each:

```text
Zones           ○ uncommitted changes in the specs (openspec/) and in the code at once. Commit one zone before working on the other.
                specs: openspec/changes/add-retry/specs/retry/spec.md
                code:  src/retry.ts, src/retry.test.ts
```

`status` prints it with the summary. `continue` prints it under its own `Zones` heading, in every phase (in `spec` it catches code edited before the spec is settled). It never changes an exit code and never blocks.

It says nothing when `zone_guard` is off, when the tree is clean or touches one zone, when the project is not a Git work tree, or when Git fails. `doctor`, `handoff` and `verify` are unchanged.

## Options considered

| Option | Why not |
|---|---|
| Block in `verify` | A warning about the state of the tree is not a verification result; blocking would surprise a person who commits both on purpose |
| A Git hook that refuses the commit | TRUSS does not install hooks or touch `.git`; the option stays with the person |
| Look at commits, not at the work tree | A commit cannot tell what one unit of work was; the uncommitted state is the only moment the question has an answer |
| A runtime adapter that denies writes in the other zone | The real enforcement, and already the plan in the docs. It needs a runtime TRUSS does not control, and this ADR does not replace it |
| Gate on `spec.mode: source` instead of `zone_guard` | `zone_guard` is the option that says "keep them apart"; `mode: source` already adds a reminder in `continue` and does not imply the separation |

## Consequences

- ✅ `zone_guard` has a first effect that TRUSS itself produces, not only a sentence for the agent.
- ✅ Opt-in on an option that today does nothing, so no existing configuration changes behavior.
- ⚠️ It sees the state afterwards. It cannot stop the agent from editing the other zone; it can only say that it happened.
- ⚠️ False warnings are possible: a spec corrected while implementing, as the policy itself allows, or a generated file under `openspec/`. The warning says to commit one zone, and the person decides.
- ⚠️ The code zone is "everything else", so a change to the README counts as code. This is the template's rule. Exempting documentation would need a list that TRUSS cannot know for every project.
- ⚠️ Cost: one `git status` for each `status` and `continue` when the option is on.

## Decisions on the open points

1. Nothing is exempted beyond `tasks.md`, the archive folder and `.truss/`; the warning is allowed to be imperfect.
2. The line appears in every phase, `spec` included.
3. The warning needs `spec.zone_guard: true`; `spec.mode: source` alone does not turn it on.
