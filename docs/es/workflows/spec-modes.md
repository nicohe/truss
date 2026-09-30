# Modos de especificación

> Traducción al español. La referencia canónica es [la versión en inglés](../../en/workflows/spec-modes.md).

TRUSS requiere OpenSpec. `spec.mode` controla cómo puede interactuar la implementación con la especificación activa.

## Spec-Anchored (`anchored`) — default

OpenSpec permanece como ancla durable, pero los descubrimientos durante la implementación pueden justificar cambios en spec, diseño, tests o tasks. Toda divergencia debe ser explícita y reconciliada antes de terminar.

```text
Idea / bug / feature
        ↓
Discovery / Grill cuando haga falta
        ↓
OpenSpec: proposal + behavior + design + tasks
        ↓
execute-change
        ↓
Implementar vertical slice
        ↓
¿El descubrimiento contradice o refina la spec?
   ├─ no ───────────────────────────┐
   └─ sí                            │
        ↓                           │
      evaluar                       │
        ↓                           │
      actualizar explícitamente    │
      spec/design/tests/tasks/ADR  │
      afectados                    │
        ↓                           │
      reconciliar implementación   │
        └───────────────────────────┘
                    ↓
               verification
                    ↓
               code review
                    ↓
          alineación con OpenSpec
                    ↓
                 archive
```

Reglas:
- Código y spec nunca deben divergir silenciosamente.
- Un requisito descubierto no se acepta automáticamente; primero se evalúa.
- Solo se actualizan los artefactos afectados.
- ADR se usa únicamente para decisiones arquitectónicas durables.
- Review compara la implementación final contra la spec reconciliada.

## Spec-as-Source (`source`)

El comportamiento esperado definido en OpenSpec es autoritativo durante implementación. Un cambio de comportamiento comienza en la fase de especificación, no en código.

```text
Idea / bug / feature
        ↓
Discovery / Grill
        ↓
OpenSpec
        ↓
Spec revisada / lista
        ↓
Fase de implementación
        ↓
execute-change
        ↓
¿Hay que cambiar comportamiento especificado?
   ├─ no ───────────────────────────┐
   └─ sí                            │
        ↓                           │
       STOP implementación          │
        ↓                           │
       volver a Spec Zone           │
        ↓                           │
       actualizar/revisar OpenSpec  │
        ↓                           │
       volver a Code Zone           │
        └───────────────────────────┘
                    ↓
               verification
                    ↓
               code review
                    ↓
          alineación con OpenSpec
                    ↓
                 archive
```

Con `spec.zone_guard: true`, los runtimes con controles de escritura deberían aplicar la separación Spec Zone / Code Zone. En v0.2 es una policy para el agente; el enforcement automático corresponde a adapters/orquestación posteriores.

## Elección del modo

| Aspecto | `anchored` | `source` |
|---|---|---|
| Default | Sí | No |
| Spec como ancla durable | Sí | Sí |
| Editar spec durante implementación | Sí, explícitamente | No; primero se vuelve a fase spec |
| Uso típico | Ingeniería de producto general | Entornos estrictos/controlados por spec |
| Zone Guard | Normalmente off | Suele ser útil |

Cambiar el modo no reescribe artefactos OpenSpec existentes. Cambia las reglas del workflow aplicadas desde ese momento.
