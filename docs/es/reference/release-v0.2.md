# Contrato de la versión v0.2 de TRUSS

> Traducción al español. La referencia canónica es [la versión en inglés](../../en/reference/release-v0.2.md).

Este es el contrato de la línea v0.2 (0.2.0 y sus releases de parche). TRUSS v0.2 mantiene el modelo dirigido por el agente de [v0.1.0](release-v0.1.md) y añade el primer **enforcement de la policy de ingeniería por parte de TRUSS**: gates opcionales en `truss verify` que comprueban hechos determinísticos de un cambio. TRUSS sigue sin ejecutar ningún coding agent por sí mismo.

## Alcance estable

Todo lo garantizado por el contrato de v0.1.0 y, desde v0.1.0:

- **Aprobación de `truss verify`.** Una lista de `verification.commands` nueva o modificada debe aprobarse antes de ejecutarse, por proyecto y fuera del repositorio. Sin terminal necesita `--trust` o `TRUSS_TRUST=1`. Consulta el [modelo de confianza](../../../SECURITY.md) (en inglés).
- **Gate tests-required** (`verification.tests_required: off | warn | block`): un cambio que toca código fuente sin tocar ningún test se informa o se rechaza.
- **Gate tasks-complete** (`verification.tasks_complete: off | warn | block`): las tareas abiertas del cambio OpenSpec activo se informan o se rechazan.
- **Fase del ciclo de vida a partir del progreso de tareas.** `truss status` y `truss continue` derivan la fase del progreso de tareas de OpenSpec. Un cambio está `complete` solo cuando tiene tareas y ninguna está abierta.
- **Windows.** OpenSpec y Graphify instalados con npm (shims `.cmd`) se lanzan sin shell.
- Un parser de configuración más estricto, nombres de cambio a prueba de acentos, salida que respeta `NO_COLOR` y la terminal, y escrituras de estado atómicas.

Ambos gates vienen en `off` por defecto, así que un proyecto que no cambia nada conserva su comportamiento de verificación anterior.

## Lo que los gates no afirman
Comprueban que cambiaron archivos de test y que las tareas están marcadas. **No** demuestran que los tests se escribieron primero (TDD), que cubren el cambio, que pasan ni que las tareas marcadas se hicieran de verdad. Eso sigue siendo cosa de `verification.commands` y de la disciplina del agente. Consulta el [modelo de enforcement](enforcement.md).

## Compatibilidad
- Node.js: `>=20`; el CI cubre Node 20 y 24 en Ubuntu y en macOS. Node 22 en Ubuntu y Node 24 en Windows están en pausa por ahora (consulta [CI](../development/ci.md)), así que no se prueba nada en Windows hasta que vuelvan.
- Schema de configuración: `version: 1`. Las opciones nuevas son aditivas; las configuraciones existentes siguen siendo válidas.
- OpenSpec: estable `>=1.0.0 <2.0.0`. Un test de contrato ejecuta el ciclo de vida contra el CLI real (`@fission-ai/openspec@1`) en el CI.
- Graphify: opcional salvo que `integrations.graphify.required: true`.

## Cambios de comportamiento para proyectos existentes
- `verify` pide aprobación (ver arriba).
- El parser de configuración rechaza la sintaxis que nunca admitió en lugar de aceptarla en silencio; pon entre comillas los valores que empiecen por `& * ! | > [ {`.
- Los nombres de cambio pierden los acentos (`Añadir política` pasa a ser `anadir-politica`).
- `status` y `continue` informan `implementation` (no `complete`) mientras haya tareas abiertas.
- `truss config` ahora lista las dos opciones nuevas con sus valores por defecto; el archivo de evidencia gana `testsRequired` y `tasksComplete` solo cuando un gate está activado.

## Distribución
Sin cambios respecto a v0.1: clona TRUSS en el directorio `.truss/` del proyecto anfitrión e ignora ese directorio en el repositorio anfitrión. TRUSS se actualiza de forma explícita con Git.

## Gate de release
Una release v0.2.x está lista solo cuando:
1. `npm ci` tiene éxito.
2. `npm run ci` tiene éxito (chequeo de sintaxis, lint y formato con Biome, y todas las suites de tests).
3. Se cumple el mínimo de cobertura (`npm run test:coverage`).
4. Todos los jobs de CI requeridos están en verde y el job `Contract / real OpenSpec` pasa.
5. La documentación no afirma una orquestación de runtime que v0.2 no ofrece.
6. Los metadatos de paquete y versión coinciden con la release, en todos los sitios donde se escriben (consulta [Publicar una release](../development/releasing.md)).

## Límite de v0.3
El TRUSS dirigido por orquestación sigue siendo trabajo futuro: runtime adapters, resolución de contexto, ejecución y enrutado automáticos de tareas, review aislado, automatización del handoff y ejecución consciente de capacidades. Nada de eso es una garantía de v0.2.
