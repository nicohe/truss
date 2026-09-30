# Security Policy

## Supported versions

TRUSS is currently pre-1.0. Security fixes are applied to the latest maintained release unless a release note states otherwise.

## Reporting a vulnerability

Do not publish exploitable vulnerability details in a public issue before maintainers have had a reasonable opportunity to investigate and address them.

Report it privately through GitHub: [open a private security advisory](https://github.com/nicohe/truss/security/advisories/new) (Security tab → Report a vulnerability). Only the maintainers can see it. Please do not open a public issue for a suspected vulnerability.

Include, when possible:

- affected TRUSS version or commit;
- affected runtime or integration;
- reproduction steps;
- expected and observed behavior;
- security impact;
- suggested mitigation, if known.

## Scope

Security reports may include vulnerabilities in the TRUSS CLI, configuration handling, command execution, runtime adapters, integrations, repository/worktree handling, or behavior that could cause unintended modification or disclosure of project data.

Vulnerabilities in OpenSpec, Graphify, coding-agent runtimes, or other third-party tools should normally also be reported to their respective maintainers. TRUSS does not assume ownership of third-party security processes.

## Trust model

TRUSS runs local, deterministic tooling on your behalf. Treat the project's `.truss/config.yaml` as **executable code**.

- `truss verify` runs every entry in `verification.commands` through the system shell (`shell: true`) with your user's permissions and environment. Whoever controls that file controls what runs.
- **Approval gate.** `truss verify` shows the command list and asks for confirmation before running it, then remembers the approval for that project. It asks again whenever the list changes. Without a terminal it refuses to run (exit `1`) unless you pass `--trust` or set `TRUSS_TRUST=1`.
- The approval lives in a user-level file (`$TRUSS_HOME/trusted.json`, default `~/.config/truss/trusted.json`), keyed by project path and a SHA-256 of the command list. It is deliberately outside the repository, so a cloned project cannot ship its own approval.
- `truss init` trusts the default command list it writes itself; a config you adopt or edit is not trusted until you approve it.
- The gate protects against *unreviewed* commands, not against a command you approve. Read the list before answering yes, and do the same when a pull request changes `.truss/config.yaml`. It also does not stop you (or an agent) from running the same commands by hand or with `--trust`.
- TRUSS never downloads or installs OpenSpec or Graphify; it only executes the CLIs already present on your `PATH` (or at `TRUSS_OPENSPEC_PATH`).
- Local state under `.truss/` (`state.json`, `verification/`, `handoffs/`, logs, caches) is ignored by Git and is not a trust boundary.

Reports about command execution beyond this documented behavior are in scope (see Scope above).

