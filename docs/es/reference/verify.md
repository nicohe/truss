# `truss verify`

> Traducción al español. La referencia canónica es [la versión en inglés](../../en/reference/verify.md).

`truss verify` es el runner de verificación determinística de TRUSS: ejecuta tus comandos de verificación en orden y, si los activas, dos comprobaciones opcionales antes de ellos.

## Garantías

- Carga y valida `.truss/config.yaml` antes de ejecutar comandos del proyecto.
- Ejecuta la lista de comandos solo después de que se haya aprobado para este proyecto (consulta [Aprobación](#aprobación)).
- Cuando `verification.tests_required` o `verification.tasks_complete` no es `off`, ejecuta los gates [tests-required](#gate-tests-required) y [tasks-complete](#gate-tasks-complete) después de comprobar la aprobación y antes de cualquier comando.
- Ejecuta `verification.commands` exactamente en el orden configurado.
- Ejecuta los comandos de forma secuencial desde la raíz del proyecto.
- Se detiene en el primer comando que falla (fail-fast).
- Conserva el stdout/stderr de cada comando en la terminal.
- Registra evidencia legible por máquina en `.truss/verification/latest.json`.
- Nunca informa éxito si no hay comandos de verificación configurados.

## La lista de comandos por defecto

`truss init` escribe `npm test --if-present`, `npm run lint --if-present`, `npm run typecheck --if-present` y `npm run build --if-present`. `--if-present` omite un script que el proyecto no define, pero `npm` necesita un `package.json`: en un proyecto que no lo tiene (Python, Go, o la raíz de un monorepo cuyos paquetes están en subdirectorios) el primer comando falla con `npm error … Could not read package.json` y `verify` se detiene. Sustituye la lista por tus propias comprobaciones en `.truss/config.yaml`; consulta los [ejemplos](../configuration/examples.md#un-proyecto-que-no-es-node).

Cada comando se ejecuta a través de tu shell con tu terminal conectada (entrada y salida estándar heredadas), así que un comando que espera entrada o vigila cambios en los archivos mantiene a `verify` esperando. Usa la forma de una sola ejecución de tu ejecutor de pruebas, como `vitest run` en lugar de `vitest`. Hay un ejemplo con pnpm y Vitest en [los ejemplos de configuración](../configuration/examples.md#un-proyecto-typescript-con-pnpm-y-vitest).

## Códigos de salida

| Código | Significado |
|---|---|
| `0` | Todos los comandos de verificación configurados pasaron. |
| `1` | Un comando de verificación falló o no pudo iniciarse; no hay comandos configurados; la lista no está aprobada y no se aprobó; o un gate en modo `block` (`tests_required` / `tasks_complete`) encontró un problema. |
| `2` | La configuración de TRUSS es inválida. No se ejecuta ningún comando de verificación del proyecto. |

## Aprobación

Los comandos de `verification.commands` se ejecutan a través de tu shell, así que `truss verify` pregunta antes de ejecutar una lista que no ha visto para este proyecto:

- La primera vez, y cada vez que la lista cambia, imprime los comandos y pregunta `Run and trust these commands? [y/N]`. La aprobación se recuerda.
- Sin terminal (CI, agentes) se niega a ejecutar y sale con `1`, salvo que pases `truss verify --trust` o definas `TRUSS_TRUST=1`. Úsalos solo después de leer `.truss/config.yaml`.
- Las aprobaciones se guardan por ruta de proyecto en `$TRUSS_HOME/trusted.json` (por defecto `~/.config/truss/`, o `$XDG_CONFIG_HOME/truss/`), nunca en el repositorio.
- `truss init` aprueba la lista por defecto que escribe; las configuraciones adoptadas o editadas necesitan aprobación.
- `truss doctor` informa del estado de aprobación actual.

Consulta el modelo de confianza en [`SECURITY.md`](../../../SECURITY.md#trust-model) (en inglés) y las [variables de entorno](environment.md) para `TRUSS_TRUST` y `TRUSS_HOME`.

## Gate tests-required

Se activa con `verification.tests_required: warn | block` (por defecto `off`). Responde una sola pregunta determinística a partir de Git: **¿el cambio tocó código fuente sin tocar ningún test?**

```text
Tests required  block
  × missing tests source changed without any test change (base main @ 3f2a1bc)
    workspace:
      lib/retry.mjs
  Add or update tests, or lower verification.tests_required to warn/off.

Verification failed: tests are required. No command was executed.
```

- `warn` informa y continúa. `block` sale con `1` antes de ejecutar ningún comando.
- La comparación es el árbol de trabajo contra el merge-base de `HEAD` y la rama base (`verification.base_ref`, detectada automáticamente si no se define). Cuentan los archivos confirmados, en staging, modificados sin staging y sin seguimiento; las eliminaciones puras no exigen tests.
- Se evalúa por componente, así que un monorepo necesita tests en cada componente que cambió.
- Mira toda la rama, no cada commit: un test cambiado en un commit anterior de la rama también satisface a un commit posterior que solo cambia código, y cuenta cualquier archivo de test del componente. Para tests que ejerciten el código, añade un umbral de cobertura a `verification.commands` (consulta la [referencia de configuración](../configuration/reference.md#verificationtests_required)).
- Si no puede decidir (no hay work tree de Git, no hay commits, no hay rama base, clon superficial), lo dice y nunca bloquea.
- **No** demuestra que los tests se escribieron primero, que cubren el cambio ni que pasan; de esto último se encargan los `verification.commands`.

El resultado se guarda en `testsRequired` dentro del archivo de evidencia. Consulta la [referencia de configuración](../configuration/reference.md) para ver cómo se clasifican los archivos.

## Gate tasks-complete

Se activa con `verification.tasks_complete: warn | block` (por defecto `off`). Responde: **¿están marcadas todas las tareas del cambio OpenSpec activo?**

```text
Tasks complete  block
  × open tasks 2 of 3 task(s) still open in "add-retry"
      1.2 Add tests
      1.3 Update the docs
  Finish or check off these tasks, or lower verification.tasks_complete to warn/off.

Verification failed: the active change still has open tasks. No command was executed.
```

- El cambio activo sale de `.truss/state.json`; el progreso sale de `openspec instructions apply` (las casillas de `tasks.md`).
- `warn` informa y continúa; `block` sale con `1` antes de ejecutar ningún comando.
- Si no hay cambio activo, OpenSpec no está disponible o es incompatible, o `tasks.md` no tiene tareas, lo dice y nunca bloquea. Un cambio activo que se archivó con `openspec archive` se informa como tal (`archived`, con adónde fue) y tampoco bloquea nunca: un cambio terminado no tiene progreso de tareas que leer.
- Cuando ambos gates están activados, se informan y se registran los dos; el primero que bloquea (tests y luego tasks) da nombre al motivo.

El resultado se guarda en `tasksComplete` dentro del archivo de evidencia.

## Evidencia

El archivo de evidencia local contiene los comandos realmente ejecutados, en orden, con su resultado, código o señal de salida y duración. Como TRUSS es una herramienta local, `.truss/verification/` es estado efímero del harness y no código fuente del producto.
