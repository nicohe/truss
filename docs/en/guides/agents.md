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

To keep the guidance to yourself in a repository your team shares, use a personal file (`CLAUDE.local.md`, `AGENTS.local.md`, `AGENTS.override.md`). Each agent treats it differently; see [use TRUSS in a shared repository](shared-repo.md#guidance-for-your-agent-that-stays-with-you).

## Approve the verification commands yourself, once

`truss verify` asks for approval of a command list it has not seen. Do it in your own terminal the first time:

```bash
node .truss/bin/truss.mjs verify
```

Read the list and answer `y`. The approval is stored per project in your user account, so an agent running as you can run `verify` afterwards without `--trust`. If it is not approved, the agent stops with `Not trusted; nothing was executed.` and asks you.

Do not let an agent pass `--trust` for a list it did not show you: the prompt exists so that a person reads the commands. An agent that runs in a sandbox or container with a different home directory has its own approval store; run `verify` once there, or point `TRUSS_HOME` at a shared directory (see [environment variables](../reference/environment.md#truss_home)).

## Review in a separate session, then back to the implementer

A review is better done by an agent that did not write the code, in a fresh session, so it judges the spec and the diff and not the implementer's reasoning ([who does what](../concepts/who-does-what.md#one-model-or-several)). Two sessions do not see each other, so how the findings travel matters:

1. **Reviewer.** Start a new session and point it to the skill by path (`truss skills` prints the real path of each), with the change and the evidence: *Review the active change with `.truss/.truss/skills/code-review.SKILL.md`. Read the spec first, then the diff and `.truss/verification/latest.json`. You only read: edit nothing and do not run `truss verify`. Write the full report to `.truss/handoffs/<change>-review.md`.* The report path is a suggestion of this guide: TRUSS neither creates nor reads that file, and `.truss/` is ignored by Git, so it stays local. A subagent also works if your runtime has one; TRUSS does not assume it does. The `/code-review` command of Claude Code is a different tool; see [skills](../skills/overview.md#code-review-and-claude-codes-code-review).
2. **The report is ephemeral, and TRUSS does not keep it.** Either paste it, or have the reviewer write it to a file as above, and give it to the implementer in full. A fresh implementer given only the path of that file applied it in a test. Do not give a compressed copy in place of the original: `caveman` is manual, TRUSS never applies it, and a review report is what it is not for; see [`caveman`](../skills/overview.md#caveman).
3. **What must survive goes into durable files.** A finding that changes behavior goes into the spec or the design; work to be done goes into `tasks.md` as a new task group (see [reopening a finished change](../workflows/lifecycle-commands.md#reopening-a-finished-change)); a finding you decide not to fix now is written down, for example as an open question in the design, so it is not lost when the session ends.
4. **Implementer.** Back in the implementing session: *Apply the review findings. Register each fix as a task in `tasks.md`, update the spec if behavior changes, then run `truss verify`.* If the work moved to a new session, [`truss handoff`](../reference/handoff.md) carries the state.

### When to review, and how many times

TRUSS names the moment and does not require the review. When every task is checked off, `truss continue` says to run `truss verify`, then code review, then `openspec validate` and archive. Nothing checks that a review happened: `verify` does not look for one, and a review that says "not ready" blocks nothing. That is on purpose. A review is advice, and a gate that waited for an agent to say "ready" could loop for ever.

- **Review once**, when the change is complete and `verify` passes.
- **Review again only if the fixes changed behavior or code**, not for a wording correction. Limit the second review to the findings of the first and to what the fixes touched.
- **Decide when to stop before you start.** In a test, a second review closed the three blocking findings of the first and found a new one that the first fix had caused: a sentence added to the spec promised more than the code did. A review can find something new every time. A recommendation, not a rule of TRUSS: after one re-review limited to the fixes, a person decides, and what is left goes to the design as an open question.
- If you register the re-review as a task, the change is not `complete` until someone ticks it. Tick it when you decide, not when a reviewer says "ready".

### What TRUSS does in these steps, and what it does not

| Step | Who does it |
|---|---|
| Saying that review comes after `verify` and before archiving | TRUSS (`truss continue`) |
| Opening the reviewer's session and giving it the prompt | you |
| Writing the report and carrying it to the implementer | the reviewer and you; TRUSS stores nothing |
| Deciding where each finding goes (spec, `tasks.md`, design) | the implementer, with you |
| Going back from `complete` to `implementation` when you add a task group | TRUSS, from `tasks.md` |
| Warning that the code changed after the last `verify` | TRUSS (`truss status` and `continue`, as stale evidence) |
| Deciding whether to review again | you |

Known limit: while the next task is a review, `truss continue` still says "Implement…". TRUSS has no phase for "waiting for a review".

## The agent's permission mode

Agents ask before editing files or running commands, and what they ask depends on their permission mode. For a TRUSS loop, a sensible setup is to let the agent edit files without asking and to pre-approve only the commands you have looked at, such as `node .truss/bin/truss.mjs continue` and `status`, and to keep a person in the loop for the rest. Do not use a mode that skips every check outside an isolated container or VM. In Claude Code the modes are described in [permission modes](https://code.claude.com/docs/en/permission-modes). Whatever the mode, the agent must never pass `--trust` to `truss verify`; see [approve the verification commands yourself](#approve-the-verification-commands-yourself-once).

## Check what the agent did

- `truss status` shows the phase and the task progress (`Tasks 1/3 complete`).
- `.truss/verification/latest.json` is the [evidence](../reference/verify.md#evidence) of the last `verify`.
- Set `verification.tasks_complete: warn` and `verification.tests_required: warn` to have `verify` report open tasks and source changes without tests. See [`truss verify`](../reference/verify.md).
