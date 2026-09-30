# Primeros pasos

```bash
git clone <truss-repository> .truss
echo ".truss/" >> .gitignore
node .truss/bin/truss.mjs init
node .truss/bin/truss.mjs doctor
node .truss/bin/truss.mjs new "Add retry policy"
```

Luego, con Claude Code, Codex, Devin u otro coding agent:

```text
Implement the active TRUSS change.
Read AGENTS.md, .truss/config.yaml, .truss/policies/,
.truss/workflows/ and the active spec before changing code.
Follow configured BDD/TDD policies and run `truss verify`
before considering the change complete.
```

En v0.1 el agente sigue el workflow; TRUSS todavía no controla automáticamente el runtime. Para monorepos declarás `components` y podés usar `--component`. Para cambiar de agente/runtime/sesión, `truss handoff`.
