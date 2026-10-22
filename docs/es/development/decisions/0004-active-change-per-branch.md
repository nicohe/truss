# ADR 0004: recordar el cambio activo de cada rama de Git

> Traducción al español. La referencia canónica es [la versión en inglés](../../../en/development/decisions/0004-active-change-per-branch.md).

- **Estado:** propuesta, 2026-10-21.
- **Decide:** el mantenedor.

## Contexto

El requisito del mantenedor: una persona debe poder cambiar de rama, con cambios pequeños o grandes en cada una, y no perder la referencia de lo que estaba haciendo.

Hoy TRUSS guarda un único registro del cambio activo en `.truss/state.json` (el cambio, su componente, la última fase que vio y la ruta). Git ignora `.truss/` ([ADR 0001](0001-local-project-configuration.md)), así que todas las ramas leen el mismo archivo. Lo siguiente se ejecutó en un repositorio de prueba con dos ramas:

- **El registro sigue a la persona, no a la rama.** El cambio `demo` estaba activo en `main`. En una rama nueva `feat-b`, `truss new "other change"` sustituyó el registro por `other-change`, y ese cambio se confirmó allí. De vuelta en `main`, el registro seguía diciendo `other-change`, un cambio que no existe en `main`, y `status` y `continue` fallaron (código de salida `1`). Nada decía que `demo` era el cambio en el que la persona había estado trabajando.
- **El mensaje de fallo no daba salida.** Decía que empezaras un cambio nuevo. Desde entonces se amplió para listar lo que hay abierto y el comando `truss use` (consulta el registro de cambios); eso arregla el callejón sin salida, no la referencia perdida.
- **La evidencia es un solo archivo.** `.truss/verification/latest.json` y `working-tree.json` los reemplaza cada `verify`; quedaron en 417 y 201 bytes tras verificar en las dos ramas. Tras verificar en `feat-b` y volver a `main`, `status` mostró el aviso de evidencia obsoleta ([ADR 0002](0002-stale-evidence-warning.md)) sin decir que la evidencia era de otra rama.
- **La nota de `handoff` es un archivo por cambio** y `truss handoff` nunca la sobrescribe. Su línea `Branch:` se escribió cuando se creó la nota y dice `feat-b` tras volver a `main`.
- Nada crece sin límite: los archivos anteriores se reemplazan, no se les añade.

## Decisión

Recordar el cambio activo **de cada rama**, de modo que al volver a una rama regrese el cambio que estaba activo allí.

**El registro.** `.truss/state.json` conserva sus campos actuales de primer nivel, como «el último cambio activado», y gana un mapa `branches`:

```json
{
  "change": "other-change",
  "phase": "implementation",
  "branches": {
    "main": { "change": "demo", "component": null, "title": "demo", "phase": "complete", "path": "openspec/changes/demo", "updatedAt": "…" },
    "feat-b": { "change": "other-change", "component": null, "title": "other change", "phase": "implementation", "path": "openspec/changes/other-change", "updatedAt": "…" }
  }
}
```

**Lectura.** La rama actual se pregunta a Git, solo en lectura (`git symbolic-ref --short -q HEAD`). Si el mapa tiene una entrada para ella, ese es el cambio activo. Si no, valen los campos de primer nivel, que es lo que pasa hoy. Un proyecto que nunca cambia de rama no ve ninguna diferencia.

**Escritura.** `new` y `use` escriben los campos de primer nivel y la entrada de la rama actual. Cuando `status` o `continue` ven que la fase del cambio activo se movió, actualizan ambos.

**Sin rama, sin entrada.** En un HEAD desacoplado, o donde Git no está disponible, no hay entrada por rama y se usan solo los campos de primer nivel, como hoy.

**Se mantiene acotado.** Cada escritura descarta las entradas de ramas que ya no existen (`git for-each-ref refs/heads`). Si Git no puede listarlas, no se descarta nada.

**La evidencia sigue siendo una.** `latest.json` gana la `branch` en la que se registró, y la línea de evidencia obsoleta lo dice cuando difiere de la actual, por ejemplo `the evidence was recorded on branch "feat-b"; you are on "main"`. La decisión de si la evidencia está obsoleta no cambia: sigue siendo la huella de la ADR 0002.

