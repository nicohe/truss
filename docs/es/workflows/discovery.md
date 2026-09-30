# Descubrimiento (Grill)

> Traducción al español. La referencia canónica es [la versión en inglés](../../en/workflows/discovery.md).

El descubrimiento es el trabajo previo a la spec: convertir una idea poco clara en decisiones, para que tu agente no tenga que inventar requisitos cuando escriba los artefactos de OpenSpec. Se hace con una ronda de **Grill**, una conversación corta en la que el agente pregunta y tú respondes. TRUSS no ejecuta nada aquí: Grill es una skill que sigue tu agente, el paso 2 del [ciclo de vida](lifecycle.md).

## Cuándo hacerlo y cuándo saltárselo

Hazlo cuando:

- los requisitos son ambiguos;
- se desconocen restricciones importantes, o el comportamiento que mostraría que el cambio funciona;
- son plausibles varios diseños materialmente distintos.

Sáltatelo cuando el cambio es trivial y ya tiene criterios de aceptación claros. `truss continue` dice "Use Grill first if material ambiguity remains"; si esa ambigüedad persiste es un juicio tuyo y de tu agente, no algo que decida TRUSS.

## Dos skills y una forma de elegir

| Partes de | Skill | Qué hace primero |
|---|---|---|
| Una idea, una petición de funcionalidad, un bug o una duda de diseño | `grill-me` | lee solo el contexto del proyecto que necesita, y busca las incógnitas que podrían cambiar el comportamiento, el alcance, la arquitectura, el riesgo o la verificación |
| Documentos: requisitos, una propuesta, un ticket, un ADR, un diagrama o ejemplos | `grill-with-docs` | lee los documentos antes de preguntar nada, y pregunta solo lo que dejan abierto |

La regla que sigue el agente, en el workflow `grill`, es: si existen documentos de partida, usa `grill-with-docs`; si no, usa `grill-me`. Cuando partes de documentos, nómbralos en la petición: *Use the `grill-with-docs` skill on `docs/retry-proposal.md`, then write the OpenSpec artifacts.* Si no nombras ninguno, el agente debería preguntar cuáles usar.

`grill-with-docs` lee con cuidado: una propuesta no es automáticamente un requisito, el código de ejemplo es ilustrativo salvo que diga otra cosa, y el comportamiento existente es evidencia, no necesariamente el comportamiento que quieres.

## Qué haces tú

Respondes. El agente hace preguntas concretas en tandas pequeñas y prefiere las que resuelven una decisión («¿reintentar solo ante errores de red, o ante cualquier fallo?») a las abiertas. Mantiene separados los hechos, las suposiciones, las propuestas y las preguntas abiertas.

Las decisiones son tuyas. El agente no debe decidir en silencio requisitos de producto, ni convertir una preferencia de implementación en un requisito. Si no sabes una respuesta, dilo: pasa al resultado como pregunta sin resolver en lugar de adivinarse.

## Cuando una duda técnica bloquea una decisión

Si la respuesta depende de evidencia y no de opinión (cómo se comporta una librería, si una API puede hacer algo, cuánto cuesta un enfoque), el agente usa la skill `prototype` para esa única duda. Enuncia la pregunta, fija un límite y unos criterios de éxito, construye el experimento desechable más pequeño y anota lo que encontró y sus límites. El prototipo es evidencia, no la implementación: su código se descarta salvo que se promueva deliberadamente.

## Cómo termina

El agente se detiene cuando otro agente podría escribir la spec sin inventar requisitos. Las decisiones durables y el comportamiento de aceptación pasan entonces a la spec activa, y no se guardan en dos sitios: la spec es la que perdura (consulta [durable frente a efímero](../concepts/durable-vs-ephemeral.md)).

## Qué produce

Un resultado conciso con estos campos, comunes a las dos skills: el objetivo; qué está dentro y fuera del alcance; el comportamiento de aceptación observable; las restricciones; las decisiones tomadas; las suposiciones; las preguntas sin resolver; los riesgos relevantes; y un siguiente paso sugerido, que es un prototipo o la spec.

`grill-with-docs` añade tres que salen de trabajar con documentos: las fuentes de las afirmaciones importantes, las contradicciones que encontró y cómo se resolvió o se dejó abierta cada una, y lo que tomó como propuesta o ejemplo y no como requisito.

La forma es la misma con cualquiera de las dos skills, así que la sesión que escribe la spec puede partir de ella incluso cuando otra sesión hizo las preguntas (consulta [quién hace qué](../concepts/who-does-what.md)).

## Dónde están las skills y el workflow

Viven en la instalación de TRUSS: `skills/grill-me.SKILL.md`, `skills/grill-with-docs.SKILL.md`, `skills/prototype.SKILL.md` y `workflows/grill.md`. En la disposición del inicio rápido están bajo `.truss/.truss/`, y `truss skills` lista las skills. Consulta la [visión general de las skills](../skills/overview.md).
