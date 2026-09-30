# Ejemplos de configuración

## Default recomendado
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

## Spec-as-source estricto
```yaml
spec:
  mode: source
  gherkin: true
  zone_guard: true
development:
  bdd: true
  tdd: true
```

## Graphify deshabilitado
```yaml
integrations:
  graphify:
    enabled: false
    required: false
```

## Graphify obligatorio
```yaml
integrations:
  graphify:
    enabled: true
    required: true
```
En v0.1, `truss graphify` y `truss doctor` hacen enforcement de readiness/bloqueo cuando `required: true`. Durante implementación agent-driven, el agente también debe respetar ese requisito.

## Monorepo
```yaml
components:
  api:
    path: ./apps/api
  worker:
    path: ./apps/worker
```
