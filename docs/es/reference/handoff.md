# `truss handoff`

> Traducción al español. La referencia canónica es [la versión en inglés](../../en/reference/handoff.md).

`truss handoff` escribe una nota breve sobre el cambio activo, para cuando el trabajo pasa a otro agente, runtime, sesión o persona. Úsalo solo ante un límite real, no entre cada paso; consulta la [gestión de contexto](../concepts/context-management.md).

```text
△ TRUSS · handoff

● .truss/handoffs/add-retry-policy.md
```

## Qué hace

- Necesita un cambio activo (consulta [`truss new`](../workflows/lifecycle-commands.md)). Sin él imprime `No active change.`, no escribe nada y sale con `0`. Si hay cambios abiertos en OpenSpec (un clon nuevo no tiene ninguno activo, porque `.truss/state.json` es local de cada checkout) los lista y señala `truss use`, igual que [`truss status`](../workflows/lifecycle-commands.md#truss-status):

  ```text
  No active change.
  Open changes    add-retry-policy
  Next: truss use add-retry-policy, or truss new "Change name" for a new one
  ```

  Sin nada abierto se queda en esa única línea. Lo mismo ocurre cuando el cambio activo se archivó con `openspec archive`: lo dice, lista lo que sigue abierto (o señala `truss new`) y no escribe nada, porque un cambio terminado no tiene nada que traspasar.
- Escribe `.truss/handoffs/<change>.md` e imprime la ruta.
- Rellena lo que TRUSS sabe (el cambio, el componente, la fase, la ruta de OpenSpec y la rama actual de Git, o `unknown`) y deja vacío el resto. La fase se pregunta a OpenSpec al escribir la nota, así que es la que mostraría `truss status` ahora. Si OpenSpec o la configuración no se pueden usar, `handoff` escribe la nota igualmente, con la última fase registrada y una línea que lo dice (`Phase: implementation (last recorded; OpenSpec could not be asked)`):

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

## Una nota rellenada

TRUSS escribe el encabezado; el agente escribe el resto. Una nota de un cambio que pasa a un revisor puede verse así (el contenido es una ilustración):

```markdown
# Handoff: add-retry-policy

- Component: workspace
- Phase: implementation
- OpenSpec: openspec/changes/add-retry-policy
- Branch: feature/add-retry-policy

## Completed
- Tasks 1.1 to 1.4 done and checked off; `truss verify` passes (5 of 5 commands).
- Retry with exponential backoff in `src/retry.ts`; scenarios 1 to 3 of the spec pass.

## Discoveries
- The timeout case is not in the spec: a request that times out is retried like a failure. Decide whether that is intended before archiving.

## Verification
- `truss verify` passed at the last commit; evidence in `.truss/verification/latest.json`.
- Not run: `openspec validate add-retry-policy`.

## Blockers
- None.

## Next action
- Review against the spec with `.truss/.truss/skills/code-review.SKILL.md`; start from the timeout question above.
```

Escríbela de forma breve: la skill [`caveman`](../skills/overview.md#caveman) se aplica a una nota como esta, que se lee una vez, y no a la spec ni al informe de revisión. Un handoff es para la frontera entre el implementador y el revisor; los hallazgos del revisor vuelven como un informe, no como un handoff (consulta [revisar en otra sesión](../guides/agents.md#revisar-en-otra-sesión-y-volver-al-implementador)).

## Volver a ejecutarlo conserva tu nota

Si ya existe una nota para el cambio, `truss handoff` la deja exactamente como está y lo dice:

```text
△ TRUSS · handoff

○ .truss/handoffs/add-retry-policy.md already exists and was not changed.
  Edit it, or delete it to start a new note.
```

El código de salida es `0`, igual que cuando se escribe una nota. Para empezar de nuevo, borra antes el archivo. Las releases hasta la 0.2.2 reemplazaban una nota existente por la plantilla vacía y perdían lo que se había escrito en ella.

## Dónde vive la nota

En `.truss/handoffs/`, que es estado local que Git ignora. Un handoff es efímero: mueve cualquier cosa durable, como un descubrimiento que cambia la spec o una decisión que merece un ADR, a OpenSpec, a un ADR o a la documentación antes. Consulta [estado durable vs efímero](../concepts/durable-vs-ephemeral.md).

## Códigos de salida

| Código | Significado |
|---|---|
| `0` | Se escribió la nota, se conservó tal cual una nota existente, o no hay cambio activo (o se archivó). |
| `2` | `.truss/state.json` no se puede leer. |
