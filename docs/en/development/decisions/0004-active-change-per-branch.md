# ADR 0004: remember the active change for each Git branch

- **Status:** accepted, 2026-10-21.
- **Decision by:** the maintainer.

## Context

The maintainer's requirement: a person must be able to change branches, with small or large changes in each, and not lose the reference to what they were working on, without TRUSS ever blocking the flow. A person who uses TRUSS for the first time must also be able to find out what each command is for.

Today TRUSS keeps one record of the active change in `.truss/state.json` (the change, its component, the last phase it saw, and the path). `.truss/` is ignored by Git ([ADR 0001](0001-local-project-configuration.md)), so every branch reads the same file. What follows was run in a throwaway repository with two branches:

- **The record follows the person, not the branch.** The change `demo` was active on `main`. On a new branch `feat-b`, `truss new "other change"` replaced the record with `other-change` and the change was committed there. Back on `main`, the record still said `other-change`, a change that does not exist on `main`, and `status` and `continue` failed (exit code `1`). Nothing said that `demo` was the change the person had been working on.
- **The failure message gave no way out.** It has since been extended to list what is open and the `truss use` command (see the changelog); that fixes the dead end, not the lost reference.
- **The evidence is one file.** `.truss/verification/latest.json` and `working-tree.json` are overwritten by each `verify`; they stayed at 417 and 201 bytes after verifying on both branches. After verifying on `feat-b` and going back to `main`, `status` printed the stale-evidence warning ([ADR 0002](0002-stale-evidence-warning.md)) although `main` was as it had been when it passed, and without saying that the evidence was from another branch.
- **The handoff note is one file per change** and `truss handoff` never overwrites it. Its `Branch:` line was written when the note was created and says `feat-b` after going back to `main`.
- **First contact.** `truss help` is a flat list of terse phrases, and `truss use` without a name prints only its usage and exits `2`, without saying which changes exist.
- Nothing grows without bound: the files above are replaced, not appended to.

## Decision

**1. The active change is remembered for each branch.** `.truss/state.json` keeps its current top-level fields, as "the change last made active", and gains a `branches` map:

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

- **Reading.** The current branch is asked from Git, read-only (`git symbolic-ref -q HEAD`, not `--short`, which can answer `heads/x` when a tag has the same name). If the map has an entry for it, that is the active change. If not, the top-level fields apply, which is what happens today. The reader ignores a `branches` value that is not an object, and an entry without a `change`; only invalid JSON stays an error. A branch may be called `__proto__`, so entries are read and written as own properties.
- **Writing.** `new`, `use` and the automatic choice below write the top-level fields and the entry of the current branch. When `status` or `continue` find that the phase moved, they update only the record they read from (the entry, or the top level), so "last made active" does not become "last looked at".
- **No branch, no entry.** In a detached HEAD, or where Git is not available, only the top-level fields are used and the map is left as it is.
- **Bounded.** Each write drops the entries of branches that no longer exist (`git for-each-ref refs/heads`). It never drops the current branch, and it drops nothing when the list is empty or unavailable (a branch with no commit yet is not listed).

**2. A missing recorded change does not stop the work.** When the recorded change is not in OpenSpec on this branch:

- with exactly **one** change open, `status` and `continue` use it, make it the active one and say so in one line: `Using "add-retry-policy", the only change open here: the recorded "add-old" is not on this branch.`;
- with **several** open, they list them and the `truss use` command, and exit `0`, as for a fresh clone with no active change;
- with **none** open, the failure of today stays (exit `1`).

`handoff` and the tasks gate read the record without asking OpenSpec, so they do not choose.

**3. The evidence is valid again when the files match a run that passed.** [ADR 0002](0002-stale-evidence-warning.md) gets an amendment: `verify` keeps the last ten passing runs, each with the fingerprint of the tree, in `.truss/verification/history.json`. If the tree matches any of them, the evidence is current, whatever the branch. `latest.json` also records the `branch` and the `commit`, and `status` says when the evidence comes from another branch. The files that changed are named only against the newest passing run, whose list of ids is the only one kept.

**4. `status` says where you are.** A block at the top: `Branch`, `Change`, `Phase` and `Evidence` (current, stale, recorded on another branch, last run failed, or none), and a `Handoff` row when the note was written elsewhere.

