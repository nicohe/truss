> Traducción al español. La referencia canónica es [la versión en inglés](../../en/guides/first-change.md).

# Tu primer cambio, de punta a punta

[Primeros pasos](../getting-started.md) muestra los comandos. Esta guía muestra la otra mitad: qué pedirle a tu agente en cada paso y qué hace OpenSpec con ello. Los prompts son ejemplos, en inglés porque las skills y las palabras clave de los artefactos lo están; escribe los tuyos con tus palabras y en tu idioma.

Vienen de una ejecución real de TRUSS en un proyecto TypeScript, donde un primer cambio fue desde una ronda de discovery hasta una spec archivada. El comportamiento de OpenSpec que se describe aquí (qué imprime `instructions`, `validate`, `MODIFIED`, el ajuste de idioma) se ejecutó en un proyecto desechable con OpenSpec 1.13.2.

## El camino

| Paso | Tú | Tu agente | Termina cuando |
|---|---|---|---|
| 1. Empezar | `truss new "Nombre"` | | el cambio existe |
| 2. Descubrir | respondes las preguntas | una ronda de Grill | podrías entregar el resultado a quien tenga que escribir la spec |
| 3. Escribir los artefactos | lees cada uno | proposal, specs, design, tasks, uno a uno | `truss continue` dice que implementes |
| 4. Implementar | | una slice a la vez | todas las tareas están marcadas |
| 5. Verificar | `truss verify` (la primera vez, tú) | | pasa |
| 6. Revisar | | una sesión nueva | no queda ningún hallazgo bloqueante |
| 7. Cerrar | | validar, archivar | el cambio está en `openspec/changes/archive/` |

## 1. Empezar el cambio

```bash
node .truss/bin/truss.mjs new "Add retry policy"
node .truss/bin/truss.mjs continue
```

`continue` imprime el siguiente paso y los archivos que hay que cargar. Entrégaselo a tu agente en cada prompt de abajo, o ejecútalo tú y pega lo que dice.

## 2. Descubrir qué hacer

Sáltate esto cuando el cambio sea pequeño y sus criterios de aceptación estén claros. Cuando no lo estén, haz una ronda de Grill (consulta [Discovery](../workflows/discovery.md)). Si tienes un documento del que partir, nómbralo:

> Active TRUSS change: `add-retry-policy`. Use the `grill-with-docs` skill (`.truss/.truss/skills/grill-with-docs.SKILL.md`) on `docs/retry-requirements.md`. Scope: the retry behavior of the HTTP client only. First tell me what the document already decides, what it only proposes and what it contradicts. Then ask me questions only about what is still open, in small batches. Do not write any artifact yet.

Dos detalles de ese prompt importan. Pide la **clasificación primero**, para que veas qué tomó el agente como decisión y qué como propuesta, y termina con **«do not write any artifact yet»**, para que el agente no salte de una pregunta a una spec.

Cuando termina la ronda, puedes pedir una hoja de ruta, que un Grill no produce por sí solo:

> Now break the work into candidate changes: for each, a one-line goal, what it depends on and whether it can go first. Order them. Do not create them yet.

El resultado de la ronda es **efímero**: vive en esa sesión. Lo que perdura es lo que el siguiente paso escribe en los artefactos.

## 3. Escribir los artefactos, uno a uno

Un prompt que funciona para cada artefacto:

> Write only the `proposal` artifact for `add-retry-policy`. First run `openspec instructions proposal --change add-retry-policy` and follow it. Re-read the earlier artifacts from disk. Add no behavior that we did not decide in the discovery; if something is missing, ask me. Do not mention TRUSS in the artifact.

«Do not mention TRUSS» está ahí porque `openspec/` se commitea y lo leen compañeros que quizá no lo usen. Repite con `specs`, `design` y `tasks`, leyendo cada resultado antes del siguiente. Añade «then run `openspec validate add-retry-policy`» a partir del artefacto `specs`: antes de él el cambio no tiene deltas de spec, y `validate` informa `Change must have at least one delta`. Este ritmo de uno en uno te permite detectar una desviación cuando todavía es un párrafo. La regla detrás de «add no behavior we did not decide» es que cada requisito de las specs se traza hasta una decisión de la proposal; un requisito que no lo hace es comportamiento nuevo, y el agente debe preguntar antes de añadirlo.

### Qué imprime `openspec instructions`

```bash
openspec instructions proposal --change add-retry-policy
```

