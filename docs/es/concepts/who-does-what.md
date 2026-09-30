# Quién hace qué

> Traducción al español. La referencia canónica es [la versión en inglés](../../en/concepts/who-does-what.md).

En un cambio participan cuatro partes: tú, tu coding agent, TRUSS y OpenSpec. La mayoría de las dudas de una primera vez se reducen a quién hace cada parte, y esta página lo aclara.

## Respuestas cortas

| Pregunta | Respuesta |
|---|---|
| ¿TRUSS ejecuta mi agente? | No. Le dice al agente qué hacer a continuación y comprueba el resultado. |
| ¿Un solo modelo, o uno distinto por fase? | Tú eliges. TRUSS no asigna modelos, y cualquier agente puede retomar el siguiente paso. |
| ¿Usa subagentes o worktrees? | No de forma automática, y no hay ningún ajuste para ello. Depende de ti y de las herramientas de tu agente. |
| ¿Comprueba que el revisor sea independiente? | No. Pide un contexto limpio pero no lo exige. |

## Las partes

| Quién | Hace | No hace |
|---|---|---|
| **Tú** | decides qué construir, respondes a las preguntas del agente, apruebas los comandos de verificación, eliges el agente o los agentes, mergeas | |
| **Tu coding agent** (cualquier herramienta, cualquier modelo) | escribe los artefactos de OpenSpec, implementa, ejecuta `truss verify`, revisa | lo ejecuta TRUSS: lo arrancas tú |
| **TRUSS** | dice cuál es el siguiente paso (`truss continue`), ejecuta tus comandos de verificación y las comprobaciones opcionales, guarda el estado local, la evidencia y las notas de handoff | ejecutar un agente, elegir un modelo, o escribir código o specs |
| **OpenSpec** | guarda el cambio (proposal, specs, design, tasks) y su progreso | |

## Un cambio, paso a paso

| Paso | Quién actúa |
|---|---|
| `truss new "Add retry policy"` crea el cambio | lo ejecutas tú o el agente; OpenSpec crea los archivos |
| Descubrimiento: preguntas sobre lo que no está claro | el agente pregunta (la skill `grill-me`, o `grill-with-docs` cuando ya tienes documentos), tú respondes |
| Escribir el proposal, las specs, el design y las tasks | el agente |
| Implementar, tarea por tarea | el agente, siguiendo `truss continue` |
| `truss verify` | lo ejecuta el agente; tú aprobaste la lista de comandos una vez |
| Code review | un agente, idealmente en una sesión limpia |
| Verificar y archivar en OpenSpec | tú o el agente |

## Qué escribe el agente

El cambio es un directorio de archivos de texto, y por eso cualquier agente puede continuar donde otro se quedó:

```text
openspec/changes/add-retry-policy/
├── proposal.md
├── specs/retry/spec.md
├── design.md
└── tasks.md
```

Las casillas de `tasks.md` son el progreso que leen `truss status` y `truss continue`. Los formatos de los archivos pertenecen a OpenSpec; consulta su [documentación](https://github.com/Fission-AI/OpenSpec).

## ¿Un modelo o varios?

A TRUSS no le importa qué modelo hace el trabajo. El estado vive en archivos, así que cada fase puede ser un agente distinto, o un modelo distinto del mismo, cada uno en su propia sesión:

| Fase | Sesión | Qué le pides |
|---|---|---|
| Análisis | agente A | *Use the `grill-me` skill on this idea, then write the OpenSpec artifacts. Run `truss continue`.* |
| Implementación | agente B | *Implement the active TRUSS change. Run `truss continue` and follow the instructions and the files it lists.* |
| Review | agente C, en una sesión limpia | *Review the active TRUSS change with the `code-review` skill: read the spec first, then the diff and `.truss/verification/latest.json`.* |

- **El análisis parte de una idea o de documentos.** Usa `grill-me` para una idea, y `grill-with-docs` cuando hay una propuesta, un ticket o un ADR de partida: *Use the `grill-with-docs` skill on `docs/retry-proposal.md`, then write the OpenSpec artifacts.*
- **`truss continue` le dice a cada sesión en qué punto está el cambio.** Cuando todas las tareas están marcadas, indica ejecutar `truss verify`, luego el code review y archivar.
- **Las skills viven en la instalación de TRUSS.** `truss skills` las lista; con la disposición del inicio rápido están en `.truss/.truss/skills/`.
- **Usa un [handoff](../reference/handoff.md) solo si algo no está en los archivos**, como un descubrimiento que aún no está en la spec.
- **TRUSS no comprueba que el revisor sea otro modelo.** La skill `code-review` prefiere un contexto limpio, y el [modelo de enforcement](../reference/enforcement.md) recoge la independencia del revisor como algo que se le pide al agente.

## Subagentes y worktrees

TRUSS no crea worktrees, no arranca subagentes ni ejecuta agentes en paralelo, y ninguna opción de configuración activa nada de eso. `truss doctor` muestra una línea `Git worktrees`, pero solo para decir que Git los admite.

- **Los subagentes** son una función de la herramienta de tu agente. Si los usa, TRUSS solo ve los comandos que ejecutan.
- **Un worktree necesita su propia configuración.** Tiene tus archivos confirmados, `openspec/` incluido, pero no `.truss/`, que Git ignora. Crea allí `.truss/config.yaml`; la instalación de TRUSS puede ser la de tu checkout principal (`node ../proyecto/.truss/bin/truss.mjs ...`). El worktree tiene su propio estado y su propia evidencia, y se vuelve a pedir la aprobación de los comandos de verificación, porque se guarda por directorio.
- **No ejecutes dos agentes en el mismo directorio sobre el mismo cambio.** El puntero al cambio activo y la evidencia del último `verify` son archivos únicos por directorio, así que gana quien escribe el último.

Los revisores aislados, el enrutado de subagentes y la gestión de worktrees están previstos para v0.3, mediante runtime adapters. Consulta el [contrato de la versión v0.2](../reference/release-v0.2.md#límite-de-v03).
