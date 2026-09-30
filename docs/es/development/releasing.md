# Publicar una release

> Traducción al español. La referencia canónica es [la versión en inglés](../../en/development/releasing.md).

Una release es una pull request que sube la versión, seguida de un tag y de una release en GitHub. Nada está automatizado: esta página es la lista de pasos.

## Antes de la pull request

1. Parte de un `main` actualizado, en una rama como `release/vX.Y.Z`.
2. Sube la versión sin crear el tag:

   ```bash
   npm version X.Y.Z --no-git-tag-version --ignore-scripts
   ```

   Esto actualiza `package.json` y `package-lock.json`.
3. En `CHANGELOG.md`, convierte las entradas de `[Unreleased]` en una sección `[X.Y.Z] - fecha`: un resumen de un párrafo, **Upgrade notes** (indica que no hay, si es el caso) y luego lo añadido, cambiado y corregido.
4. Actualiza los lugares que escriben la versión. `npm run check:docs` falla hasta que coincidan con `package.json`:
   - la instalación fijada en [Usar TRUSS en CI](../guides/ci.md) (`--branch vX.Y.Z`) y el `git checkout vX.Y.Z` de [Actualizar o eliminar TRUSS](../guides/update-and-remove.md);
   - la salida de ejemplo de `--version` en la [referencia del CLI](../reference/cli.md);
   - el placeholder de `.github/ISSUE_TEMPLATE/bug_report.yml`;
   - las mismas líneas en las páginas en español de `docs/es/`.
5. Ejecuta `npm run ci` y abre la pull request. Necesita los nueve jobs de la matriz en verde, como cualquier otra.

## Después del merge

Actualiza `main`, crea el tag sobre el commit del merge y publica la release, usando la sección del changelog como notas:

```bash
git tag -a vX.Y.Z -m "TRUSS vX.Y.Z" <commit-del-merge>
git push origin vX.Y.Z
gh release create vX.Y.Z --verify-tag --latest --title "TRUSS vX.Y.Z" --notes-file <archivo con la sección del changelog>
```

Los tags son anotados. Las guías fijan un tag, así que un tag publicado nunca se mueve ni se borra: un error se corrige con la release siguiente.

## Qué cubren los checks

`check:docs` compara la versión de esos lugares con `package.json` (consulta la [integración continua](ci.md#comprobación-de-la-documentación)). No puede saber si el changelog está completo, ni si las páginas del contrato de release ([v0.2](../reference/release-v0.2.md)) siguen describiendo lo que se publica: léelas antes de crear el tag.
