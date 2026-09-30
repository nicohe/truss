# Resolución de componentes

> Traducción al español. La referencia canónica es [la versión en inglés](../../en/reference/components.md).

TRUSS resuelve los identificadores de componentes configurados en contexto concreto del proyecto.

```yaml
components:
  api:
    path: ./apps/api
  worker:
    path: ./apps/worker
```

`truss components` valida cada ruta configurada. `truss components api` resuelve un solo componente.

Para cada componente, TRUSS informa de:

- la raíz del componente;
- el `AGENTS.md` efectivo (primero el del componente, con el del workspace como alternativa);
- la raíz de OpenSpec (primero la del componente, con la del workspace como alternativa);
- los directorios de código fuente detectados;
- los directorios de tests detectados.

Una ruta configurada debe existir, ser un directorio, quedar dentro de la raíz del proyecto y no resolverse a la misma ruta real que otro componente. Una resolución inválida devuelve el código de salida 2. `truss doctor` también comprueba la resolución de componentes.

Cuando `components: {}`, el repositorio se resuelve como un único componente `workspace`.

`truss new --component <name>` usa el identificador del componente, no una ruta cruda del sistema de archivos. El cambio nuevo se crea bajo la raíz de OpenSpec resuelta.
