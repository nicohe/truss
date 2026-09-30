# `truss init`

> Traducción al español. La referencia canónica es [la versión en inglés](../../en/reference/init.md). Los mensajes que imprime TRUSS están en inglés.

`truss init` prepara un proyecto para usar TRUSS. Es idempotente y no destructivo: ejecútalo tantas veces como quieras.

```text
Config          ● created .truss/config.yaml
OpenSpec       ● initialized with --tools none
Git ignore      ● .truss/ ignored

TRUSS initialization verified.
```

## Qué hace

1. **Configuración.** Crea `.truss/config.yaml` a partir de los valores por defecto de TRUSS si no existe. Si existe, se valida y se **adopta**, nunca se sobrescribe. El proyecto solo recibe sus propios archivos; el schema, las skills, las policies y los workflows vienen de la [instalación de TRUSS](project-structure.md).
2. **OpenSpec.** Adopta un proyecto OpenSpec ya inicializado, o inicializa uno que falte con `openspec init <project> --tools none`, y solo cuando hay un CLI de OpenSpec compatible.
3. **Aprobación.** Cuando `init` *crea* la configuración, también aprueba la lista por defecto de `verification.commands` que acaba de escribir, de modo que el primer `truss verify` no pida confirmación. Una configuración **adoptada** no se aprueba: su primer `verify` pregunta (consulta [`truss verify`](verify.md#aprobación)).
4. **Git.** Inspecciona `.gitignore` y avisa cuando `.truss/` no está ignorado. Nunca reescribe `.gitignore`.

No crea un `AGENTS.md`, no instala un agente ni cambia tu historial de Git.

## Garantías

- Un `.truss/config.yaml` existente se valida y se adopta; nunca se sobrescribe. Si es inválido, detiene `init` y se deja intacto.
- Si TRUSS no puede validar la configuración que acaba de crear (por ejemplo, por una instalación incompleta), el archivo se elimina de nuevo: `init` nunca deja una configuración a medio crear.
- Los proyectos OpenSpec ya inicializados se adoptan sin modificarlos.
- Los directorios `openspec/` parciales o heredados se conservan y requieren una acción explícita del usuario.
- TRUSS nunca instala, actualiza ni degrada OpenSpec.
- Volver a ejecutar `truss init` es seguro: la configuración de TRUSS y los datos del proyecto OpenSpec existentes no cambian.

## Códigos de salida

| Código | Significado |
|---|---|
| `0` | El proyecto está inicializado (creado o adoptado). |
| `1` | OpenSpec falta, es incompatible, está en un estado parcial o heredado, o su inicialización falló. Aun así la configuración pudo haberse creado. |
| `2` | La configuración es inválida o la instalación de TRUSS está incompleta. No se sobrescribió nada. |

## ¿Por qué `--tools none`?

TRUSS es independiente del runtime. OpenSpec sigue siendo la capa durable de especificación requerida, mientras que elegir Claude Code, Codex, Devin, Windsurf u otras integraciones de runtime de OpenSpec sigue siendo una decisión explícita del proyecto o del usuario.
