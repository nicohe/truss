# Use TRUSS in a shared repository

You can use TRUSS in a repository your team shares without anyone else seeing it: no `.gitignore` change, no guidance file for your agent in the history, no TRUSS commands in the team's scripts. This guide says what is local, what is shared, and how to keep it that way.

Every command below was run in a throwaway repository. Where the behavior comes from an agent's own documentation, the guide links it.

## What is local and what is shared

| What | Where | Share it? |
|---|---|---|
| TRUSS itself and its configuration | `.truss/`, including `.truss/config.yaml` | No. Local to your checkout |
| The active change, the evidence of the last `verify`, handoff notes | `.truss/state.json`, `.truss/verification/`, `.truss/handoffs/` | No |
| Specs, designs, tasks and archived changes | `openspec/` | **Yes.** Commit it: it is how the team works with OpenSpec |
| Your approval of the verification commands | `~/.config/truss/trusted.json` | No. It lives outside the repository |
| A Graphify index | `graphify-out/` | No |
| Guidance for the agent that only you want | `CLAUDE.local.md`, `AGENTS.local.md`, `AGENTS.override.md` | No |

The split is the one in [durable vs ephemeral state](../concepts/durable-vs-ephemeral.md): what a teammate would miss goes into `openspec/` and the code, and the scaffolding stays on your machine.

## Ignore TRUSS without touching `.gitignore`

The quick start adds `.truss/` to the repository's `.gitignore`, which is a change everyone sees. To keep TRUSS to yourself, put the entry in `.git/info/exclude` instead. It uses the same syntax as `.gitignore` but belongs to your copy of the repository and is never committed:

```bash
printf '.truss/\n' >> .git/info/exclude
```

Check that Git honors it:

```bash
git check-ignore -v .truss/
```

```text
.git/info/exclude:7:.truss/	.truss/
```

`truss doctor` uses `git check-ignore`, so it reports `● .truss ignore   .truss/ ignored` with the entry in either file.

Two things to know:

- `.git/info/exclude` is **per copy of the repository**. A fresh clone, another machine or a new worktree does not have it, so repeat the line there.
- `truss init` asks Git, and says `● .truss/ ignored (via .git/info/exclude)` when the entry is there. Releases before 0.2.19 read only `.gitignore`: in a repository with `.git/info/exclude` and no entry in `.gitignore`, they can print `○ no .gitignore detected` (when there is no `.gitignore` at all) or `○ .truss/ is not ignored` (when there is one without the entry), even though Git is ignoring the folder. Trust `truss doctor` and `git check-ignore`; the `init` line is only a note.

Add the other local files to the same place:

```bash
printf 'graphify-out/\nCLAUDE.local.md\nAGENTS.local.md\nAGENTS.override.md\n' >> .git/info/exclude
```

## Guidance for your agent that stays with you

The [guidance snippet](../getting-started.md#4-give-your-agent-some-guidance) tells the agent to run `node .truss/bin/truss.mjs`. Do not put it in a shared `AGENTS.md`: for a teammate who does not have TRUSS, the agent would try to run a command that does not exist. Put it in a file only you load:

| Agent | Your personal file | What it does |
|---|---|---|
| Claude Code | `CLAUDE.local.md` at the project root | Loaded together with `CLAUDE.md` and meant to stay out of version control ([Claude Code memory](https://code.claude.com/docs/en/memory)) |
| Devin | `AGENTS.local.md` | Loaded **in addition to** `AGENTS.md` ([Devin rules](https://docs.devin.ai/cli/extensibility/rules)) |
| Codex | `AGENTS.override.md` | **Replaces** `AGENTS.md` in that directory, it does not add to it ([Codex AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md)) |

Watch two traps:

- **Claude Code and the shared `AGENTS.md`.** Claude Code reads `AGENTS.md` only when there is no `CLAUDE.md` or `CLAUDE.local.md` in the working directory or above it. If you create `CLAUDE.local.md` in a repository that has only an `AGENTS.md`, Claude stops reading the team's file. Start your `CLAUDE.local.md` with the line `@AGENTS.md` to import it.
- **Codex.** Because `AGENTS.override.md` replaces the shared file, copy what you still want from `AGENTS.md` into it.

A `CLAUDE.local.md` for a project that uses TRUSS can be this short:

```markdown
@AGENTS.md

## Working with TRUSS (local, not shared)

- Before implementing, run `node .truss/bin/truss.mjs continue` and follow the instructions and the files it lists.
- To write an OpenSpec artifact, run `openspec instructions <artifact> --change <id>`.
- When you finish, run `node .truss/bin/truss.mjs verify` and do not call the change done until it passes.
```

The agent can also learn the workflow from your prompt, with no file: *Implement the active TRUSS change. Run `node .truss/bin/truss.mjs continue` and follow the instructions and the files it lists.*

## Formatters and linters that walk the whole tree

`.truss/` is a full clone, with its own source, tests and Markdown. A tool that scans the project root scans it too. In a throwaway project with Prettier 3, `prettier --check .` reported **131 files** inside `.truss/` as not formatted, and `prettier --write .` (or a `format` script that runs it on `.`) would rewrite them. ESLint did not complain in the same test, because it only lints the files its configuration matches.

| Option | Cost |
|---|---|
| Point the command at your sources: `prettier --check src` | Nothing visible: no shared file changes. It also leaves out the files outside `src` that you may want checked |
| Add `.truss/` to `.prettierignore` | One visible line in a shared file |
| Add the pattern `.*/` to `.prettierignore` | Does not name TRUSS, but stops checking every dot-folder, such as `.github/` |

Test runners walk the tree too: a bare `vitest` finds the test files inside `.truss/` and runs TRUSS's own tests. Limit the runner to your sources; see [a TypeScript project with pnpm and Vitest](../configuration/examples.md#a-typescript-project-with-pnpm-and-vitest).

For the verification list, prefer the first one: `pnpm exec prettier --check src` in `verification.commands`, and do not run a `format` script that targets `.` at the root of a project that holds `.truss/`.

## Before you clean the repository

`git clean -fdx` removes ignored files, including the ones in `.git/info/exclude`: `graphify-out/`, `CLAUDE.local.md`, `AGENTS.local.md` and `AGENTS.override.md` would go. It skips `.truss/` itself, because that folder is a Git repository of its own; Git only removes it with a second `-f` (`git clean -ffdx`). Run `git clean -ndx` first to list what would go, and keep a copy of `.truss/config.yaml` and of your local guidance files: they exist nowhere else.

## Graphify in a shared repository

TRUSS only builds the graph (`truss graphify bootstrap`, `update`). Graphify's own commands that set up an agent write files such as `CLAUDE.md` or `AGENTS.md` and hooks into the project, which a shared repository then shows to everyone. See [Graphify](../integrations/graphify.md) before running them.

## See also

- [Durable vs ephemeral state](../concepts/durable-vs-ephemeral.md)
- [Use TRUSS with a coding agent](agents.md)
- [Update or remove TRUSS](update-and-remove.md)
- [ADR 0001: local project configuration](../development/decisions/0001-local-project-configuration.md)
