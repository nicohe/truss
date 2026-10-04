# Configuration examples

## Recommended default
```yaml
version: 1
spec:
  mode: anchored
  gherkin: true
  zone_guard: false
development:
  bdd: true
  tdd: true
verification:
  commands:
    - npm test --if-present
    - npm run lint --if-present
    - npm run typecheck --if-present
    - npm run build --if-present
integrations:
  graphify:
    enabled: true
    required: false
components: {}
```

## A project that is not Node
The default commands call `npm`, which fails when there is no `package.json`. List the checks of your own project instead:
```yaml
verification:
  commands:
    - pytest -q
    - ruff check .
```
Because you edited the list, the first `truss verify` asks you to approve it (see [`truss verify`](../reference/verify.md#trust)).

## A TypeScript project with pnpm and Vitest
The default list calls `npm`. In a project that uses pnpm, list its scripts instead:
```yaml
verification:
  commands:
    - pnpm typecheck
    - pnpm lint
    - pnpm exec prettier --check src
    - pnpm test run
    - pnpm build
```
This list ran green with pnpm 12, Vitest 5, ESLint 10 and Prettier 3. Four things in it are deliberate:

- **`pnpm test run`, not `pnpm test`.** With `"test": "vitest"`, Vitest starts in watch mode when it is attached to a terminal, it is not in CI and it does not detect an agent. TRUSS gives each command your terminal, so `truss verify` run by hand prints `Waiting for file changes...` and never finishes. The extra `run` makes it a single run. Inside an agent session Vitest sees the agent and runs once on its own, so the problem shows up only when you run `verify` yourself. Changing the script to `"test": "vitest run"` has the same effect.
- **Keep Vitest inside your sources.** `.truss/` is a full clone with its own test files, and a bare `vitest` finds them (22 in the test, next to the project's one) and runs TRUSS's tests as if they were yours. Limit it in `vitest.config.ts`:
  ```ts
  import { defineConfig } from 'vitest/config';

  export default defineConfig({
    test: { include: ['src/**/*.test.ts'] },
  });
  ```
- **`prettier --check src`, not `.`.** Prettier also scans `.truss/`; see [use TRUSS in a shared repository](../guides/shared-repo.md#formatters-and-linters-that-walk-the-whole-tree).
- **Allow the dependency builds that need it.** pnpm 12 does not run a dependency's install script until you allow it. The first script you run installs the dependencies and, for a package such as `esbuild`, stops with `ERR_PNPM_IGNORED_BUILDS`; the next run works, but the first `verify` fails. Decide it once, in `pnpm-workspace.yaml`:
  ```yaml
  allowBuilds:
    esbuild: true
  ```
  (or run `pnpm approve-builds`). The same message appears in [troubleshooting](../guides/troubleshooting.md#verification).

To keep OpenSpec's own check in the evidence, add it to the list: `openspec validate --all --strict --no-interactive` validates every change and spec, and exits `1` if one is malformed. It also fails for a change that has no spec deltas yet, so add it once the specs exist, not while a change is still a proposal. Without it, `latest.json` records only the commands you list, and a reviewer cannot see that the change was validated.

## Strict spec-as-source
```yaml
spec:
  mode: source
  gherkin: true
  zone_guard: true
development:
  bdd: true
  tdd: true
```

## Require tests with every code change
```yaml
verification:
  tests_required: block   # or warn to only report
  base_ref: develop       # optional; auto-detects main/master otherwise
  # source_paths: [server]  # optional overrides of the detected layout
  # test_paths: [checks]
  commands:
    - npm test
```

## Require finished tasks
```yaml
verification:
  tasks_complete: warn    # block where a finished OpenSpec change is required, e.g. before archiving
  tests_required: block
  commands:
    - npm test
```

## Graphify disabled
```yaml
integrations:
  graphify:
    enabled: false
    required: false
```

## Graphify mandatory
```yaml
integrations:
  graphify:
    enabled: true
    required: true
```
In v0.2, `truss graphify` and `truss doctor` enforce readiness/blocking when `required: true`. During agent-driven implementation, the agent must also respect that requirement.

## Monorepo
```yaml
components:
  api:
    path: ./apps/api
  worker:
    path: ./apps/worker
```
