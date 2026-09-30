# Desarrollo guiado por especificación

> Traducción al español. La referencia canónica es [la versión en inglés](../../en/concepts/spec-driven-development.md).

La idea: escribir lo que un cambio debe hacer *antes* de implementarlo, mantener esa descripción junto al código y comprobar el resultado contra ella. TRUSS no define un formato propio para esto. Exige [OpenSpec](../integrations/openspec.md), que guarda cada cambio como un pequeño conjunto de archivos: proposal, specs, design y una lista de tareas.

## El camino de un cambio

```text
idea → proposal → specs → design → tasks → implementar → verificar → review → archivar
```

- **Antes de implementar**, los cuatro artefactos de planificación describen el cambio. `truss new` crea el cambio; `truss continue` le dice al agente qué artefacto escribir a continuación.
- **Mientras se implementa**, la lista de tareas es el medidor de progreso. `truss status` muestra `Tasks 1/3 complete`, y un cambio solo cuenta como completo cuando todas las tareas están marcadas.
- **Antes de terminar**, `truss verify` ejecuta las comprobaciones determinísticas, un review compara el resultado con la spec y el cambio se archiva a través de OpenSpec.

## Dos formas de tratar la spec

`spec.mode` decide qué ocurre cuando la implementación te enseña algo que la spec no sabía.

| Modo | La spec es... | Cuando descubres algo |
|---|---|---|
| `anchored` (por defecto) | el ancla permanente | puedes refinar la spec, el design, los tests o las tareas, pero la divergencia debe ser explícita y reconciliarse antes de terminar el cambio |
| `source` | la autoridad mientras implementas | vuelves primero a la fase de spec y cambias el código solo después |

En ambos, el código y la especificación nunca divergen en silencio. `anchored` sirve para la mayoría del trabajo, donde descubrir es normal. `source` sirve para trabajo cuyo comportamiento está fijado de antemano, como un contrato o una funcionalidad regulada. Los detalles, con diagramas, están en los [modos de especificación](../workflows/spec-modes.md).

## Qué hace TRUSS al respecto

TRUSS comprueba las partes mecánicas y le pide el resto al agente:

- **TRUSS comprueba:** que OpenSpec esté instalado y sea compatible, la fase del cambio activo y, si activas `verification.tasks_complete`, que no quede ninguna tarea abierta.
- **Al agente se le pide:** seguir el modo, reconciliar los descubrimientos y mantener honesta la spec. Nada en v0.2 impide que un agente ignore la spec. `spec.zone_guard` solo *declara* la intención de mantener separado el trabajo de spec y el de código.

Consulta el [modelo de enforcement](../reference/enforcement.md) para ver el límite exacto.
