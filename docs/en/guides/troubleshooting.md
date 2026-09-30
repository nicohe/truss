# Troubleshooting

Find what TRUSS printed, see what it means, and what to do. The messages are quoted as the CLI prints them.

Start with `truss doctor`. It changes nothing, and it reports the environment, the configuration and OpenSpec: `●` is fine, `○` is an optional warning, and `×` is a problem to fix. See [`truss doctor`](../reference/doctor.md).

## Setup

| You see | What it means | What to do |
|---|---|---|
| `TRUSS config not found: .truss/config.yaml` | the project has not been initialized, or you are in a directory that has no `.truss/`: a Git worktree, or a second checkout of the project | run `truss init`. In a worktree or another checkout, create the configuration there too: `.truss/` is ignored by Git, so it is local to each checkout (see [worktrees](../concepts/who-does-what.md#subagents-and-worktrees) and [ADR 0001](../development/decisions/0001-local-project-configuration.md)) |
| `Git ignore  ○ .truss/ is not ignored` or `○ no .gitignore detected` from `truss init`, and `○ .truss ignore` in `truss doctor` | Git would track the TRUSS clone. `init` only warns: it never edits your `.gitignore` | add the line yourself: `echo ".truss/" >> .gitignore` |
| `OpenSpec  × CLI missing`, then `Install a compatible OpenSpec CLI (>=1.0.0 <2.0.0)` | OpenSpec is not on `PATH` | `npm install --global @fission-ai/openspec@1`, then `truss init` again. To use a specific executable, see [`TRUSS_OPENSPEC_PATH`](../reference/environment.md) |
| `OpenSpec … is not compatible (>=1.0.0 <2.0.0)` | OpenSpec has a version TRUSS does not support | install a 1.x release; TRUSS never upgrades OpenSpec for you |
| `OpenSpec project is not initialized` | there is no `openspec/` directory | run `truss init` |
| `× invalid config`, followed by a line such as `$.bogus: unknown property.` (exit code `2`, from any command that reads the configuration) | `config.yaml` breaks the schema | fix what the line says. `truss config` lists every error (see [validation](../configuration/validation.md)) |
| `TRUSS installation is incomplete: config schema not found` | the `.truss/` clone is damaged | clone TRUSS again (see [update or remove](update-and-remove.md)) |
| `Invalid TRUSS state file: .truss/state.json` (exit code `2`) | the file that remembers the active change was edited or cut short | delete `.truss/state.json`. It holds only the pointer to the active change, so TRUSS will say there is none; start the next change with `truss new` |

## Verification

| You see | What it means | What to do |
|---|---|---|
| `× Not trusted; nothing was executed.` | the command list is new or changed, and there is no terminal to ask you | read the list it printed, then re-run with `--trust`, or set `TRUSS_TRUST=1` in CI (see [trust](../reference/verify.md#trust)) |
| `× failed  [1/4] npm test --if-present`, with `npm error … Could not read package.json` | the default command list assumes a Node project and this one has no `package.json` | replace `verification.commands` with your own checks and approve the new list (see [a non-Node project](../configuration/examples.md#a-project-that-is-not-node)) |
| `× no verification commands configured` | `verification.commands` is empty | list the commands to run in `.truss/config.yaml` |
| `○ could not evaluate: … Not blocking.` under `Tests required` or `Tasks complete` | the gate could not decide, and a gate that cannot decide never blocks. The reason is printed: not a Git work tree, no commits yet, no base branch found, a shallow clone without the common ancestor, or no tasks | fix the reason if you want the gate to work: for a base branch, set `verification.base_ref`; for a shallow clone, fetch more history |

## Changes and the agent

| You see | What it means | What to do |
|---|---|---|
| `The active change "x" was archived (openspec/changes/archive/…)`, from `status`, `continue` or `handoff`, or `the active change "x" was archived (…); nothing to check` under `Tasks complete` | you archived the change with `openspec archive`, and TRUSS noticed | nothing is wrong: start the next one with `truss new "Change name"` |
| `The active change "x" is not in OpenSpec (openspec/changes/x is missing)` | the change's folder was deleted or moved without being archived | restore the folder, or start over with `truss new` |
| `OpenSpec could not create change "x": …`, from `truss new` (exit code `1`), followed by what OpenSpec said, such as `Change 'x' already exists at …` or `Change name is too long (200 characters max)` | OpenSpec refused the change: a folder with that id is already under `openspec/changes/`, or the id is longer than OpenSpec allows | choose another title, or delete the folder if it is a leftover. A long title is shortened in the message, not in the id |
| `○ "x" is still open in OpenSpec (…) and is no longer the active change`, from `truss new` | you started a change while another was still open, and TRUSS follows one at a time | nothing was lost, and this is not an error. To go back to the first change, see [`truss new`](../workflows/lifecycle-commands.md#truss-new-change-name---component-name) |
| `Unknown component "x". No components are configured.`, or `Available: …` (exit code `2`) | that name is not declared under `components` | declare it in `.truss/config.yaml`, or leave out `--component` |
| `Unknown command "stauts".` and `Did you mean "status"?` (exit code `2`) | a typo | see `truss help` |
| `… already exists and was not changed.` from `truss handoff` | a note for this change already exists, and TRUSS never overwrites one | edit it, or delete it to start a new one (see [handoff](../reference/handoff.md)) |
| the agent does not run `truss continue` or `truss verify` | TRUSS runs no agent; the agent follows what its guidance file says | check that the snippet is in the file your agent reads (see [use TRUSS with a coding agent](agents.md)) |

## The TRUSS installation

| You see | What it means | What to do |
|---|---|---|
| `warning: refs/tags/… is not a commit!` while cloning, before Git's long `detached HEAD` note | the release is an annotated tag, and Git warns about it when you clone it with `--branch` | nothing: the clone succeeds and the warning is harmless. `git -C .truss describe --tags` prints the release you have |
| `git pull` inside `.truss/` says `Already up to date.` and nothing changes | the quick start pins the clone to a release, so there is no branch to pull | `git fetch --tags`, then `git checkout vX.Y.Z` (see [update or remove](update-and-remove.md)) |
| `error: pathspec 'main' did not match any file(s) known to git` | a clone pinned to a release only knows its own tag | see [follow `main` instead](update-and-remove.md#follow-main-instead) |
| `config.yaml` or `state.json` vanished from `.truss/` | they are untracked files inside the clone, and `git clean -fd` deletes them (`git stash -u` sets them aside) | restore them from your copy of the configuration, and do not run either command inside `.truss/` |

## Windows

| You see | What it means | What to do |
|---|---|---|
| paths that mix `\` and `/`, such as `openspec\changes\…` next to `.truss/…` | TRUSS prints some paths with the operating system's separator and others with `/` | nothing: both are correct |
| a `.cmd` file rejected when `TRUSS_OPENSPEC_PATH` points to it | TRUSS launches OpenSpec without a shell and reads the npm shim to find its script; a `.cmd` that is not an npm shim cannot be read that way | point `TRUSS_OPENSPEC_PATH` at the npm-installed `openspec`, or at the `.exe` (see [environment variables](../reference/environment.md)) |

If none of this explains it, run `truss doctor` and `truss --version`, and include both when you [report the problem](https://github.com/nicohe/truss/issues).
