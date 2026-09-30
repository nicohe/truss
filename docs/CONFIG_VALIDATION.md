# Configuration validation

TRUSS v0.1.8 validates `.truss/config.yaml` before commands that depend on configuration.

```bash
node ./bin/truss.mjs config
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

TRUSS intentionally keeps configuration simple. It supports nested mappings, booleans, integers, strings, `{}`, `[]`, and lists of scalar strings. Advanced YAML features such as anchors, aliases, multiline scalars, and lists of objects are not part of config schema v1.

The formal contract remains `.truss/schema/config.schema.json`.
