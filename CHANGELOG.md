# Changelog

All notable changes to TRUSS are documented here.

## [Unreleased]

### Changed
- `bin/truss.mjs` is now a thin dispatcher; command logic lives in `lib/commands.mjs` and terminal output in `lib/ui.mjs`. CLI behavior and output are unchanged.
- `handoff` reads the active change through the shared lifecycle state reader, so a corrupt `state.json` is reported instead of crashing.
- `.truss/state.json` is written atomically (temp file + rename).

### Added
- `truss verify` asks for approval before running a new or changed `verification.commands` list, remembers it per project outside the repository, and refuses without a terminal unless `--trust` or `TRUSS_TRUST=1` is given. `truss init` trusts the default list it writes; `truss doctor` reports trust state.
- Color output honors `NO_COLOR` and `FORCE_COLOR`, and is disabled when stdout is not a TTY.
- `SECURITY.md` documents the trust model for `verification.commands`.

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
