# Security Policy

## Supported versions

TRUSS is currently pre-1.0. Security fixes are applied to the latest maintained release unless a release note states otherwise.

## Reporting a vulnerability

Do not publish exploitable vulnerability details in a public issue before maintainers have had a reasonable opportunity to investigate and address them.

Use the repository's private security-reporting mechanism when available. If the repository does not provide one, contact the maintainers privately through a documented maintainer contact before public disclosure.

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
- Before running `truss verify` (or an agent that runs it) in a repository you did not author, read `.truss/config.yaml`. Do the same when a pull request changes it.
- TRUSS never downloads or installs OpenSpec or Graphify; it only executes the CLIs already present on your `PATH` (or at `TRUSS_OPENSPEC_PATH`).
- Local state under `.truss/` (`state.json`, `verification/`, `handoffs/`, logs, caches) is ignored by Git and is not a trust boundary.

Reports about command execution beyond this documented behavior are in scope (see Scope above).

