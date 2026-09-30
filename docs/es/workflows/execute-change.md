# execute-change

> Traducción al español. La referencia canónica es [la versión en inglés](../../en/workflows/execute-change.md).

`execute-change` es el workflow central de implementación de TRUSS. Toma un cambio ya definido en OpenSpec y lo lleva de **especificado** a **implementado, con evidencia, verificado y revisado**.

OpenSpec define **qué** debe cambiar. `execute-change` coordina **cómo se ejecuta ese cambio como trabajo de ingeniería**.

## Entradas

- cambio OpenSpec activo: proposal, specs, design y tasks;
- instrucciones `AGENTS.md` globales/del componente;
- policies configuradas de TRUSS;
- próxima tarea vertical lista;
- contexto mínimo relevante de código/documentación;
- impacto/contexto de Graphify cuando esté habilitado y disponible;
- ADRs relevantes cuando existan.

## Flujo

1. Resolver y leer el cambio OpenSpec activo.
2. Confirmar que está suficientemente definido; usar Grill si queda ambigüedad material.
3. Elegir la menor vertical slice demostrable que esté lista.
4. Resolver únicamente el contexto necesario para esa slice.
5. Si BDD está habilitado, establecer comportamiento observable de aceptación y RED cuando aplique.
6. Si TDD está habilitado, usar RED → GREEN mínimo → refactor para detalles de implementación.
7. Mantener código, tests y OpenSpec alineados según `spec.mode`.
8. Llevar el comportamiento de aceptación a GREEN.
9. Actualizar tasks y evidencia durable explícitamente.
10. Ejecutar la verificación determinística configurada con `truss verify`.
11. Ejecutar Code Review contra Spec, Standards y Risk.
12. Crear Handoff solo cuando cambie contexto, responsabilidad, sesión o runtime.
13. Continuar con la siguiente tarea lista o finalizar el cambio.

## Enforcement en v0.2

En v0.2, `execute-change` es un **contrato de instrucciones** seguido por el coding agent. TRUSS ejecuta directamente la verificación determinística, mientras que BDD/TDD/comportamiento de spec son principalmente enforced por el agente. La orquestación por runtime está prevista para v0.3.

## No es una skill

`execute-change` es un workflow/orquestador. Puede invocar skills, aplicar policies y consumir integraciones; no es una skill.
