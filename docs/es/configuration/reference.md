# Referencia de configuración

> Traducción al español. La documentación en `docs/en/` es la referencia canónica.

Regla: **No configuration without semantics.** Cada opción pública documenta tipo, default, valores permitidos, efecto, fallback/fallo y responsable del enforcement.

## `version`
Entero, default `1`. Selecciona la versión del schema de configuración TRUSS. Una versión no soportada debe fallar validación. Enforcement: **TRUSS**.

## `spec.mode`
Enum, default `anchored`. Valores: `anchored`, `source`.
- `anchored`: OpenSpec permanece como ancla; spec, tests y código pueden evolucionar con reconciliación explícita.
- `source`: OpenSpec es autoritativa; los cambios de comportamiento vuelven primero a la fase de spec.
Enforcement v0.2: **AGENT**. Objetivo v0.3: **TRUSS + AGENT**.

## `spec.gherkin`
Boolean, default `true`. `true` espera escenarios Gherkin para comportamiento observable cuando corresponda; `false` permite criterios de aceptación estructurados sin Gherkin. Enforcement v0.2: **AGENT**.

## `spec.zone_guard`
Boolean, default `false`. `true` espera separación Spec Zone / Code Zone. Recomendado principalmente con `mode: source`. Enforcement v0.2: **AGENT/DECLARATIVE**.

## `development.bdd`
Boolean, default `true`. Habilita el macro-loop BDD en `execute-change`: aceptación RED → implementación → aceptación GREEN. Enforcement v0.2: **AGENT**.

## `development.tdd`
Boolean, default `true`. Habilita RED → GREEN mínimo → refactor para detalles de implementación. Enforcement v0.2: **AGENT**.

## `verification.commands`
Array de strings. `truss verify` ejecuta los comandos en orden; un fallo impide considerar Verification exitosa. Enforcement: **TRUSS**.

## `verification.tests_required`
Enum, default `off`. Valores: `off`, `warn`, `block`. Controla el **gate de tests obligatorios** de `truss verify`: ¿el cambio tocó código fuente sin tocar ningún test?
- `off`: el gate no se ejecuta.
- `warn`: `truss verify` informa qué archivos de código cambiaron sin tests y continúa; el exit code no cambia.
- `block`: el mismo informe, pero `truss verify` termina con exit `1` **antes de ejecutar ningún comando** y lo registra en `.truss/verification/latest.json`.

Compara el working tree con el merge-base entre `HEAD` y la rama base (ver `base_ref`): cuentan los archivos commiteados, en staging, modificados y sin seguimiento; las eliminaciones puras no exigen tests. Se evalúa **por componente**. Solo cuentan archivos con extensión de código; docs, JSON, lockfiles y fixtures se ignoran. Es test un archivo bajo un directorio de tests o llamado `*.test.*`, `*.spec.*` o `*_test.*`.

Si no puede decidir (no es un work tree de Git, no hay commits, no hay rama base, clon superficial), lo informa y **no** bloquea. Límite: demuestra que cambiaron archivos de test, no que se escribieran primero (TDD), que cubran el cambio ni que pasen; eso sigue en `verification.commands`. Enforcement: **TRUSS** para la comprobación de presencia; **AGENT** para la disciplina BDD/TDD.

## `verification.tasks_complete`
Enum, default `off`. Valores: `off`, `warn`, `block`. Controla el **gate de tareas completas** de `truss verify`: ¿todas las tareas del cambio activo de OpenSpec están marcadas?
- `off`: el gate no se ejecuta.
- `warn`: `truss verify` lista las tareas abiertas y continúa.
- `block`: el mismo informe, pero `truss verify` termina con exit `1` **antes de ejecutar ningún comando** y lo registra en `.truss/verification/latest.json`.

El cambio activo es el de `.truss/state.json` (lo crea `truss new`). El progreso es el que informa OpenSpec con `openspec instructions apply` (las casillas de `tasks.md`). Si no hay cambio activo, OpenSpec no está disponible o es incompatible, o `tasks.md` no tiene tareas, lo informa y **no** bloquea. Comprueba que las tareas están *marcadas*, no que se hicieran de verdad. Enforcement: **TRUSS** para la comprobación; **AGENT** para hacer el trabajo.

## `verification.base_ref`
String, default sin definir (autodetección: `origin/HEAD`, `origin/main`, `origin/master`, `main`, `master`). Ref de Git contra la que se compara el cambio. Una ref inexistente hace que el gate informe que no puede evaluar, sin bloquear. Enforcement: **TRUSS**.

## `verification.source_paths` y `verification.test_paths`
Arrays de strings, default sin definir (se usan los directorios detectados: `src`, `app`, `apps`, `lib`, `packages` y `test`, `tests`, `__tests__`, `spec`). Prefijos de directorio relativos al repositorio que reemplazan los detectados. Enforcement: **TRUSS**.

## `integrations.graphify.enabled`
Boolean, default `true`.
- `false`: TRUSS no intenta usar Graphify; usa descubrimiento nativo.
- `true`: Graphify puede usarse para relaciones/impacto del código.
Enforcement v0.2: **TRUSS** para habilitar/deshabilitar los comandos y diagnósticos de Graphify; **AGENT** para decidir cuándo usar Graphify opcional durante implementación.

## `integrations.graphify.required`
Boolean, default `false`. Solo válido con `enabled: true`.
- `false`: si Graphify no está disponible, fallback a search/grep/LSP/exploración nativa.
- `true`: Graphify es requisito del proyecto. `truss graphify` y `truss doctor` lo reportan como bloqueante si no está disponible/listo.
Enforcement v0.2: **TRUSS** para esos checks ejecutables; **AGENT** debe respetar el requisito durante implementación agent-driven. El gating centralizado de workflows queda para orquestación posterior.

`enabled: false` + `required: true` es configuración inválida.

## `components`
Mapa, default `{}`.
- `{}`: repo tratado como un único workspace.
- con entradas: declara unidades direccionables dentro de monorepo/workspace.

```yaml
components:
  api:
    path: ./apps/api
  worker:
    path: ./apps/worker
```
La key es el identificador estable del componente y `path` su raíz relativa al repo. Puede usarse para scope de instrucciones locales, código, tests y trabajo OpenSpec. Enforcement v0.2: **TRUSS** valida y resuelve paths de componentes, guidance AGENTS local/workspace, scope OpenSpec y roots comunes de source/tests; la orquestación profunda de tasks queda para v0.3.

## OpenSpec no es opcional
OpenSpec es requerido por TRUSS y no aparece bajo `integrations`. TRUSS debe detectar/reutilizar un OpenSpec compatible existente o inicializarlo si falta, sin reemplazar silenciosamente datos OpenSpec existentes.

## Schema legible por máquina

El contrato v1 legible por máquina vive en `.truss/schema/config.schema.json` y usa JSON Schema Draft 2020-12. Define la estructura soportada, tipos, enums, estructura de componentes, política de propiedades desconocidas y la combinación inválida `graphify.enabled: false` + `graphify.required: true`.

El schema es el contrato estructural. El parseo YAML, aplicación de defaults, diagnósticos y enforcement real del CLI corresponden al paso de validación de configuración.
