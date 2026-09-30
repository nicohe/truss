# ADR 0001: la configuración del proyecto se queda local a cada copia (por ahora)

> Traducción al español. La referencia canónica es [la versión en inglés](../../../en/development/decisions/0001-local-project-configuration.md).

- **Estado:** aceptada, 2026-09-30. Se revisará cuando un equipo necesite una configuración compartida.
- **Decisión de:** el mantenedor.

## Contexto

El [inicio rápido](../../getting-started.md) clona TRUSS en el `.truss/` del proyecto y añade `.truss/` al `.gitignore` del proyecto. Luego `truss init` escribe la configuración del proyecto en `.truss/config.yaml`, que está dentro de ese directorio ignorado. Por eso la configuración **nunca se confirma con el proyecto**.

En la práctica:

- Cada copia tiene su propio `config.yaml`. `truss init` en un clon nuevo crea uno nuevo con los valores **por defecto**, no con los del equipo.
- Dos personas, o una persona y una máquina de CI, pueden verificar con reglas distintas sin darse cuenta: distintos `verification.commands`, `tests_required`, `tasks_complete`, `spec.mode` o componentes.
- Compárese con `openspec/`, que *sí* se confirma: las especificaciones se comparten, las reglas de TRUSS no.

La documentación anterior decía que se confirmara la «configuración compartida de TRUSS», cosa que el inicio rápido contradice. Este registro resuelve esa contradicción.

## Decisión

**Dejarlo como está.** La configuración del proyecto es personal de cada copia. La documentación ahora lo dice con claridad (consulta [estado durable vs efímero](../../concepts/durable-vs-ephemeral.md)) en lugar de dar a entender que se comparte.

Por qué no cambiarlo ahora:

- La herramienta la usa un solo mantenedor, para quien una configuración compartida todavía no resuelve nada.
- La ubicación y el nombre de un archivo que se confirma son difíciles de cambiar una vez publicados, así que merecen un diseño deliberado y no uno apresurado.

## Qué puede hacer un equipo hoy

No hay ningún mecanismo integrado. Un arreglo manual que funciona:

1. Guarda en tu repositorio una copia de referencia de la configuración, por ejemplo `docs/truss-config.example.yaml`.
2. En una copia nueva (o una máquina de CI), clona TRUSS en `.truss/` como en el inicio rápido, copia el archivo de referencia a `.truss/config.yaml` y solo entonces ejecuta `truss init`. `init` **adopta** una configuración existente y nunca la sobrescribe.
3. El primer `truss verify` se niega a ejecutar una lista de comandos que no ha visto para esa copia. Lee la lista y luego pasa `--trust` (o define `TRUSS_TRUST=1` en CI). Consulta [`truss verify`](../../reference/verify.md).

Copiar el archivo después de `init` también funciona; solo tendrás entretanto la configuración por defecto. Nada garantiza que las copias se mantengan sincronizadas.

## Opción considerada para más adelante: un archivo de configuración versionable

No está implementada. Se registra para que no se pierda el razonamiento.

**Idea.** Dejar que la configuración del proyecto viva en un archivo que se confirma, en la raíz del proyecto, y mantener todo lo local bajo `.truss/`.

- **Ubicación y nombre.** Un archivo en la raíz del proyecto. `truss.config.yaml` es un candidato; el nombre está **sin decidir**.
- **Orden de búsqueda.** TRUSS lee primero el archivo de la raíz y recurre a `.truss/config.yaml`, de modo que los proyectos existentes siguen funcionando sin cambios.
- **`truss init`.** Crea el archivo de la raíz para un proyecto nuevo y deja en paz un `.truss/config.yaml` existente.
- **El estado local sigue siendo local.** `state.json`, `verification/` y `handoffs/` se quedan bajo `.truss/`. La aprobación de la verificación ya vive fuera del repositorio, indexada por la ruta del proyecto.
- **`truss doctor`.** Informa de qué archivo se está usando y avisa si existen ambos y difieren.

**Beneficios.** Todo el equipo y el CI comparten un único conjunto de reglas; un cambio en las reglas pasa por review como cualquier otro cambio; un clon nuevo no necesita copias manuales.

**Costes y preguntas abiertas.**

- El nombre del archivo, y si se sigue admitiendo la ubicación antigua indefinidamente o se depreca.
- La migración de los proyectos que ya tienen un `.truss/config.yaml`: cómo se les avisa y si TRUSS ofrece moverlo.
- La precedencia cuando existen ambos archivos.
- Monorepos: ¿un archivo en la raíz o un archivo por componente?
- Documentación que habría que cambiar: el inicio rápido, `project-structure.md`, `durable-vs-ephemeral.md`, `init.md`, la referencia de configuración y sus traducciones al español.
- Tests que habría que añadir: precedencia, alternativa, comportamiento de `init` y el test end-to-end del inicio rápido con el archivo confirmado.

## Cuándo revisarlo

Cualquiera de estas situaciones es un motivo para retomar la opción de arriba:

- Una segunda persona empieza a usar TRUSS en el mismo proyecto.
- Un pipeline de CI debe ejecutar `truss verify` con las reglas del equipo.
- Alguien informa de que dos copias verificaron con configuraciones distintas.

## Consecuencias de la decisión actual

- ✅ No hay nada que confirmar ni que revisar: TRUSS queda del todo fuera del historial del proyecto.
- ✅ No hay un formato de archivo nuevo ni reglas de búsqueda que mantener.
- ⚠️ La configuración puede desviarse entre copias y el CI, sin ningún aviso.
- ⚠️ Un equipo debe mantener su propia copia de la configuración y aplicarla a mano.
