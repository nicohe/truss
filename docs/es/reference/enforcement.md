# Modelo de enforcement

> Traducción al español. `docs/en/reference/enforcement.md` es la referencia canónica.

TRUSS v0.2 separa garantías implementadas de instrucciones para agentes y comportamiento futuro de adapters.

| Etiqueta | Significado en v0.2 |
|---|---|
| **[TRUSS]** | TRUSS lo fuerza/ejecuta mediante código y, cuando corresponde, tests automáticos. |
| **[AGENT]** | Policy/instrucción que debe seguir el coding agent; TRUSS v0.2 no puede forzarla técnicamente. |
| **[ADAPTER]** | Requiere una integración específica del runtime. v0.2 no tiene orquestación completa. |
| **[DECLARATIVE]** | Expresa intención/policy, pero v0.2 no la fuerza técnicamente. |

## Garantizado por TRUSS v0.2

**[TRUSS]** El CLI implementa actualmente:

- parsing, defaults y validación de configuración;
- detección de OpenSpec CLI/proyecto y compatibilidad de versión;
- `truss init` idempotente/no destructivo dentro del contrato documentado;
- resolución de components;
- estado/update/bootstrap de Graphify y estado bloqueante cuando es required;
- diagnóstico de `truss doctor` y clases de exit code documentadas;
- verification secuencial/fail-fast y evidencia local;
- `new`, `status` y cálculo de siguiente acción de `continue` respaldados por OpenSpec; la fase (`spec` / `implementation` / `complete`) sale del progreso de tareas de OpenSpec;
- gate opcional de tests obligatorios en `truss verify` (`verification.tests_required`): código fuente cambiado sin ningún test se informa (`warn`) o detiene la verificación (`block`). Comprueba que cambiaron archivos de test, no que se escribieran primero ni que sean significativos;
- gate opcional de tareas completas (`verification.tasks_complete`): las tareas abiertas del cambio activo se informan (`warn`) o detienen la verificación (`block`). Comprueba que las tareas están marcadas, no que el trabajo sea real;
- creación local del scaffold de handoff y listado de skills.

## Enforced por el agente en v0.2

**[AGENT]** Siguen siendo instrucciones y no garantías técnicas:

- disciplina Spec-Anchored / Spec-as-Source;
- uso de Gherkin;
- loops BDD/TDD (TRUSS solo puede comprobar que cambiaron tests, con `verification.tests_required`);
- reconciliar descubrimientos de implementación con la spec;
- decidir cuándo usar Graphify opcional;
- usar search/grep/LSP como fallback semántico;
- calidad/independencia del code review;
- mover descubrimientos durables de handoff a OpenSpec/ADRs/docs;
- cargar solamente contexto relevante.

## Adapter / futuro

**[ADAPTER]** v0.2 no garantiza invocación automática del coding agent, reviewer aislado, routing de subagents/teams, zone guard técnico, hooks, MCP, worktrees automáticos ni routing por capabilities.

**[DECLARATIVE]** `spec.zone_guard` declara el comportamiento Spec Zone / Code Zone, pero v0.2 no impide escrituras por sí mismo.

## Distinción importante: Graphify

**[TRUSS]** `graphify.required: true` produce estado bloqueante en `truss graphify` y `truss doctor` si Graphify falta o no está ready.

**[AGENT]** v0.2 no envuelve centralmente cada workflow posible; durante implementación agent-driven el agente debe respetar ese requisito. El fallback nativo opcional también es comportamiento del workflow del agente, no un motor automático de búsqueda implementado por TRUSS.

## Límite v0.2

```text
Garantías ejecutables TRUSS
        +
policies seguidas por el agente
        +
OpenSpec / Git / tests
        ↓
TRUSS v0.2

Orquestación automática del runtime
        ↓
no es garantía de v0.2
```
