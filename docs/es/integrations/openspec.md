# OpenSpec

> Traducción al español. La referencia canónica es [la versión en inglés](../../en/integrations/openspec.md).

OpenSpec es una **base obligatoria de TRUSS**, no una integración opcional. TRUSS no implementa un segundo formato de especificación ni hace fallback silencioso hacia otro sistema de specs.

## Propiedad y ciclo de vida

OpenSpec mantiene un ciclo de vida independiente y puede utilizarse sin TRUSS. `truss init` debe detectar primero si el proyecto ya tiene OpenSpec antes de intentar configurarlo.

- OpenSpec compatible existente: reutilizarlo y preservar todas las specs/cambios.
- OpenSpec ausente: inicializar/configurar OpenSpec antes de ejecutar workflows TRUSS.
- OpenSpec existente incompatible: informar y detenerse; nunca actualizar silenciosamente.
- Datos OpenSpec existentes: nunca sobrescribirlos durante la inicialización de TRUSS.

TRUSS sí configura cómo trabaja con las especificaciones mediante `spec.mode`, `spec.gherkin` y `spec.zone_guard`, pero OpenSpec no se habilita/deshabilita desde `integrations`.
