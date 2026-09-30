# Pruebas end-to-end

> Traducción al español. La referencia canónica es [la versión en inglés](../../en/development/e2e.md).

TRUSS v0.2 mantiene una suite E2E ejecutable en `test/e2e/`.

Ejecútala con:

```bash
npm run test:e2e
```

La suite ejercita el ciclo de vida visible para el usuario mediante procesos reales del CLI de TRUSS y workspaces Git temporales. Salvo que un test diga otra cosa, los ejecutables externos de OpenSpec y Graphify son fixtures locales determinísticos: los tests E2E nunca instalan, actualizan ni acceden a la red.

Recorridos cubiertos:

1. Workspace nuevo: `init -> new -> continue(spec) -> planificación completa -> continue(implementation) -> verify -> complete -> guía de review/archive`.
2. Proyecto OpenSpec existente: `init` adopta los datos durables de OpenSpec sin sobrescribirlos.
3. Graphify activado más tarde: un proyecto puede empezar con Graphify desactivado, activarlo como opcional con fallback nativo y pasar a `ready` cuando existe un grafo al día.
4. Inicio rápido: TRUSS clonado en el proyecto como `.truss/` (la disposición documentada) y TRUSS instalado en un directorio aparte ejecutan `init`, `doctor` y `config`, y una instalación rota falla con claridad y no deja una configuración a medio crear. Este es el test que habría detectado un schema buscado en el sitio equivocado.
5. Contrato con OpenSpec real (`real-openspec.e2e.test.mjs`): las fases del ciclo de vida y el gate tasks-complete siguen el progreso de tareas que informa el CLI real de OpenSpec, no un fixture. Se ejecuta cuando hay un `openspec` compatible en el `PATH`, se omite en otro caso y no se puede omitir en el job de CI `Contract / real OpenSpec` (consulta la [integración continua](ci.md#test-de-contrato-contra-el-openspec-real)).

El límite E2E se detiene a propósito antes de la ejecución automática del agente y del archivado automático de OpenSpec. En v0.2 siguen siendo pasos del workflow a cargo del agente o del usuario; la orquestación por runtime pertenece a v0.3.
