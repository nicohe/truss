# Estado durable vs efímero

> Traducción al español. La referencia canónica es [la versión en inglés](../../en/concepts/durable-vs-ephemeral.md).

Parte de lo que rodea a un cambio es conocimiento que el proyecto necesitará más adelante. El resto es andamiaje. Confirma (commit) lo primero; mantén lo segundo en local.

## Durable: confírmalo

| Qué | Dónde |
|---|---|
| Código fuente y tests | tu repositorio |
| Specs, designs, tasks y cambios archivados | `openspec/` |
| Decisiones arquitectónicas (ADRs), cuando una decisión merece uno | tu documentación |
| Documentación estable del proyecto y el archivo de guía del agente | tu documentación, `AGENTS.md` |

Si un futuro compañero o agente estaría peor sin ello, pertenece aquí.

## Efímero: mantenlo en local

| Qué | Dónde |
|---|---|
| El puntero al cambio activo | `.truss/state.json` |
| La evidencia del último `truss verify` | `.truss/verification/latest.json` |
| Las notas de handoff que escribe `truss handoff` | `.truss/handoffs/` |
| Cualquier otro estado de sesión, cachés o logs | donde los guarde el runtime de tu agente |
| Un índice de Graphify | `graphify-out/` |
| Tu aprobación de una lista de comandos de verificación | `$TRUSS_HOME/trusted.json`, fuera del repositorio a propósito |

Esto describe *esta copia, ahora mismo*. Si algo llega a valer la pena conservarlo, como un descubrimiento de un handoff, muévelo a un lugar durable (OpenSpec, un ADR, la documentación) en lugar de confirmar el archivo temporal.

## Qué hace el inicio rápido con `.truss/`

El [inicio rápido](../getting-started.md) clona TRUSS en `.truss/` e ignora todo el directorio. Eso mantiene a TRUSS fuera de tu historial, y también significa que `.truss/config.yaml` es **local a cada copia**: no se confirma con el proyecto, así que un clon nuevo (o una máquina de CI) empieza con la configuración por defecto, no con la de tu equipo.

Es una decisión deliberada por ahora, registrada en el [ADR 0001](../../en/development/decisions/0001-local-project-configuration.md) (en inglés). El ADR también explica una forma manual de que un equipo comparta su configuración hoy y describe el archivo de configuración versionable que añadiríamos si un equipo lo necesita.

Los ignores de Git son también la razón por la que nada de esta tabla debería llegar a un commit por accidente. `truss doctor` avisa cuando `.truss/` no está ignorado.
