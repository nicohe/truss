# Continuous Integration

TRUSS v0.2 runs its permanent verification suite in GitHub Actions.

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
npm run check:docs         (ubuntu / Node 22 only)
  ↓
npm run lint               (ubuntu / Node 22 only)
  ↓
unit → integration → E2E   (separate steps, so one failing suite does not hide the others)
```

`npm run check` performs `node --check` against TRUSS JavaScript modules. `npm run check:docs` runs the [documentation check](#documentation-check). `npm run lint` runs [Biome](https://biomejs.dev) (`biome check`: lint rules, formatting and import order) using `biome.jsonc`. The suites are started by `scripts/run-tests.mjs`, which lists the test files itself because `cmd.exe` and Node 20 do not expand globs.

## Documentation check

`npm run check:docs` (`scripts/check-docs.mjs`, no dependencies, no network) fails the build when the documentation drifts. It checks the Markdown files of the repository for:

- **Broken links**: a relative link to a file that does not exist.
- **Broken anchors**: a `#fragment` with no matching heading in the target page. Anchors follow GitHub's rules, including inline-code headings and repeated headings.
- **Orphan pages**: a page under `docs/en/` or `docs/es/` that no other page links to. Any other docs directory (a future translation, say) only produces a warning until it is added to `ENFORCED_ORPHAN_DIRS`; `--strict` enforces all of them.

and, against the code they describe, that the documentation mentions:

- every CLI command (`docs/en/reference/cli.md`);
- every configuration option in the schema (`docs/en/configuration/reference.md`);
- every `truss doctor` check (`docs/en/reference/doctor.md`);
- every environment variable the CLI reads or a CI workflow sets (`docs/en/reference/environment.md`).

So adding a command, an option, a doctor check or an environment variable without documenting it fails the build, which is the kind of drift that had left `doctor.md` and the environment variables undocumented. Use `--root <dir>` to check another tree. External links are not checked, to keep the build deterministic.

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
