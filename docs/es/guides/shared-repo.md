> Traducción al español. La referencia canónica es [la versión en inglés](../../en/guides/shared-repo.md).

# Usar TRUSS en un repositorio compartido

Puedes usar TRUSS en un repositorio que comparte tu equipo sin que nadie más lo vea: sin cambios en el `.gitignore`, sin un archivo de guía para tu agente en el historial y sin comandos de TRUSS en los scripts del equipo. Esta guía dice qué es local, qué es compartido y cómo mantenerlo así.

Cada comando de abajo se ejecutó en un repositorio desechable. Cuando el comportamiento viene de la documentación de un agente, la guía la enlaza.

## Qué es local y qué es compartido

| Qué | Dónde | ¿Se comparte? |
|---|---|---|
| TRUSS y su configuración | `.truss/`, incluido `.truss/config.yaml` | No. Es local a tu copia de trabajo |
| El cambio activo, la evidencia del último `verify` y las notas de handoff | `.truss/state.json`, `.truss/verification/`, `.truss/handoffs/` | No |
| Specs, diseños, tareas y cambios archivados | `openspec/` | **Sí.** Se commitea: es como el equipo trabaja con OpenSpec |
| Tu aprobación de los comandos de verificación | `~/.config/truss/trusted.json` | No. Vive fuera del repositorio |
| Un índice de Graphify | `graphify-out/` | No |
| Guía para el agente que solo quieres tú | `CLAUDE.local.md`, `AGENTS.local.md`, `AGENTS.override.md` | No |

La división es la de [estado duradero frente a efímero](../concepts/durable-vs-ephemeral.md): lo que un compañero echaría en falta va a `openspec/` y al código, y el andamiaje se queda en tu máquina.

## Ignorar TRUSS sin tocar `.gitignore`

La guía de primeros pasos añade `.truss/` al `.gitignore` del repositorio, un cambio que ve todo el mundo. Para quedarte TRUSS para ti, pon la entrada en `.git/info/exclude`. Usa la misma sintaxis que `.gitignore`, pero pertenece a tu copia del repositorio y nunca se commitea:

```bash
printf '.truss/\n' >> .git/info/exclude
```

Comprueba que Git lo respeta:

```bash
git check-ignore -v .truss/
```

```text
.git/info/exclude:7:.truss/	.truss/
```

`truss doctor` usa `git check-ignore`, así que informa `● .truss ignore   .truss/ ignored` con la entrada en cualquiera de los dos archivos.

Dos cosas que conviene saber:

- `.git/info/exclude` es **por copia del repositorio**. Un clon nuevo, otra máquina o un worktree nuevo no lo tiene: repite la línea allí.
- `truss init` solo lee `.gitignore`. En un repositorio con `.git/info/exclude` y sin entrada en `.gitignore`, puede imprimir `○ no .gitignore detected` (cuando no hay `.gitignore`) o `○ .truss/ is not ignored` (cuando hay uno sin la entrada), aunque Git ya esté ignorando la carpeta. Fíate de `truss doctor` y de `git check-ignore`; la línea de `init` es solo una nota.

Añade los demás archivos locales al mismo sitio:

```bash
printf 'graphify-out/\nCLAUDE.local.md\nAGENTS.local.md\nAGENTS.override.md\n' >> .git/info/exclude
```

## Guía para tu agente que se queda contigo

