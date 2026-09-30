# Gestión de contexto

> Traducción al español. La referencia canónica es [la versión en inglés](../../en/concepts/context-management.md).

Un agente trabaja mejor con un contexto pequeño y relevante. TRUSS favorece la **progressive disclosure**: cargar lo que la tarea necesita, cuando lo necesita, y nada más. Cargar de entrada todo el árbol de documentación o todas las skills desperdicia la atención del agente y esconde lo que importa.

## Qué debería cargar un agente

Para una tarea de implementación, y por orden de importancia:

1. El cambio activo de OpenSpec: proposal, specs, design y tasks.
2. El archivo de guía del proyecto (`AGENTS.md`), que debería apuntar a más documentación en lugar de contenerla.
3. Las policies relevantes y el workflow [`execute-change`](../workflows/execute-change.md).
4. Solo el código y la documentación que necesita la siguiente tarea.

No tienes que recordar esta lista. `truss continue` la imprime, con las rutas reales de tu disposición de archivos, bajo `Context to load`.

## Cómo ayuda TRUSS

- **`truss continue`** nombra el siguiente paso y los archivos que hay que leer para darlo.
- **Las skills se cargan bajo demanda.** `truss skills` las lista; usa una skill cuando surja su situación (una sesión de Grill para requisitos poco claros, un prototype para una duda técnica sin resolver) y no cargues las siete de antemano.
- **Graphify** es un mapa opcional de relaciones e impacto del código. Úsalo cuando un cambio cruza módulos. Cuando no está disponible, la búsqueda nativa, grep y el language server del editor son el fallback. Ninguno es obligatorio.
- **`writing-for-agents`** es una skill para mantener pequeños, fiables y basados en punteros los archivos pensados para agentes.
- **[`truss handoff`](../reference/handoff.md)** escribe una nota breve cuando el trabajo pasa a otro agente, runtime, sesión o persona. Úsalo solo ante un límite real; no hagas handoff en cada paso.

## Reglas prácticas

- Prefiere un puntero a una copia: indica dónde vive un documento en lugar de pegarlo.
- Mantén `AGENTS.md` corto. Uno largo se carga siempre, sea relevante o no.
- Guarda el conocimiento durable donde pueda volver a encontrarse (OpenSpec, tests, docs) y deja que el estado de sesión sea local. Consulta [estado durable vs efímero](durable-vs-ephemeral.md).
