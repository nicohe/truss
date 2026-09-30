<p align="center">
  <img src="assets/logo/truss-gradient.svg" width="128" alt="TRUSS logo" />
</p>
<h1 align="center">TRUSS</h1>
<p align="center"><strong>Portable engineering harness for coding agents.</strong></p>

## What is TRUSS

TRUSS coordinates specs, engineering policies, verification and runtime adapters without replacing the tools it integrates.

**Intent → Spec → Behavior → Implementation → Evidence → Verification**

**In plain words:** your project keeps its specs and rules; your coding agent, whichever you use, does the work; TRUSS tells the agent what to do next and checks the result. TRUSS runs no agent and picks no model, so you can use a different one for each phase. See [who does what](docs/en/concepts/who-does-what.md).

TRUSS is agent-agnostic. [OpenSpec](docs/en/integrations/openspec.md) is a required foundation and anchors expected behavior; tests provide executable evidence. [Graphify](docs/en/integrations/graphify.md) is optional. Runtime-specific orchestration is an extension point rather than a v0.2 guarantee.

**Status:** v0.2. TRUSS runs no coding agent itself: the change lifecycle is agent-driven, and runtime orchestration is planned for v0.3. What TRUSS does check, deterministically, is the project and its configuration, the OpenSpec state and, opt-in, that a change touches tests and has no open tasks (`verification.tests_required`, `verification.tasks_complete`). See the [release contract](docs/en/reference/release-v0.2.md).

## Quick start

Requires Node.js 20+ and a compatible OpenSpec CLI (`>=1.0.0 <2.0.0`). Clone a TRUSS release into the project and keep it ignored by the host repository:

```bash
git clone --depth 1 --branch v0.2.14 https://github.com/nicohe/truss.git .truss
echo ".truss/" >> .gitignore
node .truss/bin/truss.mjs init
node .truss/bin/truss.mjs doctor
node .truss/bin/truss.mjs new "Add retry policy"
node .truss/bin/truss.mjs status
```

`--branch` pins the clone to a release, so what you install is what was published and tested (`truss --version` says which). To move to another release, or to follow `main`, see [update or remove TRUSS](docs/en/guides/update-and-remove.md). In a monorepo, declare `components` in `.truss/config.yaml` first and then pass `--component <name>` to `truss new`. A shell alias/wrapper may expose `truss`; a global install is not required. TRUSS keeps its schema, skills, policies and workflows in its own installation; your project only gets `.truss/config.yaml` and local state (see [project structure](docs/en/reference/project-structure.md)). Then hand the work to your coding agent. Add a few lines to your project's `AGENTS.md` (the snippet is in [Getting started](docs/en/getting-started.md#4-give-your-agent-some-guidance)) so the agent runs `truss continue` before implementing and `truss verify` when it finishes. The agent writes the OpenSpec artifacts and the code; TRUSS tells it what is next and checks the result. When a change is verified, review it and archive it with `openspec archive`. [Getting started](docs/en/getting-started.md) walks through the whole loop.

## Commands

| Command | Purpose |
|---|---|
| `truss init` | Initialize local TRUSS configuration (idempotent, non-destructive) |
| `truss new "..."` | Create a change scaffold |
| `truss use <change>` | Make a change that is already open the active one again |
| `truss status` | Show active change and phase |
| `truss continue` | Recover the next action |
| `truss verify` | Run configured deterministic checks |
| `truss doctor` | Check environment, required OpenSpec foundation and optional capabilities |
| `truss config` | Validate and show the resolved configuration |
| `truss openspec` | Inspect OpenSpec CLI/project compatibility |
| `truss graphify` | Inspect or refresh the optional code graph |
| `truss components` | Resolve configured project components |
| `truss handoff` | Create concise local transition context |
| `truss skills` | List portable TRUSS skills |
| `truss version` | Print the installed TRUSS version (also `--version`) |
| `truss help [command]` | List the commands, or explain one (also `<command> --help`) |

Full details in the [CLI reference](docs/en/reference/cli.md).

## Documentation

Canonical documentation lives in [`docs/en/`](docs/en/README.md); Spanish translations are in [`docs/es/`](docs/es/README.md).

- [Getting started](docs/en/getting-started.md)
- [Architecture](docs/en/concepts/architecture.md) and [workflow](docs/en/workflows/overview.md)
- [Skills](docs/en/skills/overview.md)
- [Configuration](docs/en/configuration/reference.md): [effects](docs/en/configuration/effects.md), [examples](docs/en/configuration/examples.md) and [validation](docs/en/configuration/validation.md)
- [v0.2 enforcement model](docs/en/reference/enforcement.md)
- [Testing](docs/en/development/testing.md) and [CI](docs/en/development/ci.md)
- [Brand and logo usage](docs/en/reference/brand.md)
- [Changelog](CHANGELOG.md) · [Contributing](CONTRIBUTING.md) · [Security](SECURITY.md)

Rule: **No configuration without semantics.** Every public option documents its behavioral effect and enforcement status.

## License

TRUSS is distributed under the [MIT License](LICENSE). Using TRUSS on another project does not change that project's license. Third-party tools and integrations retain their own licenses; see [THIRD_PARTY.md](THIRD_PARTY.md).
