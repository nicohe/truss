> Traducción al español. La referencia canónica es [la versión en inglés](../../en/integrations/graphify.md).

# Graphify

Graphify es una capacidad de relaciones/impacto del codebase, no almacenamiento de requirements durables. Se usa cuando importan relaciones cross-module o análisis de impacto. Si es opcional y no está disponible, el fallback es búsqueda nativa, grep, LSP y exploración del runtime.

Esta página dice qué hace TRUSS con Graphify y qué no, para que sepas qué esperar. Para la configuración, los estados y los comandos, consulta el [ciclo de vida de Graphify](graphify-lifecycle.md).

## Qué hace TRUSS, y qué no

TRUSS **gestiona** el grafo: `truss graphify bootstrap` lo construye, `truss graphify update` lo refresca, y, mientras se implementa un cambio, `truss continue` termina con un párrafo corto **Code graph** que dice si el grafo está fresco, obsoleto o ausente. Eso es todo.

TRUSS **no** hace que el agente use el grafo. Nunca ejecuta una consulta de Graphify, nunca instala Graphify y no escribe nada en la guía ni en la configuración del agente. Un agente buscará con `grep` y `find` como siempre, salvo que algo le diga que consulte el grafo. El párrafo de `continue` es ese algo solo en el sentido débil de una frase que el agente lee.

## Hacer que un agente use el grafo

Esa parte es de Graphify. Tiene comandos que configuran cada agente, y **escriben archivos**. Ejecutados en un repositorio desechable, con una carpeta home desechable:

| Comando | Qué escribió |
|---|---|
| `graphify claude install` | una sección en `CLAUDE.md` y hooks PreToolUse en `.claude/settings.json`, en el proyecto |
| `graphify codex install` | una sección en `AGENTS.md` y `.codex/hooks.json`, en el proyecto |
| `graphify hook install` | hooks `post-commit` y `post-checkout` en `.git/hooks/` (locales a tu clon) y una línea en `.gitattributes` que registra un merge driver para `graphify-out/graph.json` (un archivo versionado) |

No se escribió nada en la carpeta home. Los demás agentes difieren, y la propia ayuda de Graphify dice dónde: `graphify devin install` escribe una skill en `~/.config/devin/skills/graphify/` (tu cuenta de usuario, no el proyecto), mientras que `graphify cursor install` escribe `.cursor/rules/graphify.mdc` (el proyecto). Ejecuta `graphify --help` para ver la lista, y `graphify <agente> uninstall` para deshacer uno.

En un repositorio que comparte tu equipo, los de nivel de proyecto ponen archivos delante de todos. Prefiere una instalación a nivel de usuario, u omite los instaladores y pon una línea en tu [archivo de guía personal](../guides/shared-repo.md#guía-para-tu-agente-que-se-queda-contigo), por ejemplo: *Before searching the tree for callers or impact, query the graph with `graphify query`, `explain`, `path` or `affected`.*

## Consultar el grafo

Con un grafo construido, estos son los comandos que un agente (o tú) puede ejecutar, según la ayuda de Graphify:

```bash
graphify query "<pregunta>"     # búsqueda en anchura en el grafo para una pregunta
graphify explain "X"            # un nodo y sus vecinos, en lenguaje llano
graphify path "A" "B"           # camino más corto entre dos nodos
graphify affected "X"           # qué depende de X, por recorrido inverso
```

Leen `graphify-out/graph.json` y no llaman a ningún modelo. Un nombre que no es un nodo del grafo da `No matching nodes found.`

## Mantén `.truss/` fuera del grafo

Graphify indexa el código del proyecto, y `.truss/` es código. En un proyecto desechable con tres archivos de código, `graphify extract . --code-only` leyó **3** archivos cuando `.truss/` estaba ignorado (mediante `.git/info/exclude`) y **51** cuando no lo estaba, con las funciones propias de TRUSS dentro del grafo. Ignora `.truss/` y `graphify-out/` antes de construir el grafo; consulta [usar TRUSS en un repositorio compartido](../guides/shared-repo.md#ignorar-truss-sin-tocar-gitignore).

## El grafo sigue los commits, no tu árbol de trabajo

TRUSS compara el grafo con el HEAD de Git. En una prueba, el grafo estaba `fresh` después de una edición sin commitear, así que no contenía la edición, y pasó a `stale` solo tras el commit. Si trabajas con código que aún no está commiteado, ejecuta `truss graphify update` tú mismo antes de fiarte del grafo. Si instalaste el hook de git de Graphify, un commit también inicia una reconstrucción en segundo plano.

## Cuándo adoptarlo

Es una recomendación. Graphify se gana su sitio cuando el código tiene varias capas con dependencias entre ellas, cuando otros módulos usan el que estás cambiando, o cuando los cambios rompen cosas que nadie esperaba. En un módulo pequeño, `grep` encuentra lo que necesitas y el grafo añade un paso que mantener. Empieza sin él, y añádelo cuando el agente se siga dejando fuera lo que toca un cambio.

## Silenciar el recordatorio

Con `integrations.graphify.enabled: false`, `truss continue` deja de imprimir el párrafo **Code graph**. `truss doctor` sigue listando una línea, `○ Graphify   disabled`, y la cuenta como una advertencia opcional. Mantén `required` en `false` cuando esté desactivado: esa pareja no es válida, y la comprobación de configuración rechaza `enabled: false` con `required: true`.

