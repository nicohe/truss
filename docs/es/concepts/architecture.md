# Arquitectura de TRUSS

TRUSS separa **skills**, **policies**, **workflows**, **integrations** y **runtime adapters**. El core expresa intención y capacidades; no debe depender de un vendor de coding agents. OpenSpec conserva el contrato del cambio, Graphify aporta relaciones derivadas del código, Git/tests aportan evidencia y Handoff conserva estado en transiciones reales de contexto.
