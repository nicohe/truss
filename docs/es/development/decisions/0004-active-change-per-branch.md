# ADR 0004: recordar el cambio activo de cada rama de Git

> Traducción al español. La referencia canónica es [la versión en inglés](../../../en/development/decisions/0004-active-change-per-branch.md).

- **Estado:** aceptada, 2026-10-21.
- **Decide:** el mantenedor.

## Contexto

El requisito del mantenedor: una persona debe poder cambiar de rama, con cambios pequeños o grandes en cada una, y no perder la referencia de lo que estaba haciendo, sin que TRUSS bloquee nunca el flujo. Quien usa TRUSS por primera vez también debe poder averiguar para qué sirve cada comando.

Hoy TRUSS guarda un único registro del cambio activo en `.truss/state.json` (el cambio, su componente, la última fase que vio y la ruta). Git ignora `.truss/` ([ADR 0001](0001-local-project-configuration.md)), así que todas las ramas leen el mismo archivo. Lo siguiente se ejecutó en un repositorio de prueba con dos ramas:

- **El registro sigue a la persona, no a la rama.** El cambio `demo` estaba activo en `main`. En una rama nueva `feat-b`, `truss new "other change"` sustituyó el registro por `other-change`, y ese cambio se confirmó allí. De vuelta en `main`, el registro seguía diciendo `other-change`, un cambio que no existe en `main`, y `status` y `continue` fallaron (código de salida `1`). Nada decía que `demo` era el cambio en el que la persona había estado trabajando.
- **El mensaje de fallo no daba salida.** Desde entonces se amplió para listar lo que hay abierto y el comando `truss use` (consulta el registro de cambios); eso arregla el callejón sin salida, no la referencia perdida.
- **La evidencia es un solo archivo.** `.truss/verification/latest.json` y `working-tree.json` los reemplaza cada `verify`; quedaron en 417 y 201 bytes tras verificar en las dos ramas. Tras verificar en `feat-b` y volver a `main`, `status` mostró el aviso de evidencia obsoleta ([ADR 0002](0002-stale-evidence-warning.md)) aunque `main` estaba como cuando pasó, y sin decir que la evidencia era de otra rama.
- **La nota de `handoff` es un archivo por cambio** y `truss handoff` nunca la sobrescribe. Su línea `Branch:` se escribió cuando se creó la nota y dice `feat-b` tras volver a `main`.
- **Primer contacto.** `truss help` es una lista plana de frases escuetas, y `truss use` sin nombre solo imprime su uso y sale con `2`, sin decir qué cambios existen.
- Nada crece sin límite: los archivos anteriores se reemplazan, no se les añade.

## Decisión

**1. El cambio activo se recuerda por rama.** `.truss/state.json` conserva sus campos actuales de primer nivel, como «el último cambio activado», y gana un mapa `branches`:

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

- **Lectura.** La rama actual se pregunta a Git, solo en lectura (`git symbolic-ref -q HEAD`, no `--short`, que puede responder `heads/x` cuando una etiqueta tiene el mismo nombre). Si el mapa tiene una entrada para ella, ese es el cambio activo. Si no, valen los campos de primer nivel, que es lo que pasa hoy. El lector ignora un valor de `branches` que no sea un objeto y una entrada sin `change`; solo el JSON inválido sigue siendo un error. Una rama puede llamarse `__proto__`, así que las entradas se leen y se escriben como propiedades propias.
- **Escritura.** `new`, `use` y la elección automática de abajo escriben los campos de primer nivel y la entrada de la rama actual. Cuando `status` o `continue` ven que la fase se movió, actualizan solo el registro del que leyeron (la entrada, o el primer nivel), para que «el último activado» no se convierta en «el último mirado».
- **Sin rama, sin entrada.** En un HEAD desacoplado, o donde Git no está disponible, se usan solo los campos de primer nivel y el mapa se deja como está.
- **Acotado.** Cada escritura descarta las entradas de ramas que ya no existen (`git for-each-ref refs/heads`). Nunca descarta la rama actual, y no descarta nada cuando la lista está vacía o no está disponible (una rama sin ningún commit no aparece en ella).

**2. Un cambio registrado que falta no detiene el trabajo.** Cuando el cambio registrado no está en OpenSpec en esta rama:

- con exactamente **un** cambio abierto, `status` y `continue` lo usan, lo hacen el activo y lo dicen en una línea: `Using "add-retry-policy", the only change open here: the recorded "add-old" is not on this branch.`;
- con **varios** abiertos, los listan junto con el comando `truss use` y salen con `0`, como en un clon nuevo sin cambio activo;
- con **ninguno** abierto, el fallo de hoy se mantiene (salida `1`).

`handoff` pregunta a OpenSpec la fase del cambio registrado y la comprobación de tareas lee solo el registro; ninguna elige otro cambio. (La primera release con este comportamiento, la 0.2.26, dejó que `handoff` eligiera por error; consulta el registro de cambios.)

**3. La evidencia vuelve a valer cuando los archivos coinciden con una ejecución que pasó.** La [ADR 0002](0002-stale-evidence-warning.md) recibe una enmienda: `verify` conserva las últimas diez ejecuciones que pasaron, cada una con la huella del árbol, en `.truss/verification/history.json`. Si el árbol coincide con alguna, la evidencia es vigente, sea cual sea la rama. `latest.json` también registra la `branch` y el `commit`, y `status` avisa cuando la evidencia viene de otra rama. Los archivos que cambiaron solo se nombran frente a la ejecución más reciente que pasó, cuya lista de ids es la única que se conserva.

