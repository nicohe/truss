# Documentación de TRUSS

> Traducción al español. La documentación canónica está en [`docs/en/`](../en/README.md); cada página de allí tiene su versión en esta carpeta. Los archivos de la raíz del repositorio (`CONTRIBUTING`, `SECURITY`, `CHANGELOG`) solo existen en inglés.

**¿Eres nuevo?** Lee [Primeros pasos](getting-started.md): te lleva de cero a un cambio verificado en unos diez minutos.

## Entender TRUSS

Por qué funciona como funciona.

- [Quién hace qué](concepts/who-does-what.md): tú, tu agente, TRUSS y OpenSpec; un modelo o varios; subagentes y worktrees.
- [Arquitectura](concepts/architecture.md): el core, las policies, los workflows, las integrations y los runtime adapters.
- [Desarrollo guiado por especificación](concepts/spec-driven-development.md): OpenSpec como ancla y los dos modos de especificación.
- [BDD y TDD](concepts/bdd-tdd.md): los dos bucles y qué puede y qué no puede comprobar TRUSS sobre ellos.
- [Gestión de contexto](concepts/context-management.md): darle a un agente solo lo que la tarea necesita.
- [Estado durable vs efímero](concepts/durable-vs-ephemeral.md): qué confirmar y qué mantener en local.
- [Glosario](reference/glossary.md)

## Hacer el trabajo

Cómo avanza un cambio por TRUSS.

- [Resumen de workflows](workflows/overview.md)
- [Ciclo de vida del cambio](workflows/lifecycle.md): el orden de comandos, workflows y skills.
- [`execute-change`](workflows/execute-change.md): el workflow central de implementación.
- [Modos de especificación](workflows/spec-modes.md): Spec-Anchored y Spec-as-Source en detalle.
- [Comandos del ciclo de vida](workflows/lifecycle-commands.md): `new`, `status`, `continue` y las fases.
- [Skills](skills/overview.md): las skills portables para agentes.

## Guías

Respuestas paso a paso a una tarea.

- [Usar TRUSS con un coding agent](guides/agents.md): el bucle, dónde lee cada agente su guía y aprobar la verificación una vez.
- [Usar TRUSS en CI](guides/ci.md): una instalación fijada, la configuración, la aprobación y un workflow de ejemplo.
- [Actualizar o desinstalar TRUSS](guides/update-and-remove.md): fijar una release y qué no borrar.

## Comandos

- [Referencia del CLI](reference/cli.md): cada comando, sus opciones y códigos de salida.
- [Variables de entorno](reference/environment.md): `TRUSS_TRUST`, `TRUSS_HOME`, `TRUSS_OPENSPEC_PATH`, color y `PATH`.
- [`truss init`](reference/init.md)
- [`truss doctor`](reference/doctor.md)
- [`truss verify`](reference/verify.md): comandos, aprobación y los dos gates opcionales.
- [`truss handoff`](reference/handoff.md): la nota de transición y lo que no protege.
- [Resolución de componentes](reference/components.md): monorepos y `--component`.

## Configuración

Cada opción, su valor por defecto y qué cambia al cambiarla.

- [Referencia](configuration/reference.md): tipos, valores por defecto, valores posibles y quién exige cada opción.
- [Efectos](configuration/effects.md): qué cambia cuando cambia un valor.
- [Ejemplos](configuration/examples.md): perfiles completos.
- [Validación](configuration/validation.md): cómo se comprueba `.truss/config.yaml`.
- [Estructura del proyecto](reference/project-structure.md): la instalación de TRUSS frente al proyecto.

## Integraciones

- [OpenSpec](integrations/openspec.md): la base requerida.
  - [Detección](integrations/openspec-detection.md) y [compatibilidad](integrations/openspec-compatibility.md)
- [Graphify](integrations/graphify.md): inteligencia de código opcional.
  - [Ciclo de vida](integrations/graphify-lifecycle.md)

## Qué está garantizado

- [Modelo de enforcement](reference/enforcement.md): qué comprueba TRUSS por sí mismo, qué le pide al agente y qué necesita un runtime adapter.
- [Contrato de la versión v0.2.0](reference/release-v0.2.md)
- [Contrato de la versión v0.1.0](reference/release-v0.1.md) (histórico)
- [Auditoría de la documentación](reference/documentation-audit.md) (histórica)

## Contribuir y mantener

- [Pruebas](development/testing.md), [pruebas end-to-end](development/e2e.md) e [integración continua](development/ci.md)
- [Decisiones de diseño](development/decisions/0001-local-project-configuration.md): ADR 0001, dónde vive la configuración del proyecto.
- [Marca y uso del logo](reference/brand.md)
- Consulta también [CONTRIBUTING](../../CONTRIBUTING.md), [SECURITY](../../SECURITY.md) y el [changelog](../../CHANGELOG.md) *(en inglés)*.
