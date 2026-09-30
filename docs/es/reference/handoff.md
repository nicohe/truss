# `truss handoff`

> Traducción al español. La referencia canónica es [la versión en inglés](../../en/reference/handoff.md).

`truss handoff` escribe una nota breve sobre el cambio activo, para cuando el trabajo pasa a otro agente, runtime, sesión o persona. Úsalo solo ante un límite real, no entre cada paso; consulta la [gestión de contexto](../concepts/context-management.md).

```text
△ TRUSS · handoff

● .truss/handoffs/add-retry-policy.md
```

## Qué hace

- Necesita un cambio activo (consulta [`truss new`](../workflows/lifecycle-commands.md)). Sin él imprime `No active change.`, no escribe nada y sale con `0`.
- Escribe `.truss/handoffs/<change>.md` e imprime la ruta.
- Rellena lo que TRUSS sabe (el cambio, el componente, la fase, la ruta de OpenSpec y la rama actual de Git, o `unknown`) y deja vacío el resto:

```markdown
# Handoff: add-retry-policy

- Component: workspace
- Phase: implementation
- OpenSpec: openspec/changes/add-retry-policy
- Branch: main

## Completed

## Discoveries

## Verification

## Blockers

## Next action
```

Rellenar las secciones es tarea del agente. La skill `handoff` dice qué contiene una buena nota: la primera tarea sin completar, el trabajo hecho, las decisiones que aún no están en un artefacto durable, el estado de la verificación, los bloqueos y la siguiente acción exacta.

## Volver a ejecutarlo reemplaza el archivo

Si ya existe una nota para el cambio, `truss handoff` la sobrescribe con la plantilla vacía y lo que había escrito en ella se pierde. Copia o renombra una nota que hayas rellenado antes de volver a ejecutar el comando.

## Dónde vive la nota

En `.truss/handoffs/`, que es estado local que Git ignora. Un handoff es efímero: mueve cualquier cosa durable, como un descubrimiento que cambia la spec o una decisión que merece un ADR, a OpenSpec, a un ADR o a la documentación antes. Consulta [estado durable vs efímero](../concepts/durable-vs-ephemeral.md).

## Códigos de salida

| Código | Significado |
|---|---|
| `0` | Se escribió la nota, o no hay cambio activo. |
| `2` | `.truss/state.json` no se puede leer. |
