# `truss doctor`

`truss doctor` is the local health check for a TRUSS workspace. It is read-only: it diagnoses setup and never installs, upgrades, initializes, reindexes, or rewrites project data.

## Checks

- **Core:** Node >= 20, Git CLI, Git work tree, `.truss/` ignore status, valid TRUSS config.
- **Project:** configured component paths and resolution.
- **OpenSpec:** CLI presence, supported version (`>=1.0.0 <2.0.0`), initialized project.
- **Capabilities:** Graphify according to `enabled/required`, native-search fallback, Git worktree capability.
- **Verification:** whether deterministic verification commands are configured.

## Severity

- `●` pass: required/available condition is satisfied.
- `○` warning/optional: workflow can continue; capability or recommendation is optional.
- `×` fail: a required condition is not satisfied.

Graphify only fails doctor when `integrations.graphify.required: true`. When optional, an unavailable or stale graph is a warning and TRUSS falls back to native search.

## Exit codes

- `0`: all required checks passed. Optional warnings may still be present.
- `1`: one or more required operational/setup checks failed.
- `2`: TRUSS configuration is invalid or cannot be loaded.

`doctor` is intentionally diagnostic. Use the relevant explicit command (`truss init`, `truss graphify bootstrap`, etc.) to repair a condition.
