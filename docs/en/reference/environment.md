# Environment variables

TRUSS reads a small set of environment variables. Project behavior is configured in `.truss/config.yaml`, never through the environment; these variables only adjust where TRUSS looks for things and how it prints.

| Variable | Effect | Default |
|---|---|---|
| [`TRUSS_TRUST`](#truss_trust) | Approves a `verification.commands` list without asking | unset |
| [`TRUSS_HOME`](#truss_home) | Directory of the approval store | `~/.config/truss` |
| [`XDG_CONFIG_HOME`](#truss_home) | Base of the default approval store location | `~/.config` |
| [`TRUSS_OPENSPEC_PATH`](#truss_openspec_path) | Use this OpenSpec CLI instead of the one on `PATH` | unset |
| [`NO_COLOR`](#color) | Turns colored output off | unset |
| [`FORCE_COLOR`](#color) | Turns colored output on | unset |
| [`TERM`](#color) | `dumb` turns colored output off | set by your terminal |
| [`PATH`](#path) | Where `openspec`, `graphify` and `git` are found | your shell's |
| [`TRUSS_REQUIRE_REAL_OPENSPEC`](#tests-and-ci-only) | Makes the real-OpenSpec contract test fail instead of skip | unset |

## `TRUSS_TRUST`

`truss verify` runs the commands in `verification.commands` through your shell, so it asks before running a list it has not seen for the project. Setting `TRUSS_TRUST` to `1` or `true` (case-insensitive) approves the list without asking, exactly like `truss verify --trust`. Any other value is ignored.

Use it in CI or from an agent, where there is no terminal to answer, and only after reading the list in `.truss/config.yaml`. Without a terminal and without this variable or `--trust`, `verify` refuses to run and exits `1`. See [`truss verify`](verify.md#trust) and the [trust model](../../../SECURITY.md#trust-model).

## `TRUSS_HOME`

TRUSS remembers which command lists you approved in `trusted.json`, keyed by the project's real path and a SHA-256 of the list. The file is deliberately **outside the repository**, so a cloned project cannot ship its own approval. It is created with mode `0600` inside a directory created with mode `0700`.

The directory is, in order: `$TRUSS_HOME`, then `$XDG_CONFIG_HOME/truss`, then `~/.config/truss`. Point `TRUSS_HOME` somewhere else to keep approvals apart, for example in a disposable CI workspace. Deleting the file only means you are asked again.

## `TRUSS_OPENSPEC_PATH`

By default TRUSS finds the OpenSpec CLI on `PATH`. Set `TRUSS_OPENSPEC_PATH` to the full path of a specific executable to use that one instead, for example to test a different version. An empty value is ignored.

- The path is used as given. If it does not exist, `truss doctor` shows the CLI as `version unknown` and fails the compatibility check, because TRUSS cannot read a version from it.
- On Windows the extension may be omitted: TRUSS uses the `.exe` or `.cmd` next to the path. An npm-installed OpenSpec is launched without a shell, so its `.cmd` shim is read to find the Node script it runs. A `.cmd` that is not an npm shim is rejected with a message pointing here.

## Color

Colored output is decided in this order:

1. `NO_COLOR` set to any non-empty value: **off**. It wins over everything else.
2. `FORCE_COLOR` set to anything other than `0`: **on**, even when the output is piped.
3. Otherwise: on only when standard output is an interactive terminal and `TERM` is not `dumb`.

So piping TRUSS into a file, a pager or a CI log gives plain text by default.

## `PATH`

TRUSS locates `openspec` (unless `TRUSS_OPENSPEC_PATH` is set), `graphify` and `git` on `PATH`. `truss doctor` reports what it found. On Windows, `where` is used and the `.exe` / `.cmd` variants are preferred over the extensionless `sh` shim that npm installs next to them.

## Tests and CI only

`TRUSS_REQUIRE_REAL_OPENSPEC=1` is used by the `Contract / real OpenSpec` CI job. With it, `test/e2e/real-openspec.e2e.test.mjs` fails when no compatible OpenSpec is installed instead of being skipped. It has no effect on the CLI. See [continuous integration](../development/ci.md).
