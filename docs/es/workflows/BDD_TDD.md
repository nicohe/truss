# BDD y TDD en TRUSS

Sí: BDD y TDD vienen habilitados por defecto:

```yaml
development:
  bdd: true
  tdd: true
```

No requieren comandos separados. Son políticas de `execute-change`.

```text
OpenSpec / Gherkin
       ↓
Acceptance RED
       ↓
unit RED → implementation → GREEN → refactor
       ↓
Acceptance GREEN
       ↓
truss verify
```

BDD cubre comportamiento observable. TDD guía diseño e implementación interna. En v0.2 el agente convierte escenarios en tests y ejecuta el loop; TRUSS crea artefactos y ejecuta verification. La orquestación automática del runtime llega después.

`bdd: false` puede ser razonable para refactors/tooling sin comportamiento observable nuevo; no desactiva tests existentes ni verification.
