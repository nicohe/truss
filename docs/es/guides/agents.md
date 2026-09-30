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

## Dónde lee cada agente su guía

| Agente | Qué lee |
|---|---|
| Codex | `AGENTS.md`, desde la raíz del proyecto hasta el directorio en el que trabaja |
| Claude Code | `CLAUDE.md`. Las versiones recientes leen `AGENTS.md` solo cuando no hay `CLAUDE.md`; si tienes uno, añádele la línea `@AGENTS.md` para importar el archivo. Consulta la [documentación de memoria de Claude Code](https://code.claude.com/docs/en/memory). |
| Cualquier otro | su documentación indica qué archivo lee; el fragmento sirve en cualquiera de ellos |

## Aprueba tú mismo los comandos de verificación, una vez

`truss verify` pide aprobación para una lista de comandos que no ha visto. Hazlo en tu propia terminal la primera vez:

```bash
node .truss/bin/truss.mjs verify
```

Lee la lista y responde `y`. La aprobación se guarda por proyecto en tu cuenta de usuario, así que un agente que se ejecute como tú puede ejecutar `verify` después sin `--trust`. Si no está aprobada, el agente se detiene con `Not trusted; nothing was executed.` y te pregunta.

No dejes que un agente pase `--trust` para una lista que no te mostró: el prompt existe para que una persona lea los comandos. Un agente que se ejecuta en un sandbox o contenedor con otro directorio home tiene su propio almacén de aprobaciones; ejecuta `verify` una vez allí, o apunta `TRUSS_HOME` a un directorio compartido (consulta las [variables de entorno](../reference/environment.md#truss_home)).

## Comprueba lo que hizo el agente

- `truss status` muestra la fase y el progreso de las tareas (`Tasks 1/3 complete`).
- `.truss/verification/latest.json` es la [evidencia](../reference/verify.md#evidencia) del último `verify`.
- Define `verification.tasks_complete: warn` y `verification.tests_required: warn` para que `verify` informe de tareas abiertas y de cambios de código sin tests. Consulta [`truss verify`](../reference/verify.md).
