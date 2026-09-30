# Validación de la configuración

> Traducción al español. La referencia canónica es [la versión en inglés](../../en/configuration/validation.md).

TRUSS valida `.truss/config.yaml` antes de cada comando que depende de la configuración.

```bash
node .truss/bin/truss.mjs config
```

El validador garantiza:

- sintaxis YAML dentro del subconjunto admitido de la configuración de TRUSS;
- versión de schema `1`;
- solo propiedades conocidas;
- los tipos esperados (escalar, array, objeto);
- valores permitidos para `spec.mode`;
- comandos de verificación y rutas de componentes no vacíos;
- que `graphify.required: true` no se combine con `graphify.enabled: false`;
- que las opciones opcionales omitidas reciban los valores por defecto documentados en la configuración resuelta.

Una configuración inválida sale con código `2`. La verificación no se ejecuta cuando la configuración es inválida.

## Subconjunto de YAML admitido

TRUSS mantiene la configuración simple a propósito. Admite mapeos anidados, booleanos, enteros, strings, `{}`, `[]` y listas de strings escalares. Las funciones avanzadas de YAML, como anchors, aliases, tags, block scalars, colecciones flow con valores y listas de objetos, no forman parte del schema de configuración v1. El parser las rechaza con un error en lugar de convertirlas en strings, así que pon entre comillas cualquier valor que empiece por `&`, `*`, `!`, `|`, `>`, `[` o `{`; una comilla sin cerrar también es un error.

El contrato formal sigue siendo `.truss/schema/config.schema.json`.
