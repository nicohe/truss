# ADR 0002: `status` and `continue` warn when the files changed after the last verify

- **Status:** accepted, 2026-10-12.
- **Decision by:** the maintainer.

## Context

`truss verify` writes `.truss/verification/latest.json` with the result of the commands. That result describes the files as they were at that moment. When the code is edited afterwards, the evidence still says `passed`, and nothing says it no longer applies. In a case seen in practice, a reviewer and an implementer worked on code that had changed after the last verify, and neither `status` nor `continue` mentioned it.

It is the same kind of mistake as a Graphify graph that stays `fresh` while the work tree has uncommitted edits: a state that looks valid and no longer matches the files.

## Decision

`verify` records a **fingerprint of the files Git sees**, and `status` and `continue` compare the current one with it and print one warning line when they differ. It only warns.

**The fingerprint** is a SHA-256 of every (path, content id) pair, where the content id is the one Git would give the file (`git hash-object`, without writing it). It is built from Git's read-only commands: the index (`git ls-files -s`), minus the files deleted from the work tree (`-d`), with the modified (`-m`) and untracked-but-not-ignored (`-o --exclude-standard`) files read from disk. It follows content, not commits: editing a file changes it, a second edit of the same file changes it again, and staging or committing the same content does not.

**Left out**, always: `.truss/`, because it holds the evidence itself, and any `openspec/` folder, because ticking a task or fixing a spec after a verify is normal and is not the code. What Git ignores is out by definition.

**Recorded** in `latest.json` as `workingTree: { fingerprint, files }`, once the commands have finished, so it includes what they wrote. It is only written for a passing run.

**Shown** as one line, only when the last evidence is `passed` and carries a fingerprint that differs from the current one:

```text
Evidence        ○ stale: the files changed after the last passing verify (2026-10-12 22:33 UTC). Run truss verify.
```

`status` prints it with the summary. `continue` prints it under its own `Evidence` heading, in the `implementation` and `complete` phases (in `spec` there is nothing to verify yet). It never changes an exit code and never blocks.

It says nothing when there is no evidence, when the last run failed (the failure is the news), when the evidence predates the fingerprint, or when Git cannot say. `doctor` and `handoff` are unchanged.

## Options considered

| Option | Why not |
|---|---|
| File modification times against `latest.json` | `git checkout`, `touch`, formatters and clocks give false positives and misses |
| The commit (`HEAD`) only | misses uncommitted edits, which is the case that matters |
| `git stash create`, or `git write-tree` with a temporary index | writes objects into `.git` in a command that should only read |
| `git status` output | cannot tell two successive edits of the same file apart |
| A list of every file and its hash inside `latest.json` | makes the evidence file large for a person or an agent that reads it. Kept in its own file instead (see Amendment) |
| Only files with a code extension | misses `package.json` or `tsconfig.json`, which can break a verification |

## Consequences

- ✅ A passing `verify` stops looking valid after the code moves. No new dependency, no write to `.git` or to the work tree.
- ✅ The warning follows the content: a commit or a `git add` of the same files does not raise it.
- ⚠️ Since the amendment it names the files; without the list file it only says that they changed.
- ⚠️ A folder that Git does not ignore and that something regenerates outside `verify` (a build or coverage folder) marks the evidence stale. Ignore that folder.
- ⚠️ A change to the files of a submodule is not seen: the fingerprint holds the commit the index records for it.
- ⚠️ Cost: a few `git` calls and one read of each modified or untracked file, for every `status` and `continue`. It took 0.12 s on a 172-file repository, and 0.11 s on a 20,000-file one; with 2,000 untracked files it took 0.16 s (13 s before the files were hashed in one `git hash-object --stdin-paths` call instead of one process each).
- Evidence written by an earlier release has no fingerprint and produces no warning until the next `verify`.

## Amendment: the warning names the files (0.2.21)

`verify` also writes `.truss/verification/working-tree.json`: the fingerprint and the content id of every file, as `{ fingerprint, ids }`. It is separate from `latest.json` so the evidence stays short. `status` and `continue` compare the ids and list up to five files under the warning, then `… and N more`:

```text
Evidence        ○ stale: the files changed after the last passing verify (2026-10-12 22:33 UTC). Run truss verify.
                edited lib/a.mjs
                added src/retry.js
                removed old.js
```

The list is only used when its fingerprint is the one in `latest.json`. When the file is missing, damaged or from another run, the warning appears as before, without names. The file holds paths and hashes, never contents, and lives in `.truss/`, which is ignored. For a large repository it is about 100 bytes per file.

## Amendment: a short history of passing runs (ADR 0004)

`verify` keeps the last ten passing runs in `.truss/verification/history.json`, newest first: `{ version: 1, passed: [{ fingerprint, files, finishedAt, branch, commit, commands }] }`. `commands` is the first 12 characters of the digest of the command list. A run with the same fingerprint replaces its older entry, and only runs that passed and have a fingerprint are recorded, so repeating `verify` on one tree never pushes other trees out and a failed run adds nothing. The file is about 2.5 KB at most.

The evidence is **current** when the tree matches the newest passing run (as before) or any run in the history, whatever the branch. An older run is accepted only if its command list has the same digest as the current one. `latest.json` also records the `branch` and the `commit` of the run, and the warning says when the last passing run was on another branch. The files that changed are named only against the newest passing run, because `working-tree.json` still holds the ids of that run alone: keeping them for every entry would cost about 1.2 MB per entry at 20,000 files (measured at about 58 bytes per file). A match with an older run needs no names.

This does not widen what the fingerprint covers (see the consequences of [ADR 0004](0004-active-change-per-branch.md)).