**4. `status` dice dónde estás.** Un bloque arriba: `Branch`, `Change`, `Phase` y `Evidence` (vigente, obsoleta, registrada en otra rama, la última ejecución falló, o ninguna), y una fila `Handoff` cuando la nota se escribió en otro sitio.

**5. La nota de handoff registra la rama y el commit** cuando se crea, sigue sin sobrescribirse, y `handoff` y `status` dicen en una línea cuándo la nota se escribió en otra rama, o en un commit que no está en el historial de `HEAD`. Un commit nuevo en la misma rama es progreso normal y no dice nada. Nunca cambia un código de salida.

**6. TRUSS se explica.** `truss help` se agrupa por etapas (empezar, trabajar en un cambio, comprobar, relevar, otros) con una frase clara por comando; `truss use` sin nombre lista los cambios abiertos y sale con `0` (un nombre vacío que viene de una variable de un script sigue siendo un error de uso, `2`); `truss help concepts` explica en pocas líneas qué son un cambio, el cambio activo, una fase, la evidencia y un handoff.

## Opciones consideradas

| Opción | Por qué no |
|---|---|
| Solo el mensaje de fallo más claro | Hecho como primer paso. Quita el callejón sin salida, pero la persona sigue teniendo que recordar en qué cambio estaba |
| Un archivo de estado por rama (`.truss/state/<rama>.json`) | Los nombres de rama contienen `/`; los archivos de ramas borradas se quedan; podar exige recorrer un directorio. Un mapa en un archivo es más simple de leer y de podar |
| Guardar el registro dentro de Git (notas o refs) | Escribe dentro de `.git`, que TRUSS no toca; además viajaría con un push |
| Vincular un cambio a una rama por convención de nombres | Supone una convención que el proyecto puede no seguir |
| Evidencia por rama | Los archivos se multiplicarían con las ramas y necesitarían la misma poda, y la rama es la clave equivocada: lo que importa es si los archivos son los que pasaron. Un historial corto por huella responde a esa pregunta |
| Mantener el fallo cuando falta el cambio registrado y hay uno abierto | Quien cambió de rama tendría que teclear la única respuesta posible |
| Un hook de Git en el checkout | TRUSS no instala hooks ni toca `.git` |

## Consecuencias

- ✅ Volver a una rama devuelve su cambio, con cambios pequeños y grandes por igual, sin que la persona lo nombre de nuevo, y TRUSS nunca se niega a trabajar por la rama.
- ✅ La evidencia de una ejecución que pasó se reutiliza cuando los archivos son los mismos, sin depender de nombres de rama, renombrados ni de un HEAD desacoplado.
- ✅ Opt-in por uso: una rama sin entrada se comporta como hoy, y los archivos antiguos se leen como antes.
- ✅ Acotado: una entrada por rama existente, diez ejecuciones de evidencia.
- ⚠️ Un cambio de comportamiento: en una rama donde antes se ejecutó `new` o `use`, `status` muestra el cambio de esa rama, no el último usado en cualquier sitio. La elección automática puede escoger un cambio ajeno al trabajo de la persona; el mensaje de una línea y `truss use` son la salida.
- ⚠️ **Reutilizar la evidencia es más estrecho de lo que parece.** La huella deja fuera `openspec/` y `.truss/`, así que dos ramas que solo difieren en sus specs coinciden. «Vigente» significa que los comandos de verificación pasaron con estos archivos exactos; los resultados de `tests_required` y `tasks_complete` no se evalúan de nuevo. La lista de comandos no forma parte de la huella, así que una ejecución más antigua solo se acepta si su lista de comandos tiene el mismo resumen que la de hoy.
- ⚠️ Un TRUSS anterior a este cambio lee los archivos nuevos, pero cuando escribe (`new`, `use`) construye el registro solo con los campos de primer nivel y descarta el mapa, así que la memoria por rama se pierde hasta que un TRUSS más nuevo la vuelva a escribir. Ignora `history.json` y los campos nuevos de `latest.json`.
- ⚠️ Una rama renombrada pierde su entrada y vuelve a los campos de primer nivel; la entrada antigua se descarta en la siguiente escritura.
- ⚠️ `status` y `continue` siguen escribiendo la fase que encuentran, como antes, y por eso `.truss/state.json` no lo escriben solo `new` y `use`.
- ⚠️ Coste: un `git symbolic-ref` por cada comando que lee el cambio activo, un `git for-each-ref` por cada escritura y un `git rev-parse` cuando se escribe o se compara una nota de handoff.
- ⚠️ Los worktrees de Git tienen su propio `.truss/`, así que son registros separados.

## Plan de pruebas

Pruebas unitarias de lectura, escritura y poda del mapa, incluido el formato antiguo y una rama llamada `__proto__`; del historial y de la decisión de si la evidencia es vigente; de los ayudantes de Git (una rama con nombre, una rama con barra, un HEAD desacoplado, un repositorio sin ningún commit, ningún repositorio, una etiqueta con el mismo nombre que una rama); y de la comparación del handoff. Pruebas de integración con repositorios Git reales: crear un cambio en una rama, cambiar, comprobar `status`; volver; una rama borrada y una renombrada; la elección automática con uno, varios y ningún cambio abierto; `use` sin nombre; verificar en una rama y comprobar en otra; y cada mensaje del bloque de `status`. Una prueba de extremo a extremo en la disposición documentada, donde `.truss/` contiene un clon propio.

## Decisiones sobre los puntos abiertos

1. **HEAD desacoplado:** sin entrada por rama.
2. **`status` imprime la rama:** sí, en el bloque de arriba.
3. **Poda:** en cada escritura, contra las ramas locales.
4. **Un interruptor para desactivarlo:** ninguno.
5. **La nota de handoff:** registra la rama y el commit, y una discrepancia se comunica en una línea.
