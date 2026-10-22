# ADR 0004: remember the active change for each Git branch

- **Status:** proposed, 2026-10-21.
- **Decision by:** the maintainer.

## Context

The maintainer's requirement: a person must be able to change branches, with small or large changes in each, and not lose the reference to what they were working on.

Today TRUSS keeps one record of the active change in `.truss/state.json` (the change, its component, the last phase it saw, and the path). `.truss/` is ignored by Git ([ADR 0001](0001-local-project-configuration.md)), so every branch reads the same file. What follows was run in a throwaway repository with two branches:

- **The record follows the person, not the branch.** The change `demo` was active on `main`. On a new branch `feat-b`, `truss new "other change"` replaced the record with `other-change` and the change was committed there. Back on `main`, the record still said `other-change`, a change that does not exist on `main`, and `status` and `continue` failed (exit code `1`). Nothing said that `demo` was the change the person had been working on.
- **The failure message gave no way out.** It said to start a new change. It has since been extended to list what is open and the `truss use` command (see the changelog); that fixes the dead end, not the lost reference.
- **The evidence is one file.** `.truss/verification/latest.json` and `working-tree.json` are overwritten by each `verify`; they stayed at 417 and 201 bytes after verifying on both branches. After verifying on `feat-b` and going back to `main`, `status` printed the stale-evidence warning ([ADR 0002](0002-stale-evidence-warning.md)) without saying that the evidence was from another branch.
- **The handoff note is one file per change** and `truss handoff` never overwrites it. Its `Branch:` line was written when the note was created and says `feat-b` after going back to `main`.
- Nothing grows without bound: the files above are replaced, not appended to.

## Decision

Remember the active change **for each branch**, so that going back to a branch brings back the change that was active there.

**The record.** `.truss/state.json` keeps its current top-level fields, as "the change last made active", and gains a `branches` map:

```json
{
  "change": "other-change",
  "phase": "implementation",
  "branches": {
    "main": { "change": "demo", "component": null, "title": "demo", "phase": "complete", "path": "openspec/changes/demo", "updatedAt": "…" },
    "feat-b": { "change": "other-change", "component": null, "title": "other change", "phase": "implementation", "path": "openspec/changes/other-change", "updatedAt": "…" }
  }
}
```

**Reading.** The current branch is asked from Git, read-only (`git symbolic-ref --short -q HEAD`). If the map has an entry for it, that is the active change. If not, the top-level fields apply, which is what happens today. A project that never changes branch sees no difference.

**Writing.** `new` and `use` write the top-level fields and the entry of the current branch. When `status` or `continue` find that the phase of the active change moved, they update both.

**No branch, no entry.** In a detached HEAD, or where Git is not available, there is no per-branch entry and only the top-level fields are used, as today.

**It stays bounded.** Each write drops the entries of branches that no longer exist (`git for-each-ref refs/heads`). If Git cannot list them, nothing is dropped.

**The evidence stays single.** `latest.json` gains the `branch` it was recorded on, and the stale-evidence line says so when it differs from the current one, for example `the evidence was recorded on branch "feat-b"; you are on "main"`. The decision whether the evidence is stale does not change: it is still the fingerprint of ADR 0002.

**The handoff note does not change.** It is still one file per change and is never overwritten. The reference documents that its `Branch:` line is the branch at the time it was written.

## Options considered

| Option | Why not |
|---|---|
| Only the clearer failure message | Done already, as a first step. It removes the dead end but the person still has to remember which change they were on |
| One state file per branch (`.truss/state/<branch>.json`) | Branch names contain `/`; files of deleted branches stay behind; pruning needs a directory walk. One map in one file is simpler to read and to prune |
| Store the record inside Git (notes or refs) | It writes inside `.git`, which TRUSS does not touch; it would also travel with a push |
| Link a change to a branch by naming convention | Assumes a convention the project may not follow |
| Evidence for each branch | The files would multiply with the branches and need the same pruning. A new `verify` is the normal way to get fresh evidence, and a label on the existing one says what is needed |
| A Git hook on checkout | TRUSS does not install hooks or touch `.git` |

## Consequences

- ✅ Going back to a branch brings back its change, for small and large changes alike, without the person naming it again.
- ✅ Opt-in by use: a branch with no entry behaves as today, and an old `state.json` without `branches` is read as before. An older TRUSS reads a newer file without trouble, since the top-level fields are still there; but when it writes (`new`, `use`) it builds the record from those fields alone and drops the map, so the per-branch memory is lost until a newer TRUSS writes it again.
- ✅ Bounded: one entry per existing branch.
- ⚠️ A behavior change for anyone who relied on one active change across branches: on a branch where `use` was run before, `status` now shows that branch's change, not the last one used anywhere.
- ⚠️ A renamed branch loses its entry and falls back to the top-level fields; the old entry is dropped at the next write.
- ⚠️ The evidence is still a single file, so after changing branch a `verify` is needed again; the label says why.
- ⚠️ Cost: one `git symbolic-ref` for each command that reads the active change, and one `git for-each-ref` for each write.
- ⚠️ Git worktrees have their own `.truss/`, so they are separate records. A project whose `.truss/` is shared between worktrees by hand is not covered.

## Testing plan

Unit tests for reading, writing and pruning the map, including the old format. Integration tests with a real Git repository: create a change on a branch, switch, check `status`; go back; a detached HEAD; a deleted branch is pruned; a directory that is not a Git repository behaves as today; and the label on stale evidence.

## Open points for the maintainer

1. **Detached HEAD.** Proposed: no per-branch entry. The alternative is to key on the commit, which accumulates entries that mean little.
2. **Should `status` print the branch** (a `Branch` line) when the active change came from a per-branch entry? Proposed: yes, one line, only when the map is in use.
3. **Pruning.** Proposed: at each write, against the local branches. The alternative is `truss doctor` reporting entries of missing branches and a command to clean them.
4. **A switch.** Proposed: none. A setting such as `lifecycle.per_branch: false` would restore today's behavior, at the price of another option to document.
5. **The handoff note.** Proposed: leave it as it is. The alternative is to print a line when its `Branch:` differs from the current branch.
