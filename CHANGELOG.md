# Changelog

All notable changes to TRUSS are documented here.

## [Unreleased]

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
