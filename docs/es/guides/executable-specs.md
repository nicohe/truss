# Ejecuta los escenarios de tus specs como tests

> Traducción al español. La referencia canónica es [la versión en inglés](../../en/guides/executable-specs.md).

Con `spec.mode: source` la spec es la autoridad sobre el comportamiento. Esta guía muestra una forma de hacerlo literal: escribe los escenarios de tus specs de OpenSpec en Gherkin y deja que un ejecutor de pruebas los ejecute contra tu aplicación, de modo que un escenario que ya no se cumple haga fallar `truss verify`.

TRUSS no incluye un ejecutor, ni lo hará: ejecutar Gherkin necesita una herramienta para tu lenguaje (cucumber-js, behave y otras), y TRUSS no elige tu toolchain. Lo que TRUSS te da es el sitio donde enchufarlo. `verification.commands` ejecuta cualquier comando, en orden, y registra el resultado. El ejecutor viene de otro lado.

## Una implementación para empezar

El [intent-driven-template](https://github.com/intent-driven-dev/intent-driven-template) (licencia MIT) documenta una configuración completa en sus skills `acceptance-test-authoring` y `spec-as-source`. Esta página resume cómo funciona a partir de la lectura de esos archivos; no los copia, y TRUSS no ha ejecutado esa configuración de principio a fin. Lee los archivos de la plantilla antes de adoptar nada, y conserva su aviso de licencia si copias alguno de ellos a tu proyecto.

Cómo funciona, en resumen:

1. Los pasos del escenario van en un bloque cercado `gherkin` dentro de cada requisito de un `spec.md`, bajo el encabezado habitual `#### Scenario:`. Los encabezados llevan la estructura (capacidad, requisito, escenario); el bloque contiene solo pasos `Given`, `When` y `Then`.
2. Un **extractor** convierte cada `spec.md` bajo `openspec/` en un archivo `.feature` dentro de una carpeta generada (`acceptance-tests/.extracted/`, ignorada por Git y reconstruida en cada ejecución). Las specs siguen siendo la fuente; los `.feature` nunca se editan a mano.
3. Un **ejecutor** (cucumber-js para JavaScript, behave para Python) ejecuta esos archivos contra la aplicación en marcha. Las definiciones de pasos y los page objects viven en `acceptance-tests/`, un proyecto de pruebas propio que arranca la aplicación antes de la suite y la detiene después.
4. La ejecución cubre la **spec efectiva**: las specs vigentes con los deltas de los cambios activos aplicados. Las reglas que un delta modifica o elimina quedan fuera, y `openspec/changes/archive/` nunca se ejecuta.
5. Las tareas van primero con el test de aceptación: preparar el ejecutor, luego una tarea por paso pendiente (verlo fallar por la razón correcta, implementar, verlo pasar), y al final una ejecución completa sin pasos pendientes ni sin definir.

## Enchúfalo en `truss verify`

Cuando el proyecto exista, lista su único comando en `.truss/config.yaml`, después de tus otras comprobaciones:

```yaml
spec:
  mode: source
  gherkin: true
verification:
  commands:
    - cd acceptance-tests && npm test
```

Para el stack de Python la plantilla documenta `python run_acceptance.py` desde dentro de `acceptance-tests/`. Como escribiste tú la lista, el primer `truss verify` te pide aprobarla (consulta [la aprobación](../reference/verify.md#aprobación)). La evidencia de `latest.json` muestra entonces la ejecución, y un escenario que falla detiene `verify` como cualquier otro comando que falla.

## Qué se comprobó y qué no

Comprobado con OpenSpec 1.13.2 y 1.14.1: una spec delta con un bloque cercado `gherkin` bajo un escenario pasa `openspec validate --strict`, y `openspec archive` copia el bloque sin cambios a `openspec/specs/<capacidad>/spec.md`. La spec archivada empieza con `# <capacidad> Specification`; no se probó si el extractor de la plantilla acepta ese título.

No se comprobó: el extractor, los ejecutores, las convenciones de page objects y la configuración de lint de la plantilla. Pruébalos en un proyecto de prueba antes de depender de ellos.

## Coste y cuándo vale la pena

Es la opción más pesada que documenta TRUSS: un segundo proyecto de pruebas, una dependencia de ejecutor y una aplicación que pueda arrancar desde un comando. Compensa cuando el comportamiento de las specs se observa desde fuera (HTTP, una interfaz) y quieres que las specs sean los tests. Para una biblioteca o una herramienta cuyo comportamiento ya cubren los tests unitarios, suelen bastar las [políticas de BDD y TDD](../concepts/bdd-tdd.md) y `tests_required`.

`spec.zone_guard` es otro asunto: TRUSS lo declara, pero lo hace cumplir un adaptador de runtime, no esta configuración. Consulta los [modos de especificación](../workflows/spec-modes.md).
