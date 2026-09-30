> Traducción al español. La referencia canónica es [la versión en inglés](../../en/reference/glossary.md).

# Glosario

Los términos están en orden alfabético.

- **Adaptador (adapter):** una implementación específica de un runtime, por ejemplo para Claude Code o Codex. No forma parte del core de v0.2; consulta el [modelo de enforcement](enforcement.md).
- **ADR (registro de decisión de arquitectura):** un documento breve que registra una decisión arquitectónica y por qué se tomó. Escribe uno solo cuando una decisión merezca sobrevivir al cambio; el [ADR 0001](../development/decisions/0001-local-project-configuration.md) es un ejemplo.
- **Agente:** el asistente de código que hace el trabajo de implementación. TRUSS nunca ejecuta uno; le dice al agente qué hacer a continuación.
- **Aprobación (trust):** tu confirmación de que una lista de `verification.commands` puede ejecutarse. Se guarda por proyecto y se vuelve a pedir cuando la lista cambia. Consulta [`truss verify`](verify.md).
- **Cambio (change):** una unidad de trabajo registrada por OpenSpec, con proposal, specs, design y tasks. `truss new` la crea.
- **Componente (component):** una unidad direccionable de un monorepo, declarada bajo `components`.
- **Descubrimiento (discovery):** el trabajo previo a la spec, en el que una idea poco clara se convierte en decisiones explícitas. Consulta *Grill*.
- **Evidencia (evidence):** el registro legible por máquina de una ejecución de `truss verify`, en `.truss/verification/latest.json`.
- **Fail-fast:** detenerse en el primer fallo en lugar de ejecutar lo que queda. `truss verify` lo hace: un comando que falla termina la ejecución.
- **Fase (phase):** en qué punto está un cambio: `spec` (faltan artefactos de planificación), `implementation` (planificado, con tareas abiertas) o `complete` (todas las tareas marcadas).
- **Gate:** una comprobación opcional de `truss verify` que puede informar o negarse antes de ejecutar ningún comando: `tests_required` y `tasks_complete`.
- **Gherkin:** el formato Given / When / Then para describir el comportamiento como escenarios. `spec.gherkin` indica si se espera el comportamiento de aceptación en ese formato.
- **Graphify:** una herramienta opcional que mapea las relaciones del código. Cuando falta, TRUSS recurre a la búsqueda nativa.
- **Grill:** una ronda guiada de preguntas que convierte una idea poco clara en decisiones explícitas, hecha con la skill `grill-me` o `grill-with-docs`. Es la herramienta principal del *descubrimiento*.
- **Handoff:** el estado vivo mínimo que se transfiere ante un cambio real de contexto, agente, runtime o sesión.
- **Instalación (installation):** la copia de TRUSS en sí (su código, schema, skills, policies y workflows), frente al *proyecto* sobre el que se ejecuta. Consulta la [estructura del proyecto](project-structure.md).
- **Integración (integration):** una capacidad externa con la que trabaja TRUSS, como OpenSpec o Graphify.
- **Merge-base:** el commit donde tu rama salió de la rama base. El gate tests-required compara tus cambios contra él.
- **OpenSpec:** la herramienta de especificación requerida. TRUSS lee su estado y nunca la reemplaza.
- **Policy:** una regla de comportamiento que se le pide seguir al agente, por ejemplo BDD o TDD.
- **RED / GREEN:** en un bucle que empieza por el test, RED es un test que falla porque el comportamiento aún no existe, y GREEN es ese mismo test pasando. El refactor se hace mientras sigue en GREEN. Consulta [BDD y TDD](../concepts/bdd-tdd.md).
- **Skill:** una capacidad reutilizable del agente, como `grill-me` o `code-review`.
- **Spec-Anchored / Spec-as-Source:** los dos valores de `spec.mode`. Consulta los [modos de especificación](../workflows/spec-modes.md).
- **Verificación (verification):** evidencia ejecutable determinística: los comandos que configuraste, ejecutados en orden.
- **Vertical slice:** la pieza más pequeña de un cambio que demuestra un comportamiento por sí sola, de fuera hacia dentro. «La base de datos» es una capa horizontal; «un usuario puede reintentar una petición fallida» es una vertical slice. Consulta [BDD y TDD](../concepts/bdd-tdd.md).
- **Workflow:** una coordinación de pasos, skills y policies, como [`execute-change`](../workflows/execute-change.md).
- **Zone guard:** la intención declarada (`spec.zone_guard`) de mantener separado el trabajo de spec y el de código. Por sí sola no impide escrituras.
