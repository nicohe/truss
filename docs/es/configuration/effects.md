# Efectos de la configuración

> Traducción al español. La referencia canónica es [la versión en inglés](../../en/configuration/effects.md). Esta página responde: **¿qué cambia cuando modifico un valor?**

| Cambio | Comportamiento efectivo | Enforcement en v0.2 |
|---|---|---|
| `spec.mode: anchored` | La spec sigue siendo el ancla permanente; una reconciliación explícita puede hacer evolucionar spec, tests y código | AGENT |
| `spec.mode: source` | Los cambios de comportamiento vuelven a la spec antes de seguir implementando; `truss continue` lo dice mientras el agente implementa | AGENT |
| `spec.gherkin: true` | Se prefieren o esperan escenarios de aceptación en Gherkin | AGENT |
| `spec.gherkin: false` | Se permiten criterios de aceptación estructurados sin Gherkin | AGENT |
| `spec.zone_guard: true` | Se espera separación entre Spec Zone y Code Zone; `truss continue` se lo recuerda al agente mientras implementa | AGENT / DECLARATIVE |
| `development.bdd: true` | `execute-change` aplica el macro-loop de aceptación RED → GREEN | AGENT |
| `development.bdd: false` | El macro-loop BDD deja de ser obligatorio; `truss continue` se lo dice al agente mientras implementa | AGENT |
| `development.tdd: true` | `execute-change` aplica RED → GREEN mínimo → refactor | AGENT |
| `development.tdd: false` | El micro-loop TDD deja de ser obligatorio; `truss continue` se lo dice al agente mientras implementa | AGENT |
| cambiar `verification.commands` | `truss verify` ejecuta la nueva lista de comandos en orden | TRUSS |
| `verification.tests_required: warn` | `truss verify` informa de los cambios en código fuente sin cambios en tests y continúa | TRUSS (comprobación de presencia) |
| `verification.tests_required: block` | `truss verify` sale con `1` antes de ejecutar comandos cuando cambió código fuente sin tests | TRUSS (comprobación de presencia) |
| `verification.tasks_complete: warn` | `truss verify` lista las tareas abiertas del cambio OpenSpec activo y continúa | TRUSS (comprobación de progreso) |
| `verification.tasks_complete: block` | `truss verify` sale con `1` antes de ejecutar comandos mientras el cambio activo tenga tareas abiertas | TRUSS (comprobación de progreso) |
| `verification.base_ref` / `source_paths` / `test_paths` | Cambian contra qué compara el gate tests-required y cómo clasifica los archivos | TRUSS |
| `graphify.enabled: false` | Los comandos de Graphify tratan la capacidad como desactivada; el agente usa el descubrimiento nativo | TRUSS + AGENT |
| `graphify.enabled: true, required: false` | TRUSS informa de la disponibilidad de Graphify; que falte o no esté listo no bloquea; el agente puede usar el fallback nativo | TRUSS + AGENT |
| `graphify.enabled: true, required: true` | `truss graphify` y `doctor` bloquean cuando no está disponible o listo; el agente debe respetar el requisito al implementar | TRUSS + AGENT |
| `components: {}` | Un único workspace | TRUSS/AGENT, parcial |
| definir `components` | Activa el acotado por componente | TRUSS/AGENT, parcial |

OpenSpec no tiene un interruptor `enabled` ni `required`: es una base obligatoria de TRUSS.
