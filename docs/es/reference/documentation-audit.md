# Auditoría de la documentación de TRUSS v0.1

> Traducción al español. La referencia canónica es [la versión en inglés](../../en/reference/documentation-audit.md).

> Documento histórico. Describe la documentación de v0.1.0 de TRUSS y se conserva como registro. Para lo que vale hoy, consulta el [contrato de la versión v0.2](release-v0.2.md) y el [modelo de enforcement](enforcement.md).

Versión auditada: **0.1.0 estable**.

Propósito: evitar que la documentación presente una policy del agente o una futura orquestación de runtime como una garantía ejecutable de v0.1.

Definiciones canónicas de enforcement: [`enforcement.md`](enforcement.md).

## Resultado de la auditoría

- El comportamiento ejecutable del CLI está etiquetado o redactado como comportamiento **[TRUSS]**.
- BDD, TDD, la disciplina de spec, la calidad del review, la disciplina de contexto y el fallback opcional de Graphify siguen siendo comportamiento **[AGENT]**.
- La orquestación de runtime, los reviewers aislados, los equipos y subagents automáticos, los hooks y los controles de escritura por zonas siguen siendo comportamiento **[ADAPTER]** / futuro.
- `spec.zone_guard` sigue siendo **[DECLARATIVE]** en v0.1.
- La documentación de Graphify ahora refleja la implementación: un Graphify obligatorio bloquea `truss graphify` y `truss doctor`; la implementación dirigida por el agente sigue dependiendo de que el agente respete ese requisito.
- La documentación de primeros pasos ahora coincide con el modelo de distribución elegido, `.truss/` local al proyecto más el `.gitignore` del anfitrión, y no exige una instalación global con `npm link`.
- La referencia del CLI se comprobó contra `bin/truss.mjs`; los comandos de v0.1 documentados existen. `truss review` no se documenta como ejecutable a propósito.

Esta auditoría es una comprobación de release, no un mecanismo de enforcement en runtime. Los cambios de comportamiento futuros deben actualizar tanto el código y los tests como la documentación de enforcement correspondiente.
