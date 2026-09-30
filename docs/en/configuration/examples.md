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
In v0.1, `truss graphify` and `truss doctor` enforce readiness/blocking when `required: true`. During agent-driven implementation, the agent must also respect that requirement.

## Monorepo
```yaml
components:
  api:
    path: ./apps/api
  worker:
    path: ./apps/worker
```