El [fragmento de guía](../getting-started.md#4-da-algo-de-guía-a-tu-agente) le dice al agente que ejecute `node .truss/bin/truss.mjs`. No lo pongas en un `AGENTS.md` compartido: para un compañero que no tiene TRUSS, el agente intentaría ejecutar un comando que no existe. Ponlo en un archivo que solo cargas tú:

| Agente | Tu archivo personal | Qué hace |
|---|---|---|
| Claude Code | `CLAUDE.local.md` en la raíz del proyecto | Se carga junto con `CLAUDE.md` y está pensado para quedar fuera del control de versiones ([memoria de Claude Code](https://code.claude.com/docs/en/memory)) |
| Devin | `AGENTS.local.md` | Se carga **además de** `AGENTS.md` ([reglas de Devin](https://docs.devin.ai/cli/extensibility/rules)) |
| Codex | `AGENTS.override.md` | **Reemplaza** a `AGENTS.md` en ese directorio, no se suma ([AGENTS.md de Codex](https://learn.chatgpt.com/docs/agent-configuration/agents-md)) |

Cuidado con dos trampas:

- **Claude Code y el `AGENTS.md` compartido.** Claude Code lee `AGENTS.md` solo cuando no hay un `CLAUDE.md` ni un `CLAUDE.local.md` en el directorio de trabajo ni por encima. Si creas `CLAUDE.local.md` en un repositorio que solo tiene `AGENTS.md`, Claude deja de leer el archivo del equipo. Empieza tu `CLAUDE.local.md` con la línea `@AGENTS.md` para importarlo.
- **Codex.** Como `AGENTS.override.md` reemplaza al archivo compartido, copia en él lo que aún quieras de `AGENTS.md`.

Un `CLAUDE.local.md` para un proyecto que usa TRUSS puede ser así de corto:

```markdown
@AGENTS.md

## Working with TRUSS (local, not shared)

- Before implementing, run `node .truss/bin/truss.mjs continue` and follow the instructions and the files it lists.
- To write an OpenSpec artifact, run `openspec instructions <artifact> --change <id>`.
- When you finish, run `node .truss/bin/truss.mjs verify` and do not call the change done until it passes.
```

El agente también puede aprender el flujo desde tu prompt, sin archivo: *Implement the active TRUSS change. Run `node .truss/bin/truss.mjs continue` and follow the instructions and the files it lists.*

## Formateadores y linters que recorren todo el árbol

`.truss/` es un clon completo, con su propio código, pruebas y Markdown. Una herramienta que escanea la raíz del proyecto lo escanea también. En un proyecto desechable con Prettier 3, `prettier --check .` informó que **131 archivos** de `.truss/` no estaban formateados, y `prettier --write .` (o un script `format` que lo ejecute sobre `.`) los reescribiría. ESLint no se quejó en la misma prueba, porque solo revisa los archivos que su configuración incluye.

| Opción | Coste |
|---|---|
| Apuntar el comando a tu código: `prettier --check src` | Nada visible: no cambia ningún archivo compartido. También deja fuera los archivos que no estén en `src` y quizá quieras comprobar |
| Añadir `.truss/` a `.prettierignore` | Una línea visible en un archivo compartido |
| Añadir el patrón `.*/` a `.prettierignore` | No nombra a TRUSS, pero deja de revisar todas las carpetas que empiezan por punto, como `.github/` |

Para la lista de verificación, prefiere la primera: `pnpm exec prettier --check src` en `verification.commands`, y no ejecutes un script `format` que apunte a `.` en la raíz de un proyecto que contenga `.truss/`.

## Antes de limpiar el repositorio

`git clean -fdx` borra los archivos ignorados, incluidos los de `.git/info/exclude`: se irían `graphify-out/`, `CLAUDE.local.md`, `AGENTS.local.md` y `AGENTS.override.md`. Se salta `.truss/`, porque esa carpeta es un repositorio Git propio; Git solo la borra con una segunda `-f` (`git clean -ffdx`). Ejecuta antes `git clean -ndx` para ver la lista de lo que se borraría, y guarda una copia de `.truss/config.yaml` y de tus archivos de guía locales: no existen en ningún otro sitio.

## Graphify en un repositorio compartido

TRUSS solo construye el grafo (`truss graphify bootstrap`, `update`). Los comandos propios de Graphify que configuran un agente escriben en el proyecto archivos como `CLAUDE.md` o `AGENTS.md` y hooks, que un repositorio compartido muestra después a todos. Consulta [Graphify](../integrations/graphify.md) antes de ejecutarlos.

## Véase también

- [Estado duradero frente a efímero](../concepts/durable-vs-ephemeral.md)
- [Usar TRUSS con un coding agent](agents.md)
- [Actualizar o desinstalar TRUSS](update-and-remove.md)
- [ADR 0001: configuración local del proyecto](../development/decisions/0001-local-project-configuration.md)
