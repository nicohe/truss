# Getting started

This walks you through adding TRUSS to a project and taking one change from idea to verified. It takes about ten minutes. The outputs below were captured from a real run; a line with only `...` stands for lines left out.

TRUSS is a harness, not an agent: it keeps your specs, policies and verification in one place and tells whichever coding agent you use what to do next. It never runs an agent itself.

## 1. Prerequisites

| You need | Why | Check |
|---|---|---|
| Node.js 20 or newer | TRUSS is a Node CLI with no other dependencies | `node --version` |
| Git | the project must be a Git work tree | `git --version` |
| The OpenSpec CLI, `>=1.0.0 <2.0.0` | OpenSpec holds the specs; TRUSS requires it | `openspec --version` |
| A coding agent (Claude Code, Codex, Devin, or any other) | it does the implementation work | — |

Install OpenSpec if you do not have it (its formats and commands are documented in its [repository](https://github.com/Fission-AI/OpenSpec)):

```bash
npm install --global @fission-ai/openspec@1
```

TRUSS never installs or upgrades OpenSpec for you. Windows, macOS and Linux are supported; on Windows an npm-installed OpenSpec (a `.cmd` shim) works.

## 2. Add TRUSS to your project

From the root of your project:

```bash
git clone --depth 1 --branch v0.2.19 https://github.com/nicohe/truss.git .truss
echo ".truss/" >> .gitignore
```

TRUSS lives in `.truss/` and stays out of your repository's history. The clone is pinned to a release, so Git says it is in a "detached HEAD" state: that is expected, you are on a release and not on a branch. Git may also print a `warning: refs/tags/… is not a commit!` line while cloning: the release is an annotated tag, and the clone still succeeds (`git -C .truss describe --tags` prints the release you have). To move to a newer release later, see [update or remove TRUSS](guides/update-and-remove.md). If you would rather not type the long command, add an alias:

```bash
alias truss='node .truss/bin/truss.mjs'                       # bash / zsh
function truss { node .truss/bin/truss.mjs @args }            # PowerShell
```

An alias exists only in the terminal where you defined it. Put it in your shell's startup file to keep it, and note that agents and scripts do not see it: they run `node .truss/bin/truss.mjs`.

The examples below use the long form. See [project structure](reference/project-structure.md) for what lives where.

If the repository is shared and you do not want to change its `.gitignore`, ignore `.truss/` through `.git/info/exclude` instead; see [use TRUSS in a shared repository](guides/shared-repo.md).

One thing to know early: `.truss/` is ignored by Git, so your `.truss/config.yaml` is **local to this checkout**. If several people or a CI machine work on the project, each needs its own copy of the configuration; see [ADR 0001](development/decisions/0001-local-project-configuration.md). The same goes for the record of the active change: a fresh clone has none, so `truss status` lists the changes that are open in OpenSpec and `truss use <change>` picks one up.

## 3. Initialize and check the setup

```bash
node .truss/bin/truss.mjs init
```

```text
△ TRUSS · init

Config          ● created .truss/config.yaml
OpenSpec       ● initialized with --tools none
Git ignore      ● .truss/ ignored

TRUSS initialization verified.
Run again safely at any time: truss init
Next: truss doctor
```

`init` creates `.truss/config.yaml` and initializes OpenSpec, without overwriting anything that already exists, so it is safe to run again. Then check the environment:

```bash
node .truss/bin/truss.mjs doctor
```

```text
Core
  ● Node                   v24.12.0 (>=20 required)
  ● Git CLI                installed
  ● Git repository         work tree detected
  ● .truss ignore          .truss/ ignored
  ● Config                 .truss/config.yaml valid
  ...
OpenSpec
  ● CLI                    v1.13.2
  ● Compatibility          compatible (>=1.0.0 <2.0.0)
  ● Project                openspec/config.yaml
  ...
TRUSS doctor passed. 1 optional warning(s).
```

`●` is fine, `○` is an optional warning (for example, Graphify is not installed and TRUSS falls back to normal search), `×` is a problem you must fix. See [`truss doctor`](reference/doctor.md).

## 4. Give your agent some guidance

Agents read a project guidance file, usually `AGENTS.md`, at the repository root. TRUSS does not create one. A few lines are enough to make an agent follow the workflow; add them to your own file:

```markdown
## Working with TRUSS

- Before implementing, run `node .truss/bin/truss.mjs continue` and follow the instructions and the files it lists.
- Load skills and documentation only when the task needs them; `node .truss/bin/truss.mjs skills` lists the skills.
- To write an OpenSpec artifact, run `openspec instructions <artifact> --change <id>`; it prints the format and the path.
- Keep specs, code and tests aligned; do not let them diverge silently.
- When you finish, run `node .truss/bin/truss.mjs verify` and do not call the change done until it passes.
- Write a handoff (`node .truss/bin/truss.mjs handoff`) only when work moves to another agent, runtime or session.
```

Copy these lines rather than this repository's own [`AGENTS.md`](../../AGENTS.md), which guides work on TRUSS itself: the paths it mentions (such as `.truss/skills/`) are `.truss/.truss/skills/` in your project, and `truss continue` always prints the real ones. [Use TRUSS with a coding agent](guides/agents.md) says where each agent reads its guidance.

## 5. Take one change through the workflow

Start a change:

```bash
node .truss/bin/truss.mjs new "Add retry policy"
```

```text
△ TRUSS · new

● OpenSpec change created
Change          add-retry-policy
Component       workspace
OpenSpec        openspec/changes/add-retry-policy
Planning        0/4 artifacts complete

Next: truss continue
```

By default a change has four planning artifacts (proposal, specs, design and tasks), which OpenSpec tracks. Ask TRUSS what to do next:

```bash
node .truss/bin/truss.mjs continue
```

```text
△ TRUSS · continue

Change          add-retry-policy
Phase           spec
OpenSpec        openspec/changes/add-retry-policy
Mode            agent-driven (TRUSS v0.2)

Next action
Create/refine the OpenSpec artifact "proposal" for add-retry-policy. Run openspec instructions proposal --change add-retry-policy for its format and path. Use Grill first if material ambiguity remains.
```

**Grill** in that text is a round of questions the agent asks you when the idea is unclear, so that it does not have to invent requirements. It comes as two skills: `grill-me` when you start from an idea, and `grill-with-docs` when you already have requirements, a proposal, a ticket or an ADR to start from (it reads them first and asks only what they leave open). For example: *Use the `grill-with-docs` skill on `docs/retry-proposal.md`, then write the OpenSpec artifacts.* See [Discovery](workflows/discovery.md). The agent skips Grill when the idea is already clear.

Hand that to your agent. A prompt that works with any agent:

> Implement the active TRUSS change. Run `truss continue` and follow the instructions and the files it lists.

`continue` never runs the agent; it computes the next step from OpenSpec's state and prints it. Once the four artifacts exist, the phase becomes `implementation` and the instruction changes. The paths in it look doubled, `.truss/.truss/`, and they are right: the first `.truss/` is the folder where you cloned TRUSS, and the second is TRUSS's own `.truss/` inside that clone, where its workflows and policies live.

```text
△ TRUSS · continue

Change          add-retry-policy
Phase           implementation
OpenSpec        openspec/changes/add-retry-policy
Tasks           1/2 complete
Mode            agent-driven (TRUSS v0.2)

Next action
Implement add-retry-policy using .truss/.truss/workflows/execute-change.md. Read the active OpenSpec, start with the first incomplete task ("1.2 Add tests"), follow configured BDD/TDD policies, then run truss verify.

Context to load
- AGENTS.md (effective component/workspace guidance)
- openspec/changes/add-retry-policy
- .truss/config.yaml (this project's settings: gates, verification commands, policies)
- .truss/.truss/workflows/execute-change.md
- .truss/.truss/policies/ (configured BDD/TDD/spec policies)
```

`truss continue` always prints the real paths for your layout. `truss status` shows the same progress, and a change is `complete` only when every task in `tasks.md` is checked off. Phases and commands are in the [lifecycle](workflows/lifecycle-commands.md).

### What your agent does

For the prompts to give it at each step, see [your first change, end to end](guides/first-change.md).

`continue` says *what* to do; your agent needs to know *how*. TRUSS does not install OpenSpec's commands in your agent (`init` runs OpenSpec with `--tools none`), so the agent asks OpenSpec directly:

```bash
openspec instructions proposal --change add-retry-policy
```

That prints the purpose, the format and the exact path of the artifact, and the same works for `specs`, `design` and `tasks`. The agent writes each one, runs `truss continue` again and repeats until the four exist. If the idea is unclear, it should first run a Grill round with the `grill-me` or `grill-with-docs` skill, as described above. This is why `truss continue` names the command in its instruction, and why the guidance snippet above has a line about it.

Once the phase is `implementation`, the agent works through `tasks.md` and changes `- [ ]` to `- [x]` as it finishes each task. That is what `truss status` counts.

## 6. Verify

```bash
node .truss/bin/truss.mjs verify
```

`verify` runs the commands listed under `verification.commands` in `.truss/config.yaml`, in order, and stops at the first failure. It records what happened in `.truss/verification/latest.json`. The default list runs your `npm test`, `lint`, `typecheck` and `build` scripts when they exist. That default assumes a Node project: without a `package.json`, `npm` fails on the first command. In any other project, replace the list with your own checks first (for example `pytest -q`); see [the default command list](reference/verify.md#the-default-command-list).

Because those commands run through your shell, TRUSS asks before running a list it has not seen for this project. `init` approves the default list it writes; if you edit the list, the next run stops:

```text
○ These verification commands are not trusted for this project yet.
  They run through your shell with your permissions. Review them first:
    npm test --if-present
    ...
× Not trusted; nothing was executed.
Review .truss/config.yaml, then re-run with --trust (or TRUSS_TRUST=1).
```

In a terminal it asks `Run and trust these commands? [y/N]` instead. In CI or from an agent, read the list, then pass `--trust` or set `TRUSS_TRUST=1` (see [environment variables](reference/environment.md)). See the [trust model](../../SECURITY.md#trust-model).

`verify` can also check that a change touched tests and has no open tasks. Both are off by default; try them in `warn` mode first:

```yaml
verification:
  tests_required: warn   # source changed without any test change
  tasks_complete: warn   # open tasks in the active OpenSpec change
```

See [`truss verify`](reference/verify.md) for what each check does and does not prove.

### After verify passes

A passing `verify` does not close the change: `truss continue` then asks for a code review and for OpenSpec's own checks. TRUSS does none of these; you or your agent do:

1. **Review.** The agent uses the `code-review` skill against the spec, the project's standards and risk, ideally in a fresh session (see [who does what](concepts/who-does-what.md)).
2. **Validate.** `openspec validate add-retry-policy` checks that the change's specs are well formed.
3. **Archive.** `openspec archive add-retry-policy` moves the change to `openspec/changes/archive/`, dated, and merges its spec deltas into `openspec/specs/`. It asks for confirmation (`-y` skips it); add `--skip-specs` for a change that alters no behavior, such as tooling or documentation.

Commit `openspec/` with the code: specs and archived changes are durable (see [durable vs ephemeral](concepts/durable-vs-ephemeral.md)). TRUSS notices the archive: `truss status` and `truss continue` say the active change was archived and point to `truss new` for the next one (or to `truss use` when another change is still open).

## 7. Monorepos

Declare each unit under `components` in `.truss/config.yaml`, then name it when creating a change:

```yaml
components:
  api:
    path: ./apps/api
  worker:
    path: ./apps/worker
```

```bash
node .truss/bin/truss.mjs components            # check they resolve
node .truss/bin/truss.mjs new "Add retry policy" --component worker
```

Component paths must exist and stay inside the project. See [component resolution](reference/components.md), and [choose where TRUSS lives](guides/where-to-put-truss.md) to decide between components and one TRUSS per project folder.

## If something goes wrong

| You see | What it means | What to do |
|---|---|---|
| `Install a compatible OpenSpec CLI (>=1.0.0 <2.0.0)` or `OpenSpec CLI is not installed` | OpenSpec is missing | `npm install --global @fission-ai/openspec@1`, then run `init` again |
| `OpenSpec … is not compatible (>=1.0.0 <2.0.0)` | OpenSpec is a version TRUSS does not support | install a 1.x release; TRUSS never upgrades it for you |
| `TRUSS config not found: .truss/config.yaml` | the project has not been initialized | run `truss init` |
| `invalid config` (exit code 2) | `config.yaml` breaks the schema | run `truss config` for the exact errors |
| `TRUSS installation is incomplete: config schema not found` | the `.truss/` clone is damaged | clone TRUSS again |
| `Not trusted; nothing was executed.` | the command list changed | review it, then `--trust` |
| `× failed  [1/4] npm test --if-present`, with `npm error … Could not read package.json` | the default command list assumes a Node project and this one has no `package.json` | replace `verification.commands` with your project's own checks, then approve the new list |
| `Unknown component "x"` | that name is not declared under `components` | declare it, or omit `--component` |
| `OpenSpec project is not initialized` | no `openspec/` directory | run `truss init` |

`truss doctor` diagnoses most of these without changing anything. [Troubleshooting](guides/troubleshooting.md) covers more, including verification, changes and the installation.

## Where next

- [Concepts](concepts/spec-driven-development.md): why TRUSS works this way.
- [Workflows](workflows/overview.md) and the [`execute-change`](workflows/execute-change.md) workflow your agent follows.
- [Configuration](configuration/reference.md): every option and what it changes.
- [Enforcement model](reference/enforcement.md): what TRUSS checks itself and what it only asks the agent to do.
- [Guides](guides/agents.md): use TRUSS with your agent, in [CI](guides/ci.md), and [update or remove it](guides/update-and-remove.md).
- [CLI reference](reference/cli.md).
