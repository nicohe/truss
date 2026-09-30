# Referencia de configuración

> Traducción al español. La referencia canónica es [la versión en inglés](../../en/configuration/reference.md).

Regla: **No configuration without semantics.** Cada opción pública documenta tipo, valor por defecto, valores permitidos, efecto, comportamiento ante fallos o fallback y quién hace el enforcement.

## `version`
Tipo: entero. Por defecto: `1`. Selecciona la versión del schema de configuración de TRUSS. Una versión no soportada debe fallar la validación. Enforcement: **TRUSS**.

## `spec.mode`
Tipo: enum. Por defecto: `anchored`. Valores: `anchored`, `source`.
- `anchored`: OpenSpec sigue siendo el ancla permanente; una reconciliación explícita puede hacer evolucionar juntos la spec, los tests y el código.
- `source`: OpenSpec es la autoridad; los cambios de comportamiento vuelven primero a la fase de spec.

Enforcement en v0.2: **policy del AGENT**. Mientras el agente implementa, `truss continue` la indica en la acción siguiente (en modo `source`: la spec es de solo lectura, y el comportamiento que tenga que cambiar vuelve primero a la spec); TRUSS no lo comprueba. Objetivo en v0.3: **TRUSS + AGENT**.

## `spec.gherkin`
Tipo: booleano. Por defecto: `true`. Con `true`, el comportamiento de aceptación observable debería expresarse como escenarios Gherkin cuando corresponda. Con `false` se admiten criterios de aceptación estructurados sin Gherkin. Enforcement en v0.2: **AGENT**.

## `spec.zone_guard`
Tipo: booleano. Por defecto: `false`. Con `true` se espera una separación de comportamiento entre Spec Zone y Code Zone. Se recomienda sobre todo con `mode: source`. Enforcement en v0.2: **AGENT/DECLARATIVE**; `truss continue` se lo recuerda al agente mientras implementa, y el enforcement por runtime es trabajo futuro.

## `development.bdd`
Tipo: booleano. Por defecto: `true`. Activa el macro-loop BDD en `execute-change`: comportamiento de aceptación RED → implementación → aceptación GREEN. Enforcement en v0.2: **AGENT**.

## `development.tdd`
Tipo: booleano. Por defecto: `true`. Activa RED → GREEN mínimo → refactor para los detalles de implementación. Enforcement en v0.2: **AGENT**. TRUSS puede comprobar además que el cambio tocó algún test: consulta `verification.tests_required`.

