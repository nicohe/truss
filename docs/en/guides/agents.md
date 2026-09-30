# Use TRUSS with a coding agent

TRUSS never runs an agent. It tells whichever one you use what to do next and checks the result. Any agent that can read a guidance file and run shell commands can follow it.

## The loop

```text
truss continue   →   implement the next task   →   truss verify
                                                       ↑        │
                                                       └── fix ─┘
```

1. **Guidance.** Put the [snippet from getting started](../getting-started.md#4-give-your-agent-some-guidance) in the guidance file your agent reads.
2. **Prompt.** Ask for the work in terms of the change: *Implement the active TRUSS change. Run `truss continue` and follow the instructions and the files it lists.* `continue` names the next step and the files to load, with the real paths.
3. **Verification.** When the agent finishes, it runs `truss verify`. The change is done when that passes.
4. **Handoff.** Only if the work moves to another agent, runtime or session: [`truss handoff`](../reference/handoff.md).

Each phase can be a different agent or model; see [who does what](../concepts/who-does-what.md#one-model-or-several).

## Where each agent reads its guidance

| Agent | What it reads |
|---|---|
| Codex | `AGENTS.md`, from the project root down to the directory it works in |
| Claude Code | `CLAUDE.md`. Recent versions read `AGENTS.md` only when there is no `CLAUDE.md`; if you have one, add the line `@AGENTS.md` to it to import the file. See the [Claude Code memory docs](https://code.claude.com/docs/en/memory). |
| Any other | its documentation says which file it reads; the snippet works in any of them |

## Approve the verification commands yourself, once

`truss verify` asks for approval of a command list it has not seen. Do it in your own terminal the first time:

```bash
node .truss/bin/truss.mjs verify
```

Read the list and answer `y`. The approval is stored per project in your user account, so an agent running as you can run `verify` afterwards without `--trust`. If it is not approved, the agent stops with `Not trusted; nothing was executed.` and asks you.

Do not let an agent pass `--trust` for a list it did not show you: the prompt exists so that a person reads the commands. An agent that runs in a sandbox or container with a different home directory has its own approval store; run `verify` once there, or point `TRUSS_HOME` at a shared directory (see [environment variables](../reference/environment.md#truss_home)).

## Check what the agent did

- `truss status` shows the phase and the task progress (`Tasks 1/3 complete`).
- `.truss/verification/latest.json` is the [evidence](../reference/verify.md#evidence) of the last `verify`.
- Set `verification.tasks_complete: warn` and `verification.tests_required: warn` to have `verify` report open tasks and source changes without tests. See [`truss verify`](../reference/verify.md).
