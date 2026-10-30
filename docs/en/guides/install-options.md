# Install TRUSS: per project, once for the machine, or without Git

TRUSS is a folder of Node code plus the harness content that ships with it. There is no package on npm and no installer: you put that folder somewhere and run `bin/truss.mjs` with Node 20 or later. This guide shows three ways to do it and says what each one costs.

The install and `init` commands below were run in a throwaway project against the v0.2.25 release on GitHub. The update commands were not (there was no newer release to move to), and the end of the page lists what else was not tried.

## The three ways

| | Clone per project | One clone for the machine | Tarball per project |
|---|---|---|---|
| Where the code lives | `<project>/.truss/` | one folder, for example `~/.local/share/truss/` | `<project>/.truss/` |
| You run | `node .truss/bin/truss.mjs` | `truss` (a link on your `PATH`) | `node .truss/bin/truss.mjs` |
| Needs Git to install | yes | yes | no |
| Update | `git checkout <release>` in each project | `git checkout <release>` once, for every project | download again |
| Versions across projects | each project pins its own | all projects share one | each project pins its own |
| Size on disk | about 2 MB per project | about 2 MB, once | about 1.4 MB per project |
| Best when | a team or CI uses the project | the projects are yours and you want a short command | you do not want Git for TRUSS |

The first way is the [quick start](../getting-started.md#2-add-truss-to-your-project). Pick it when other people or a CI machine use the project: each one can see which release the project is on.

## One clone for the machine

Clone once, then link the executable somewhere on your `PATH`:

```bash
git clone --depth 1 --branch v0.2.30 https://github.com/nicohe/truss.git ~/.local/share/truss
ln -s ~/.local/share/truss/bin/truss.mjs ~/.local/bin/truss
truss --version
```

`~/.local/bin` has to be on your `PATH`. The file `bin/truss.mjs` has the execute bit and a `#!/usr/bin/env node` line, which is why a link is enough.

Then, in each project:

```bash
cd my-project
truss init
truss doctor
```

`init` creates `openspec/` and `.truss/config.yaml` and nothing else. The project keeps its configuration, the active change and the evidence in its own `.truss/`; the schema, skills, policies and workflows are read from the installation (see [project structure](../reference/project-structure.md)). Everything else works as in the quick start, with `truss` in place of `node .truss/bin/truss.mjs`. In the guidance for your agent, use `truss` as well.

To update every project at once, or to go back:

```bash
git -C ~/.local/share/truss fetch --tags
git -C ~/.local/share/truss checkout v0.2.31
```

To remove it, delete `~/.local/share/truss` and `~/.local/bin/truss`. The projects keep `openspec/` and `.truss/`.

### With an agent

`truss continue` prints the absolute path of the workflow and of each policy file it asks the agent to follow, so the agent can read them although they are outside the project. In a test, a subagent given the usual guidance ran `truss continue`, read the workflow and the policies from the central folder and implemented a small change test first (see [use TRUSS with a coding agent](agents.md)). The agent needs `truss` on its own `PATH`: an alias in your shell is not visible to it.

In CI, clone TRUSS in the workflow and call it by its path, as in [use TRUSS in CI](ci.md); a link on a `PATH` is one more step to set up there.

## A tarball, without Git

For a project where you do not want a Git clone of TRUSS:

```bash
mkdir -p .truss
curl -L https://github.com/nicohe/truss/archive/refs/tags/v0.2.30.tar.gz | tar -xz --strip-components=1 -C .truss
echo ".truss/" >> .gitignore
```

GitHub puts everything in a top folder named `truss-0.2.30`; `--strip-components=1` removes it. The result is the same layout as the clone, minus `.git`, so `node .truss/bin/truss.mjs init` and the rest work as in the quick start. There is no `git checkout` to update it: remove everything in `.truss/` except `config.yaml`, `state.json`, `verification/` and `handoffs/` (the project's own files live in the same folder), then unpack the new release.

## What was not checked

- **Updating a tarball install.** The steps above are the intended ones; they were not run.
- **Windows.** The link and the `#!` line are for macOS and Linux. On Windows use the long form, or a function in your shell profile.
- **Agents.** One agent, one small task with the TDD policy. It shows that the central install can be followed; it does not show that agents follow it better or worse than the clone per project.
- **A published package.** TRUSS is not on npm, and nothing here depends on a package manager.

## See also

- [Getting started](../getting-started.md)
- [Update or remove TRUSS](update-and-remove.md)
- [Use TRUSS in a shared repository](shared-repo.md)
