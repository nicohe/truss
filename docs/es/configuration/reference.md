# Referencia de configuración

> Traducción al español. La documentación en `docs/en/` es la referencia canónica.

Regla: **No configuration without semantics.** Cada opción pública documenta tipo, default, valores permitidos, efecto, fallback/fallo y responsable del enforcement.

## `version`
Entero, default `1`. Selecciona la versión del schema de configuración TRUSS. Una versión no soportada debe fallar validación. Enforcement: **TRUSS**.

## `spec.mode`
Enum, default `anchored`. Valores: `anchored`, `source`.
- `anchored`: OpenSpec permanece como ancla; spec, tests y código pueden evolucionar con reconciliación explícita.
- `source`: OpenSpec es autoritativa; los cambios de comportamiento vuelven primero a la fase de spec.
Enforcement v0.1: **AGENT**. Objetivo v0.2: **TRUSS + AGENT**.

## `spec.gherkin`
Boolean, default `true`. `true` espera escenarios Gherkin para comportamiento observable cuando corresponda; `false` permite criterios de aceptación estructurados sin Gherkin. Enforcement v0.1: **AGENT**.

## `spec.zone_guard`
Boolean, default `false`. `true` espera separación Spec Zone / Code Zone. Recomendado principalmente con `mode: source`. Enforcement v0.1: **AGENT/DECLARATIVE**.

## `development.bdd`
Boolean, default `true`. Habilita el macro-loop BDD en `execute-change`: aceptación RED → implementación → aceptación GREEN. Enforcement v0.1: **AGENT**.

## `development.tdd`
Boolean, default `true`. Habilita RED → GREEN mínimo → refactor para detalles de implementación. Enforcement v0.1: **AGENT**.

## `verification.commands`
Array de strings. `truss verify` ejecuta los comandos en orden; un fallo impide considerar Verification exitosa. Enforcement: **TRUSS**.

## `integrations.graphify.enabled`
Boolean, default `true`.
- `false`: TRUSS no intenta usar Graphify; usa descubrimiento nativo.
- `true`: Graphify puede usarse para relaciones/impacto del código.
Enforcement v0.1: **TRUSS** para habilitar/deshabilitar los comandos y diagnósticos de Graphify; **AGENT** para decidir cuándo usar Graphify opcional durante implementación.

## `integrations.graphify.required`
Boolean, default `false`. Solo válido con `enabled: true`.
- `false`: si Graphify no está disponible, fallback a search/grep/LSP/exploración nativa.
- `true`: Graphify es requisito del proyecto. `truss graphify` y `truss doctor` lo reportan como bloqueante si no está disponible/listo.
Enforcement v0.1: **TRUSS** para esos checks ejecutables; **AGENT** debe respetar el requisito durante implementación agent-driven. El gating centralizado de workflows queda para orquestación posterior.

`enabled: false` + `required: true` es configuración inválida.

## `components`
Mapa, default `{}`.
- `{}`: repo tratado como un único workspace.
- con entradas: declara unidades direccionables dentro de monorepo/workspace.

```yaml
components:
  api:
    path: ./apps/api
  worker:
    path: ./apps/worker
```
La key es el identificador estable del componente y `path` su raíz relativa al repo. Puede usarse para scope de instrucciones locales, código, tests y trabajo OpenSpec. Enforcement v0.1: **TRUSS** valida y resuelve paths de componentes, guidance AGENTS local/workspace, scope OpenSpec y roots comunes de source/tests; la orquestación profunda de tasks queda para v0.2.

## OpenSpec no es opcional
OpenSpec es requerido por TRUSS y no aparece bajo `integrations`. TRUSS debe detectar/reutilizar un OpenSpec compatible existente o inicializarlo si falta, sin reemplazar silenciosamente datos OpenSpec existentes.

## Schema legible por máquina

El contrato v1 legible por máquina vive en `.truss/schema/config.schema.json` y usa JSON Schema Draft 2020-12. Define la estructura soportada, tipos, enums, estructura de componentes, política de propiedades desconocidas y la combinación inválida `graphify.enabled: false` + `graphify.required: true`.

El schema es el contrato estructural. El parseo YAML, aplicación de defaults, diagnósticos y enforcement real del CLI corresponden al paso de validación de configuración.
