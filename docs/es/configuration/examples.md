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

## Un proyecto TypeScript con pnpm y Vitest
La lista por defecto llama a `npm`. En un proyecto que usa pnpm, lista en su lugar sus scripts:
```yaml
verification:
  commands:
    - pnpm typecheck
    - pnpm lint
    - pnpm exec prettier --check src
    - pnpm test run
    - pnpm build
```
Esta lista se ejecutó en verde con pnpm 12, Vitest 5, ESLint 10 y Prettier 3. Cuatro cosas de ella son deliberadas:

- **`pnpm test run`, no `pnpm test`.** Con `"test": "vitest"`, Vitest arranca en modo watch cuando está conectado a una terminal, no está en CI y no detecta un agente. TRUSS entrega tu terminal a cada comando, así que un `truss verify` ejecutado a mano imprime `Waiting for file changes...` y no termina nunca. El `run` extra lo convierte en una sola ejecución. Dentro de una sesión de agente Vitest detecta al agente y se ejecuta una vez por sí solo, de modo que el problema aparece solo cuando ejecutas `verify` tú mismo. Cambiar el script a `"test": "vitest run"` tiene el mismo efecto.
- **Mantén Vitest dentro de tu código.** `.truss/` es un clon completo con sus propios archivos de prueba, y un `vitest` sin configuración los encuentra (22 en la prueba, junto al del proyecto) y ejecuta las pruebas de TRUSS como si fueran tuyas. Acótalo en `vitest.config.ts`:
  ```ts
  import { defineConfig } from 'vitest/config';

  export default defineConfig({
    test: { include: ['src/**/*.test.ts'] },
  });
  ```
- **`prettier --check src`, no `.`.** Prettier también escanea `.truss/`; consulta [usar TRUSS en un repositorio compartido](../guides/shared-repo.md#formateadores-y-linters-que-recorren-todo-el-árbol).
- **Permite las compilaciones de dependencias que lo necesitan.** pnpm 12 no ejecuta el script de instalación de una dependencia hasta que lo permites. El primer script que ejecutas instala las dependencias y, con un paquete como `esbuild`, se detiene con `ERR_PNPM_IGNORED_BUILDS`; la siguiente ejecución funciona, pero el primer `verify` falla. Decídelo una vez, en `pnpm-workspace.yaml`:
  ```yaml
  allowBuilds:
    esbuild: true
  ```
  (o ejecuta `pnpm approve-builds`). El mismo mensaje aparece en la [solución de problemas](../guides/troubleshooting.md#verificación).

Para dejar la comprobación propia de OpenSpec en la evidencia, añádela a la lista: `openspec validate --all --strict --no-interactive` valida todos los cambios y specs, y termina con código `1` si alguno está mal formado. También falla en un cambio que aún no tiene deltas de spec, así que añádela cuando las specs ya existan, no mientras un cambio sea solo una proposal. Sin ella, `latest.json` registra solo los comandos que listas, y un revisor no puede ver que el cambio se validó.

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