**5. The handoff note records the branch and the commit** when it is created, is still never overwritten, and `handoff` and `status` say in one line when the note was written on another branch, or at a commit that is not in the history of `HEAD`. A new commit on the same branch is normal progress and says nothing. It never changes an exit code.

**6. TRUSS explains itself.** `truss help` is grouped by stage (start, work on a change, check, hand off, other) with one plain sentence per command; `truss use` without a name lists the open changes and exits `0` (an empty name from a script variable stays a usage error, `2`); `truss help concepts` explains in a few lines what a change, the active change, a phase, the evidence and a handoff are.

## Options considered

| Option | Why not |
|---|---|
| Only the clearer failure message | Done as a first step. It removes the dead end but the person still has to remember which change they were on |
| One state file per branch (`.truss/state/<branch>.json`) | Branch names contain `/`; files of deleted branches stay behind; pruning needs a directory walk. One map in one file is simpler to read and to prune |
| Store the record inside Git (notes or refs) | It writes inside `.git`, which TRUSS does not touch; it would also travel with a push |
| Link a change to a branch by naming convention | Assumes a convention the project may not follow |
| Evidence for each branch | The files would multiply with the branches and need the same pruning, and a branch is the wrong key: what matters is whether the files are the ones that passed. A short history keyed by the fingerprint answers that question |
| Keep the failure when the recorded change is missing and one is open | A person who changed branch would have to type the only possible answer |
| A Git hook on checkout | TRUSS does not install hooks or touch `.git` |

## Consequences

- ✅ Going back to a branch brings back its change, for small and large changes alike, without the person naming it again, and TRUSS never refuses to work because of the branch.
- ✅ The evidence of a run that passed is reused when the files are the same, with no dependence on branch names, renames or a detached HEAD.
- ✅ Opt-in by use: a branch with no entry behaves as today, and old files are read as before.
- ✅ Bounded: one entry per existing branch, ten runs of evidence.
- ⚠️ A behavior change: on a branch where `new` or `use` was run before, `status` shows that branch's change, not the last one used anywhere. The automatic choice can pick a change that is unrelated to the person's work; the one-line message and `truss use` are the way out.
- ⚠️ **Reusing the evidence is narrower than it sounds.** The fingerprint leaves out `openspec/` and `.truss/`, so two branches that differ only in their specs match. "Current" means that the verification commands passed on these exact files; the `tests_required` and `tasks_complete` results are not evaluated again. The command list is not part of the fingerprint, so an older run is accepted only if its command list has the same digest as today's.
- ⚠️ A TRUSS older than this change reads the new files, but when it writes (`new`, `use`) it builds the record from the top-level fields alone and drops the map, so the per-branch memory is lost until a newer TRUSS writes it again. It ignores `history.json` and the new fields of `latest.json`.
- ⚠️ A renamed branch loses its entry and falls back to the top-level fields; the old entry is dropped at the next write.
- ⚠️ `status` and `continue` still write the phase they find, as before, and so `.truss/state.json` is no longer only written by `new` and `use`.
- ⚠️ Cost: one `git symbolic-ref` for each command that reads the active change, one `git for-each-ref` for each write, and one `git rev-parse` when a handoff note is written or compared.
- ⚠️ Git worktrees have their own `.truss/`, so they are separate records.

## Testing plan

Unit tests for reading, writing and pruning the map, including the old format and a branch called `__proto__`; for the history and for deciding whether the evidence is current; for the Git helpers (a named branch, a branch with a slash, a detached HEAD, a repository with no commit, no repository, a tag with the same name as a branch); and for the handoff comparison. Integration tests with real Git repositories: create a change on a branch, switch, check `status`; go back; a deleted and a renamed branch; the automatic choice with one, several and no open changes; `use` without a name; verifying on one branch and checking on another; and every message of the `status` block. One end-to-end test in the documented layout, where `.truss/` holds a clone of its own.

## Decisions on the open points

1. **Detached HEAD:** no per-branch entry.
2. **`status` prints the branch:** yes, in the block at the top.
3. **Pruning:** at each write, against the local branches.
4. **A switch to turn it off:** none.
5. **The handoff note:** it records the branch and the commit, and a mismatch is reported in one line.
