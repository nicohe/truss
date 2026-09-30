# Actualizar o desinstalar TRUSS

> Traducción al español. La referencia canónica es [la versión en inglés](../../en/guides/update-and-remove.md).

Con la disposición del [inicio rápido](../getting-started.md), TRUSS es un clon de Git dentro del `.truss/` de tu proyecto, fijado a una release. Actualizarlo y quitarlo son operaciones de Git.

## Comprueba qué tienes

```bash
node .truss/bin/truss.mjs --version
```

Imprime `truss 0.2.2` o posterior. Una release anterior a la 0.2.2 no tiene `--version`; ejecuta en su lugar `git describe --tags` dentro de `.truss/`. El [changelog](../../../CHANGELOG.md) (en inglés) lista qué cambia cada release, con notas de actualización.

## Actualizar a una release más nueva, o volver a una

El inicio rápido fija el clon a una release. Para pasar a otra, descarga los tags y haz checkout del que quieras:

```bash
cd .truss
git fetch --tags
git checkout v0.2.8      # un HEAD desacoplado, a propósito: nada se mueve hasta que tú lo digas
cd ..
node .truss/bin/truss.mjs doctor
```

El [changelog](../../../CHANGELOG.md) y la [página de releases](https://github.com/nicohe/truss/releases) listan las releases. Un tag más antiguo te lleva atrás del mismo modo.

## Seguir `main` en su lugar

Lo que se ha mergeado y aún no se ha publicado está en `main`. El clon fijado solo conoce el tag de su release, así que primero hay que hablarle de `main`:

```bash
cd .truss
git remote set-branches --add origin main
git fetch --depth 1 origin main
git checkout main
cd ..
```

Desde entonces, `git pull` dentro de `.truss/` lo mantiene al día. `truss --version` sigue imprimiendo el número de la última release, así que indica que estás en `main` cuando reportes un problema. Vuelve a una release con la sección anterior.

## Protege tus archivos mientras lo haces

Tu `config.yaml`, `state.json`, `verification/` y `handoffs/` están dentro del clon, como archivos que Git no rastrea. `git pull` y `git checkout` no los tocan. **`git clean -fd` los borra y `git stash -u` los aparta**, así que no ejecutes ninguno de los dos dentro de `.truss/`. Guarda una copia de tu configuración fuera de él (consulta el [ADR 0001](../development/decisions/0001-local-project-configuration.md)).

## Desinstalar TRUSS

1. **Borra el directorio**: `rm -rf .truss`. Eso elimina TRUSS, la configuración del proyecto, el estado local, la evidencia de verificación y las notas de handoff. Copia antes lo que quieras conservar.
2. **Quita `.truss/` del `.gitignore`**, y las líneas de TRUSS de tu `AGENTS.md`.
3. **Conserva `openspec/`.** Contiene tus especificaciones y pertenece a OpenSpec, y nada de lo que hay en él depende de TRUSS. Para quitar también OpenSpec: `npm uninstall --global @fission-ai/openspec`.
4. **Olvida las aprobaciones** (opcional): viven en `trusted.json` bajo `$TRUSS_HOME`, por defecto `~/.config/truss/`, fuera del proyecto. Borrar el archivo solo significa que se te volvería a preguntar.

Tu aplicación no depende de `.truss/`, así que sigue funcionando sin él (consulta la [estructura del proyecto](../reference/project-structure.md)).
