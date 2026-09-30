# Integración continua

> Traducción al español. La referencia canónica es [la versión en inglés](../../en/development/ci.md).

TRUSS v0.2 ejecuta su suite de verificación permanente en GitHub Actions.

Workflow: `.github/workflows/ci.yml`

## Disparadores

El CI se ejecuta en:

- los push a `main`;
- cada pull request;
- las ejecuciones manuales con `workflow_dispatch`.

## Matriz de runtimes

TRUSS declara Node.js `>=20`, así que el CI verifica la versión mayor mínima admitida y las líneas más nuevas (6 jobs):

| Sistema operativo | Node.js |
|---|---|
| `ubuntu-latest` | 20, 22 y 24 |
| `macos-latest` | 20 y 24 |
| `windows-latest` | 24 |

El rango de versiones de Node se cubre en Ubuntu, el runner más barato. macOS y Windows están para detectar lo que depende del sistema operativo (rutas, shims, lanzamiento de procesos), así que ejecutan menos celdas. El coste es que un problema propio de un Node más antiguo en Windows, o de Node 22 en macOS o Windows, no lo detecta el CI.

**Windows.** Toda la suite se ejecuta en Windows. Los CLIs falsos de OpenSpec y Graphify se instalan como npm instala un CLI global (un shim `sh` sin extensión, un shim `.cmd` y el script de Node que lanzan ambos), de modo que los tests ejercitan el mismo manejo de `.cmd` que una instalación real.

## Checks requeridos

Cada job de la matriz realiza:

```text
checkout
  ↓
npm ci --ignore-scripts
  ↓
npm run check
  ↓
npm run check:docs         (solo ubuntu / Node 22)
  ↓
npm run lint               (solo ubuntu / Node 22)
  ↓
unit → integration → E2E   (pasos separados, para que una suite que falla no oculte a las demás)
```

`npm run check` ejecuta `node --check` sobre los módulos JavaScript de TRUSS. `npm run check:docs` ejecuta la [comprobación de la documentación](#comprobación-de-la-documentación). `npm run lint` ejecuta [Biome](https://biomejs.dev) (`biome check`: reglas de lint, formato y orden de imports) con `biome.jsonc`. Las suites las arranca `scripts/run-tests.mjs`, que lista él mismo los archivos de test porque `cmd.exe` y Node 20 no expanden globs.

## Comprobación de la documentación

`npm run check:docs` (`scripts/check-docs.mjs`, sin dependencias ni red) hace fallar el build cuando la documentación se desajusta. Revisa los archivos Markdown del repositorio en busca de:

- **Enlaces rotos**: un enlace relativo a un archivo que no existe.
- **Anclas rotas**: un `#fragmento` sin un encabezado que coincida en la página de destino. Las anclas siguen las reglas de GitHub, incluidos los encabezados con código en línea y los encabezados repetidos.
- **Páginas huérfanas**: una página bajo `docs/en/` o `docs/es/` a la que no enlaza ninguna otra página. Cualquier otro directorio de documentación (una futura traducción, por ejemplo) solo produce una advertencia hasta que se añada a `ENFORCED_ORPHAN_DIRS`; `--strict` los exige todos.
- **Traducciones desajustadas**: una página bajo `docs/es/` cuya estructura difiere de su original en inglés (encabezados, bloques de código, filas de tabla, viñetas o enlaces relativos), o que no lleva exactamente una nota de traducción. Informa de qué difiere y en cuánto.

y, frente al código que describen, que la documentación mencione:

- cada comando del CLI (`docs/en/reference/cli.md`);
- cada opción de configuración del schema (`docs/en/configuration/reference.md`);
- cada check de `truss doctor` (`docs/en/reference/doctor.md`);
- cada variable de entorno que lee el CLI o define un workflow de CI (`docs/en/reference/environment.md`);
- la versión actual allí donde una página o plantilla la escribe (instalaciones fijadas en las guías, el ejemplo de `--version`, el placeholder del reporte de errores), coincidiendo con `package.json`. Consulta [Publicar una release](releasing.md).

Las traducciones al español de esas cuatro páginas (`docs/es/...`) se comprueban igual cuando existen. La comprobación también lista, como una advertencia que no hace fallar el build, cada página en inglés que no tiene su equivalente bajo `docs/es/`.

Así, añadir un comando, una opción, un check de doctor o una variable de entorno sin documentarlos hace fallar el build, que es el tipo de desajuste que había dejado sin documentar `doctor.md` y las variables de entorno. Usa `--root <dir>` para comprobar otro árbol. Los enlaces externos no se comprueban, para que el build sea determinístico.

## Test de contrato contra el OpenSpec real

El job `Contract / real OpenSpec` instala `@fission-ai/openspec@1` y ejecuta la suite E2E con `TRUSS_REQUIRE_REAL_OPENSPEC=1`, de modo que `test/e2e/real-openspec.e2e.test.mjs` no puede omitirse allí. El OpenSpec falso que usan los demás jobs replica el CLI real, pero solo este job lo demuestra. **No** es un check requerido a propósito: un problema del registro o una versión nueva de OpenSpec no deberían bloquear los merges. En local el test se ejecuta siempre que haya un `openspec` compatible en el `PATH` y se omite en otro caso.

## Mínimo de cobertura

El job `ubuntu-latest` / Node 22 ejecuta toda la suite mediante `npm run test:coverage`, que falla cuando la cobertura cae por debajo del mínimo definido en `package.json` (líneas 90 %, ramas 75 %, funciones 95 %). En local:

```bash
npm run test:coverage
```

El workflow es de solo lectura, salvo por el workspace efímero del runner. No instala ni actualiza OpenSpec ni Graphify y no publica TRUSS.

## Equivalente en local

Antes de hacer push de un cambio, ejecuta:

```bash
npm ci --ignore-scripts
npm run ci
```

Si `npm run lint` informa de problemas de formato o de lint corregibles, `npm run lint:fix` los aplica.

Un fallo en el chequeo de sintaxis, en la comprobación de la documentación, en el lint o en un test hace fallar el job de CI. La protección de `main` exige que pasen los seis jobs de la matriz antes de poder mergear una pull request. El job `Contract / real OpenSpec` no es requerido.
