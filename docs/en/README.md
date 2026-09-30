# TRUSS documentation

> Canonical documentation. Spanish translations are in [`docs/es/`](../es/README.md).

**New here?** Read [Getting started](getting-started.md): it takes you from nothing to a verified change in about ten minutes.

## Understand TRUSS

Why it works the way it does.

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
- [Skills](skills/overview.md): the portable agent skills.

## Commands

- [CLI reference](reference/cli.md): every command, its options and exit codes.
- [Environment variables](reference/environment.md): `TRUSS_TRUST`, `TRUSS_HOME`, `TRUSS_OPENSPEC_PATH`, color and `PATH`.
- [`truss init`](reference/init.md)
- [`truss doctor`](reference/doctor.md)
- [`truss verify`](reference/verify.md): commands, approval, and the two opt-in gates.
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
- [v0.2.0 release contract](reference/release-v0.2.md)
- [v0.1.0 release contract](reference/release-v0.1.md) (historical)
- [Documentation audit](reference/documentation-audit.md) (historical)

## Contribute and maintain

- [Testing](development/testing.md), [end-to-end tests](development/e2e.md) and [continuous integration](development/ci.md)
- [Design decisions](development/decisions/0001-local-project-configuration.md): ADR 0001, where the project configuration lives.
- [Brand and logo usage](reference/brand.md)
- See also [CONTRIBUTING](../../CONTRIBUTING.md), [SECURITY](../../SECURITY.md) and the [changelog](../../CHANGELOG.md).
