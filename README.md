<p align="center">
  <img src="assets/logo/truss-gradient.svg" width="128" alt="TRUSS logo" />
</p>
<h1 align="center">TRUSS</h1>
<p align="center"><strong>Portable engineering harness for coding agents.</strong></p>

TRUSS coordinates specs, engineering policies, verification and runtime adapters without replacing the tools it integrates.

## Philosophy

**Intent → Spec → Behavior → Implementation → Evidence → Verification**

TRUSS is designed to be agent-agnostic. OpenSpec is a required foundation and anchors expected behavior; tests provide executable evidence. Runtime-specific orchestration is an extension point rather than a v0.1 guarantee.

## Quick start

Clone TRUSS locally into the project and keep it ignored by the host repository:

```bash
git clone <truss-repository> .truss
echo ".truss/" >> .gitignore
node .truss/bin/truss.mjs init
node .truss/bin/truss.mjs doctor
node .truss/bin/truss.mjs new "Add retry policy" --component worker
node .truss/bin/truss.mjs status
```

A shell alias/wrapper may expose `truss`, but a global install is not required by the v0.1 project model.

Then configure `.truss/config.yaml` and follow the active OpenSpec.

## Commands

| Command | Purpose |
|---|---|
| `truss init` | Initialize local TRUSS configuration |
| `truss new "..."` | Create a change scaffold |
| `truss status` | Show active change and phase |
| `truss continue` | Recover the next action |
| `truss verify` | Run configured deterministic checks |
| `truss doctor` | Check environment, required OpenSpec foundation and optional capabilities |
| `truss handoff` | Create concise local transition context |

## Documentation

- [Getting started](docs/GETTING_STARTED.md)
- [Architecture](docs/architecture/ARCHITECTURE.md)
- [Workflow](docs/workflows/WORKFLOW.md)
- [Brand and logo usage](docs/brand/BRAND.md)
- [v0.1 enforcement model](docs/en/reference/enforcement.md)
- [v0.1.0 release contract](docs/RELEASE_V0.1.md)
- [Changelog](CHANGELOG.md)

## Repository model

TRUSS configuration lives alongside the application but is not an application runtime dependency. Local state, caches and handoffs are ignored by Git; durable specs, tests, ADRs and project documentation should be committed.

For monorepos, keep one project-local `.truss/` harness and declare component identifiers in `.truss/config.yaml`. Component resolution may select component-local OpenSpec when present or fall back to workspace OpenSpec.

## Status

This repository is the **TRUSS v0.1 stable baseline**: the CLI provides deterministic project/configuration checks and an agent-driven change lifecycle, while runtime-specific orchestration remains an extension point for v0.2. OpenSpec is required; Graphify remains optional.


## Documentación en español

Ver `docs/es/README.md` y `docs/es/CONFIGURACION.md`.

## Skills

TRUSS v0.1 ships portable skill contracts under `.truss/skills/`: `grill-me`, `grill-with-docs`, `prototype`, `code-review`, `handoff`, `writing-for-agents`, and `caveman`. See `docs/skills/SKILLS.md` or `docs/es/skills/SKILLS.md`.

## Documentation

Canonical documentation is in `docs/en/`; Spanish translations are in `docs/es/`.

Configuration is split intentionally:
- `configuration/reference.md` — fields, types, defaults, accepted values and enforcement owner.
- `configuration/effects.md` — what behavior changes when a value changes.
- `configuration/examples.md` — complete profiles and examples.

Rule: **No configuration without semantics.** Every public option must document its behavioral effect and enforcement status.

## License

TRUSS is distributed under the [MIT License](LICENSE). Using TRUSS on another project does not change that project's license. Third-party tools and integrations retain their own licenses; see [THIRD_PARTY.md](THIRD_PARTY.md).

## Configuration validation

TRUSS validates `.truss/config.yaml` against the v1 configuration contract before configuration-dependent execution. Run `truss config` (or `node ./bin/truss.mjs config` in this starter) to inspect the resolved configuration. Invalid configuration exits with code `2` and blocks verification. See `docs/CONFIG_VALIDATION.md`.

## OpenSpec detection

TRUSS can inspect its required OpenSpec dependency without modifying it:

```bash
truss openspec
```

The check distinguishes CLI installation from project initialization. See `docs/OPENSPEC_DETECTION.md`.


## OpenSpec compatibility

TRUSS v0.1 supports stable OpenSpec `>=1.0.0 <2.0.0`. Compatibility is checked explicitly; TRUSS never silently upgrades or downgrades OpenSpec. See `docs/OPENSPEC_COMPATIBILITY.md`.

### Graphify lifecycle

Graphify is optional by default. `truss graphify` reports whether its CLI and code graph are ready; optional failures fall back to native repository search, while `required: true` makes an unavailable/unready graph blocking. TRUSS never installs or upgrades Graphify silently. See `docs/GRAPHIFY_LIFECYCLE.md`.

## Initialization safety

`truss init` is idempotent and non-destructive. It adopts existing compatible OpenSpec projects and never overwrites existing specifications. See `docs/INIT.md`.

## Change lifecycle

`truss new`, `truss status`, and `truss continue` use OpenSpec as the operational change-state source. See `docs/LIFECYCLE.md`.

## TRUSS test suite

Run the complete v0.1 test suite with `npm test`. It includes unit, integration, and E2E tests using Node.js built-in `node:test` and adds no test-framework dependency.

## Continuous integration

TRUSS runs syntax checks plus unit, integration, and E2E tests in GitHub Actions on Node.js 20 and 22. See [`docs/CI.md`](docs/CI.md).