**La nota de handoff no cambia.** Sigue siendo un archivo por cambio y nunca se sobrescribe. La referencia documenta que su línea `Branch:` es la rama del momento en que se escribió.

## Opciones consideradas

| Opción | Por qué no |
|---|---|
| Solo el mensaje de fallo más claro | Ya está hecho, como primer paso. Quita el callejón sin salida, pero la persona sigue teniendo que recordar en qué cambio estaba |
| Un archivo de estado por rama (`.truss/state/<rama>.json`) | Los nombres de rama contienen `/`; los archivos de ramas borradas se quedan; podar exige recorrer un directorio. Un mapa en un archivo es más simple de leer y de podar |
| Guardar el registro dentro de Git (notas o refs) | Escribe dentro de `.git`, que TRUSS no toca; además viajaría con un push |
| Vincular un cambio a una rama por convención de nombres | Supone una convención que el proyecto puede no seguir |
| Evidencia por rama | Los archivos se multiplicarían con las ramas y necesitarían la misma poda. Un nuevo `verify` es la forma normal de tener evidencia fresca, y una etiqueta en la existente dice qué hace falta |
| Un hook de Git en el checkout | TRUSS no instala hooks ni toca `.git` |

## Consecuencias

- ✅ Volver a una rama devuelve su cambio, con cambios pequeños y grandes por igual, sin que la persona lo nombre de nuevo.
- ✅ Opt-in por uso: una rama sin entrada se comporta como hoy, y un `state.json` antiguo sin `branches` se lee como antes. Un TRUSS más antiguo lee sin problema un archivo nuevo, porque los campos de primer nivel siguen ahí; pero cuando escribe (`new`, `use`) construye el registro solo con esos campos y descarta el mapa, así que la memoria por rama se pierde hasta que un TRUSS más nuevo la vuelva a escribir.
- ✅ Acotado: una entrada por rama existente.
- ⚠️ Un cambio de comportamiento para quien dependía de un único cambio activo entre ramas: en una rama donde antes se ejecutó `use`, `status` ahora muestra el cambio de esa rama, no el último usado en cualquier sitio.
- ⚠️ Una rama renombrada pierde su entrada y vuelve a los campos de primer nivel; la entrada antigua se descarta en la siguiente escritura.
- ⚠️ La evidencia sigue siendo un solo archivo, así que tras cambiar de rama hace falta un `verify` otra vez; la etiqueta dice por qué.
- ⚠️ Coste: un `git symbolic-ref` por cada comando que lee el cambio activo, y un `git for-each-ref` por cada escritura.
- ⚠️ Los worktrees de Git tienen su propio `.truss/`, así que son registros separados. Un proyecto cuyo `.truss/` se comparte a mano entre worktrees no está cubierto.

## Plan de pruebas

Pruebas unitarias de lectura, escritura y poda del mapa, incluido el formato antiguo. Pruebas de integración con un repositorio Git real: crear un cambio en una rama, cambiar, comprobar `status`; volver; un HEAD desacoplado; una rama borrada se poda; un directorio que no es un repositorio Git se comporta como hoy; y la etiqueta en la evidencia obsoleta.

## Puntos abiertos para el mantenedor

1. **HEAD desacoplado.** Propuesta: sin entrada por rama. La alternativa es usar el commit como clave, lo que acumula entradas de poco sentido.
2. **¿`status` debe imprimir la rama** (una línea `Branch`) cuando el cambio activo salió de una entrada por rama? Propuesta: sí, una línea, solo cuando se usa el mapa.
3. **Poda.** Propuesta: en cada escritura, contra las ramas locales. La alternativa es que `truss doctor` informe de las entradas de ramas que faltan y haya un comando para limpiarlas.
4. **Un interruptor.** Propuesta: ninguno. Un ajuste como `lifecycle.per_branch: false` restauraría el comportamiento de hoy, a costa de otra opción que documentar.
5. **La nota de handoff.** Propuesta: dejarla como está. La alternativa es imprimir una línea cuando su `Branch:` difiere de la rama actual.
