# Continuous Integration

TRUSS v0.1 runs its permanent verification suite in GitHub Actions.

Workflow: `.github/workflows/ci.yml`

## Triggers

CI runs on:

- pushes to `main`;
- every pull request;
- manual `workflow_dispatch` runs.

## Runtime matrix

TRUSS declares Node.js `>=20`, so CI verifies the minimum supported major and a newer LTS/runtime line:

- Node.js 20;
- Node.js 22.

## Required checks

Each matrix job performs:

```text
checkout
  ↓
npm ci --ignore-scripts
  ↓
npm run check
  ↓
npm test
  ├── unit
  ├── integration
  └── E2E
```

`npm run check` performs `node --check` against TRUSS JavaScript modules. `npm test` runs all permanent test suites.

The workflow is read-only apart from its ephemeral runner workspace. It does not install or upgrade OpenSpec or Graphify and does not publish TRUSS.

## Local equivalent

Before pushing a change, run:

```bash
npm ci --ignore-scripts
npm run ci
```

A failed syntax check or test causes the CI job to fail. Branch protection is a repository setting and should require the CI job before merging when the repository is hosted on GitHub.
