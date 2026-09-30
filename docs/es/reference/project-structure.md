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

Cuando la instalación es un clon en el `.truss/` del proyecto, ese contenido está en `.truss/.truss/…`, y `truss continue` imprime la ruta real que hay que leer. Actualiza TRUSS actualizando el clon (por ejemplo, `git pull` dentro de él).

## El proyecto

El directorio en el que se ejecuta TRUSS. Solo recibe sus propios archivos, todos bajo `<project>/.truss/`:

| Ruta | Qué es |
|---|---|
| `config.yaml` | La configuración del proyecto (la crea `truss init`). |
| `state.json` | El puntero al cambio activo. |
| `verification/latest.json` | La evidencia del último `truss verify`. |
| `handoffs/` | Notas de handoff locales. |

`openspec/` contiene los artefactos durables de los cambios cuando se usa OpenSpec. El estado local lo ignora Git; las specs, los tests y la documentación se confirman. El código de aplicación del proyecto debe seguir siendo utilizable si se elimina `.truss/`.

Cuando TRUSS se usa sobre su propio repositorio, la instalación y el proyecto son el mismo directorio.
