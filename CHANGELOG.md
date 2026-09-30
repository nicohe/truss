# Changelog

All notable changes to TRUSS are documented here.

## [Unreleased]

### Changed
- **The verification policy and the `execute-change` workflow now name `truss verify`.** They said "run the configured commands", which an agent can do by hand and leave no evidence. `policies/verification.md` also mentions the approval of a new command list and the two opt-in checks.

- **`npm run check:docs` compares each Spanish page with its English original.** It fails when a translation has a different number of headings, code blocks, table rows, list items or relative links, or does not carry exactly one translation note, and says what differs and by how much. Until now it only checked that a translated page existed, and only four reference pages against the code; a translation could lose a section or repeat a line unnoticed, as `spec-modes.md` did. The orphan-page check also stopped counting the link in a translation's note as a link to the original: it made every translated English page look linked, which hid orphans.

### Fixed
- **`truss handoff` no longer overwrites an existing note.** Running it a second time replaced the note with the empty template, so whatever the agent had written in it was lost, which is the opposite of what a handoff is for. An existing note is now left untouched (exit `0`, with a message that says so); delete it to start a new one. The file is created only if it does not exist, so this holds even if two runs overlap.

### Documentation
- **New page: [who does what](docs/en/concepts/who-does-what.md)**, in English and Spanish. It settles the first questions of a newcomer: TRUSS runs no agent and picks no model; each phase (analysis, implementation, review) can use a different agent or model, because the state is in files; subagents and worktrees are not automatic and have no setting, and a worktree needs its own `.truss/config.yaml` because Git ignores `.truss/`. Each claim was tried, including a real worktree. The README now says what TRUSS is in a plain sentence, and getting started and the OpenSpec page link to [OpenSpec's repository](https://github.com/Fission-AI/OpenSpec), the only place its formats are documented; no page pointed there before.
- **Three guides**, in English and Spanish: [use TRUSS with a coding agent](docs/en/guides/agents.md) (the loop, where Codex and Claude Code read their guidance, and approving the verification commands once yourself), [use TRUSS in CI](docs/en/guides/ci.md) (a pinned install, the configuration that a fresh checkout lacks, approval without a terminal and an example GitHub Actions workflow) and [update or remove TRUSS](docs/en/guides/update-and-remove.md) (including that `git clean -fd` inside `.truss/` deletes your configuration).
- **New reference page: [`truss handoff`](docs/en/reference/handoff.md).** It documents the note's format, when to use it, its exit codes and that an existing note is kept.
- **The outputs quoted in getting started are now tested:** an end-to-end test runs the guide's steps and checks that every quoted line is what TRUSS prints, in order, and that the Spanish guide quotes the same.
- **The default verification commands assume a Node project, and the docs now say so.** In a project without a `package.json` (Python, Go, the root of a monorepo) the first command fails with `npm error … Could not read package.json` and `truss verify` stops. Getting started, the `verify` page, the configuration reference (which listed the default as "project starter commands") and the examples explain it and show a non-Node list; the troubleshooting table has the error.
- **Getting started shows the full output** of `new` and `continue` (the samples left out lines without saying so) and says what `...` means. Step 4 now has a ready-to-paste `AGENTS.md` snippet for a project that uses TRUSS, and warns that this repository's own `AGENTS.md` uses paths that are wrong in another project (`.truss/skills/` is `.truss/.truss/skills/` there).
- **The glossary defines eight terms** used across many pages without a definition: ADR, discovery, fail-fast, Gherkin, Grill, merge-base, RED / GREEN and vertical slice.
- The README lists `truss version` and `truss help`.
- Fixed a duplicated translation note in the Spanish `spec-modes.md`, introduced in 0.2.2.

## [0.2.2] - 2026-09-30

Patch release: the CLI is easier to use (`--version`, `--help` per command, a clear error for a mistyped command) and the Spanish documentation is complete. The configuration schema and the behavior of `truss verify` do not change.

### Upgrade notes
- An unknown command now exits with `2` instead of `0`. A script that relied on `truss <typo>` succeeding will now fail, which is the point. Running `truss` with no command still lists the commands and exits `0`.
- Nothing else changes for an existing project.

### Added
- **`truss --version`** (also `-v` and `truss version`) prints the installed version. Until now there was no way to tell which TRUSS was installed, and a bug report needs it.
- **`truss <command> --help`** (also `-h`, and `truss help <command>`) shows the usage, options and exit codes of one command, and never runs it. `truss help` lists the commands as before, and now also says how to get more.
- **`npm run check:docs`**, run by `npm run ci` and by a CI step. It fails on broken links, broken anchors and orphan pages under `docs/en/`, and on drift between the docs and the code: an undocumented CLI command, configuration option, `truss doctor` check or environment variable. Tested with real trees and by mutating a copy of the repository with the problems found during the documentation analysis.

### Changed
- **An unknown command now fails with exit code `2`** and says so, with a suggestion when one is close (`Unknown command "verfy". Did you mean "verify"?`). Before, it printed the whole command list and exited `0`, so `truss verfy && deploy` carried on as if verification had passed. Running `truss` with no command still lists the commands and exits `0`.
- **`npm run check:docs` now covers the Spanish docs.** Orphan pages under `docs/es/` fail the check, like those under `docs/en/`, and the Spanish CLI, configuration, `doctor` and environment references are held to the same drift checks as the English ones (a page that is not translated yet is not an error, an out-of-date one is). It also warns, without failing, about an English page that has no counterpart under `docs/es/`.

### Documentation
- **Reference pages brought up to date with the code.** `doctor.md` now has a table of every check (required or not, and when it passes), including `Trust`, `Tests required` and `Tasks complete`. `init.md` says that `init` approves the default command list it writes and documents its exit codes. `cli.md` no longer calls verification commands "gates" (the word now means the two opt-in checks) or the CLI a "starter", and gains an options table and an exit-code section with per-command exceptions.
- **New page: [environment variables](docs/en/reference/environment.md)** covering `TRUSS_TRUST`, `TRUSS_HOME` / `XDG_CONFIG_HOME`, `TRUSS_OPENSPEC_PATH`, `NO_COLOR` / `FORCE_COLOR` / `TERM` and `PATH`. `FORCE_COLOR` was not documented anywhere.
- **Getting started rewritten.** It now lists prerequisites (including how to install OpenSpec), shows the real output of each step, walks one change from `new` to `verify` including the approval prompt, covers monorepos, and has a table of the errors a new user is most likely to hit. The agent prompt no longer hard-codes paths.
- **The documentation index is organized by what you want to do** (understand, do the work, commands, configuration, integrations, guarantees, contribute) and links every page; previously the four concept pages, the glossary and the project structure were not linked from anywhere.
- **ADR 0001** records that the project configuration is local to each checkout (the quick start ignores all of `.truss/`), what a team can do about it today, and the versionable-configuration-file option to revisit later. It resolves the old contradiction with "commit shared TRUSS configuration".
- The four concept pages were 3 to 5 lines each and are now real pages (spec-driven development, BDD and TDD, context management, durable vs ephemeral state); the glossary defines the terms used across the docs.
- **Spanish documentation is complete: every English page has a Spanish counterpart at the same path** (39 pages). Getting started (now in neutral Spanish instead of voseo), `truss verify`, `doctor`, `init`, the CLI reference, environment variables, the five concept pages, the glossary and the project structure were translated first. The six legacy-named pages (`FLUJO`, `SKILLS`, `USO`, `BDD_TDD`, `ARQUITECTURA`, `CONFIGURACION`) were merged into the pages of the current structure and removed; the two facts only they held (when turning `bdd` off makes sense, and when to use each skill) were added to the English pages too. The remaining pages were then translated (lifecycle commands, components, configuration validation, OpenSpec detection and compatibility, Graphify lifecycle, testing, end-to-end tests, CI, ADR 0001, both release contracts, the documentation audit and the brand guide), and the older Spanish configuration pages, which had fallen behind, were rewritten to match: `tests_required`, `tasks_complete`, `base_ref` and the path options were missing from the reference, the effects table and the examples.

## [0.2.1] - 2026-09-30

Patch release: the documented quick start now works. Until now, cloning TRUSS into a project and running `truss init` failed on the first command.

### Upgrade notes
- TRUSS reads its config schema, skills, policies and workflows from its own installation. A `.truss/schema/` copied into a project as a workaround is no longer used, and can be deleted.
- Nothing else changes for a project that already works.

### Fixed
- **The documented quick start did not work.** Cloning TRUSS into a project's `.truss/` (as the README says) and running `truss init` failed with `TRUSS config schema not found`, because TRUSS looked for its schema, skills, policies and workflows inside the *project* instead of in its own installation. Every path the docs and `AGENTS.md` point agents to was missing there, and the same happened with TRUSS installed anywhere else. The tests hid it by copying the schema into each test project. TRUSS now reads that content from its own installation (`lib/paths.mjs`); the project keeps only `config.yaml` and its local state. `truss continue` prints the real path of the workflow and policies to read, `truss skills` lists the installed skills, and a project's own `.truss/schema` is no longer used.
- The README quick start passed `--component worker` to `truss new` on a project with no components, which fails with `Unknown component`. The example no longer uses it, and the README says to declare `components` first.
- `truss init` no longer leaves a half-created `.truss/config.yaml` behind when it cannot validate it (for example, an incomplete installation), and the error now says the installation is incomplete.

## [0.2.0] - 2026-09-29

TRUSS keeps its agent-driven model and gains its first TRUSS-side checks of engineering policy: two opt-in gates in `truss verify`. It still runs no coding agent itself, so the runtime orchestration the docs used to promise for "v0.2" is now planned for v0.3 (all such references were updated). See the [v0.2.0 release contract](docs/en/reference/release-v0.2.md).

### Upgrade notes
Both new gates default to `off`, so nothing changes for a project that does not enable them. Also worth knowing:
- **`truss status` / `truss continue` now report `implementation` (not `complete`) while tasks are open.** The previous output was wrong with a real OpenSpec (see Fixed).
- `truss config` lists the two new options with their defaults.
- The evidence file gains `testsRequired` / `tasksComplete` only when the corresponding gate is enabled.
- Documentation vocabulary moved: "v0.1" (the current model) is now "v0.2", and the future orchestration release is "v0.3". The v0.1.0 contract and audit keep their historical wording.

### Fixed
- **`truss status` / `truss continue` reported a change as complete while tasks were still open.** With a real OpenSpec, `isComplete` from `openspec status` means "all artifacts exist", not "all tasks are done", so the `implementation` phase was effectively unreachable and `continue` said "Implementation tasks are complete" for a change with unchecked tasks. The phase now comes from task progress (`openspec instructions apply`): `complete` only when there are tasks and none remain open. `status` shows `Tasks 1/3 complete` and `continue` names the first incomplete task. If progress is unavailable the change is reported as `implementation`, never `complete`.

### Documentation
- Version vocabulary updated across the English and Spanish docs, plus a new [v0.2.0 release contract](docs/en/reference/release-v0.2.md); the v0.1.0 contract now points forward.
- `SECURITY.md` points to GitHub's private vulnerability reporting, which is now enabled for the repository.

### Added
- **Tasks-complete gate** (`verification.tasks_complete: off | warn | block`, default `off`). `truss verify` can list, or refuse to run while, the active OpenSpec change has open tasks. It never blocks when it cannot decide (no active change, OpenSpec unavailable, no tasks) and records the result under `tasksComplete` in the evidence. `truss doctor` shows the mode.
- Contract test against the real OpenSpec CLI (`test/e2e/real-openspec.e2e.test.mjs`) and a non-required `Contract / real OpenSpec` CI job. The fake OpenSpec used by the other tests now mirrors the real CLI's task-progress semantics.
- **Tests-required gate** (`verification.tests_required: off | warn | block`, default `off`). `truss verify` can now report, or refuse to run, a change that touches source code without touching any test. It compares the working tree with the merge-base of `HEAD` and the base branch (`verification.base_ref`, auto-detected), per component, and records the result in the evidence file. It never blocks when it cannot decide (no Git work tree, no base branch, shallow clone). `verification.source_paths` and `verification.test_paths` override the detected layout. `truss doctor` shows the mode. It proves test files changed, not that they were written first or are meaningful. This is the first step of TRUSS-side enforcement for BDD/TDD.

## [0.1.2] - 2026-09-29

Patch release: makes TRUSS usable on Windows with an npm-installed OpenSpec or Graphify. CLI launching was refactored for every OS, with no behavior change intended on macOS or Linux.

### Fixed
- **Windows: npm-installed OpenSpec and Graphify were not usable.** `where` lists npm's extensionless `sh` shim before the `.cmd` one and Node cannot spawn `.cmd` files, so TRUSS reported a working OpenSpec as incompatible and could not run `init`, `new`, `status` or `doctor`. TRUSS now picks the runnable file and, for an npm-style `.cmd` shim, launches the Node script it points to directly. No shell is involved, so arguments such as a change title are never re-parsed by `cmd.exe`. A `.cmd` that is not an npm shim is reported with a clear error; point `TRUSS_OPENSPEC_PATH` at an `.exe` or at the npm shim. On Windows that path may omit the extension; TRUSS uses the `.exe`/`.cmd` next to it.

### Quality
- The fake OpenSpec/Graphify CLIs in the tests are installed like npm installs a global CLI, so no test is skipped on Windows anymore.

## [0.1.1] - 2026-09-29

Hardening and quality release. It stays within the v0.1 agent-driven model; runtime orchestration is still planned for v0.2.

### Upgrade notes
Three behaviors changed and can affect existing setups:
- **`truss verify` needs approval.** The first run for a project, and any run after `verification.commands` changes, asks for confirmation. Without a terminal (CI, agents) it refuses with exit `1` unless you pass `--trust` or set `TRUSS_TRUST=1`. Review `.truss/config.yaml` before doing so.
- **The config parser is stricter.** Anchors, aliases, tags, block/flow values, lists of objects, unterminated quotes and keys nested under a scalar are now errors instead of being silently kept as strings. Quote any value that starts with one of `& * ! | > [ {`.
- **Change names drop accents** (`Añadir política` becomes `anadir-politica`).

### Security
- `SECURITY.md` documents the trust model for `verification.commands`, which run through the system shell.
- `truss verify` asks before running a new or changed command list and remembers the approval per project in `$TRUSS_HOME/trusted.json` (default `~/.config/truss/`), outside the repository. `truss init` trusts the default list it writes; `truss doctor` reports trust state.

### Fixed
- The config parser rejects what it documents as unsupported instead of accepting it silently or mis-nesting it.
- Change names keep their letters when they contain accents.
- `handoff` reports a corrupt `state.json` instead of crashing.
- An unknown command name falls back to help instead of resolving to an object property.

### Changed
- `bin/truss.mjs` is a thin dispatcher; command logic lives in `lib/commands.mjs` and terminal output in `lib/ui.mjs`. CLI output is unchanged.
- `.truss/state.json` is written atomically (temp file + rename).
- Color output honors `NO_COLOR` and `FORCE_COLOR` and is disabled when stdout is not a TTY.
- `.truss/verification/` is git-ignored.

### Documentation
- README restructured (what it is, quick start, commands, docs, license) and the quick start uses the public repository URL.
- Root-level `docs/*.md` consolidated under `docs/en/`; exact duplicates removed.
- Issue templates, a pull request template and Dependabot for GitHub Actions.

### Quality
- Tests: 29 unit + 10 integration + 3 E2E became 85 unit + 43 integration + 3 E2E; line coverage 84.7% to about 96%, with a coverage floor enforced in CI (`npm run test:coverage`).
- CI runs on Ubuntu, macOS and Windows with Node.js 20, 22 and 24. Tests that need the POSIX fake OpenSpec/Graphify CLIs are skipped on Windows, so spawning a real npm-installed `openspec` there is not covered.
- Biome for linting and formatting (`npm run lint`, `npm run lint:fix`), enforced in CI. The codebase was reformatted; see `.git-blame-ignore-revs`.
- `scripts/run-tests.mjs` starts the suites without relying on shell globbing.

## [0.1.0] - 2026-09-29

First stable TRUSS baseline.

### Core
- Project-local, gitignored `.truss/` operating model.
- Versioned configuration schema and runtime validation.
- Component resolution for single-repo and monorepo workspaces.
- Deterministic CLI exit codes for configuration and verification failures.

### OpenSpec
- Required OpenSpec foundation.
- CLI/project detection and compatibility checks for stable `>=1.0.0 <2.0.0`.
- Non-destructive adoption/initialization; no silent CLI upgrade or downgrade.
- OpenSpec-backed `new`, `status`, and `continue` lifecycle.

### Graphify
- Optional Graphify capability with disabled, missing, bootstrap, ready, stale, and unknown-freshness states.
- Optional native-search fallback policy.
- Blocking diagnostics when Graphify is configured as required.

### Quality
- Sequential fail-fast `truss verify` with machine-readable local evidence.
- `truss doctor` diagnostics.
- 29 unit, 10 integration, and 3 E2E tests.
- GitHub Actions CI on Node.js 20 and 22.

### Governance
- MIT license.
- Contribution, security, and third-party policies.
- Explicit v0.1 enforcement model distinguishing TRUSS, agent, adapter, and declarative behavior.

### Intentionally deferred to v0.2
- Automatic coding-agent invocation and runtime routing.
- Runtime adapters for Claude Code/Codex/other agents.
- Automatic isolated reviewer execution.
- Automatic subagent/team/worktree orchestration.
- Technical zone-guard enforcement.
- Automatic OpenSpec archive/closure.
