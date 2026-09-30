# Changelog

All notable changes to TRUSS are documented here.

## [Unreleased]

### Documentation
- **Getting started rewritten.** It now lists prerequisites (including how to install OpenSpec), shows the real output of each step, walks one change from `new` to `verify` including the approval prompt, covers monorepos, and has a table of the errors a new user is most likely to hit. The agent prompt no longer hard-codes paths.
- **The documentation index is organized by what you want to do** (understand, do the work, commands, configuration, integrations, guarantees, contribute) and links every page; previously the four concept pages, the glossary and the project structure were not linked from anywhere.
- The four concept pages were 3 to 5 lines each and are now real pages (spec-driven development, BDD and TDD, context management, durable vs ephemeral state); the glossary defines the terms used across the docs.

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
