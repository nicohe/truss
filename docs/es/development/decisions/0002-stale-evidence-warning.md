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
| Una lista de cada archivo y su hash en la evidencia | permitiría que el aviso nombrara los archivos, a costa de una evidencia más grande. Se deja como posible paso posterior |
| Solo archivos con extensión de código | no ve `package.json` ni `tsconfig.json`, que pueden romper una verificación |

## Consecuencias

- ✅ Un `verify` que pasó deja de parecer válido cuando el código se mueve. Sin dependencias nuevas, sin escribir en `.git` ni en el árbol de trabajo.
- ✅ El aviso sigue el contenido: un commit o un `git add` de los mismos archivos no lo activa.
- ⚠️ Dice que los archivos cambiaron, no cuáles. Nombrarlos es el posible paso posterior.
- ⚠️ Una carpeta que Git no ignora y que algo regenera fuera de `verify` (una de build o de cobertura) marca la evidencia como desactualizada. Ignora esa carpeta.
- ⚠️ Un cambio en los archivos de un submódulo no se ve: la huella contiene el commit que el índice registra para él.
- ⚠️ Coste: unas llamadas a `git` y una lectura de cada archivo modificado o nuevo, en cada `status` y `continue`. Tardó 0,12 s en un repositorio de 172 archivos; no se ha medido en uno grande.
- La evidencia escrita por una release anterior no tiene huella y no produce aviso hasta el siguiente `verify`.
