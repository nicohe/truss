# Component resolution

TRUSS resolves configured component identifiers into concrete project context.

```yaml
components:
  api:
    path: ./apps/api
  worker:
    path: ./apps/worker
```

`truss components` validates every configured path. `truss components api` resolves one component.

For each component TRUSS reports:

- component root;
- effective `AGENTS.md` (component-local first, workspace fallback);
- OpenSpec root (component-local first, workspace fallback);
- detected source directories;
- detected test directories.

A configured path must exist, be a directory, remain inside the project root, and not resolve to the same real path as another component. Invalid resolution returns exit code 2. `truss doctor` also checks component resolution.

For which layout to choose, and the rules that are easy to trip over (an empty `AGENTS.md`, a hand-made `openspec/` folder), see [choose where TRUSS lives](../guides/where-to-put-truss.md).

When `components: {}`, the repository is resolved as a single `workspace` component.

`truss new --component <name>` uses the component identifier, not a raw filesystem path. The new change is created under the resolved OpenSpec root.
