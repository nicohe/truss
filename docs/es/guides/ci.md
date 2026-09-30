# Usar TRUSS en CI

> Traducción al español. La referencia canónica es [la versión en inglés](../../en/guides/ci.md).

Ejecuta `truss verify` en tu pipeline para que una pull request se compruebe con los mismos comandos que ejecutas en local. Dos cosas de TRUSS determinan cómo: la configuración del proyecto **no** está en tu repositorio, y `verify` se niega a ejecutar una lista de comandos que nadie aprobó.

## Qué necesita el CI

- **TRUSS**, fijado a una release para que el pipeline no cambie por debajo de ti.
- **Tu configuración**, porque `.truss/config.yaml` es local a cada copia y un checkout nuevo del CI no la tiene. Guarda una copia de referencia en el repositorio (por ejemplo `ci/truss-config.yaml`) y cópiala a su sitio. El [ADR 0001](../development/decisions/0001-local-project-configuration.md) explica por qué.
- **Aprobación**, porque no hay terminal donde responder al prompt. Define `TRUSS_TRUST=1` (o pasa `--trust`). Hazlo solo para una lista de comandos que una persona haya revisado: el archivo de referencia, revisado como cualquier otro cambio del repositorio, es esa revisión.
- **Historial completo de Git**, solo si activas `verification.tests_required`, que compara el cambio con la rama base.
- **OpenSpec**, solo si activas `verification.tasks_complete`. Sin él, la comprobación informa de que no puede evaluar y no bloquea.

## Ejemplo: GitHub Actions

```yaml
name: verify
on: pull_request

jobs:
  truss:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
        with:
          fetch-depth: 0   # tests_required compares with the base branch
      - uses: actions/setup-node@v7
        with:
          node-version: 22
      - run: npm ci
      - run: git clone --depth 1 --branch v0.2.2 https://github.com/nicohe/truss.git .truss
      - run: cp ci/truss-config.yaml .truss/config.yaml
      - run: node .truss/bin/truss.mjs verify
        env:
          TRUSS_TRUST: "1"
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: truss-evidence
          path: .truss/verification/latest.json
```

El job falla cuando `verify` sale con `1` o `2` (consulta los [códigos de salida](../reference/cli.md#códigos-de-salida)). El último paso conserva la [evidencia](../reference/verify.md#evidencia) de la ejecución, también cuando falla.

## No apruebes lo que no revisaste

`TRUSS_TRUST=1` hace que los comandos del archivo copiado se ejecuten con los permisos del job. No lo uses en un job que ejecuta código de una pull request que no has revisado, como un workflow disparado por pull requests de forks que además copia un archivo que la pull request puede cambiar. Lee el [modelo de confianza](../../../SECURITY.md#trust-model) (en inglés).

## Si falla

| Ves | Qué significa | Qué hacer |
|---|---|---|
| `Not trusted; nothing was executed.` y código de salida `1` | no hay terminal ni aprobación | define `TRUSS_TRUST: "1"` en el paso, tras revisar la lista |
| `TRUSS config not found: .truss/config.yaml` | no se copió la configuración | añade el paso `cp` antes de `verify` |
| `Tests required` con `could not evaluate` | el checkout es superficial, así que no hay rama base con la que comparar | usa `fetch-depth: 0` |
| `× failed [1/4] npm test --if-present` con `Could not read package.json` | los comandos por defecto suponen un proyecto Node | lista tus propios comandos en el archivo de referencia (consulta los [ejemplos](../configuration/examples.md#un-proyecto-que-no-es-node)) |
