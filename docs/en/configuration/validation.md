# Configuration validation

TRUSS validates `.truss/config.yaml` before every command that depends on configuration.

```bash
node .truss/bin/truss.mjs config
```

The validator guarantees:

- YAML syntax for the supported TRUSS configuration subset.
- schema version `1`.
- known properties only.
- expected scalar/array/object types.
- allowed `spec.mode` values.
- non-empty verification commands and component paths.
- `graphify.required: true` cannot be combined with `graphify.enabled: false`.
- omitted optional settings receive the documented defaults in the resolved configuration.

Invalid configuration exits with code `2`. Verification does not run when configuration is invalid.

## Supported YAML subset

TRUSS intentionally keeps configuration simple. It supports nested mappings, booleans, integers, strings, `{}`, `[]`, and lists of scalar strings. Advanced YAML features such as anchors, aliases, tags, block scalars, flow collections with values, and lists of objects are not part of config schema v1. The parser rejects them with an error instead of turning them into strings, so quote any value that starts with `&`, `*`, `!`, `|`, `>`, `[` or `{`, and note that an unterminated quote is also an error.

The formal contract remains `.truss/schema/config.schema.json`.
