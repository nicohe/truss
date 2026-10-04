# Usar TRUSS con un coding agent

> Traducción al español. La referencia canónica es [la versión en inglés](../../en/guides/agents.md).

TRUSS nunca ejecuta un agente. Le dice al que uses qué hacer a continuación y comprueba el resultado. Cualquier agente que pueda leer un archivo de guía y ejecutar comandos de shell puede seguirlo.

## El bucle

```text
truss continue   →   implementa la siguiente tarea   →   truss verify
                                                           ↑        │
                                                           └── corregir ─┘
```

1. **Guía.** Pon el [fragmento de primeros pasos](../getting-started.md#4-da-algo-de-guía-a-tu-agente) en el archivo de guía que lee tu agente.
2. **Prompt.** Pide el trabajo en términos del cambio: *Implement the active TRUSS change. Run `truss continue` and follow the instructions and the files it lists.* `continue` nombra el siguiente paso y los archivos que hay que cargar, con las rutas reales.
3. **Verificación.** Cuando el agente termina, ejecuta `truss verify`. El cambio está hecho cuando eso pasa.
4. **Handoff.** Solo si el trabajo pasa a otro agente, runtime o sesión: [`truss handoff`](../reference/handoff.md).

Cada fase puede ser un agente o un modelo distinto; consulta [quién hace qué](../concepts/who-does-what.md#un-modelo-o-varios).

## Dónde lee cada agente su guía

| Agente | Qué lee |
|---|---|
| Codex | `AGENTS.md`, desde la raíz del proyecto hasta el directorio en el que trabaja |
| Claude Code | `CLAUDE.md`. Las versiones recientes leen `AGENTS.md` solo cuando no hay `CLAUDE.md`; si tienes uno, añádele la línea `@AGENTS.md` para importar el archivo. Consulta la [documentación de memoria de Claude Code](https://code.claude.com/docs/en/memory). |
| Cualquier otro | su documentación indica qué archivo lee; el fragmento sirve en cualquiera de ellos |

Para mantener la guía solo para ti en un repositorio que comparte tu equipo, usa un archivo personal (`CLAUDE.local.md`, `AGENTS.local.md`, `AGENTS.override.md`). Cada agente lo trata de forma distinta; consulta [usar TRUSS en un repositorio compartido](shared-repo.md#guía-para-tu-agente-que-se-queda-contigo).

## Aprueba tú mismo los comandos de verificación, una vez

`truss verify` pide aprobación para una lista de comandos que no ha visto. Hazlo en tu propia terminal la primera vez:

```bash
node .truss/bin/truss.mjs verify
```

Lee la lista y responde `y`. La aprobación se guarda por proyecto en tu cuenta de usuario, así que un agente que se ejecute como tú puede ejecutar `verify` después sin `--trust`. Si no está aprobada, el agente se detiene con `Not trusted; nothing was executed.` y te pregunta.

No dejes que un agente pase `--trust` para una lista que no te mostró: el prompt existe para que una persona lea los comandos. Un agente que se ejecuta en un sandbox o contenedor con otro directorio home tiene su propio almacén de aprobaciones; ejecuta `verify` una vez allí, o apunta `TRUSS_HOME` a un directorio compartido (consulta las [variables de entorno](../reference/environment.md#truss_home)).

## Revisar en otra sesión y volver al implementador

Conviene que la revisión la haga un agente que no escribió el código, en una sesión nueva, para que juzgue la spec y el diff y no el razonamiento del implementador ([quién hace qué](../concepts/who-does-what.md#un-modelo-o-varios)). Dos sesiones no se ven entre sí, así que importa cómo viajan los hallazgos:

1. **Revisor.** Abre una sesión nueva y señálale la skill por su ruta, con el cambio y la evidencia: *Review the active change with `.truss/.truss/skills/code-review.SKILL.md`. Read the spec first, then the diff and `.truss/verification/latest.json`.* Un subagente también sirve si tu runtime lo tiene; TRUSS no da por hecho que lo tenga. El comando `/code-review` de Claude Code es otra herramienta; consulta [las skills](../skills/overview.md#code-review-y-el-code-review-de-claude-code).
2. **El informe es efímero.** Vive en la sesión del revisor. Pégalo, o guárdalo en un archivo, y entrégalo completo al implementador. No des una copia comprimida en lugar del original; consulta [`caveman`](../skills/overview.md#caveman).
3. **Lo que debe sobrevivir va a archivos duraderos.** Un hallazgo que cambia el comportamiento va a la spec o al diseño; el trabajo por hacer va a `tasks.md` como un grupo de tareas nuevo (consulta [reabrir un cambio terminado](../workflows/lifecycle-commands.md#reabrir-un-cambio-terminado)); un hallazgo que decides no corregir ahora se anota, por ejemplo como pregunta abierta en el diseño, para que no se pierda cuando termine la sesión.
4. **Implementador.** De vuelta en la sesión que implementa: *Apply the review findings. Register each fix as a task in `tasks.md`, update the spec if behavior changes, then run `truss verify`.* Si el trabajo pasó a una sesión nueva, [`truss handoff`](../reference/handoff.md) lleva el estado.

## El modo de permisos del agente

Los agentes preguntan antes de editar archivos o ejecutar comandos, y lo que preguntan depende de su modo de permisos. Para un bucle de TRUSS, una configuración sensata es dejar que el agente edite archivos sin preguntar y preaprobar solo los comandos que has revisado, como `node .truss/bin/truss.mjs continue` y `status`, y mantener a una persona en el bucle para el resto. No uses un modo que se salta todas las comprobaciones fuera de un contenedor o una VM aislados. En Claude Code los modos se describen en [permission modes](https://code.claude.com/docs/en/permission-modes). Sea cual sea el modo, el agente nunca debe pasar `--trust` a `truss verify`; consulta [aprueba tú mismo los comandos de verificación](#aprueba-tú-mismo-los-comandos-de-verificación-una-vez).

## Comprueba lo que hizo el agente

- `truss status` muestra la fase y el progreso de las tareas (`Tasks 1/3 complete`).
- `.truss/verification/latest.json` es la [evidencia](../reference/verify.md#evidencia) del último `verify`.
- Define `verification.tasks_complete: warn` y `verification.tests_required: warn` para que `verify` informe de tareas abiertas y de cambios de código sin tests. Consulta [`truss verify`](../reference/verify.md).
