# Contrato de la versión v0.1.0 de TRUSS

> Traducción al español. La referencia canónica es [la versión en inglés](../../en/reference/release-v0.1.md).

> Documento histórico. Describe v0.1.0 de TRUSS y se conserva como registro. Para lo que vale hoy, consulta el [contrato de la versión v0.2](release-v0.2.md) y el [modelo de enforcement](enforcement.md).

TRUSS v0.1.0 es la primera base estable del harness dirigido por el agente.

## Alcance estable

TRUSS garantiza por sí mismo:
- el parseo de la configuración, los valores por defecto, la validación del schema y las comprobaciones de combinaciones inválidas;
- la detección de OpenSpec, las comprobaciones de versión admitida, la adopción o inicialización segura y la integración con el estado del ciclo de vida;
- la resolución de rutas y alcance de los componentes;
- los comandos de diagnóstico y ciclo de vida de Graphify y su comportamiento de bloqueo cuando es obligatorio;
- el diagnóstico del proyecto mediante `truss doctor`;
- la verificación determinística, secuencial y fail-fast con evidencia local legible por máquina;
- los helpers del ciclo de vida del cambio activo: `new`, `status`, `continue` y `handoff`;
- los gates permanentes de tests unitarios, de integración, E2E y de CI.

El coding agent sigue siendo responsable del trabajo de ingeniería no determinístico, como Grill, la disciplina Spec-Anchored, la estrategia de ejecución de BDD/TDD, la implementación y el razonamiento del code review.

## Compatibilidad

- Node.js: `>=20`.
- Schema de configuración: `version: 1`.
- OpenSpec: estable `>=1.0.0 <2.0.0`.
- Graphify: opcional salvo que `integrations.graphify.required: true`.

## Distribución

En v0.1, clona TRUSS en el directorio `.truss/` del proyecto anfitrión e ignora ese directorio en el repositorio anfitrión. TRUSS se actualiza de forma explícita con Git; el proyecto anfitrión no lo actualiza en silencio.

## Gate de release

Un release v0.1.0 está listo solo cuando:
1. `npm ci` tiene éxito.
2. `npm run check` tiene éxito.
3. `npm test` tiene éxito.
4. La documentación no afirma una orquestación de runtime que v0.1 no ofrece.
5. Los metadatos de paquete y versión son `0.1.0`.
6. El archivo del release supera la validación de integridad ZIP.

## Releases posteriores

Este documento es el contrato histórico de v0.1.0. Preveía la orquestación de runtime para v0.2; eso se ha movido. v0.2.0 mantuvo el modelo dirigido por el agente y añadió gates opcionales del lado de TRUSS (consulta el [contrato de v0.2](release-v0.2.md)), y el TRUSS dirigido por orquestación (runtime adapters, resolución de contexto, ejecución y enrutado automáticos de tareas, review aislado, automatización del handoff, ejecución consciente de capacidades) está previsto ahora para v0.3. Nada de eso fue una garantía de v0.1.
