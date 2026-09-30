# Variables de entorno

> Traducción al español. La referencia canónica es [la versión en inglés](../../en/reference/environment.md).

TRUSS lee un pequeño conjunto de variables de entorno. El comportamiento del proyecto se configura en `.truss/config.yaml`, nunca mediante el entorno; estas variables solo ajustan dónde busca cosas TRUSS y cómo imprime.

| Variable | Efecto | Por defecto |
|---|---|---|
| [`TRUSS_TRUST`](#truss_trust) | Aprueba una lista de `verification.commands` sin preguntar | sin definir |
| [`TRUSS_HOME`](#truss_home) | Directorio del almacén de aprobaciones | `~/.config/truss` |
| [`XDG_CONFIG_HOME`](#truss_home) | Base de la ubicación por defecto del almacén de aprobaciones | `~/.config` |
| [`TRUSS_OPENSPEC_PATH`](#truss_openspec_path) | Usa este CLI de OpenSpec en lugar del que está en el `PATH` | sin definir |
| [`NO_COLOR`](#color) | Desactiva la salida con color | sin definir |
| [`FORCE_COLOR`](#color) | Activa la salida con color | sin definir |
| [`TERM`](#color) | `dumb` desactiva la salida con color | lo define tu terminal |
| [`PATH`](#path) | Dónde se encuentran `openspec`, `graphify` y `git` | el de tu shell |
| [`TRUSS_REQUIRE_REAL_OPENSPEC`](#solo-para-tests-y-ci) | Hace que el test de contrato con OpenSpec real falle en lugar de omitirse | sin definir |

## `TRUSS_TRUST`

`truss verify` ejecuta los comandos de `verification.commands` a través de tu shell, así que pregunta antes de ejecutar una lista que no ha visto para el proyecto. Definir `TRUSS_TRUST` como `1` o `true` (sin distinguir mayúsculas) aprueba la lista sin preguntar, igual que `truss verify --trust`. Cualquier otro valor se ignora.

Úsala en CI o desde un agente, donde no hay terminal para responder, y solo después de leer la lista en `.truss/config.yaml`. Sin terminal y sin esta variable ni `--trust`, `verify` se niega a ejecutar y sale con `1`. Consulta [`truss verify`](verify.md#aprobación) y el [modelo de confianza](../../../SECURITY.md#trust-model) (en inglés).

## `TRUSS_HOME`

TRUSS recuerda qué listas de comandos aprobaste en `trusted.json`, indexado por la ruta real del proyecto y un SHA-256 de la lista. El archivo está a propósito **fuera del repositorio**, para que un proyecto clonado no pueda traer su propia aprobación. Se crea con modo `0600` dentro de un directorio creado con modo `0700`.

El directorio es, por orden: `$TRUSS_HOME`, luego `$XDG_CONFIG_HOME/truss` y luego `~/.config/truss`. Apunta `TRUSS_HOME` a otro sitio para mantener las aprobaciones separadas, por ejemplo en un workspace de CI desechable. Borrar el archivo solo significa que se te volverá a preguntar.

## `TRUSS_OPENSPEC_PATH`

Por defecto TRUSS encuentra el CLI de OpenSpec en el `PATH`. Define `TRUSS_OPENSPEC_PATH` con la ruta completa de un ejecutable concreto para usar ese en su lugar, por ejemplo para probar otra versión. Un valor vacío se ignora.

- La ruta se usa tal cual. Si no existe, `truss doctor` muestra el CLI como `version unknown` y falla el check de compatibilidad, porque TRUSS no puede leer una versión de él.
- En Windows puedes omitir la extensión: TRUSS usa el `.exe` o el `.cmd` que está junto a la ruta. Un OpenSpec instalado con npm se lanza sin shell, así que se lee su shim `.cmd` para encontrar el script de Node que ejecuta. Un `.cmd` que no sea un shim de npm se rechaza con un mensaje que apunta aquí.

## Color

La salida con color se decide en este orden:

1. `NO_COLOR` con cualquier valor no vacío: **desactivado**. Gana a todo lo demás.
2. `FORCE_COLOR` con cualquier valor distinto de `0`: **activado**, incluso cuando la salida se redirige.
3. En otro caso: activado solo cuando la salida estándar es una terminal interactiva y `TERM` no es `dumb`.

Por eso, redirigir TRUSS a un archivo, a un paginador o a un log de CI da texto plano por defecto.

## `PATH`

TRUSS localiza `openspec` (salvo que se defina `TRUSS_OPENSPEC_PATH`), `graphify` y `git` en el `PATH`. `truss doctor` informa de lo que encontró. En Windows se usa `where` y se prefieren las variantes `.exe` / `.cmd` frente al shim `sh` sin extensión que npm instala junto a ellas.

## Solo para tests y CI

`TRUSS_REQUIRE_REAL_OPENSPEC=1` lo usa el job de CI `Contract / real OpenSpec`. Con ella, `test/e2e/real-openspec.e2e.test.mjs` falla cuando no hay un OpenSpec compatible instalado, en lugar de omitirse. No tiene efecto sobre el CLI. Consulta la [integración continua](../../en/development/ci.md) (en inglés).
