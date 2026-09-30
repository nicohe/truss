# Comandos del ciclo de vida de TRUSS v0.2

> Traducción al español. La referencia canónica es [la versión en inglés](../../en/workflows/lifecycle-commands.md).

TRUSS v0.2 sigue siendo **dirigido por el agente**. Estos comandos hacen de OpenSpec la fuente operativa del estado de un cambio, sin introducir la orquestación de runtime prevista para v0.3.

## `truss new "Nombre del cambio" [--component name]`

- valida la configuración de TRUSS y el componente;
- exige un proyecto OpenSpec compatible e inicializado;
- normaliza el título a un identificador de cambio en kebab-case;
- delega la creación del scaffold en `openspec new change <id> --goal <title> --json`;
- nunca inventa su propia estructura de artefactos de OpenSpec;
- registra solo el puntero al cambio activo en `.truss/state.json`.

## `truss status`

- lee el puntero al cambio activo de `.truss/state.json`;
- consulta `openspec status --change <id> --json` cada vez;
- informa de la disponibilidad de los artefactos y del progreso de planificación a partir de OpenSpec, no de datos de fase de TRUSS que pueden haber quedado obsoletos;
- informa del progreso de las tareas (`Tasks 1/3 complete`), leído de `openspec instructions apply`, es decir, de las casillas de `tasks.md`;
- actualiza el puntero local de fase:
  - `spec`: aún faltan artefactos de planificación;
  - `implementation`: existen todos los artefactos pero al menos una tarea está abierta (o el progreso de tareas no está disponible);
  - `complete`: hay tareas y todas están marcadas.

`openspec status` por sí solo no distingue `implementation` de `complete`: su `isComplete` significa que *existen todos los artefactos*, no que *todas las tareas están hechas*. Por eso TRUSS nunca informa `complete` a menos que el progreso de tareas lo indique.

## `truss continue`

`continue` no invoca a ningún modelo de código en v0.2. Calcula e imprime la siguiente acción del agente:

- sin cambio activo → crear uno;
- planificación incompleta → crear o refinar el siguiente artefacto de OpenSpec que esté listo, usando Grill cuando quede ambigüedad;
- planificación completa y tareas abiertas → seguir el workflow `execute-change` (`workflows/execute-change.md` en la instalación de TRUSS; `continue` imprime la ruta real), las policies de BDD/TDD y de verificación, empezando por la primera tarea sin completar;
- todas las tareas completas → ejecutar la verificación determinística, el code review y después la verificación o el archivado de OpenSpec.

Esto mantiene explícito el límite: OpenSpec es dueño del estado del cambio y de los artefactos; TRUSS es dueño de la policy del workflow de ingeniería; y el coding agent hace la implementación no determinística en v0.2.
