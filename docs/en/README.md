# TRUSS documentation

> Canonical documentation. Spanish translations are in [`docs/es/`](../es/README.md).

**New here?** Read [Getting started](getting-started.md): it takes you from nothing to a verified change in about ten minutes.

## Understand TRUSS

Why it works the way it does.

- [Who does what](concepts/who-does-what.md): you, your agent, TRUSS and OpenSpec; one model or several; subagents and worktrees.
- [Architecture](concepts/architecture.md): the core, policies, workflows, integrations and runtime adapters.
- [Spec-driven development](concepts/spec-driven-development.md): OpenSpec as the anchor, and the two specification modes.
- [BDD and TDD](concepts/bdd-tdd.md): the two loops, and what TRUSS can and cannot check about them.
- [Context management](concepts/context-management.md): giving an agent only what the task needs.
- [Durable vs ephemeral state](concepts/durable-vs-ephemeral.md): what to commit and what to keep local.
- [Glossary](reference/glossary.md)

## Do the work

How a change moves through TRUSS.

- [Workflow overview](workflows/overview.md)
- [Change lifecycle](workflows/lifecycle.md): the order of commands, workflows and skills.
- [`execute-change`](workflows/execute-change.md): the central implementation workflow.
- [Specification modes](workflows/spec-modes.md): Spec-Anchored and Spec-as-Source in detail.
- [Lifecycle commands](workflows/lifecycle-commands.md): `new`, `status`, `continue` and the phases.
- [Discovery (Grill)](workflows/discovery.md): turning an unclear idea into decisions before the spec; `grill-me`, `grill-with-docs` and `prototype`.
- [Skills](skills/overview.md): the portable agent skills.

## Guides

Step-by-step answers to a task.

- [Use TRUSS with a coding agent](guides/agents.md): the loop, where each agent reads its guidance, and approving verification once.
- [Use TRUSS in a shared repository](guides/shared-repo.md): keeping TRUSS and your agent guidance local with `.git/info/exclude`, and what Prettier does to `.truss/`.
- [Use TRUSS in CI](guides/ci.md): a pinned install, the configuration, approval and an example workflow.
- [Update or remove TRUSS](guides/update-and-remove.md): pinning a release, and what not to delete.
- [Troubleshooting](guides/troubleshooting.md): what TRUSS prints when something is wrong, what it means and what to do.

## Commands

- [CLI reference](reference/cli.md): every command, its options and exit codes.
- [Environment variables](reference/environment.md): `TRUSS_TRUST`, `TRUSS_HOME`, `TRUSS_OPENSPEC_PATH`, color and `PATH`.
- [`truss init`](reference/init.md)
- [`truss doctor`](reference/doctor.md)
- [`truss verify`](reference/verify.md): commands, approval, and the two opt-in gates.
- [`truss handoff`](reference/handoff.md): the transition note, and what it does not protect.
- [Component resolution](reference/components.md): monorepos and `--component`.

## Configuration

Every option, its default, and what changes when you change it.

- [Reference](configuration/reference.md): types, defaults, values and who enforces each option.
- [Effects](configuration/effects.md): what changes when a value changes.
- [Examples](configuration/examples.md): complete profiles.
- [Validation](configuration/validation.md): how `.truss/config.yaml` is checked.
- [Project structure](reference/project-structure.md): the TRUSS installation vs the project.

## Integrations

- [OpenSpec](integrations/openspec.md): the required foundation.
  - [Detection](integrations/openspec-detection.md) and [compatibility](integrations/openspec-compatibility.md)
- [Graphify](integrations/graphify.md): optional code intelligence.
  - [Lifecycle](integrations/graphify-lifecycle.md)

## What is guaranteed

- [Enforcement model](reference/enforcement.md): what TRUSS checks itself, what it asks the agent to do, and what needs a runtime adapter.
- [v0.2 release contract](reference/release-v0.2.md): the scope, compatibility and release gate of the v0.2 line.

## Archive

Kept for the record. These describe an earlier release, not how TRUSS behaves today.

- [v0.1.0 release contract](reference/release-v0.1.md)
- [v0.1 documentation audit](reference/documentation-audit.md)

## Contribute and maintain

- [Testing](development/testing.md), [end-to-end tests](development/e2e.md) and [continuous integration](development/ci.md)
- [Releasing](development/releasing.md): the checklist for a version, a tag and a GitHub release.
- [Design decisions](development/decisions/0001-local-project-configuration.md): ADR 0001, where the project configuration lives.
- [Brand and logo usage](reference/brand.md)
- See also [CONTRIBUTING](../../CONTRIBUTING.md), [SECURITY](../../SECURITY.md) and the [changelog](../../CHANGELOG.md).
