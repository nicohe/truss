# ADR 0002: `status` y `continue` avisan cuando los archivos cambiaron después del último verify

> Traducción al español. La referencia canónica es [la versión en inglés](../../../en/development/decisions/0002-stale-evidence-warning.md).

- **Estado:** aceptada, 2026-10-12.
- **Decisión de:** el mantenedor.

## Contexto

`truss verify` escribe `.truss/verification/latest.json` con el resultado de los comandos. Ese resultado describe los archivos tal como estaban en ese momento. Cuando el código se edita después, la evidencia sigue diciendo `passed`, y nada dice que ya no se aplica. En un caso visto en la práctica, un revisor y un implementador trabajaron sobre código que había cambiado después del último verify, y ni `status` ni `continue` lo mencionaron.

Es el mismo tipo de error que un grafo de Graphify que sigue `fresh` mientras el árbol de trabajo tiene ediciones sin commitear: un estado que parece válido y ya no coincide con los archivos.

## Decisión

`verify` registra una **huella de los archivos que Git ve**, y `status` y `continue` comparan la actual con ella e imprimen una línea de aviso cuando difieren. Solo avisa.

**La huella** es un SHA-256 de cada par (ruta, identificador de contenido), donde el identificador es el que Git daría al archivo (`git hash-object`, sin escribirlo). Se construye con comandos de solo lectura de Git: el índice (`git ls-files -s`), menos los archivos borrados del árbol de trabajo (`-d`), con los modificados (`-m`) y los nuevos sin ignorar (`-o --exclude-standard`) leídos del disco. Sigue el contenido, no los commits: editar un archivo la cambia, una segunda edición del mismo archivo la cambia otra vez, y añadir al índice o commitear el mismo contenido no la cambia.

**Se excluyen**, siempre: `.truss/`, porque contiene la propia evidencia, y cualquier carpeta `openspec/`, porque marcar una tarea o corregir una spec después de un verify es normal y no es el código. Lo que Git ignora queda fuera por definición.

**Se registra** en `latest.json` como `workingTree: { fingerprint, files }`, cuando los comandos ya terminaron, de modo que incluye lo que escribieron. Solo se escribe en una ejecución que pasó.

**Se muestra** como una línea, solo cuando la última evidencia es `passed` y lleva una huella distinta de la actual:

```text
Evidence        ○ stale: the files changed after the last passing verify (2026-10-12 22:33 UTC). Run truss verify.
```

`status` la imprime con el resumen. `continue` la imprime bajo su propio encabezado `Evidence`, en las fases `implementation` y `complete` (en `spec` aún no hay nada que verificar). Nunca cambia un código de salida y nunca bloquea.

No dice nada cuando no hay evidencia, cuando la última ejecución falló (el fallo es la noticia), cuando la evidencia es anterior a la huella, o cuando Git no puede decirlo. `doctor` y `handoff` no cambian.

## Opciones consideradas

| Opción | Por qué no |
|---|---|
| Fechas de modificación frente a `latest.json` | `git checkout`, `touch`, los formateadores y los relojes dan falsos positivos y omisiones |
| Solo el commit (`HEAD`) | no ve las ediciones sin commitear, que es el caso que importa |
| `git stash create`, o `git write-tree` con un índice temporal | escribe objetos en `.git` en un comando que solo debería leer |
| La salida de `git status` | no distingue dos ediciones sucesivas del mismo archivo |
| Una lista de cada archivo y su hash dentro de `latest.json` | hace grande el archivo de evidencia para la persona o el agente que lo lee. Se guarda en un archivo aparte (consulta la Enmienda) |
| Solo archivos con extensión de código | no ve `package.json` ni `tsconfig.json`, que pueden romper una verificación |

## Consecuencias

- ✅ Un `verify` que pasó deja de parecer válido cuando el código se mueve. Sin dependencias nuevas, sin escribir en `.git` ni en el árbol de trabajo.
- ✅ El aviso sigue el contenido: un commit o un `git add` de los mismos archivos no lo activa.
- ⚠️ Desde la enmienda nombra los archivos; sin el archivo de la lista, solo dice que cambiaron.
- ⚠️ Una carpeta que Git no ignora y que algo regenera fuera de `verify` (una de build o de cobertura) marca la evidencia como desactualizada. Ignora esa carpeta.
- ⚠️ Un cambio en los archivos de un submódulo no se ve: la huella contiene el commit que el índice registra para él.
- ⚠️ Coste: unas llamadas a `git` y una lectura de cada archivo modificado o nuevo, en cada `status` y `continue`. Tardó 0,12 s en un repositorio de 172 archivos y 0,11 s en uno de 20.000; con 2.000 archivos sin seguimiento tardó 0,16 s (13 s antes de calcular los hashes con una sola llamada a `git hash-object --stdin-paths` en vez de un proceso por archivo).
- La evidencia escrita por una release anterior no tiene huella y no produce aviso hasta el siguiente `verify`.

## Enmienda: el aviso nombra los archivos (0.2.21)

`verify` también escribe `.truss/verification/working-tree.json`: la huella y el identificador de contenido de cada archivo, como `{ fingerprint, ids }`. Está separado de `latest.json` para que la evidencia siga siendo corta. `status` y `continue` comparan los identificadores y listan hasta cinco archivos bajo el aviso, y luego `… and N more`:

```text
Evidence        ○ stale: the files changed after the last passing verify (2026-10-12 22:33 UTC). Run truss verify.
                edited lib/a.mjs
                added src/retry.js
                removed old.js
```

La lista solo se usa cuando su huella es la de `latest.json`. Si el archivo falta, está dañado o es de otra ejecución, el aviso aparece como antes, sin nombres. El archivo guarda rutas y hashes, nunca contenidos, y vive en `.truss/`, que se ignora. En un repositorio grande son unos 100 bytes por archivo.
