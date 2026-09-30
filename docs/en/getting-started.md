# Getting Started

```bash
git clone https://github.com/nicohe/truss.git .truss
echo ".truss/" >> .gitignore
node .truss/bin/truss.mjs init
node .truss/bin/truss.mjs doctor
node .truss/bin/truss.mjs new "Add retry policy"
```

For a monorepo, declare generic workspaces such as `api` and `worker` under `components`. With `development.bdd: true` and `development.tdd: true`, BDD/TDD are default workflow policies; in v0.1 the coding agent follows them rather than TRUSS orchestrating the runtime automatically.

Run deterministic checks with `truss verify`. Spanish docs: `docs/es/README.md`.
