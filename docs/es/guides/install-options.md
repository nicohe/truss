# Instalar TRUSS: por proyecto, una vez para la máquina, o sin Git

> Traducción al español. La referencia canónica es [la versión en inglés](../../en/guides/install-options.md).

TRUSS es una carpeta de código Node más el contenido del harness que viaja con él. No hay paquete en npm ni instalador: pones esa carpeta en algún sitio y ejecutas `bin/truss.mjs` con Node 20 o posterior. Esta guía muestra tres formas de hacerlo y dice qué cuesta cada una.

Los comandos de instalación e `init` de abajo se ejecutaron en un proyecto de prueba contra la release v0.2.25 de GitHub. Los comandos de actualización no (no había una release más nueva a la que moverse), y el final de la página lista lo demás que no se probó.

## Las tres formas

| | Clon por proyecto | Un clon para la máquina | Tarball por proyecto |
|---|---|---|---|
| Dónde vive el código | `<proyecto>/.truss/` | una carpeta, por ejemplo `~/.local/share/truss/` | `<proyecto>/.truss/` |
| Ejecutas | `node .truss/bin/truss.mjs` | `truss` (un enlace en tu `PATH`) | `node .truss/bin/truss.mjs` |
| Necesita Git para instalar | sí | sí | no |
| Actualizar | `git checkout <release>` en cada proyecto | `git checkout <release>` una vez, para todos los proyectos | descargar de nuevo |
| Versiones entre proyectos | cada proyecto fija la suya | todos comparten una | cada proyecto fija la suya |
| Tamaño en disco | unos 2 MB por proyecto | unos 2 MB, una vez | unos 1,4 MB por proyecto |
| Conviene cuando | un equipo o la CI usa el proyecto | los proyectos son tuyos y quieres un comando corto | no quieres Git para TRUSS |

La primera forma es el [inicio rápido](../getting-started.md#2-añade-truss-a-tu-proyecto). Elígela cuando otras personas o una máquina de CI usan el proyecto: cada una puede ver en qué release está.

## Un clon para la máquina

Clona una vez y enlaza el ejecutable en algún sitio de tu `PATH`:

```bash
git clone --depth 1 --branch v0.2.31 https://github.com/nicohe/truss.git ~/.local/share/truss
ln -s ~/.local/share/truss/bin/truss.mjs ~/.local/bin/truss
truss --version
```

`~/.local/bin` tiene que estar en tu `PATH`. El archivo `bin/truss.mjs` tiene el bit de ejecución y una línea `#!/usr/bin/env node`, y por eso basta un enlace.

Después, en cada proyecto:

```bash
cd mi-proyecto
truss init
truss doctor
```

`init` crea `openspec/` y `.truss/config.yaml` y nada más. El proyecto guarda su configuración, el cambio activo y la evidencia en su propio `.truss/`; el esquema, las skills, las políticas y los flujos se leen de la instalación (consulta la [estructura del proyecto](../reference/project-structure.md)). Todo lo demás funciona como en el inicio rápido, con `truss` en lugar de `node .truss/bin/truss.mjs`. En la guía para tu agente, usa también `truss`.

Para actualizar todos los proyectos a la vez, o volver atrás:

```bash
git -C ~/.local/share/truss fetch --tags
git -C ~/.local/share/truss checkout v0.2.32
```

Para quitarlo, borra `~/.local/share/truss` y `~/.local/bin/truss`. Los proyectos conservan `openspec/` y `.truss/`.

### Con un agente

`truss continue` imprime la ruta absoluta del flujo y de cada archivo de política que pide seguir al agente, así que el agente puede leerlos aunque estén fuera del proyecto. En una prueba, un subagente con la guía habitual ejecutó `truss continue`, leyó el flujo y las políticas de la carpeta central e implementó un cambio pequeño empezando por el test (consulta [usar TRUSS con un coding agent](agents.md)). El agente necesita `truss` en su propio `PATH`: un alias de tu shell no lo ve.

En CI, clona TRUSS en el workflow y llámalo por su ruta, como en [usar TRUSS en CI](ci.md); un enlace en el `PATH` es un paso más que preparar allí.

## Un tarball, sin Git

Para un proyecto donde no quieres un clon de Git de TRUSS:

```bash
mkdir -p .truss
curl -L https://github.com/nicohe/truss/archive/refs/tags/v0.2.31.tar.gz | tar -xz --strip-components=1 -C .truss
echo ".truss/" >> .gitignore
```

GitHub pone todo en una carpeta superior llamada `truss-0.2.31`; `--strip-components=1` la quita. El resultado es la misma disposición que el clon, sin `.git`, así que `node .truss/bin/truss.mjs init` y lo demás funcionan como en el inicio rápido. No hay `git checkout` para actualizarlo: quita todo lo que haya en `.truss/` salvo `config.yaml`, `state.json`, `verification/` y `handoffs/` (los archivos propios del proyecto viven en la misma carpeta) y descomprime la release nueva.

## Qué no se comprobó

- **Actualizar una instalación con tarball.** Los pasos de arriba son los previstos; no se ejecutaron.
- **Windows.** El enlace y la línea `#!` son para macOS y Linux. En Windows usa la forma larga, o una función en el perfil de tu shell.
- **Agentes.** Un agente, una tarea pequeña con la política TDD. Muestra que la instalación central se puede seguir; no muestra que los agentes la sigan mejor o peor que el clon por proyecto.
- **Un paquete publicado.** TRUSS no está en npm, y nada de aquí depende de un gestor de paquetes.

## Ver también

- [Inicio rápido](../getting-started.md)
- [Actualizar o desinstalar TRUSS](update-and-remove.md)
- [Usar TRUSS en un repositorio compartido](shared-repo.md)
