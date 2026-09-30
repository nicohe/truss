# Detección de OpenSpec

> Traducción al español. La referencia canónica es [la versión en inglés](../../en/integrations/openspec-detection.md).

TRUSS trata OpenSpec como una dependencia central obligatoria, pero no es dueño de su ciclo de vida.

`truss openspec` detecta dos estados independientes:

1. **CLI**: si `openspec` está en el `PATH` y, cuando es posible, la versión que informa `openspec --version`.
2. **Proyecto**: si el proyecto actual ha sido inicializado por OpenSpec.

## Estados del proyecto

- `initialized`: existe `openspec/config.yaml` u `openspec/config.yml`.
- `legacy_or_partial`: el directorio `openspec/` tiene `specs/` o `changes/`, pero no hay configuración del proyecto.
- `directory_only`: existe `openspec/` sin evidencia reconocible de inicialización.
- `not_initialized`: no existe el directorio `openspec/`.

El contrato actual de `init` de OpenSpec crea `openspec/config.yaml`, así que TRUSS usa ese archivo como marca positiva de inicialización. TRUSS no modifica, refresca ni sobrescribe OpenSpec durante la detección.

La detección no juzga la versión. Si la versión instalada es compatible es otra pregunta, que describe el [contrato de compatibilidad](openspec-compatibility.md).

## Comandos

```bash
truss openspec
truss doctor
```

`truss openspec` sale con un código distinto de cero cuando falta el CLI o el proyecto no se reconoce como inicializado. `truss doctor` informa de estas dos comprobaciones por separado (`CLI` y `Project`) y de la comprobación de versión como `Compatibility`.
