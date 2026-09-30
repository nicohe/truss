# Solución de problemas

> Traducción al español. La referencia canónica es [la versión en inglés](../../en/guides/troubleshooting.md).

Busca lo que imprimió TRUSS, mira qué significa y qué hacer. Los mensajes se citan tal como los imprime el CLI.

Empieza por `truss doctor`. No cambia nada, e informa del entorno, la configuración y OpenSpec: `●` está bien, `○` es un aviso opcional y `×` es un problema que hay que arreglar. Consulta [`truss doctor`](../reference/doctor.md).

## Instalación y configuración

| Ves | Qué significa | Qué hacer |
|---|---|---|
| `TRUSS config not found: .truss/config.yaml` | el proyecto no se ha inicializado, o estás en un directorio que no tiene `.truss/`: un worktree de Git, o una segunda copia del proyecto | ejecuta `truss init`. En un worktree o en otra copia, crea también allí la configuración: Git ignora `.truss/`, así que es local a cada copia (consulta los [worktrees](../concepts/who-does-what.md#subagentes-y-worktrees) y el [ADR 0001](../development/decisions/0001-local-project-configuration.md)) |
| `Git ignore  ○ .truss/ is not ignored` o `○ no .gitignore detected` de `truss init`, y `○ .truss ignore` en `truss doctor` | Git rastrearía el clon de TRUSS. `init` solo avisa: nunca edita tu `.gitignore` | añade la línea tú: `echo ".truss/" >> .gitignore` |
| `OpenSpec  × CLI missing`, y después `Install a compatible OpenSpec CLI (>=1.0.0 <2.0.0)` | OpenSpec no está en el `PATH` | `npm install --global @fission-ai/openspec@1`, y vuelve a ejecutar `truss init`. Para usar un ejecutable concreto, consulta [`TRUSS_OPENSPEC_PATH`](../reference/environment.md) |
| `OpenSpec … is not compatible (>=1.0.0 <2.0.0)` | OpenSpec tiene una versión que TRUSS no admite | instala una versión 1.x; TRUSS nunca actualiza OpenSpec por ti |
| `OpenSpec project is not initialized` | no existe el directorio `openspec/` | ejecuta `truss init` |
| `× invalid config`, seguido de una línea como `$.bogus: unknown property.` (código de salida `2`, de cualquier comando que lee la configuración) | `config.yaml` incumple el schema | corrige lo que dice la línea. `truss config` lista todos los errores (consulta la [validación](../configuration/validation.md)) |
| `TRUSS installation is incomplete: config schema not found` | el clon de `.truss/` está dañado | clona TRUSS otra vez (consulta [actualizar o desinstalar](update-and-remove.md)) |
| `Invalid TRUSS state file: .truss/state.json` (código de salida `2`) | el archivo que recuerda el cambio activo se editó o quedó cortado | borra `.truss/state.json`. Solo guarda el puntero al cambio activo, así que TRUSS dirá que no hay ninguno; empieza el siguiente cambio con `truss new` |

## Verificación

| Ves | Qué significa | Qué hacer |
|---|---|---|
| `× Not trusted; nothing was executed.` | la lista de comandos es nueva o cambió, y no hay terminal para preguntarte | lee la lista que imprimió y vuelve a ejecutar con `--trust`, o define `TRUSS_TRUST=1` en CI (consulta la [aprobación](../reference/verify.md#aprobación)) |
| `× failed  [1/4] npm test --if-present`, con `npm error … Could not read package.json` | la lista de comandos por defecto supone un proyecto Node y este no tiene `package.json` | sustituye `verification.commands` por tus propias comprobaciones y aprueba la lista nueva (consulta [un proyecto que no es Node](../configuration/examples.md#un-proyecto-que-no-es-node)) |
| `× no verification commands configured` | `verification.commands` está vacío | lista en `.truss/config.yaml` los comandos a ejecutar |
| `○ could not evaluate: … Not blocking.` bajo `Tests required` o `Tasks complete` | el gate no pudo decidir, y un gate que no puede decidir nunca bloquea. Imprime el motivo: no es un work tree de Git, aún no hay commits, no se encontró rama base, un clon superficial sin el ancestro común, o no hay tareas | arregla el motivo si quieres que el gate funcione: para una rama base, define `verification.base_ref`; para un clon superficial, descarga más historial |

## Cambios y el agente

| Ves | Qué significa | Qué hacer |
|---|---|---|
| `The active change "x" was archived (openspec/changes/archive/…)`, de `status`, `continue` o `handoff`, o `the active change "x" was archived (…); nothing to check` bajo `Tasks complete` | archivaste el cambio con `openspec archive`, y TRUSS se dio cuenta | no pasa nada: empieza el siguiente con `truss new "Change name"` |
| `The active change "x" is not in OpenSpec (openspec/changes/x is missing)` | la carpeta del cambio se borró o se movió sin archivarlo | restaura la carpeta, o empieza de nuevo con `truss new` |
| `Unknown component "x". No components are configured.`, o `Available: …` (código de salida `2`) | ese nombre no está declarado en `components` | decláralo en `.truss/config.yaml`, o quita `--component` |
| `Unknown command "stauts".` y `Did you mean "status"?` (código de salida `2`) | una errata | consulta `truss help` |
| `… already exists and was not changed.` de `truss handoff` | ya existe una nota para este cambio, y TRUSS nunca sobrescribe una | edítala, o bórrala para empezar una nueva (consulta el [handoff](../reference/handoff.md)) |
| el agente no ejecuta `truss continue` ni `truss verify` | TRUSS no ejecuta ningún agente; el agente sigue lo que dice su archivo de guía | comprueba que el fragmento está en el archivo que lee tu agente (consulta [usar TRUSS con un coding agent](agents.md)) |

## La instalación de TRUSS

| Ves | Qué significa | Qué hacer |
|---|---|---|
| `git pull` dentro de `.truss/` dice `Already up to date.` y nada cambia | el inicio rápido fija el clon a una release, así que no hay rama de la que hacer pull | `git fetch --tags`, y después `git checkout vX.Y.Z` (consulta [actualizar o desinstalar](update-and-remove.md)) |
| `error: pathspec 'main' did not match any file(s) known to git` | un clon fijado a una release solo conoce su propio tag | consulta [seguir `main` en su lugar](update-and-remove.md#seguir-main-en-su-lugar) |
| `config.yaml` o `state.json` desaparecieron de `.truss/` | son archivos sin seguimiento dentro del clon, y `git clean -fd` los borra (`git stash -u` los aparta) | restáuralos desde tu copia de la configuración, y no ejecutes ninguno de los dos comandos dentro de `.truss/` |

## Windows

| Ves | Qué significa | Qué hacer |
|---|---|---|
| rutas que mezclan `\` y `/`, como `openspec\changes\…` junto a `.truss/…` | TRUSS imprime algunas rutas con el separador del sistema operativo y otras con `/` | nada: las dos son correctas |
| un archivo `.cmd` rechazado cuando `TRUSS_OPENSPEC_PATH` apunta a él | TRUSS lanza OpenSpec sin shell y lee el shim de npm para encontrar su script; un `.cmd` que no es un shim de npm no se puede leer así | apunta `TRUSS_OPENSPEC_PATH` al `openspec` instalado con npm, o al `.exe` (consulta las [variables de entorno](../reference/environment.md)) |

Si nada de esto lo explica, ejecuta `truss doctor` y `truss --version`, e incluye ambos cuando [reportes el problema](https://github.com/nicohe/truss/issues).
