# Continuous Integration

TRUSS v0.1 runs its permanent verification suite in GitHub Actions.

Workflow: `.github/workflows/ci.yml`

## Triggers

CI runs on:

- pushes to `main`;
- every pull request;
- manual `workflow_dispatch` runs.

## Runtime matrix

TRUSS declares Node.js `>=20`, so CI verifies the minimum supported major and the newer lines on three operating systems (9 jobs):

- Operating systems: `ubuntu-latest`, `macos-latest`, `windows-latest`.
- Node.js: 20, 22 and 24.

**Windows.** The whole suite runs on Windows. The fake OpenSpec/Graphify CLIs are installed the way npm installs a global CLI (an extensionless `sh` shim, a `.cmd` shim and the Node script both launch), so the tests exercise the same `.cmd` handling as a real install.

## Required checks

Each matrix job performs:

```text
checkout
  ↓
npm ci --ignore-scripts
  ↓
npm run check
  ↓
npm run lint               (ubuntu / Node 22 only)
  ↓
unit → integration → E2E   (separate steps, so one failing suite does not hide the others)
```

`npm run check` performs `node --check` against TRUSS JavaScript modules. `npm run lint` runs [Biome](https://biomejs.dev) (`biome check`: lint rules, formatting and import order) using `biome.jsonc`. The suites are started by `scripts/run-tests.mjs`, which lists the test files itself because `cmd.exe` and Node 20 do not expand globs.

## Contract test against the real OpenSpec

The `Contract / real OpenSpec` job installs `@fission-ai/openspec@1` and runs the E2E suite with `TRUSS_REQUIRE_REAL_OPENSPEC=1`, so `test/e2e/real-openspec.e2e.test.mjs` cannot be skipped there. The fake OpenSpec used by the other jobs mirrors the real CLI, but only this job proves it. It is deliberately **not** a required check: a registry problem or a new OpenSpec release should not block merges. Locally the test runs whenever a compatible `openspec` is on `PATH` and is skipped otherwise.

## Coverage floor

The `ubuntu-latest` / Node 22 job runs the whole suite through `npm run test:coverage` instead, which fails when coverage drops below the floor defined in `package.json` (lines 90%, branches 75%, functions 95%). Locally:

```bash
npm run test:coverage
```

The workflow is read-only apart from its ephemeral runner workspace. It does not install or upgrade OpenSpec or Graphify and does not publish TRUSS.

## Local equivalent

Before pushing a change, run:

```bash
npm ci --ignore-scripts
npm run ci
```

If `npm run lint` reports formatting or fixable lint problems, `npm run lint:fix` applies them.

A failed syntax check or test causes the CI job to fail. Branch protection is a repository setting and should require the CI job before merging when the repository is hosted on GitHub.
