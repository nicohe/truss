# Referencia CLI

TRUSS v0.1 es principalmente un Harness declarativo/agent-driven. La tabla distingue los comandos que ejecutan comportamiento de los que preparan o exponen estado.

| Comando | Comportamiento v0.1 | Siguiente paso |
|---|---|---|
| `truss init` | Crea `.truss/config.yaml` si falta; no lo sobrescribe | `truss doctor` |
| `truss doctor` | Comprueba Node, Git, config TRUSS, OpenSpec CLI/proyecto requeridos y disponibilidad opcional de Graphify | Resolver fallos requeridos |
| `truss config` | Valida y muestra la configuración resuelta | Corregir errores si falla |
| `truss openspec` | Inspecciona CLI/proyecto y compatibilidad de OpenSpec | Resolver incompatibilidades |
| `truss graphify [status|update|bootstrap]` | Inspecciona o actualiza el grafo | Usar fallback si es opcional |
| `truss components [name]` | Resuelve componentes configurados y su contexto | Usar el scope resuelto |
| `truss new "Nombre" [--component name]` | Crea scaffold OpenSpec y marca el cambio activo | Discovery/refinar spec |
| `truss status` | Muestra cambio y fase activos | Continuar fase actual |
| `truss continue` | Muestra OpenSpec activo e indica al agente continuar la primera task incompleta | El agente sigue `execute-change` |
| `truss verify` | Ejecuta realmente `verification.commands` en orden y se detiene en el primer fallo | Review si pasa |
| `truss handoff` | Escribe un handoff conciso del cambio activo | Solo ante transición de contexto |
| `truss skills` | Lista las skills portables instaladas | Cargar solo la skill relevante |

## Review

`code-review` existe como skill/workflow en v0.1, pero el CLI starter **no implementa actualmente** un comando ejecutable `truss review`. El review dirigido por runtime pertenece a la orquestación posterior. La documentación no debe insinuar lo contrario.

## Orden canónico

Ver [Ciclo de vida](../workflows/lifecycle.md) para el orden conjunto de CLI + OpenSpec + workflows + skills.

### Evidencia de Verification

`truss verify` ejecuta los gates secuencialmente y con fail-fast. Exit `0` significa que todos pasaron; `1` significa que Verification falló o no hay gates configurados; `2` significa configuración TRUSS inválida. El último resultado legible por máquina se guarda en `.truss/verification/latest.json`.
