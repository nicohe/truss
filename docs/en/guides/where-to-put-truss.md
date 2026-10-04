# Choose where TRUSS lives

A project with more than one part (an API and a worker, a calculation engine and a control plane, several modules) can use TRUSS in three ways. This guide helps you pick one and says what each choice does to the configuration, the verification, the active change and the specs.

Everything stated as behavior below was run in throwaway repositories. The advice, such as when to split, is a recommendation and is marked as one.

## The three layouts

| | One TRUSS at the root, with `components` | One TRUSS per project folder | One TRUSS per module |
|---|---|---|---|
| Where `.truss/` is | the repository root | inside each project folder (`calculation/.truss/`, `control-plane/.truss/`) | inside each module folder |
| Configuration and `verification.commands` | one, for the whole repository | one per folder | one per module |
| `verify` runs from | the root, for every component | each folder | each module folder |
| Active change | one at a time, across all components | one at a time **per folder** | one at a time per module |
| Evidence and state | one `.truss/verification/latest.json` and one `state.json` | separate in each | separate in each |
| `openspec/` | the root's, or one inside a component | one per folder | one per module |
| A change that touches two parts | one change | two changes with no link between them | two changes with no link |
| Best when | the parts share one pipeline and often change together | each part has its own package, pipeline and release | a module is a real project of its own |

**Recommendation.** Start with the first column. Move to the second when the parts have their own package manager, verification and release, and you want to work on both at once. Avoid the third unless a module is already a project in practice; a module that is only a folder inside `src/` does not need its own TRUSS.

## Layout 1: one TRUSS and `components`

Declare each part under `components` in `.truss/config.yaml`:

```yaml
components:
  api:
    path: ./apps/api
  worker:
    path: ./apps/worker
```

Then `truss new "Add retry" --component api` creates the change for that component. `truss components` shows what TRUSS resolved. These rules come from [component resolution](../reference/components.md) and are easy to trip over:

- **A component is a folder with its own code.** TRUSS looks for `src`, `app`, `apps`, `lib` or `packages` and for `test`, `tests`, `__tests__` or `spec` **inside the component's folder**. A part that is only a subfolder of `src/` in another component is not a component of its own; `truss components` would report `source: not detected` for it.
- **Its guidance file is the component's own `AGENTS.md` if the file exists, even when it is empty.** An empty `apps/worker/AGENTS.md` makes the effective guidance for `worker` empty, and the root `AGENTS.md` is not used for it. Without a file in the folder, TRUSS falls back to the root one. If a component has an `AGENTS.md`, put something in it.
- **`openspec/` is the component's own only if it is a real OpenSpec project.** With no `openspec/` folder in the component, its changes go to the root `openspec/`. With one made by `openspec init` (run it inside the component folder), they go there. A folder you create by hand is not enough: `truss components` then says `OpenSpec: component`, but OpenSpec ignores the folder, and `truss new --component api` creates the change in the root `openspec/`.
- **One list of verification commands.** `truss verify` runs from the repository root, whichever component the active change belongs to. A command that should check only one component has to say so itself.
- **One active change at a time.** Starting a change in another component makes it the active one; the first stays open in OpenSpec, and `truss use` goes back to it.

## Layout 2: one TRUSS per project folder

This is how the repository below is arranged:

```text
my-project/                (one Git repository)
  calculation/
    .truss/                its own configuration, state and evidence
    openspec/
  control-plane/
    .truss/
    openspec/
```

TRUSS works inside a subfolder of a Git repository. In a test with one `.truss/` in each of two folders of the same repository, `init`, `doctor`, `new` and `status` were independent in each: each had its own active change, and the one in `calculation/` did not appear in `control-plane/`. Ignore each `.truss/` (see [use TRUSS in a shared repository](shared-repo.md#ignore-truss-without-touching-gitignore)), and run every TRUSS command from inside the folder it belongs to.

What this costs: nothing connects the two. There is no shared change, no shared evidence and no shared configuration. A change in one part does not appear in the other part's `status`.

## A change that crosses two TRUSS projects

With layout 2, a feature that touches both parts is two changes, one in each. TRUSS does not link them. A pattern that works (a recommendation, not something TRUSS enforces):

1. Decide the contract between the parts first (the shape of a message or an API) and give it **one owner**: the part that provides it.
2. Make the provider's change first, and commit its spec, so the consumer's spec can refer to it.
3. Make the consumer's change against that contract, with a test that exercises it.
4. Name the other change in each proposal, so a reader can find both.

If you find yourself doing this often, that is a sign that the parts belong in layout 1, with one change that crosses components.

## When to split a module into its own project

Split it (a recommendation) when it has its own package manager and dependencies, its own verification pipeline, its own release, and people who work on it separately. Keep it inside a component when it shares the component's package and pipeline: the module's rules then go in a `src/<module>/AGENTS.md` and in the specs, not in a separate TRUSS.

## See also

- [Component resolution](../reference/components.md)
- [Getting started, monorepos](../getting-started.md#7-monorepos)
- [Use TRUSS in a shared repository](shared-repo.md)
- [Durable vs ephemeral state](../concepts/durable-vs-ephemeral.md)
