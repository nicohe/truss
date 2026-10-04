# Comandos del ciclo de vida

> Traducción al español. La referencia canónica es [la versión en inglés](../../en/workflows/lifecycle-commands.md).

Tres comandos siguen un cambio desde una idea hasta una implementación terminada: `new` lo empieza, `status` muestra en qué punto está y `continue` le dice a tu agente qué hacer a continuación. Un cuarto, `use`, vuelve a marcar como activo un cambio que ya está abierto. TRUSS v0.2 es **dirigido por el agente**: ninguno ejecuta un modelo. Leen y escriben el estado del cambio, y tu agente hace el trabajo.

La [guía de inicio](../getting-started.md#5-lleva-un-cambio-por-el-workflow) los recorre una vez. Esta página es la referencia de lo que imprime cada uno y de cuándo usarlo.

## Las fases

Un cambio está siempre en una fase, y `status` y `continue` la muestran:

| Fase | Qué significa | Qué la hace avanzar |
|---|---|---|
| `spec` | faltan artefactos de planificación (por defecto proposal, specs, design y tasks) | el agente los escribe, uno a uno |
| `implementation` | existen todos los artefactos y al menos una tarea está abierta | el agente implementa las tareas y marca cada una en `tasks.md` |
| `complete` | hay tareas y todas están marcadas | la verificación, el code review y el archivado |

La fase se recalcula desde OpenSpec cada vez que preguntas, así que no puede quedar obsoleta. `complete` significa *todas las tareas están marcadas*, nada más: no dice nada sobre si las tareas se hicieron bien. Para eso están [`truss verify`](../reference/verify.md) y la revisión.

Archivar un cambio con `openspec archive` no se lo comunica a TRUSS, que se entera la próxima vez que preguntas: `status` y `continue` dicen que el cambio activo fue archivado (y listan los cambios que siguen abiertos), y terminan con código `0`; `handoff` no escribe ninguna nota para él y también lista los abiertos, y el gate [`tasks_complete`](../reference/verify.md) lo informa como archivado en lugar de fallar al leer sus tareas. Empieza el siguiente con `truss new`, o vuelve a uno que siga abierto con [`truss use`](#truss-use).

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
○ "add-retry-policy" is still open in OpenSpec (openspec/changes/add-retry-policy) and is no longer the active change: TRUSS follows one change at a time. Go back to it with: truss use add-retry-policy
```

No se pierde nada: el primer cambio queda en OpenSpec exactamente como estaba, y `openspec list` lo sigue mostrando. [`truss use`](#truss-use) vuelve a convertirlo en el cambio activo. No hay aviso cuando el cambio anterior se archivó o ya no está en OpenSpec, porque no queda nada atrás.

Cuando no hay ningún cambio activo (por ejemplo en un clon nuevo, porque `.truss/state.json` es local de cada checkout) y hay alguno abierto en OpenSpec, `new` crea igualmente el nuevo y dice cuáles deja atrás:

```text
○ Also open in OpenSpec: add-retry-policy. None was the active change, and "second-change" is now: TRUSS follows one change at a time. Go back to one with: truss use add-retry-policy
```

Con varios abiertos el comando es `truss use <change>`, y un cambio de un componente se nombra con él (`add-retry-policy (component api)`). Esta línea y la anterior nunca salen juntas: `new` dice la primera cuando reemplaza un cambio activo que sigue abierto, y esta cuando no había ninguno que reemplazar. Un primer cambio en un proyecto sin nada abierto no imprime ninguna.

Necesita un proyecto inicializado. Sin `.truss/config.yaml` se detiene con `× invalid config` y `TRUSS config not found: .truss/config.yaml. Run truss init to create it.`, y código de salida `2`: ejecuta antes [`truss init`](../reference/init.md).

## `truss use`

`truss use <cambio> [--component name]`: úsalo para volver a un cambio que ya está abierto en OpenSpec, normalmente uno que `new` dejó atrás. Lo convierte en el cambio activo e imprime en qué punto está:

```text
△ TRUSS · use

● Active change set
Change          add-retry-policy
Component       workspace
Phase           implementation
OpenSpec        openspec/changes/add-retry-policy
Planning        4/4 artifacts complete
Tasks           1/3 complete

Next: truss continue
```

`use` no crea ni cambia nada en OpenSpec. Solo mueve el registro de cuál es el cambio activo, así que puedes ejecutarlo tantas veces como quieras, también sobre el cambio que ya está activo. El cambio tiene que estar abierto: uno que no existe, o que se archivó, es un error (código de salida `1`), y el mensaje lista los cambios que están abiertos, por ejemplo `There is no open change "nope" in openspec/changes. Open there: add-retry-policy, second-change.`

Un cambio que vive en el `openspec/` propio de un componente se encuentra a través de ese componente: `truss use add-retry-policy --component api`. Sin `--component`, `use` busca en el OpenSpec del espacio de trabajo, y si el nombre existe en un componente, el error lo dice y da el comando. Ningún nombre, o un nombre que no es un id de cambio (`../x`, `archive`), es un error de uso (código de salida `2`).

`.truss/state.json` es local a cada copia de trabajo, así que un clon nuevo o una máquina de CI no tiene cambio activo aunque OpenSpec tenga cambios en curso. `use` es la forma de retomar uno, y [`truss status`](#truss-status) lista los que están abiertos.

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
Needed to implement   tasks

Next: truss continue
```

Los marcadores junto a cada artefacto son `●` hecho, `◐` listo para escribirse y `○` bloqueado hasta que exista otro artefacto. `Needed to implement` nombra el artefacto que OpenSpec necesita antes de poder trabajar en una tarea (las releases anteriores a la 0.2.19 llamaban a esta línea `Tasks required`). Mientras la planificación está sin terminar, la línea `Tasks` no aparece, porque aún no hay tareas.

Sin cambio activo lo dice y señala el siguiente paso:

```text
△ TRUSS · status

No active change.
Next: truss new "Change name"
```

Cuando hay cambios abiertos en OpenSpec, `status` los lista y señala primero [`truss use`](#truss-use). Es lo que muestra un clon nuevo o una copia en CI, porque el registro del cambio activo es local a cada copia de trabajo:

```text
△ TRUSS · status

No active change.
Open changes    add-retry-policy, second-change
Next: truss use <change>, or truss new "Change name" for a new one
```

Con un único cambio abierto el comando lo nombra (`truss use add-retry-policy`). Un cambio que vive en el `openspec/` propio de un componente aparece como `add-retry-policy (component api)`, y entonces el comando dice `truss use add-retry-policy --component api`. La lista sale de leer las carpetas `openspec/changes`, así que no necesita el CLI de OpenSpec, y un componente que no se resuelve se omite en lugar de fallar.

Cuando el cambio se archivó, lo dice en su lugar, seguido de las mismas dos líneas si otros cambios siguen abiertos:

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
| sin crear | volver con `truss use` a uno que esté abierto en OpenSpec, o crear uno con `truss new` |
| todavía en planificación | escribir o refinar el siguiente artefacto que esté listo, usando Grill cuando quede ambigüedad |
| planificado, con tareas abiertas | seguir el workflow [`execute-change`](execute-change.md), empezando por la primera tarea sin marcar |
| con todas las tareas marcadas | ejecutar `truss verify`, después el code review y la verificación y el archivado de OpenSpec |

Sin cambio activo y con cambios abiertos en OpenSpec, `continue` los lista antes de ofrecer `truss new`, para que un agente en una copia nueva vuelva al cambio en curso en lugar de empezar un duplicado:

```text
△ TRUSS · continue

No active change. Open in OpenSpec: add-retry-policy, second-change.
Make one of them the active change with: truss use <change>, or create a new one with: truss new "Change name"
```

Con un único cambio abierto el comando lo nombra, como en `status`. Tras un archivado empieza con `The change "x" was archived.` y ofrece `create the next one`.

Cuando `spec.mode` es `source`, o `spec.zone_guard` está activo, la acción siguiente de un cambio que se está implementando dice además qué le pide eso al agente: la spec es de solo lectura mientras implementa, y el trabajo de spec y el de código se mantienen en pasos separados. Consulta los [modos de especificación](spec-modes.md). Lo mismo ocurre con un bucle de desarrollo desactivado: con `development.bdd: false` o `development.tdd: false` dice `BDD is off` o `TDD is off` y que el bucle no es obligatorio, porque el workflow solo dice «si BDD está activado» y no dice dónde se configura. Con ambos activos, lo predeterminado, no añade nada.

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

La instrucción para los artefactos posteriores a la proposal añade una frase de trazabilidad: *Keep every requirement traceable to a decision in the proposal, and ask before adding behavior it does not cover.* Durante la implementación, la primera tarea incompleta se muestra por su título, cortado en unos 80 caracteres con `…` y seguido de `; the full text is in tasks.md` cuando se cortó, para que una línea de tarea larga no inunde la salida.

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

Mientras hay tareas abiertas, la salida incluye además una sección **Context to load** con las rutas reales del workflow, las policies, el cambio y el `.truss/config.yaml` del proyecto, como muestra la guía de inicio. Lista el `AGENTS.md` del proyecto (el del componente, o si no el del espacio de trabajo) solo cuando existe: `init` no lo crea. Con Graphify activado, la salida termina con una sección **Code graph**: una frase que le dice al agente que use el grafo cuando está al día y qué ejecutar cuando está obsoleto, falta o está dañado (consulta el [ciclo de vida de Graphify](../integrations/graphify-lifecycle.md)). No dice nada cuando Graphify está apagado, u opcional y no instalado. Un prompt que funciona con cualquier agente es: «Implementa el cambio activo de TRUSS. Ejecuta `truss continue` y sigue las instrucciones y los archivos que lista.»

## Reabrir un cambio terminado

Un cambio está `complete` cuando todas sus tareas están marcadas. Si una revisión o una mirada posterior descubre más trabajo antes de archivar, no edites el código dejando `tasks.md` como está: `status`, el gate `tasks_complete` y el siguiente lector dirían que el trabajo estaba terminado. Añade en su lugar un **grupo de tareas nuevo** a `tasks.md`:

```markdown
## 2. Review follow-ups
- [ ] 2.1 Handle the timeout case
```

La fase vuelve a `implementation` (`Tasks 2/3 complete`), y `continue` nombra la tarea nueva como la primera incompleta. Esto se ejecutó sobre un cambio que había llegado a `complete`. Marca las tareas según las termines, ejecuta `truss verify` otra vez, y el cambio vuelve a `complete`. Si el trabajo nuevo cambia el comportamiento, actualiza también la spec y el diseño. Una vez archivado, un cambio no se puede reabrir así: empieza uno nuevo con `truss new`.

Antes de `openspec archive`, comprueba que las tareas, la spec, el diseño y la proposal siguen coincidiendo, y que lo que decidiste dejar para más tarde está anotado en algún sitio duradero.

## Cuál usar y cuándo

- **Empezar algo nuevo:** `new`.
- **Volver a un cambio que `new` dejó atrás:** `use`.
- **Un clon nuevo o una copia en CI, donde nada está activo:** `status` lista lo que está abierto en OpenSpec, y `use` lo retoma.
- **Retomar tras una pausa, o antes de un handoff:** `status`, y `truss handoff` si el trabajo cambia de manos (consulta el [handoff](../reference/handoff.md)).
- **Dar trabajo a un agente:** `continue`, cada vez. Su salida cambia a medida que el cambio avanza.
- **Crees que has terminado:** `status` para ver que todas las tareas están marcadas, y después `verify`.

## Cómo funciona

TRUSS guarda solo el puntero al cambio activo, en `.truss/state.json`. Todo lo demás viene de OpenSpec cada vez: `new` ejecuta `openspec new change`, `status` ejecuta `openspec status` y lee el progreso de las tareas de `openspec instructions apply` (las casillas de `tasks.md`), y TRUSS nunca inventa su propia estructura de artefactos de OpenSpec.

`openspec status` por sí solo no distingue `implementation` de `complete`: su `isComplete` significa que *existen todos los artefactos*, no que *todas las tareas están hechas*. Por eso TRUSS informa `complete` solo cuando el progreso de tareas lo indica. Así el límite queda explícito: OpenSpec es dueño del estado del cambio y de sus artefactos, TRUSS es dueño de la policy del workflow de ingeniería, y el coding agent hace la implementación no determinística. Quién hace qué está detallado en [Quién hace qué](../concepts/who-does-what.md).