Imprime el propósito del artefacto, su formato y la ruta exacta donde escribirlo, además del contexto del proyecto de `openspec/config.yaml`. Es de **solo lectura**: no escribe nada (comprobado listando los archivos antes y después). TRUSS no lo ejecuta; lo hace el agente, y `truss continue` lo nombra en su instrucción. Lo mismo vale para `specs`, `design` y `tasks`.

### Escribir los artefactos en otro idioma

`openspec init --language Spanish` registra en `openspec/config.yaml` que los artefactos se escriben en ese idioma y que los encabezados estructurales de OpenSpec y las palabras clave `SHALL` y `MUST` se quedan en inglés. El contexto del proyecto se lo repite al agente cada vez que ejecuta `instructions`. Importa por cómo OpenSpec comprueba una spec:

- Un requisito sin `SHALL` ni `MUST` recibe un aviso: `ADDED "…" should contain SHALL or MUST`.
- `WHEN` y `THEN` de un escenario **no** se comprobaron: un escenario escrito con palabras en español pasó. Mantenlos en inglés de todos modos, para coincidir con la plantilla.

### `validate` y `validate --strict`

```bash
openspec validate add-retry-policy
openspec validate add-retry-policy --strict
```

Con el requisito sin `SHALL`, el primero dijo `Change 'add-retry-policy' is valid` y terminó con `0`; el segundo terminó con `1`. `--strict` convierte los avisos en errores. Usa `--strict` antes de archivar. Si quieres la comprobación de OpenSpec en la evidencia de `truss verify`, añádela a la lista de comandos; consulta [un proyecto TypeScript con pnpm y Vitest](../configuration/examples.md#un-proyecto-typescript-con-pnpm-y-vitest).

### Cambiar una spec que ya existe

Cuando un cambio altera un requisito que ya está en `openspec/specs/`, el delta del cambio usa `## MODIFIED Requirements`, y el bloque debe contener el requisito **completo**, con todos sus escenarios, no solo la parte que cambia. OpenSpec lo comprueba: un delta que omitía un escenario de la spec actual falló en `validate` con `MODIFIED "…" omits scenario(s) the current spec still has`, y `archive` se negó con `Aborted. No files were changed.` Copia el requisito completo en el delta y después edítalo.

## 4. Implementar

> Implement the active TRUSS change. Run `truss continue` and follow it. Take one slice at a time: a failing test first, then the minimum code, then refactor. Check off each task in `tasks.md` as you finish it (`- [x]`). Stop after every two or three task groups and tell me where you are. Do not commit, and do not pass `--trust` to `truss verify`.

La pausa es lo que mantiene revisable una implementación larga. «Do not commit» es para cuando quieres revisar primero el diff; quítalo si prefieres que el agente haga commits.

## 5. Verificar

La primera vez, ejecuta tú `node .truss/bin/truss.mjs verify` y aprueba la lista (consulta [aprueba tú mismo los comandos de verificación](agents.md#aprueba-tú-mismo-los-comandos-de-verificación-una-vez)). Después puede ejecutarlo el agente.

## 6. Revisar

Abre una sesión nueva y señala el archivo de la skill, no el comando integrado de tu agente (consulta [las skills](../skills/overview.md#code-review-y-el-code-review-de-claude-code)):

> Review the active change with `.truss/.truss/skills/code-review.SKILL.md`. Read the spec first. If there are no commits, do not rely on `git diff`: read the files. Give me a table of each spec scenario and the test that covers it, check that proposal, specs, design and tasks agree, and list findings by severity. Do not modify any file.

Después lleva el informe al implementador, como describe [usar TRUSS con un coding agent](agents.md#revisar-en-otra-sesión-y-volver-al-implementador).

## 7. Cerrar

> Run `truss verify`. Review what changed since the last review. Then run `openspec validate add-retry-policy --strict`, and, if it passes, `openspec archive add-retry-policy`. Tell me what is left open before you do.

`openspec archive` mueve el cambio a `openspec/changes/archive/` y fusiona sus deltas en `openspec/specs/`. Haz commit de `openspec/` y del código, en commits separados si puedes, para que el historial muestre aparte la implementación y la actualización de la spec. TRUSS nota el archivado la próxima vez que ejecutas `status` o `continue`.

## Véase también

- [Primeros pasos](../getting-started.md)
- [Discovery (Grill)](../workflows/discovery.md)
- [Comandos del ciclo de vida](../workflows/lifecycle-commands.md)
- [Usar TRUSS con un coding agent](agents.md)
