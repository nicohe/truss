# BDD y TDD

> Traducción al español. La referencia canónica es [la versión en inglés](../../en/concepts/bdd-tdd.md).

TRUSS le pide a los agentes trabajar en dos bucles anidados. Ambos son *policies*, no comandos ni skills: viven en `.truss/policies/` y los sigue el coding agent.

## Los dos bucles

- **BDD es el macro-loop.** Expresa el comportamiento observable desde fuera como un escenario y míralo fallar (RED). Implementa. Míralo pasar (GREEN). El escenario sigue siendo trazable al cambio de OpenSpec.
- **TDD es el micro-loop.** Para el interior: escribe un test enfocado que falle, hazlo pasar con el mínimo código y luego refactoriza mientras los tests siguen en verde.

El trabajo se corta en **vertical slices**: la pieza más pequeña que demuestra un comportamiento por sí sola. «La base de datos», «la API» y «los tests» son capas horizontales; una slice que permite a un usuario reintentar una petición fallida es vertical.

`development.bdd` y `development.tdd` (ambos `true` por defecto) activan los bucles. Son instrucciones para el agente; TRUSS no las orquesta en v0.2 y solo lo dice: `truss continue` le avisa al agente cuando uno está desactivado. Desactivar `bdd` puede ser razonable en refactors o tooling sin comportamiento observable nuevo; no desactiva los tests existentes ni `truss verify`.

## Qué puede comprobar TRUSS y qué no

TRUSS no puede ver si un test se escribió antes que el código. Sí puede comprobar hechos a su alrededor:

| Pregunta | Cómo | Estado |
|---|---|---|
| ¿Pasan los tests y tienen éxito el lint, los tipos y el build? | `verification.commands` en `truss verify` | siempre se exige |
| ¿El cambio tocó algún test? | `verification.tests_required: warn \| block` | opcional |
| ¿Están marcadas todas las tareas? | `verification.tasks_complete: warn \| block` | opcional |
| ¿Se escribió cada test primero? ¿Cubre realmente el cambio? | | **no se puede comprobar**; queda en manos del agente y del review |

Por eso `tests_required` es un mínimo, no una prueba de buenos tests: un cambio con un test sin sentido lo supera. Trata un aviso suyo como un paso de TDD fallido, no como algo que silenciar. Consulta [`truss verify`](../reference/verify.md#gate-tests-required) para ver cómo se clasifican los archivos como fuente o tests.

## Dónde viven las reglas

- Las policies: `.truss/policies/bdd.md` y `.truss/policies/tdd.md` en la instalación de TRUSS (consulta la [estructura del proyecto](../reference/project-structure.md)).
- El workflow paso a paso que las aplica: [`execute-change`](../workflows/execute-change.md).
