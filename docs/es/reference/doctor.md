# `truss doctor`

> Traducción al español. La referencia canónica es [la versión en inglés](../../en/reference/doctor.md). Los nombres de los checks son los que imprime TRUSS, en inglés.

`truss doctor` es la comprobación de salud local de un workspace de TRUSS. Es de solo lectura: diagnostica la instalación y nunca instala, actualiza, inicializa, reindexa ni reescribe datos del proyecto. Ejecútalo cuando algo se comporte de forma rara y después de `truss init`.

```text
Core
  ● Node                   v24.12.0 (>=20 required)
  ● Git CLI                installed
  ● Git repository         work tree detected
  ● .truss ignore          .truss/ ignored
  ● Config                 .truss/config.yaml valid

Project
  ● Components             workspace:.

OpenSpec
  ● CLI                    v1.13.2
  ● Compatibility          compatible (>=1.0.0 <2.0.0)
  ● Project                openspec/config.yaml

Capabilities
  ○ Graphify               missing (optional; native fallback)
  ● Native search fallback filesystem / grep / runtime-native search
  ● Git worktrees          available through Git

Verification
  ● Commands               4 configured
  ● Tests required         off (not enforced)
  ● Tasks complete         off (not enforced)
  ● Trust                  commands approved for this project

TRUSS doctor passed. 1 optional warning(s).
```

## Símbolos

- `●` correcto: la condición se cumple.
- `○` advertencia u omitido: el trabajo puede continuar. Un check omitido significa que no pudo ejecutarse, normalmente porque la configuración es inválida.
- `×` fallo: una condición requerida no se cumple.

## Checks

Un check marcado como *requerido* hace que `doctor` falle cuando no pasa. Los demás solo avisan.

| Sección | Check | Requerido | Pasa cuando |
|---|---|---|---|
| Core | Node | sí | Node.js es 20 o superior |
| Core | Git CLI | sí | `git` está en el `PATH` |
| Core | Git repository | sí | el directorio está dentro de un work tree de Git |
| Core | .truss ignore | no | Git ignora `.truss/` (si no, avisa) |
| Core | Config | sí | `.truss/config.yaml` existe y es válido; si falla, lista los errores |
| Project | Components | sí | todos los componentes configurados se resuelven (se omite si la configuración es inválida) |
| Project | AGENTS.md, o AGENTS.md (componente) | no | se muestra solo cuando el archivo de guía efectivo existe y está vacío: es el archivo propio del componente, o el del workspace cuando el componente no tiene. El archivo vacío de un componente reemplaza al del workspace, así que el agente no recibe guía. Añade alguna, o quita el archivo; la skill `writing-for-agents` dice qué poner en él |
| OpenSpec | CLI | sí | se encuentra un CLI de OpenSpec |
| OpenSpec | Compatibility | sí | su versión está dentro de `>=1.0.0 <2.0.0` |
| OpenSpec | Project | sí | el directorio tiene un proyecto `openspec/` inicializado |
| Capabilities | Graphify | solo si `integrations.graphify.required: true` | Graphify está instalado y su índice está al día |
| Capabilities | Native search fallback | no | siempre; es informativo |
| Capabilities | Git worktrees | no | Git está disponible |
| Verification | Commands | no | `verification.commands` no está vacío |
| Verification | Package manager | no | se muestra solo si hay un desajuste: un comando empieza por `npm`, y el proyecto declara otro gestor en `package.json` (`packageManager`) o tiene otro lockfile (`pnpm-lock.yaml`, `yarn.lock`, `bun.lock`). TRUSS nunca cambia la lista; te dice que pongas los comandos de ese gestor |
| Verification | Tests required | no | siempre; muestra el modo de [`verification.tests_required`](verify.md#gate-tests-required) |
| Verification | Tasks complete | no | siempre; muestra el modo de [`verification.tasks_complete`](verify.md#gate-tasks-complete) |
| Verification | Trust | no | la lista de comandos actual está [aprobada](verify.md#aprobación) para este proyecto (solo se muestra si hay comandos configurados) |

Graphify es opcional por defecto: cuando no está disponible o su índice está desactualizado, `doctor` avisa y TRUSS recurre a la búsqueda normal. Solo `required: true` lo convierte en un fallo.

## Códigos de salida

| Código | Significado |
|---|---|
| `0` | Todos los checks requeridos pasaron. Aún puede haber advertencias opcionales. |
| `1` | Uno o más checks de instalación requeridos fallaron. |
| `2` | La configuración de TRUSS es inválida o no puede cargarse. |

`doctor` es diagnóstico a propósito. Para reparar una condición usa el comando explícito correspondiente: `truss init`, `truss graphify bootstrap` o instala lo que falte (consulta [primeros pasos](../getting-started.md#si-algo-sale-mal), y la [solución de problemas](../guides/troubleshooting.md) para los mensajes de los demás comandos).
