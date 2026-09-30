# ADR 0001: The project configuration stays local to each checkout (for now)

- **Status:** accepted, 2026-09-30. To be revisited when a team needs a shared configuration.
- **Decision by:** the maintainer.

## Context

The [quick start](../../getting-started.md) clones TRUSS into the project's `.truss/` and adds `.truss/` to the project's `.gitignore`. `truss init` then writes the project configuration to `.truss/config.yaml`, which is inside that ignored directory. So the configuration is **never committed with the project**.

In practice:

- Every checkout has its own `config.yaml`. `truss init` on a fresh clone creates a new one with the **default** values, not the team's.
- Two people, or a person and a CI machine, can verify with different rules without noticing: different `verification.commands`, `tests_required`, `tasks_complete`, `spec.mode`, components.
- Compare `openspec/`, which *is* committed: specifications are shared, TRUSS's rules are not.

Earlier documentation said to commit "shared TRUSS configuration", which the quick start contradicts. This record settles the contradiction.

## Decision

**Keep it as it is.** The project configuration is personal to each checkout. The documentation now says so plainly (see [durable vs ephemeral state](../../concepts/durable-vs-ephemeral.md)) instead of implying it is shared.

Why not change it now:

- The tool is used by one maintainer, where a shared configuration solves nothing yet.
- The location and name of a committed file are hard to change after they are published, so they deserve a deliberate design rather than a rushed one.

## What a team can do today

There is no built-in mechanism. A manual arrangement that works:

1. Keep a reference copy of the configuration in your repository, for example `docs/truss-config.example.yaml`.
2. On a fresh checkout (or a CI machine), clone TRUSS into `.truss/` as in the quick start, copy the reference file to `.truss/config.yaml`, and only then run `truss init`. `init` **adopts** an existing configuration and never overwrites it.
3. The first `truss verify` refuses to run a command list it has not seen for that checkout. Read the list, then pass `--trust` (or set `TRUSS_TRUST=1` on CI). See [`truss verify`](../../reference/verify.md).

Copying the file after `init` works too; you just get the default configuration in between. Nothing enforces that the copies stay in sync.

## Option considered for later: a versionable configuration file

Not implemented. Recorded so that the reasoning is not lost.

**Idea.** Let the project configuration live in a file that is committed, at the project root, and keep everything local under `.truss/`.

- **Location and name.** A file at the project root. `truss.config.yaml` is a candidate; the name is **undecided**.
- **Lookup order.** TRUSS reads the root file first and falls back to `.truss/config.yaml`, so existing projects keep working without changes.
- **`truss init`.** Creates the root file for a new project, and leaves an existing `.truss/config.yaml` alone.
- **Local state stays local.** `state.json`, `verification/` and `handoffs/` remain under `.truss/`. The verification approval already lives outside the repository, keyed by project path.
- **`truss doctor`.** Reports which file is in use and warns if both exist and differ.

**Benefits.** The whole team and CI share one set of rules; a change to the rules goes through review like any other change; a fresh clone needs no manual copying.

**Costs and open questions.**

- The file name, and whether to keep supporting the old location indefinitely or deprecate it.
- Migration for projects that already have a `.truss/config.yaml`: how they are told, and whether TRUSS offers to move it.
- Precedence when both files exist.
- Monorepos: one root file, or a file per component?
- Documentation to change: the quick start, `project-structure.md`, `durable-vs-ephemeral.md`, `init.md`, the configuration reference and its Spanish translations.
- Tests to add: precedence, fallback, `init` behavior, and the quick-start end-to-end test with the file committed.

## When to revisit

Any of these is a reason to take up the option above:

- A second person starts using TRUSS on the same project.
- A CI pipeline must run `truss verify` with the team's rules.
- Someone reports that two checkouts verified with different configurations.

## Consequences of the current decision

- ✅ Nothing to commit and nothing to review: TRUSS stays entirely out of the project's history.
- ✅ No new file format or lookup rules to maintain.
- ⚠️ Configuration can drift between checkouts and CI, with no warning.
- ⚠️ A team must keep its own copy of the configuration and apply it by hand.
