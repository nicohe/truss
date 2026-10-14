# ADR 0003: `status` y `continue` avisan cuando hay cambios sin confirmar en archivos de spec y de código a la vez

> Traducción al español. La referencia canónica es [la versión en inglés](../../../en/development/decisions/0003-zone-warning.md).

- **Estado:** aceptada, 2026-10-13.
- **Decisión de:** el mantenedor.

## Contexto

`spec.zone_guard: true` declara que el trabajo de spec y el de código se mantienen separados: mientras se implementa un cambio la spec es de solo lectura, y cuando el comportamiento tiene que cambiar el trabajo vuelve a la spec y luego regresa al código. En v0.2 nada lo comprueba. `truss continue` se lo recuerda al agente con palabras, y la opción figura como declarativa en el [modelo de cumplimiento](../../reference/enforcement.md).

El [intent-driven-template](https://github.com/intent-driven-dev/intent-driven-template) (licencia MIT) le pide a su agente una forma más estricta de la misma idea: una unidad de trabajo edita la zona de specs (`openspec/`) o la de código, nunca ambas con cambios sin confirmar, y `tasks.md` está exento. Lo comprueba leyendo `git status --porcelain`. Este ADR toma esa observación, no los archivos de la plantilla.

TRUSS puede afirmar un hecho sobre esto sin ejecutar al agente: si el árbol de trabajo tiene ahora mismo cambios sin confirmar en ambas zonas.

## Decisión

Cuando `spec.zone_guard` es `true`, `status` y `continue` imprimen un aviso si los cambios sin confirmar tocan ambas zonas. Solo avisa.

**La comprobación** lee Git, solo lectura: `git status --porcelain=v1 -z`, y los renombrados cuentan por sus dos rutas. Se ejecuta desde la raíz del proyecto y ve archivos en staging, modificados y sin seguimiento. Lo que Git ignora queda fuera por definición.

**La zona de specs** es toda ruta bajo una carpeta `openspec/` a cualquier profundidad (la misma regla que la [huella del ADR 0002](0002-stale-evidence-warning.md)).

**La zona de código** es toda otra ruta.

**En ninguna zona:**
- cualquier archivo llamado `tasks.md` bajo `openspec/`, porque marcar una tarea es como se registra el trabajo y se hace desde cualquier zona;
- `openspec/changes/archive/`, cuyo contenido lo produce `openspec archive` y debería confirmarse como una unidad junto con la sincronización que lo acompaña;
- `.truss/` (el clon local y su evidencia, normalmente ignorados).

**Se muestra** como una línea solo cuando ambas zonas tienen al menos una ruta cambiada, con hasta tres rutas de cada una:

```text
Zones           ○ uncommitted changes in the specs (openspec/) and in the code at once. Commit one zone before working on the other.
                specs: openspec/changes/add-retry/specs/retry/spec.md
                code:  src/retry.ts, src/retry.test.ts
```

`status` la imprime con el resumen. `continue` la imprime bajo su propio encabezado `Zones`, en todas las fases (en `spec` detecta código editado antes de que la spec esté asentada). Nunca cambia un código de salida y nunca bloquea.

No dice nada cuando `zone_guard` está desactivado, cuando el árbol está limpio o toca una sola zona, cuando el proyecto no es un árbol de trabajo de Git o cuando Git falla. `doctor`, `handoff` y `verify` no cambian.

## Opciones consideradas

| Opción | Por qué no |
|---|---|
| Bloquear en `verify` | Un aviso sobre el estado del árbol no es un resultado de verificación; bloquear sorprendería a quien confirma ambas zonas a propósito |
| Un hook de Git que rechace el commit | TRUSS no instala hooks ni toca `.git`; la opción queda en manos de la persona |
| Mirar los commits, no el árbol de trabajo | Un commit no dice qué fue una unidad de trabajo; el estado sin confirmar es el único momento en que la pregunta tiene respuesta |
| Un adaptador de runtime que niegue escrituras en la otra zona | Es el cumplimiento real, y ya es el plan de la documentación. Necesita un runtime que TRUSS no controla, y este ADR no lo sustituye |
| Activarlo con `spec.mode: source` en lugar de `zone_guard` | `zone_guard` es la opción que dice "mantenlos separados"; `mode: source` ya añade un recordatorio en `continue` y no implica la separación |

## Consecuencias

- ✅ `zone_guard` tiene un primer efecto que produce TRUSS mismo, no solo una frase para el agente.
- ✅ Es opcional, sobre una opción que hoy no hace nada, así que ninguna configuración existente cambia de comportamiento.
- ⚠️ Ve el estado después. No puede impedir que el agente edite la otra zona; solo puede decir que ocurrió.
- ⚠️ Son posibles falsos avisos: una spec corregida mientras se implementa, como permite la propia política, o un archivo generado bajo `openspec/`. El aviso dice que confirmes una zona, y la persona decide.
- ⚠️ La zona de código es "todo lo demás", así que un cambio en el README cuenta como código. Es la regla de la plantilla. Eximir la documentación exigiría una lista que TRUSS no puede conocer en cada proyecto.
- ⚠️ Coste: un `git status` en cada `status` y `continue` cuando la opción está activada.

## Decisiones sobre los puntos abiertos

1. No se exime nada más que `tasks.md`, la carpeta de archivo y `.truss/`; se admite que el aviso sea imperfecto.
2. La línea aparece en todas las fases, también en `spec`.
3. El aviso necesita `spec.zone_guard: true`; `spec.mode: source` por sí solo no lo activa.
