> Traducción al español. La referencia canónica es [la versión en inglés](../../en/reference/project-structure.md).

# Estructura del proyecto

TRUSS involucra dos ubicaciones. Mantenerlas separadas explica dónde vive cada archivo.

## La instalación de TRUSS

El clon de este repositorio (en el inicio rápido, un clon dentro del `.truss/` del proyecto, aunque puede estar en cualquier sitio). Contiene el código (`bin/`, `lib/`) y, en su propio directorio `.truss/`, el **contenido del harness** que acompaña a esa versión del código:

| Ruta dentro de la instalación | Qué es |
|---|---|
| `.truss/schema/config.schema.json` | El schema de configuración. Debe coincidir con el código que valida con él, así que se lee de la instalación y nunca del proyecto. |
| `.truss/skills/` | Las skills portables que lista `truss skills`. |
| `.truss/policies/` | Las policies de BDD, TDD, spec, verificación y review. |
| `.truss/workflows/` | Workflows como `execute-change`. |

Cuando la instalación es un clon en el `.truss/` del proyecto, ese contenido está en `.truss/.truss/…`, y `truss continue` imprime la ruta real que hay que leer. Actualiza TRUSS llevando el clon a otra release (consulta [Actualizar o desinstalar TRUSS](../guides/update-and-remove.md)).

## El proyecto

El directorio en el que se ejecuta TRUSS. Solo recibe sus propios archivos, todos bajo `<project>/.truss/`:

| Ruta | Qué es |
|---|---|
| `config.yaml` | La configuración del proyecto (la crea `truss init`). |
| `state.json` | El puntero al cambio activo, guardado para cada rama de Git en la que se activó un cambio. |
| `verification/latest.json` | La evidencia del último `truss verify`. |
| `verification/working-tree.json` | El identificador de contenido de cada archivo en el último `verify` que pasó, para que el aviso pueda nombrar lo que cambió. |
| `verification/history.json` | Las últimas diez ejecuciones que pasaron, cada una con la huella de sus archivos. |
| `handoffs/` | Notas de handoff locales. |

### Cómo se comportan estos archivos

Medido en un repositorio de prueba con dos ramas y hasta 1.005 archivos. Ninguno se versiona: Git ignora `.truss/`, y lo que un compañero echaría en falta va a `openspec/` y al código (consulta [estado durable y efímero](../concepts/durable-vs-ephemeral.md)).

| Archivo | Lo escribe | Se reemplaza o se añade | Tamaño | `truss use` | Cambio de rama |
|---|---|---|---|---|---|
| `state.json` | `new`, `use`, y `status` o `continue` cuando la fase del cambio se movió | se reemplaza entero (archivo temporal y luego renombrado) | unos 400 bytes, más unos 200 por cada rama con una entrada | se reescribe: registra el nuevo cambio activo | guarda una entrada por rama, así que al volver regresa el cambio de esa rama ([ADR 0004](../development/decisions/0004-active-change-per-branch.md)) |
| `verification/latest.json` | cada `verify`, pase o falle | se reemplaza | unos 470 bytes con un comando en la lista, algo más por cada uno adicional; no crece con el proyecto | no se toca | no se toca; nombra la rama y el commit de la ejecución |
| `verification/working-tree.json` | un `verify` que **pasa**; uno que falla lo deja como estaba | se reemplaza | crece con el número de archivos que ve Git, no con el tiempo: 0,7 KB con 12 archivos, 12 KB con 212, 59 KB con 1.005 | no se toca | no se toca |
| `verification/history.json` | un `verify` que pasa | la más reciente primero, una entrada por árbol, como máximo diez | unos 200 bytes por entrada, 2 KB como máximo | no se toca | no se toca; es lo que hace que archivos que ya pasaron en otra rama cuenten como vigentes |
| `handoffs/<cambio>.md` | `truss handoff` | nunca se sobrescribe: una segunda ejecución lo deja y lo dice | un archivo por cambio, unos 200 bytes antes de rellenarlo | no se toca | no se toca; sus líneas `Branch` y `Commit` son las del momento en que se escribió, y `status` avisa cuando difieren |

Repetir `verify` sobre los mismos archivos no cambia ninguno de estos tamaños. Cambiar de rama tampoco toca ninguno: `verify`, `use`, `new`, `handoff` y el refresco de fase de `status` y `continue` son lo único que los escribe. En `truss use add-retry-policy`, `add-retry-policy` es un id de cambio, el nombre que `truss new "Add retry policy"` da a la carpeta bajo `openspec/changes/`; `openspec list` muestra los ids.

`openspec/` contiene los artefactos durables de los cambios cuando se usa OpenSpec. El estado local lo ignora Git; las specs, los tests y la documentación se confirman. El código de aplicación del proyecto debe seguir siendo utilizable si se elimina `.truss/`.

Cuando TRUSS se usa sobre su propio repositorio, la instalación y el proyecto son el mismo directorio.
