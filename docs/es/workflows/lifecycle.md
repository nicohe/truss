# Ciclo de vida de un cambio

Este es el orden canónico de punta a punta para un cambio en TRUSS. No todas las skills son pasos secuenciales: algunas son condicionales o transversales.

## Flujo completo

```text
0. truss doctor
        ↓
1. truss new "Nombre del cambio"
        ↓
2. Discovery cuando haga falta
   ├─ grill-me
   └─ grill-with-docs
        ↓
3. prototype? (solo ante incertidumbre técnica sin resolver)
        ↓
4. Completar/revisar OpenSpec
        ↓
5. truss continue / execute-change
        ↓
6. BDD macro-loop + TDD micro-loop según config
        ↓
7. truss verify
        ↓
8. skill code-review / workflow de review
        ↓
9. Alineación / verify de OpenSpec
        ↓
10. OpenSpec archive
```

`handoff` se inserta únicamente cuando cambia responsabilidad, agente, runtime, sesión o contexto. `writing-for-agents` y `caveman` son transversales. Graphify es una capability de inteligencia de código bajo demanda.

## Mapeo comando / workflow / skill

| Orden | Objetivo | CLI TRUSS | Workflow / policy | Skill o capability externa |
|---:|---|---|---|---|
| 0 | Comprobar requisitos | `truss doctor` | readiness del entorno | OpenSpec requerido; estado Graphify |
| 1 | Iniciar cambio | `truss new "..."` | crear scaffold del cambio activo | OpenSpec |
| 2 | Resolver ambigüedad | sin CLI dedicado en v0.2 | `grill` | `grill-me` o `grill-with-docs` |
| 3 | Probar una idea incierta | sin CLI dedicado | discovery | `prototype` (opcional) |
| 4 | Cerrar comportamiento esperado | comandos/herramientas OpenSpec | fase spec | OpenSpec |
| 5 | Implementar siguiente slice/task | `truss continue` | `execute-change` | coding agent; Graphify si aporta valor |
| 6 | Desarrollar con feedback | dentro de `execute-change` | policies BDD/TDD | — |
| 7 | Ejecutar quality gates | `truss verify` | verification policy | comandos configurados |
| 8 | Revisar | no existe `truss review` ejecutable en el starter v0.2 | workflow code-review | `code-review` |
| 9 | Transferir estado vivo | `truss handoff` | workflow handoff | `handoff` |
| 10 | Comprobar alineación con spec | comandos/herramientas OpenSpec | completion | OpenSpec |
| 11 | Cerrar/archivar | comandos/herramientas OpenSpec | completion | OpenSpec |

Importante: v0.2 es agent-driven. `truss continue` indica al agente qué continuar; todavía no invoca un runtime adapter ni ejecuta automáticamente la task. La orquestación completa corresponde a v0.3.

## Skills que no son secuenciales

```text
writing-for-agents ───────────────────────────── documentación/contexto transversal
caveman ─────────────────────────────────────── compresión de comunicación
handoff ───────────── solo ante transición real de contexto/responsabilidad
Graphify ──────────── bajo demanda para relaciones/impacto de código
prototype ─────────── solo cuando la incertidumbre técnica lo justifica
```

No se deben cargar ni invocar todas las skills para cada cambio.
