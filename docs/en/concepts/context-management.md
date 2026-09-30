# Context management

An agent works best with a small, relevant context. TRUSS favors **progressive disclosure**: load what the task needs, when it needs it, and nothing else. Loading the whole documentation tree or every skill up front wastes the agent's attention and hides the parts that matter.

## What an agent should load

For an implementation task, and in this order of importance:

1. The active OpenSpec change: proposal, specs, design and tasks.
2. The project guidance file (`AGENTS.md`), which should point to further documentation rather than contain it.
3. The relevant policies and the [`execute-change`](../workflows/execute-change.md) workflow.
4. Only the code and documentation the next task requires.

You do not have to remember this list. `truss continue` prints it, with the real paths for your layout, under `Context to load`.

## How TRUSS helps

- **`truss continue`** names the next step and the files to read for it.
- **Skills load on demand.** `truss skills` lists them; use a skill when its situation arises (a Grill session for unclear requirements, a prototype for an unresolved technical question) and do not preload all seven.
- **Graphify** is an optional code-relationship and impact map. Use it when a change crosses modules. When it is not available, native search, grep and the editor's language server are the fallback. Neither is required.
- **`writing-for-agents`** is a skill for keeping agent-facing files small, reliable and pointer-based.
- **`truss handoff`** writes a short note when work moves to another agent, runtime, session or person. Use it only at a real boundary; do not hand off every step.

## Rules of thumb

- Prefer a pointer to a copy: say where a document lives instead of pasting it.
- Keep `AGENTS.md` short. A long one is loaded every time, whether or not it is relevant.
- Put durable knowledge where it can be found again (OpenSpec, tests, docs) and let session state stay local. See [durable vs ephemeral state](durable-vs-ephemeral.md).
