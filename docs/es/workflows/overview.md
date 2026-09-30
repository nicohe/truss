# Flujo de trabajo de ingeniería

> Traducción al español. La referencia canónica es [la versión en inglés](../../en/workflows/overview.md).

## Por defecto

```text
Intención
  ↓
Discovery / Grill (solo cuando hace falta)
  ↓
OpenSpec: proposal + comportamiento + design + tasks
  ↓
Vertical slice
  ├── BDD: escenario de aceptación RED → GREEN
  └── TDD: unit RED → GREEN → refactor
  ↓
Verificación
  ↓
Code review contra spec + estándares + riesgo
  ↓
Verificar alineación y archivar
```

## Diseño de tareas

Prefiere vertical slices de comportamiento que puedan implementarse y verificarse de forma independiente. Evita tareas horizontales como «base de datos», «API» o «tests» cuando por sí solas no pueden demostrar comportamiento visible para el usuario.

## Ejes del review

1. Spec: ¿el cambio implementó el comportamiento y el alcance acordados?
2. Standards: arquitectura, mantenibilidad y calidad del código.
3. Risk: seguridad, concurrencia, rendimiento y riesgo de regresión.

Se prefiere un contexto de reviewer nuevo. Solo hace falta un handoff cuando cambia el contexto o la responsabilidad.

## Workflow central de implementación

Consulta [`execute-change.md`](execute-change.md). Convierte un cambio activo de OpenSpec en implementación, evidencia, verificación y review. Es un workflow/orquestador, no una skill.

## Ciclo de vida detallado

Consulta [`lifecycle.md`](lifecycle.md) para ver el orden canónico de comandos, workflows y skills, y [`spec-modes.md`](spec-modes.md) para Spec-Anchored frente a Spec-as-Source.
