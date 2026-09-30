# Comandos del ciclo de vida

> Traducción al español. La referencia canónica es [la versión en inglés](../../en/workflows/lifecycle-commands.md).

Tres comandos siguen un cambio desde una idea hasta una implementación terminada: `new` lo empieza, `status` muestra en qué punto está y `continue` le dice a tu agente qué hacer a continuación. TRUSS v0.2 es **dirigido por el agente**: ninguno ejecuta un modelo. Leen y escriben el estado del cambio, y tu agente hace el trabajo.

La [guía de inicio](../getting-started.md#5-lleva-un-cambio-por-el-workflow) los recorre una vez. Esta página es la referencia de lo que imprime cada uno y de cuándo usarlo.

## Las fases

Un cambio está siempre en una fase, y `status` y `continue` la muestran:

| Fase | Qué significa | Qué la hace avanzar |
|---|---|---|
| `spec` | faltan artefactos de planificación (por defecto proposal, specs, design y tasks) | el agente los escribe, uno a uno |
| `implementation` | existen todos los artefactos y al menos una tarea está abierta | el agente implementa las tareas y marca cada una en `tasks.md` |
| `complete` | hay tareas y todas están marcadas | la verificación, el code review y el archivado |

La fase se recalcula desde OpenSpec cada vez que preguntas, así que no puede quedar obsoleta. `complete` significa *todas las tareas están marcadas*, nada más: no dice nada sobre si las tareas se hicieron bien. Para eso están [`truss verify`](../reference/verify.md) y la revisión.

Archivar un cambio con `openspec archive` no se lo comunica a TRUSS, que se entera la próxima vez que preguntas: `status` y `continue` dicen que el cambio activo fue archivado, y terminan con código `0`; `handoff` no escribe ninguna nota para él, y el gate [`tasks_complete`](../reference/verify.md) lo informa como archivado en lugar de fallar al leer sus tareas. Empieza el siguiente con `truss new`.

## `truss new "Nombre del cambio" [--component name]`

Úsalo para empezar un cambio. Convierte el título en un id (`Add retry policy` pasa a `add-retry-policy`), pide a OpenSpec que cree el cambio y lo recuerda como **cambio activo**. Solo hay un cambio activo a la vez.

```text
△ TRUSS · new

● OpenSpec change created
Change          add-retry-policy
Component       workspace
OpenSpec        openspec/changes/add-retry-policy
Planning        0/4 artifacts complete

Next: truss continue
```

Con `--component api`, el cambio se crea dentro de un componente declarado en `components` (consulta los [componentes](../reference/components.md)).

Si otro cambio sigue abierto en OpenSpec, `new` crea el nuevo y lo convierte en el cambio activo, y te avisa de que el otro se quedó atrás:

```text
○ "add-retry-policy" is still open in OpenSpec (openspec/changes/add-retry-policy) and is no longer the active change: TRUSS follows one change at a time.
```

No se pierde nada: el primer cambio queda en OpenSpec exactamente como estaba, y `openspec list` lo sigue mostrando. No hay un comando para volver a convertirlo en el cambio activo. Para hacerlo, edita `.truss/state.json` para que contenga `{"change": "add-retry-policy"}`, y además `"component": "api"` cuando el cambio vive en un componente; `truss status` completa el resto. No hay aviso cuando el cambio anterior se archivó o ya no está en OpenSpec, porque no queda nada atrás.

Necesita un proyecto inicializado. Sin `.truss/config.yaml` se detiene con `× invalid config` y `TRUSS config not found: .truss/config.yaml. Run truss init to create it.`, y código de salida `2`: ejecuta antes [`truss init`](../reference/init.md).

## `truss status`

Úsalo siempre que quieras saber en qué punto está el cambio, antes de dárselo a un agente o al retomarlo. No cambia nada, salvo refrescar la fase que recuerda.

```text
△ TRUSS · status

Change          add-retry-policy
Component       workspace
Phase           implementation
OpenSpec        openspec/changes/add-retry-policy
Planning        4/4 artifacts complete
Tasks           1/2 complete
  ● proposal           done
  ● specs              done
  ● design             done
  ● tasks              done
Tasks required   tasks

Next: truss continue
```

Los marcadores junto a cada artefacto son `●` hecho, `◐` listo para escribirse y `○` bloqueado hasta que exista otro artefacto. `Tasks required` nombra el artefacto que OpenSpec necesita antes de poder trabajar en una tarea. Mientras la planificación está sin terminar, la línea `Tasks` no aparece, porque aún no hay tareas.

Sin cambio activo lo dice y señala el siguiente paso:

```text
△ TRUSS · status

No active change.
Next: truss new "Change name"
```

Cuando el cambio se archivó, lo dice en su lugar:

```text
△ TRUSS · status

The active change "add-retry-policy" was archived (openspec/changes/archive/2026-09-30-add-retry-policy).
Next: truss new "Change name"
```

Si OpenSpec ha perdido el cambio activo sin archivarlo (por ejemplo, se borró su carpeta), `status` falla con código de salida `1` y nombra la carpeta que falta.

## `truss continue`

Úsalo para obtener la siguiente instrucción para tu agente. Calcula el paso a partir del estado del cambio y lo imprime, junto con los archivos que el agente debe leer. Nunca inicia un agente: le das su salida a uno.

| El cambio está | La siguiente acción |
|---|---|
| sin crear | crear uno con `truss new` |
| todavía en planificación | escribir o refinar el siguiente artefacto que esté listo, usando Grill cuando quede ambigüedad |
| planificado, con tareas abiertas | seguir el workflow [`execute-change`](execute-change.md), empezando por la primera tarea sin marcar |
| con todas las tareas marcadas | ejecutar `truss verify`, después el code review y la verificación y el archivado de OpenSpec |

Para un cambio que sigue en planificación:

```text
△ TRUSS · continue

Change          add-retry-policy
Phase           spec
OpenSpec        openspec/changes/add-retry-policy
Mode            agent-driven (TRUSS v0.2)

Next action
Create/refine the OpenSpec artifact "proposal" for add-retry-policy. Run openspec instructions proposal --change add-retry-policy for its format and path. Use Grill first if material ambiguity remains.
```

Para un cambio con todas las tareas marcadas:

```text
△ TRUSS · continue

Change          add-retry-policy
Phase           complete
OpenSpec        openspec/changes/add-retry-policy
Tasks           2/2 complete
Mode            agent-driven (TRUSS v0.2)

Next action
Implementation tasks for add-retry-policy are complete. Run truss verify, then perform code review, then openspec validate add-retry-policy and, once it passes, openspec archive add-retry-policy.
```

Mientras hay tareas abiertas, la salida incluye además una sección **Context to load** con las rutas reales del workflow, las policies y el cambio, como muestra la guía de inicio. Un prompt que funciona con cualquier agente es: «Implementa el cambio activo de TRUSS. Ejecuta `truss continue` y sigue las instrucciones y los archivos que lista.»

## Cuál usar y cuándo

- **Empezar algo nuevo:** `new`.
- **Retomar tras una pausa, o antes de un handoff:** `status`, y `truss handoff` si el trabajo cambia de manos (consulta el [handoff](../reference/handoff.md)).
- **Dar trabajo a un agente:** `continue`, cada vez. Su salida cambia a medida que el cambio avanza.
- **Crees que has terminado:** `status` para ver que todas las tareas están marcadas, y después `verify`.

## Cómo funciona

TRUSS guarda solo el puntero al cambio activo, en `.truss/state.json`. Todo lo demás viene de OpenSpec cada vez: `new` ejecuta `openspec new change`, `status` ejecuta `openspec status` y lee el progreso de las tareas de `openspec instructions apply` (las casillas de `tasks.md`), y TRUSS nunca inventa su propia estructura de artefactos de OpenSpec.

`openspec status` por sí solo no distingue `implementation` de `complete`: su `isComplete` significa que *existen todos los artefactos*, no que *todas las tareas están hechas*. Por eso TRUSS informa `complete` solo cuando el progreso de tareas lo indica. Así el límite queda explícito: OpenSpec es dueño del estado del cambio y de sus artefactos, TRUSS es dueño de la policy del workflow de ingeniería, y el coding agent hace la implementación no determinística. Quién hace qué está detallado en [Quién hace qué](../concepts/who-does-what.md).
