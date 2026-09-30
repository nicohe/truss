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

**Windows.** The unit suite and every integration test that does not need a fake OpenSpec/Graphify CLI run on Windows. Tests that use the fake CLIs are skipped there, because those are POSIX shell scripts. Spawning a real npm-installed `openspec`/`graphify` (a `.cmd` shim on Windows) is therefore not covered by CI.

## Required checks

Each matrix job performs:

```text
checkout
  ↓
npm ci --ignore-scripts
  ↓
npm run check
  ↓
unit → integration → E2E   (separate steps, so one failing suite does not hide the others)
```

`npm run check` performs `node --check` against TRUSS JavaScript modules. The suites are started by `scripts/run-tests.mjs`, which lists the test files itself because `cmd.exe` and Node 20 do not expand globs.

## Coverage floor

The `ubuntu-latest` / Node 22 job runs the whole suite through `npm run test:coverage` instead, which fails when coverage drops below the floor defined in `package.json` (lines 80%, branches 60%, functions 85%). Locally:

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

A failed syntax check or test causes the CI job to fail. Branch protection is a repository setting and should require the CI job before merging when the repository is hosted on GitHub.
