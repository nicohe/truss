# TRUSS testing

TRUSS v0.1 keeps permanent unit, integration, and end-to-end suites under `test/`.

Run:

```bash
npm test
```

The suite uses Node.js `node:test` and covers configuration parsing/validation/defaults, OpenSpec compatibility classification, component resolution and safety, Graphify policy states, verification fail-fast/evidence behavior, and lifecycle state helpers.


## Integration tests

TRUSS also executes the CLI as an external process against isolated temporary workspaces.
This validates command boundaries, filesystem effects, dependency detection, and exit-code contracts rather than only calling library functions directly.

```bash
npm run test:integration
```

The integration suite covers:

- valid and invalid configuration through `truss config`;
- `truss verify` success, failure, fail-fast behavior, and evidence;
- `truss doctor` with compatible/incompatible OpenSpec;
- optional and required Graphify behavior;
- `truss init` adoption and idempotent OpenSpec initialization.

External CLIs are represented by deterministic local fixtures. The suite does not install, upgrade, or contact OpenSpec or Graphify over the network.

Run all permanent tests with:

```bash
npm test
```

## End-to-end tests

The E2E suite exercises the complete v0.1 user-visible lifecycle across real TRUSS CLI processes and temporary Git workspaces.

```bash
npm run test:e2e
```

It covers a new project lifecycle, adoption of an existing OpenSpec project without overwriting durable files, and enabling optional Graphify later. Automatic coding-agent execution and automatic OpenSpec archive remain outside the v0.1 E2E boundary because those are intentionally agent/user-driven until v0.2.

## CI

The same permanent suite runs in GitHub Actions on Ubuntu, macOS and Windows with Node.js 20, 22 and 24, and one job enforces a coverage floor. See [`ci.md`](ci.md).

Local equivalent:

```bash
npm ci --ignore-scripts
npm run ci
```
