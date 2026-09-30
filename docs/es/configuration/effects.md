# Efectos de configuración

> Traducción al español. Esta página responde: **¿qué cambia cuando modifico un valor?**

| Cambio | Comportamiento efectivo | Enforcement v0.1 |
|---|---|---|
| `spec.mode: anchored` | Spec queda como ancla; spec/tests/código pueden evolucionar con reconciliación explícita | AGENT |
| `spec.mode: source` | Cambios de comportamiento vuelven a spec antes de continuar implementación | AGENT |
| `spec.gherkin: true` | Se esperan/prefieren escenarios Gherkin | AGENT |
| `spec.gherkin: false` | Se permiten criterios estructurados sin Gherkin | AGENT |
| `spec.zone_guard: true` | Se espera separación Spec Zone / Code Zone | AGENT / DECLARATIVE |
| `development.bdd: true` | `execute-change` aplica macro-loop aceptación RED → GREEN | AGENT |
| `development.bdd: false` | BDD deja de ser obligatorio | AGENT |
| `development.tdd: true` | `execute-change` aplica RED → GREEN mínimo → refactor | AGENT |
| `development.tdd: false` | TDD deja de ser obligatorio | AGENT |
| cambiar `verification.commands` | `truss verify` ejecuta la nueva lista en orden | TRUSS |
| `graphify.enabled: false` | Los comandos TRUSS tratan Graphify como disabled; el agente usa descubrimiento nativo | TRUSS + AGENT |
| `graphify.enabled: true, required: false` | TRUSS reporta readiness; missing/unready no bloquea; el agente puede usar fallback nativo | TRUSS + AGENT |
| `graphify.enabled: true, required: true` | `truss graphify` / `doctor` bloquean si falta/no está ready; el agente debe respetarlo durante implementación | TRUSS + AGENT |
| `components: {}` | Workspace único | TRUSS/AGENT, parcial |
| definir `components` | Habilita scoping por componente | TRUSS/AGENT, parcial |

OpenSpec no tiene switch `enabled`/`required`: es una base obligatoria de TRUSS.