## `verification.commands`
Tipo: array de strings. Por defecto: `npm test --if-present`, `npm run lint --if-present`, `npm run typecheck --if-present` y `npm run build --if-present`. `truss verify` ejecuta los comandos en orden; un fallo impide que la verificación se considere exitosa. La lista por defecto sirve para un proyecto Node: sin `package.json`, `npm` falla en el primer comando, así que los demás proyectos deben poner sus propias comprobaciones (consulta los [ejemplos](examples.md#un-proyecto-que-no-es-node)). Enforcement: **TRUSS**.

## `verification.tests_required`
Tipo: enum. Por defecto: `off`. Valores: `off`, `warn`, `block`. Controla el **gate tests-required** de `truss verify`: ¿el cambio tocó código fuente sin tocar ningún test?
- `off`: el gate no se ejecuta.
- `warn`: `truss verify` imprime qué archivos fuente cambiaron sin tests y continúa; el código de salida no cambia.
- `block`: el mismo informe, pero `truss verify` termina con código `1` **antes de ejecutar ningún comando** y registra el resultado en `.truss/verification/latest.json`.

El gate compara el árbol de trabajo con el merge-base de `HEAD` y la rama base (consulta `base_ref`): cuentan los archivos confirmados, en staging, modificados sin staging y sin seguimiento; las eliminaciones puras no exigen tests. Los cambios se agrupan **por componente** (o como un único workspace cuando `components` está vacío), así que un monorepo necesita tests en cada componente que cambió. Solo cuentan como fuente o test los archivos con extensión de código; se ignoran la documentación, el JSON, los lockfiles y los fixtures. Un archivo es un test cuando está bajo un directorio de tests o se llama `*.test.*`, `*.spec.*` o `*_test.*`; es fuente cuando está bajo un directorio de fuentes y no es un test.

Si no puede decidir (no es un work tree de Git, no hay commits, no hay rama base, un clon superficial sin el merge-base, un componente que no se resuelve), informa del motivo y **no** bloquea.

Límites: demuestra que cambiaron archivos de test, no que los tests se escribieron primero (TDD), que ejercitan el cambio ni que pasan. Que los tests pasen sigue siendo trabajo de `verification.commands`. Enforcement: **TRUSS** para la comprobación de presencia; **AGENT** para la disciplina BDD/TDD en sí.

## `verification.tasks_complete`
Tipo: enum. Por defecto: `off`. Valores: `off`, `warn`, `block`. Controla el **gate tasks-complete** de `truss verify`: ¿están marcadas todas las tareas del cambio OpenSpec activo?
- `off`: el gate no se ejecuta.
- `warn`: `truss verify` lista las tareas abiertas y continúa.
- `block`: el mismo informe, pero `truss verify` termina con código `1` **antes de ejecutar ningún comando** y registra el resultado en `.truss/verification/latest.json`.

El cambio activo es el de `.truss/state.json` (lo crea `truss new`). El progreso es el que informa OpenSpec con `openspec instructions apply` (las casillas de `tasks.md`). Si no hay cambio activo, OpenSpec no está disponible o es incompatible, el cambio activo se archivó, o `tasks.md` no tiene tareas, el gate lo dice y **no** bloquea.

Usa `warn` mientras trabajas (la verificación suele ejecutarse a mitad de la implementación) y `block` donde se exija un cambio terminado. Comprueba que las tareas están *marcadas*, no que se hicieran de verdad. Enforcement: **TRUSS** para la comprobación; **AGENT** para hacer el trabajo y marcarlo.

## `verification.base_ref`
Tipo: string. Por defecto: sin definir (autodetección). Ref de Git contra la que se compara el cambio. Si no se define, TRUSS prueba `origin/HEAD`, `origin/main`, `origin/master`, `main` y luego `master`. Defínela para otros modelos de ramas (por ejemplo `develop` o `release/1.x`). Una ref desconocida hace que el gate informe «no se puede evaluar» sin bloquear. Solo se usa cuando `tests_required` no es `off`. Enforcement: **TRUSS**.

## `verification.source_paths` y `verification.test_paths`
Tipo: arrays de strings. Por defecto: sin definir (se usan los directorios detectados). Prefijos de directorio relativos al repositorio que reemplazan los detectados. Los directorios de fuentes detectados son `src`, `app`, `apps`, `lib` y `packages`; los de tests son `test`, `tests`, `__tests__` y `spec` (cada uno relativo a la raíz del componente, y solo si existe). Defínelos cuando tu estructura sea distinta, por ejemplo `source_paths: [server]` y `test_paths: [checks]`. Solo se usan cuando `tests_required` no es `off`. Enforcement: **TRUSS**.

## `integrations.graphify.enabled`
Tipo: booleano. Por defecto: `true`.
- `false`: TRUSS no usa Graphify de forma intencional; se usa el descubrimiento de código nativo.
- `true`: Graphify puede usarse para analizar relaciones e impacto del código.

Enforcement en v0.2: **TRUSS** para los comandos de ciclo de vida y estado configurados; **AGENT** para decidir cuándo usar Graphify opcional durante la implementación.

## `integrations.graphify.required`
Tipo: booleano. Por defecto: `false`. Solo válido con `enabled: true`.
- `false`: si Graphify no está disponible, se usa search/grep/LSP/exploración nativa del runtime.
- `true`: Graphify es un requisito del proyecto. `truss graphify` y `truss doctor` lo informan como bloqueante cuando no está disponible o no está listo.

Enforcement en v0.2: **TRUSS** para esas comprobaciones ejecutables; el **AGENT** debe respetar el requisito durante la implementación dirigida por el agente. `truss continue` le dice al agente el estado del grafo mientras implementa, pero nunca lo detiene. El gating centralizado de todo el workflow pertenece a la orquestación posterior.

`enabled: false` + `required: true` es una configuración inválida.

## `components`
Tipo: mapa. Por defecto: `{}`.
- `{}`: el repositorio se trata como un único workspace.
- con entradas: declara unidades direccionables en un monorepo o workspace.

Ejemplo:
```yaml
components:
  api:
    path: ./apps/api
  worker:
    path: ./apps/worker
```
Cada clave de componente es un identificador estable de TRUSS; `path` apunta a su raíz relativa al repositorio. La resolución de componentes puede acotar la guía local, el contexto de código, los tests y el trabajo de OpenSpec. Enforcement en v0.2: **TRUSS** valida y resuelve las rutas de los componentes, la guía `AGENTS` local o del workspace, el alcance de OpenSpec y las raíces comunes de fuentes y tests. La orquestación más profunda de tareas pertenece a v0.3.

## OpenSpec no se puede configurar como opcional
TRUSS exige OpenSpec y por eso no aparece bajo `integrations`. TRUSS debe detectar y reutilizar un proyecto OpenSpec compatible existente, o inicializarlo cuando falte; nunca debe reemplazar en silencio los datos de OpenSpec existentes.

## Schema legible por máquina

El contrato v1 legible por máquina está en `.truss/schema/config.schema.json` y usa JSON Schema Draft 2020-12. Define la forma de objeto admitida, los tipos de los campos, los valores de los enums, la estructura de los componentes, la política de propiedades desconocidas y la combinación inválida `graphify.enabled: false` + `graphify.required: true`.

El schema es el contrato estructural. El parseo de YAML, la aplicación de valores por defecto, los diagnósticos y el enforcement del CLI están implementados en `lib/config.mjs`; consulta la [validación de la configuración](validation.md).
