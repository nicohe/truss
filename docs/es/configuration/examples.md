# Ejemplos de configuración

> Traducción al español. La referencia canónica es [la versión en inglés](../../en/configuration/examples.md).

## Configuración por defecto recomendada
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

## Un proyecto que no es Node
Los comandos por defecto llaman a `npm`, que falla cuando no hay `package.json`. Lista en su lugar las comprobaciones de tu proyecto:
```yaml
verification:
  commands:
    - pytest -q
    - ruff check .
```
Como editaste la lista, el primer `truss verify` te pide aprobarla (consulta [`truss verify`](../reference/verify.md#aprobación)).

## Spec-as-Source estricto
```yaml
spec:
  mode: source
  gherkin: true
  zone_guard: true
development:
  bdd: true
  tdd: true
```

## Exigir tests con cada cambio de código
```yaml
verification:
  tests_required: block   # o warn para solo informar
  base_ref: develop       # opcional; si no, se autodetecta main/master
  # source_paths: [server]  # anulaciones opcionales de la estructura detectada
  # test_paths: [checks]
  commands:
    - npm test
```

## Exigir tareas terminadas
```yaml
verification:
  tasks_complete: warn    # block donde se exija un cambio OpenSpec terminado, p. ej. antes de archivar
  tests_required: block
  commands:
    - npm test
```

## Graphify desactivado
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
En v0.2, `truss graphify` y `truss doctor` aplican la disponibilidad y el bloqueo cuando `required: true`. Durante la implementación dirigida por el agente, el agente también debe respetar ese requisito.

## Monorepo
```yaml
components:
  api:
    path: ./apps/api
  worker:
    path: ./apps/worker
```
