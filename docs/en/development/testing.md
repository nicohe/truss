# TRUSS testing

TRUSS keeps permanent unit, integration and end-to-end suites under `test/`. They use Node.js's built-in `node:test`; there are no test dependencies. `scripts/run-tests.mjs` lists the test files itself, because `cmd.exe` and Node 20 do not expand globs.

| Command | What it runs |
|---|---|
| `npm test` | the three suites, one after the other |
| `npm run test:unit` | `test/unit/`: library modules on their own |
| `npm run test:integration` | `test/integration/`: the CLI as an external process |
| `npm run test:e2e` | `test/e2e/`: whole user journeys |
| `npm run test:coverage` | every suite, and fails when coverage drops below the floor (lines 90%, branches 75%, functions 95%) |
| `npm run ci` | the whole local check: syntax, documentation check, lint and every suite |

## Unit tests

They cover configuration parsing, validation and defaults, OpenSpec compatibility classification, component resolution and safety, Graphify policy states, verification fail-fast and evidence, the trust store, the tests-required and tasks-complete gates, lifecycle state helpers, terminal output, launching npm-installed CLIs on Windows, `init`, `doctor`, and the documentation check itself.

## Integration tests

TRUSS also executes the CLI as an external process against isolated temporary workspaces. This validates command boundaries, filesystem effects, dependency detection, and exit-code contracts rather than only calling library functions directly.

The integration suite covers:

- valid and invalid configuration through `truss config`;
- `truss verify` success, failure, fail-fast behavior, approval, the two gates and evidence;
- `truss doctor` with compatible and incompatible OpenSpec;
- optional and required Graphify behavior;
- `truss init` adoption and idempotent OpenSpec initialization;
- `truss new`, `status` and `continue` against an OpenSpec that behaves like the real one.

External CLIs are represented by deterministic local fixtures, installed the way npm installs a global CLI. The suite does not install, upgrade, or contact OpenSpec or Graphify over the network. The fixtures are only trustworthy while they behave like the real tools, which is what the contract test below checks.

## End-to-end tests

The E2E suite exercises the complete user-visible lifecycle across real TRUSS CLI processes and temporary Git workspaces. It covers a new project lifecycle, adoption of an existing OpenSpec project without overwriting durable files, enabling optional Graphify later, both documented ways of installing TRUSS, a test that the outputs quoted in getting started are what TRUSS prints, and one contract test against the real OpenSpec CLI. See [end-to-end tests](e2e.md).

Automatic coding-agent execution and automatic OpenSpec archive remain outside the E2E boundary because those are intentionally agent/user-driven until v0.3.

## CI

The same permanent suite runs in GitHub Actions on Ubuntu, macOS and Windows with Node.js 20, 22 and 24, and one job enforces the coverage floor. See [`ci.md`](ci.md).

Local equivalent:

```bash
npm ci --ignore-scripts
npm run ci
```
