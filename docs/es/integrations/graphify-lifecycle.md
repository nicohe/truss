# Ciclo de vida de Graphify

> Traducción al español. La referencia canónica es [la versión en inglés](../../en/integrations/graphify-lifecycle.md).

Graphify es inteligencia de código opcional. TRUSS sigue funcionando sin él, salvo que el proyecto establezca explícitamente `required: true`.

## Configuración

```yaml
integrations:
  graphify:
    enabled: true
    required: false
```

| enabled | required | Comportamiento |
|---|---|---|
| false | false | Graphify se ignora. |
| true | false | Se usa Graphify cuando está listo; si no, se usa search/grep/LSP nativos. |
| true | true | Graphify debe estar instalado y su grafo debe estar listo y al día; si no, la capacidad bloquea. |
| false | true | Configuración inválida; la rechaza la validación de la configuración. |

## Estados

- `disabled`: la integración está apagada a propósito.
- `missing`: el CLI no está disponible.
- `needs_bootstrap`: el CLI existe pero `graphify-out/graph.json` no.
- `ready`: el grafo existe y se considera al día.
- `stale`: el grafo es anterior al Git HEAD actual o difiere de él.
- `unknown_freshness`: el grafo existe pero no se puede establecer con seguridad si está al día.

TRUSS escribe `graphify-out/.truss-graphify.json` tras un refresco exitoso gestionado por TRUSS. Registra el Git HEAD usado para construir o actualizar el grafo. Para los grafos creados fuera de TRUSS se usa como alternativa conservadora la fecha de modificación relativa al Git HEAD.

## Comandos

```bash
truss graphify
truss graphify bootstrap
truss graphify update
```

Bootstrap usa el CLI de Graphify para construir un grafo de código. Update refresca un grafo existente. TRUSS no instala Graphify ni cambia su versión en silencio.

`bootstrap`, y `update` cuando todavía no hay grafo, ejecutan `graphify extract . --code-only`: indexa solo el código y no llama a ningún modelo de lenguaje. `update` con un grafo ejecuta `graphify update .`. Cuando el comando falla, `truss graphify` lo imprime junto con el error que dio Graphify, recortado a sus últimas 12 líneas (un traceback de Python termina con el mensaje que importa), y un `graphify-out/graph.json` corrupto se arregla como dice Graphify: borra el archivo y ejecuta `bootstrap` otra vez. Solo cuando tu Graphify no conoce `extract` (una release antigua) TRUSS ejecuta la forma anterior, `graphify . --no-viz`, y entonces imprime ese comando.

## Semántica de fallo

Cuando es opcional, que Graphify falte, esté desactualizado o no esté listo no bloquea a TRUSS y el agente debe recurrir a la exploración nativa del repositorio. Cuando es obligatorio, esos mismos estados bloquean el workflow que depende de Graphify y `truss graphify` devuelve un código de salida distinto de cero.

El CLI actual de Graphify admite la extracción local de un grafo de código con `graphify update .` y produce `graphify-out/graph.json`. Consulta el repositorio oficial de Graphify para ver los detalles de instalación y del CLI.
