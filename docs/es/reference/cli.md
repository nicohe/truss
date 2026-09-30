# Referencia del CLI

> Traducción al español. La referencia canónica es [la versión en inglés](../../en/reference/cli.md).

TRUSS es un CLI de Node. Desde un proyecto, ejecútalo como `node .truss/bin/truss.mjs <comando>` (o mediante un alias; consulta [primeros pasos](../getting-started.md)). Los comandos actúan sobre el **directorio actual**, que debe ser la raíz del proyecto. No hay opciones globales: solo el nombre del comando, sus argumentos y las opciones que se listan abajo.

TRUSS v0.2 es principalmente un harness dirigido por el agente. La tabla muestra qué comandos ejecutan comprobaciones determinísticas y cuáles solo preparan o muestran estado; ninguno ejecuta un coding agent.

| Comando | Qué hace | Detalle |
|---|---|---|
| `truss init` | Crea `.truss/config.yaml` si falta (nunca lo sobrescribe) e inicializa o adopta OpenSpec | [`init`](init.md) |
| `truss doctor` | Comprobación de salud de solo lectura del entorno, la configuración, OpenSpec y Graphify (opcional) | [`doctor`](doctor.md) |
| `truss config` | Valida e imprime la configuración resuelta, con los valores por defecto aplicados | [validación](../configuration/validation.md) |
| `truss openspec` | Inspecciona el CLI de OpenSpec, su versión y el proyecto | [detección de OpenSpec](../integrations/openspec-detection.md) |
| `truss graphify [status\|update\|bootstrap]` | Inspecciona o refresca el grafo de código opcional | [ciclo de vida de Graphify](../integrations/graphify-lifecycle.md) |
| `truss components [name]` | Resuelve los componentes configurados y su contexto | [componentes](components.md) |
| `truss new "Nombre del cambio" [--component name]` | Crea un cambio de OpenSpec y lo marca como activo | [comandos del ciclo de vida](../workflows/lifecycle-commands.md) |
| `truss status` | Muestra el cambio activo, su fase, sus artefactos y el progreso de tareas | [comandos del ciclo de vida](../workflows/lifecycle-commands.md) |
| `truss continue` | Imprime la siguiente acción para el agente y los archivos que debe cargar | [comandos del ciclo de vida](../workflows/lifecycle-commands.md) |
| `truss verify [--trust]` | Ejecuta `verification.commands` en orden y se detiene en el primer fallo; ejecuta antes las comprobaciones opcionales; pregunta antes de ejecutar una lista de comandos nueva o modificada | [`verify`](verify.md) |
| `truss handoff` | Escribe una nota de handoff breve para el cambio activo | [gestión de contexto](../concepts/context-management.md) |
| `truss skills` | Lista las skills portables que trae la instalación | [skills](../skills/overview.md) |
| `truss help` | Imprime el uso. Ejecutar `truss` sin comando, o con uno desconocido, hace lo mismo | |

## Opciones

| Opción | En | Efecto |
|---|---|---|
| `--component <name>` | `new` | Crea el cambio en un componente declarado bajo `components`. Un nombre no declarado falla con `Unknown component`. |
| `--trust` | `verify` | Aprueba sin preguntar la lista actual de `verification.commands`. Úsala después de leer la lista. |

## Códigos de salida

Se usan los mismos tres valores en todos los comandos:

| Código | Significado |
|---|---|
| `0` | El comando hizo lo que se le pidió. |
| `1` | Falló una comprobación o una precondición: falló la verificación, no se aprobó una lista de comandos, OpenSpec falta o es incompatible, o una capacidad requerida no está disponible. |
| `2` | La configuración es inválida o el comando se usó mal (por ejemplo, `new` sin título, o un componente o una acción desconocidos). |

Por comando:

- `init`: `1` cuando OpenSpec falta, es incompatible, está parcial o falló al inicializarse; `2` para una configuración inválida o una instalación incompleta.
- `doctor`: `1` cuando falla un check requerido; `2` cuando la configuración es inválida.
- `verify`: `1` cuando un comando falla, no hay ninguno configurado, la lista no está aprobada, o un gate en modo `block` se niega; `2` para una configuración inválida.
- `graphify update` / `bootstrap`: un fallo es `1` solo cuando Graphify es `required: true`; en otro caso es `0`.
- `status`, `continue`, `handoff`: `2` cuando `.truss/state.json` no se puede leer.

## Salida

La salida es texto plano, con color solo cuando va a una terminal interactiva. `NO_COLOR` y `FORCE_COLOR` lo modifican; consulta las [variables de entorno](environment.md), que también lista las demás variables que lee TRUSS.

## Review

`code-review` existe como skill y workflow en v0.2, pero **no** hay un comando ejecutable `truss review`. El review dirigido por el runtime pertenece a la orquestación posterior.

## Orden canónico

Consulta el [ciclo de vida del cambio](../workflows/lifecycle.md) para ver el orden de comandos, workflows y skills.

## Evidencia de verificación

`truss verify` ejecuta los comandos de verificación de forma secuencial y se detiene en el primer fallo. Escribe el último resultado legible por máquina en `.truss/verification/latest.json`: los comandos ejecutados, su estado, código de salida y duración, además de los resultados de `testsRequired` y `tasksComplete` cuando esas comprobaciones están activadas. Consulta [`truss verify`](verify.md#evidencia).
