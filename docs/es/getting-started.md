# Primeros pasos

> Traducción al español. La referencia canónica es [la versión en inglés](../en/getting-started.md). Los mensajes que imprime TRUSS están en inglés, y por eso los ejemplos de salida también.

Esta guía te lleva desde un proyecto sin TRUSS hasta un cambio verificado. Son unos diez minutos. Las salidas de abajo se copiaron de una ejecución real; una línea con solo `...` representa líneas omitidas.

TRUSS es un harness, no un agente: reúne en un solo lugar tus specs, policies y verificación, y le dice al coding agent qué hacer a continuación. Nunca ejecuta un agente por sí mismo.

## 1. Requisitos

| Necesitas | Para qué | Comprobación |
|---|---|---|
| Node.js 20 o superior | TRUSS es un CLI de Node sin otras dependencias | `node --version` |
| Git | el proyecto debe ser un work tree de Git | `git --version` |
| El CLI de OpenSpec, `>=1.0.0 <2.0.0` | OpenSpec guarda las specs; TRUSS lo exige | `openspec --version` |
| Un coding agent (Claude Code, Codex, Devin u otro) | hace el trabajo de implementación | — |

Instala OpenSpec si no lo tienes (sus formatos y comandos están documentados en su [repositorio](https://github.com/Fission-AI/OpenSpec)):

```bash
npm install --global @fission-ai/openspec@1
```

TRUSS nunca instala ni actualiza OpenSpec por ti. Funciona en Windows, macOS y Linux; en Windows sirve un OpenSpec instalado con npm (un shim `.cmd`).

## 2. Añade TRUSS a tu proyecto

Desde la raíz de tu proyecto:

```bash
git clone --depth 1 --branch v0.2.12 https://github.com/nicohe/truss.git .truss
echo ".truss/" >> .gitignore
```

TRUSS vive en `.truss/` y queda fuera del historial de tu repositorio. El clon está fijado a una release, así que Git dice que está en estado «detached HEAD»: es lo esperado, estás en una release y no en una rama. Git también puede imprimir una línea `warning: refs/tags/… is not a commit!` al clonar: la release es un tag anotado y el clon termina bien (`git -C .truss describe --tags` imprime la release que tienes). Para pasar a una release más nueva más adelante, consulta [actualizar o desinstalar TRUSS](guides/update-and-remove.md). Si no quieres escribir el comando largo, define un alias:

```bash
alias truss='node .truss/bin/truss.mjs'                       # bash / zsh
function truss { node .truss/bin/truss.mjs @args }            # PowerShell
```

Los ejemplos de abajo usan la forma larga. Consulta la [estructura del proyecto](reference/project-structure.md) para saber qué vive dónde.

Conviene saber pronto una cosa: Git ignora `.truss/`, así que tu `.truss/config.yaml` es **local a esta copia del repositorio**. Si trabajan varias personas o una máquina de CI, cada una necesita su propia copia de la configuración; consulta el [ADR 0001](development/decisions/0001-local-project-configuration.md).

## 3. Inicializa y comprueba la instalación

```bash
node .truss/bin/truss.mjs init
```

```text
△ TRUSS · init

Config          ● created .truss/config.yaml
OpenSpec       ● initialized with --tools none
Git ignore      ● .truss/ ignored

TRUSS initialization verified.
Run again safely at any time: truss init
Next: truss doctor
```

`init` crea `.truss/config.yaml` e inicializa OpenSpec, sin sobrescribir nada que ya exista, así que puedes volver a ejecutarlo sin riesgo. Después comprueba el entorno:

```bash
node .truss/bin/truss.mjs doctor
```

```text
Core
  ● Node                   v24.12.0 (>=20 required)
  ● Git CLI                installed
  ● Git repository         work tree detected
  ● .truss ignore          .truss/ ignored
  ● Config                 .truss/config.yaml valid
  ...
OpenSpec
  ● CLI                    v1.13.2
  ● Compatibility          compatible (>=1.0.0 <2.0.0)
  ● Project                openspec/config.yaml
  ...
TRUSS doctor passed. 1 optional warning(s).
```

`●` significa que todo está bien, `○` es una advertencia opcional (por ejemplo, Graphify no está instalado y TRUSS recurre a la búsqueda normal) y `×` es un problema que debes resolver. Consulta [`truss doctor`](reference/doctor.md).

## 4. Da algo de guía a tu agente

Los agentes leen un archivo de guía del proyecto, normalmente `AGENTS.md`, en la raíz del repositorio. TRUSS no crea ninguno. Unas pocas líneas bastan para que un agente siga el workflow; añádelas a tu propio archivo:

```markdown
## Working with TRUSS

- Before implementing, run `node .truss/bin/truss.mjs continue` and follow the instructions and the files it lists.
- Load skills and documentation only when the task needs them; `node .truss/bin/truss.mjs skills` lists the skills.
- To write an OpenSpec artifact, run `openspec instructions <artifact> --change <id>`; it prints the format and the path.
- Keep specs, code and tests aligned; do not let them diverge silently.
- When you finish, run `node .truss/bin/truss.mjs verify` and do not call the change done until it passes.
- Write a handoff (`node .truss/bin/truss.mjs handoff`) only when work moves to another agent, runtime or session.
```

Copia estas líneas en lugar del [`AGENTS.md`](../../AGENTS.md) de este repositorio, que guía el trabajo sobre el propio TRUSS: las rutas que menciona (como `.truss/skills/`) son `.truss/.truss/skills/` en tu proyecto, y `truss continue` imprime siempre las reales. [Usar TRUSS con un coding agent](guides/agents.md) indica dónde lee cada agente su guía.

## 5. Lleva un cambio por el workflow

Empieza un cambio:

```bash
node .truss/bin/truss.mjs new "Add retry policy"
```

```text
△ TRUSS · new

● OpenSpec change created
Change          add-retry-policy
Component       workspace
OpenSpec        openspec/changes/add-retry-policy
Planning        0/4 artifacts complete

Next: truss continue
```

Por defecto un cambio tiene cuatro artefactos de planificación (proposal, specs, design y tasks), que OpenSpec registra. Pregunta a TRUSS qué toca hacer:

```bash
node .truss/bin/truss.mjs continue
```

```text
△ TRUSS · continue

Change          add-retry-policy
Phase           spec
OpenSpec        openspec/changes/add-retry-policy
Mode            agent-driven (TRUSS v0.2)

Next action
Create/refine the OpenSpec artifact "proposal" for add-retry-policy. Run openspec instructions proposal --change add-retry-policy for its format and path. Use Grill first if material ambiguity remains.
```

**Grill**, en ese texto, es una ronda de preguntas que el agente te hace cuando la idea no está clara, para no tener que inventar requisitos. Viene en dos skills: `grill-me` cuando partes de una idea, y `grill-with-docs` cuando ya tienes requisitos, una propuesta, un ticket o un ADR de partida (los lee primero y solo pregunta lo que dejan abierto). Por ejemplo: *Use the `grill-with-docs` skill on `docs/retry-proposal.md`, then write the OpenSpec artifacts.* Consulta [Descubrimiento](workflows/discovery.md). El agente se salta Grill cuando la idea ya está clara.

Pásale eso a tu agente. Un prompt que sirve con cualquier agente:

> Implement the active TRUSS change. Run `truss continue` and follow the instructions and the files it lists.

`continue` nunca ejecuta el agente: calcula el siguiente paso a partir del estado de OpenSpec y lo imprime. Cuando existen los cuatro artefactos, la fase pasa a `implementation` y la instrucción cambia. Las rutas que trae parecen duplicadas, `.truss/.truss/`, y son correctas: el primer `.truss/` es la carpeta donde clonaste TRUSS, y el segundo es el `.truss/` propio de TRUSS dentro de ese clon, donde viven sus workflows y policies.

```text
△ TRUSS · continue

Change          add-retry-policy
Phase           implementation
OpenSpec        openspec/changes/add-retry-policy
Tasks           1/2 complete
Mode            agent-driven (TRUSS v0.2)

Next action
Implement add-retry-policy using .truss/.truss/workflows/execute-change.md. Read the active OpenSpec, start with the first incomplete task ("1.2 Add tests"), follow configured BDD/TDD policies, then run truss verify.

Context to load
- AGENTS.md (effective component/workspace guidance)
- openspec/changes/add-retry-policy
- .truss/.truss/workflows/execute-change.md
- .truss/.truss/policies/ (configured BDD/TDD/spec policies)
```

`truss continue` imprime siempre las rutas reales para tu disposición de archivos. `truss status` muestra el mismo progreso, y un cambio está `complete` solo cuando todas las tareas de `tasks.md` están marcadas. Las fases y los comandos están en los [comandos del ciclo de vida](workflows/lifecycle-commands.md).

### Qué hace tu agente

`continue` dice *qué* hacer; tu agente necesita saber *cómo*. TRUSS no instala los comandos de OpenSpec en tu agente (`init` ejecuta OpenSpec con `--tools none`), así que el agente se lo pregunta directamente a OpenSpec:

```bash
openspec instructions proposal --change add-retry-policy
```

Eso imprime el propósito, el formato y la ruta exacta del artefacto, y lo mismo sirve para `specs`, `design` y `tasks`. El agente escribe cada uno, vuelve a ejecutar `truss continue` y repite hasta que existen los cuatro. Si la idea no está clara, primero debería hacer una ronda de Grill con la skill `grill-me` o `grill-with-docs`, como se ha descrito arriba. Por eso `truss continue` nombra el comando en su instrucción, y por eso el fragmento de guía de arriba tiene una línea sobre él.

Cuando la fase pasa a `implementation`, el agente recorre `tasks.md` y cambia `- [ ]` por `- [x]` al terminar cada tarea. Eso es lo que cuenta `truss status`.

## 6. Verifica

```bash
node .truss/bin/truss.mjs verify
```

`verify` ejecuta, en orden, los comandos de `verification.commands` en `.truss/config.yaml` y se detiene en el primer fallo. Registra lo ocurrido en `.truss/verification/latest.json`. La lista por defecto ejecuta tus scripts `npm test`, `lint`, `typecheck` y `build` cuando existen. Ese valor por defecto supone un proyecto Node: sin `package.json`, `npm` falla en el primer comando. En cualquier otro proyecto, sustituye antes la lista por tus propias comprobaciones (por ejemplo `pytest -q`); consulta [la lista de comandos por defecto](reference/verify.md#la-lista-de-comandos-por-defecto).

Como esos comandos se ejecutan a través de tu shell, TRUSS pregunta antes de ejecutar una lista que no ha visto para este proyecto. `init` aprueba la lista por defecto que escribe; si editas la lista, la siguiente ejecución se detiene:

```text
○ These verification commands are not trusted for this project yet.
  They run through your shell with your permissions. Review them first:
    npm test --if-present
    ...
× Not trusted; nothing was executed.
Review .truss/config.yaml, then re-run with --trust (or TRUSS_TRUST=1).
```

En una terminal pregunta `Run and trust these commands? [y/N]`. En CI o desde un agente, lee la lista y luego pasa `--trust` o define `TRUSS_TRUST=1` (consulta las [variables de entorno](reference/environment.md)). Consulta también el [modelo de confianza](../../SECURITY.md#trust-model) (en inglés).

`verify` también puede comprobar que un cambio tocó tests y que no quedan tareas abiertas. Ambas comprobaciones vienen desactivadas; pruébalas primero en modo `warn`:

```yaml
verification:
  tests_required: warn   # source changed without any test change
  tasks_complete: warn   # open tasks in the active OpenSpec change
```

Consulta [`truss verify`](reference/verify.md) para ver qué hace cada comprobación y qué no demuestra.

### Cuando verify pasa

Que `verify` pase no cierra el cambio: `truss continue` pide entonces un code review y las comprobaciones propias de OpenSpec. TRUSS no hace ninguna de ellas; las haces tú o tu agente:

1. **Revisar.** El agente usa la skill `code-review` frente a la spec, los estándares del proyecto y el riesgo, idealmente en una sesión nueva (consulta [quién hace qué](concepts/who-does-what.md)).
2. **Validar.** `openspec validate add-retry-policy` comprueba que las specs del cambio están bien formadas.
3. **Archivar.** `openspec archive add-retry-policy` mueve el cambio a `openspec/changes/archive/`, con fecha, y fusiona sus deltas de spec en `openspec/specs/`. Pide confirmación (`-y` la omite); añade `--skip-specs` para un cambio que no altera comportamiento, como herramientas o documentación.

Haz commit de `openspec/` junto con el código: las specs y los cambios archivados son durables (consulta [durable frente a efímero](concepts/durable-vs-ephemeral.md)). TRUSS se da cuenta del archivado: `truss status` y `truss continue` dicen que el cambio activo fue archivado y señalan `truss new` para el siguiente.

## 7. Monorepos

Declara cada unidad bajo `components` en `.truss/config.yaml` y nómbrala al crear un cambio:

```yaml
components:
  api:
    path: ./apps/api
  worker:
    path: ./apps/worker
```

```bash
node .truss/bin/truss.mjs components            # check they resolve
node .truss/bin/truss.mjs new "Add retry policy" --component worker
```

Las rutas de los componentes deben existir y quedar dentro del proyecto. Consulta la [resolución de componentes](reference/components.md).

## Si algo sale mal

| Ves | Qué significa | Qué hacer |
|---|---|---|
| `Install a compatible OpenSpec CLI (>=1.0.0 <2.0.0)` u `OpenSpec CLI is not installed` | falta OpenSpec | `npm install --global @fission-ai/openspec@1` y vuelve a ejecutar `init` |
| `OpenSpec … is not compatible (>=1.0.0 <2.0.0)` | OpenSpec tiene una versión que TRUSS no admite | instala una versión 1.x; TRUSS nunca lo actualiza por ti |
| `TRUSS config not found: .truss/config.yaml` | el proyecto no está inicializado | ejecuta `truss init` |
| `invalid config` (código de salida 2) | `config.yaml` incumple el schema | ejecuta `truss config` para ver los errores exactos |
| `TRUSS installation is incomplete: config schema not found` | el clon de `.truss/` está dañado | vuelve a clonar TRUSS |
| `Not trusted; nothing was executed.` | la lista de comandos cambió | revísala y luego usa `--trust` |
| `× failed  [1/4] npm test --if-present`, con `npm error … Could not read package.json` | la lista de comandos por defecto supone un proyecto Node y este no tiene `package.json` | sustituye `verification.commands` por las comprobaciones propias de tu proyecto y aprueba la lista nueva |
| `Unknown component "x"` | ese nombre no está declarado en `components` | decláralo u omite `--component` |
| `OpenSpec project is not initialized` | no existe el directorio `openspec/` | ejecuta `truss init` |

`truss doctor` diagnostica casi todo esto sin cambiar nada. [Solución de problemas](guides/troubleshooting.md) cubre más, incluidas la verificación, los cambios y la instalación.

## Siguientes pasos

- [Conceptos](concepts/spec-driven-development.md): por qué TRUSS funciona así.
- [Workflows](workflows/overview.md) y el workflow [`execute-change`](workflows/execute-change.md) que sigue tu agente.
- [Configuración](configuration/reference.md): cada opción y qué cambia.
- [Modelo de enforcement](reference/enforcement.md): qué comprueba TRUSS por sí mismo y qué solo le pide al agente.
- [Guías](guides/agents.md): usar TRUSS con tu agente, en [CI](guides/ci.md), y [actualizarlo o desinstalarlo](guides/update-and-remove.md).
- [Referencia del CLI](reference/cli.md).
