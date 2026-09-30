> Traducción al español. La referencia canónica es [la versión en inglés](../../en/reference/glossary.md).

# Glosario

Los términos están en orden alfabético.

- **Adaptador (adapter):** una implementación específica de un runtime, por ejemplo para Claude Code o Codex. No forma parte del core de v0.2; consulta el [modelo de enforcement](enforcement.md).
- **Agente:** el asistente de código que hace el trabajo de implementación. TRUSS nunca ejecuta uno; le dice al agente qué hacer a continuación.
- **Aprobación (trust):** tu confirmación de que una lista de `verification.commands` puede ejecutarse. Se guarda por proyecto y se vuelve a pedir cuando la lista cambia. Consulta [`truss verify`](verify.md).
- **Cambio (change):** una unidad de trabajo registrada por OpenSpec, con proposal, specs, design y tasks. `truss new` la crea.
- **Componente (component):** una unidad direccionable de un monorepo, declarada bajo `components`.
- **Evidencia (evidence):** el registro legible por máquina de una ejecución de `truss verify`, en `.truss/verification/latest.json`.
- **Fase (phase):** en qué punto está un cambio: `spec` (faltan artefactos de planificación), `implementation` (planificado, con tareas abiertas) o `complete` (todas las tareas marcadas).
- **Gate:** una comprobación opcional de `truss verify` que puede informar o negarse antes de ejecutar ningún comando: `tests_required` y `tasks_complete`.
- **Graphify:** una herramienta opcional que mapea las relaciones del código. Cuando falta, TRUSS recurre a la búsqueda nativa.
- **Handoff:** el estado vivo mínimo que se transfiere ante un cambio real de contexto, agente, runtime o sesión.
- **Instalación (installation):** la copia de TRUSS en sí (su código, schema, skills, policies y workflows), frente al *proyecto* sobre el que se ejecuta. Consulta la [estructura del proyecto](project-structure.md).
- **Integración (integration):** una capacidad externa con la que trabaja TRUSS, como OpenSpec o Graphify.
- **OpenSpec:** la herramienta de especificación requerida. TRUSS lee su estado y nunca la reemplaza.
- **Policy:** una regla de comportamiento que se le pide seguir al agente, por ejemplo BDD o TDD.
- **Skill:** una capacidad reutilizable del agente, como `grill-me` o `code-review`.
- **Spec-Anchored / Spec-as-Source:** los dos valores de `spec.mode`. Consulta los [modos de especificación](../workflows/spec-modes.md).
- **Verificación (verification):** evidencia ejecutable determinística: los comandos que configuraste, ejecutados en orden.
- **Workflow:** una coordinación de pasos, skills y policies, como [`execute-change`](../workflows/execute-change.md).
- **Zone guard:** la intención declarada (`spec.zone_guard`) de mantener separado el trabajo de spec y el de código. Por sí sola no impide escrituras.
