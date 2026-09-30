# Who does what

Four parties take part in a change: you, your coding agent, TRUSS and OpenSpec. Most first-time questions come down to who does which part, so this page settles it.

## Short answers

| Question | Answer |
|---|---|
| Does TRUSS run my agent? | No. It tells the agent what to do next and checks the result. |
| One model, or a different one per phase? | Your choice. TRUSS assigns no models, and any agent can pick up the next step. |
| Does it use subagents or worktrees? | Not automatically, and there is no setting for it. It is up to you and your agent's tools. |
| Does it check that the reviewer is independent? | No. It asks for a fresh context but does not enforce it. |

## The parties

| Who | Does | Does not do |
|---|---|---|
| **You** | decide what to build, answer the agent's questions, approve the verification commands, choose the agent or agents, merge | |
| **Your coding agent** (any tool, any model) | writes the OpenSpec artifacts, implements, runs `truss verify`, reviews | run by TRUSS: you start it |
| **TRUSS** | says what the next step is (`truss continue`), runs your verification commands and the opt-in checks, keeps the local state, the evidence and the handoff notes | run an agent, pick a model, or write code or specs |
| **OpenSpec** | holds the change (proposal, specs, design, tasks) and its progress | |

## One change, step by step

| Step | Who acts |
|---|---|
| `truss new "Add retry policy"` creates the change | you or the agent run it; OpenSpec creates the files |
| Discovery: questions about what is unclear | the agent asks (the `grill-me` skill, or `grill-with-docs` when you already have documents), you answer |
| Writing the proposal, specs, design and tasks | the agent |
| Implementing, task by task | the agent, following `truss continue` |
| `truss verify` | the agent runs it; you approved the command list once |
| Code review | an agent, ideally in a fresh session |
| Verify and archive in OpenSpec | you or the agent |

## What the agent writes

The change is a directory of plain files, which is why any agent can continue from where another stopped:

```text
openspec/changes/add-retry-policy/
├── proposal.md
├── specs/retry/spec.md
├── design.md
└── tasks.md
```

The checkboxes in `tasks.md` are the progress that `truss status` and `truss continue` read. The formats of the files belong to OpenSpec; see its [documentation](https://github.com/Fission-AI/OpenSpec).

## One model or several?

TRUSS does not care which model does the work. The state lives in files, so each phase can be a different agent, or a different model of the same one, each in its own session:

| Phase | Session | What you ask |
|---|---|---|
| Analysis | agent A | *Use the `grill-me` skill on this idea, then write the OpenSpec artifacts. Run `truss continue`.* |
| Implementation | agent B | *Implement the active TRUSS change. Run `truss continue` and follow the instructions and the files it lists.* |
| Review | agent C, a fresh session | *Review the active TRUSS change with the `code-review` skill: read the spec first, then the diff and `.truss/verification/latest.json`.* |

- **Analysis starts from an idea or from documents.** Use `grill-me` for an idea, and `grill-with-docs` when there is a proposal, ticket or ADR to start from: *Use the `grill-with-docs` skill on `docs/retry-proposal.md`, then write the OpenSpec artifacts.*
- **`truss continue` tells each session where the change is.** When every task is checked off, it says to run `truss verify`, then code review and archive.
- **Skills live in the TRUSS installation.** `truss skills` lists them; in the quick start layout they are in `.truss/.truss/skills/`.
- **Use a [handoff](../reference/handoff.md) only if something is not in the files**, such as a discovery that is not yet in the spec.
- **TRUSS does not check that the reviewer is a different model.** The `code-review` skill prefers a fresh context, and the [enforcement model](../reference/enforcement.md) lists reviewer independence as something the agent is asked to do.

## Subagents and worktrees

TRUSS does not create worktrees, start subagents or run agents in parallel, and no configuration option turns any of that on. `truss doctor` shows a `Git worktrees` line, but only to say that Git supports them.

- **Subagents** are a feature of your agent's tool. If it uses them, TRUSS sees only the commands they run.
- **A worktree needs its own configuration.** It has your committed files, `openspec/` included, but not `.truss/`, which Git ignores. Create `.truss/config.yaml` there; the TRUSS installation can be the one from your main checkout (`node ../project/.truss/bin/truss.mjs ...`). The worktree gets its own state and evidence, and the approval of the verification commands is asked again, because it is kept per directory.
- **Do not run two agents in the same directory on the same change.** The active-change pointer and the evidence of the last `verify` are single files per directory, so the last writer wins.

Isolated reviewers, subagent routing and worktree management are planned for v0.3, through runtime adapters. See the [v0.2 release contract](../reference/release-v0.2.md#v03-boundary).
