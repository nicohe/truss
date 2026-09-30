# Pruebas de TRUSS

> Traducción al español. La referencia canónica es [la versión en inglés](../../en/development/testing.md).

TRUSS mantiene suites permanentes de tests unitarios, de integración y end-to-end bajo `test/`. Usan el `node:test` integrado de Node.js; no hay dependencias de test. `scripts/run-tests.mjs` lista él mismo los archivos de test, porque `cmd.exe` y Node 20 no expanden globs.

| Comando | Qué ejecuta |
|---|---|
| `npm test` | las tres suites, una tras otra |
| `npm run test:unit` | `test/unit/`: los módulos de la librería por separado |
| `npm run test:integration` | `test/integration/`: el CLI como proceso externo |
| `npm run test:e2e` | `test/e2e/`: recorridos completos de usuario |
| `npm run test:coverage` | todas las suites, y falla cuando la cobertura cae por debajo del mínimo (líneas 90 %, ramas 75 %, funciones 95 %) |
| `npm run ci` | toda la comprobación local: sintaxis, comprobación de la documentación, lint y todas las suites |

## Tests unitarios

Cubren el parseo, la validación y los valores por defecto de la configuración, la clasificación de compatibilidad con OpenSpec, la resolución y la seguridad de los componentes, los estados de la policy de Graphify, el fail-fast y la evidencia de la verificación, el almacén de aprobaciones, los gates tests-required y tasks-complete, los helpers de estado del ciclo de vida, la salida por terminal, el lanzamiento de CLIs instalados con npm en Windows, `init`, `doctor` y la propia comprobación de la documentación.

## Tests de integración

TRUSS también ejecuta el CLI como proceso externo contra workspaces temporales aislados. Esto valida los límites de los comandos, los efectos sobre el sistema de archivos, la detección de dependencias y los contratos de códigos de salida, en lugar de llamar solo a funciones de la librería.

La suite de integración cubre:

- configuración válida e inválida mediante `truss config`;
- el éxito, el fallo, el fail-fast, la aprobación, los dos gates y la evidencia de `truss verify`;
- `truss doctor` con OpenSpec compatible e incompatible;
- el comportamiento de Graphify opcional y obligatorio;
- la adopción de `truss init` y la inicialización idempotente de OpenSpec;
- `truss new`, `status` y `continue` contra un OpenSpec que se comporta como el real.

Los CLIs externos se representan con fixtures locales determinísticos, instalados como npm instala un CLI global. La suite no instala, actualiza ni contacta con OpenSpec ni con Graphify por la red. Los fixtures solo son fiables mientras se comporten como las herramientas reales, que es lo que comprueba el test de contrato de abajo.

## Tests end-to-end

La suite E2E ejercita el ciclo de vida completo visible para el usuario mediante procesos reales del CLI de TRUSS y workspaces Git temporales. Cubre el ciclo de vida de un proyecto nuevo, la adopción de un proyecto OpenSpec existente sin sobrescribir archivos durables, activar Graphify opcional más adelante, las dos formas documentadas de instalar TRUSS y un test de contrato contra el CLI real de OpenSpec. Consulta las [pruebas end-to-end](e2e.md).

La ejecución automática del coding agent y el archivado automático de OpenSpec quedan fuera del límite E2E, porque son a propósito trabajo del agente o del usuario hasta v0.3.

## CI

La misma suite permanente se ejecuta en GitHub Actions sobre Ubuntu, macOS y Windows con Node.js 20, 22 y 24, y un job exige el mínimo de cobertura. Consulta [`ci.md`](ci.md).

Equivalente en local:

```bash
npm ci --ignore-scripts
npm run ci
```
