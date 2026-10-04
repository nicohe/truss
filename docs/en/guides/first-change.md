# Your first change, end to end

[Getting started](../getting-started.md) shows the commands. This guide shows the other half: what to ask your agent at each step, and what OpenSpec does with it. The prompts are examples, in English because the skills and the artifacts' keywords are; write yours in your own words and your own language.

They come from a real run of TRUSS on a TypeScript project, where a first change went from a discovery round to an archived spec. The OpenSpec behavior described here (what `instructions` prints, `validate`, `MODIFIED`, the language setting) was run in a throwaway project with OpenSpec 1.13.2.

## The path

| Step | You | Your agent | Ends when |
|---|---|---|---|
| 1. Start | `truss new "Name"` | | the change exists |
| 2. Discover | answer the questions | a Grill round | you could hand the result to someone who has to write the spec |
| 3. Write the artifacts | read each one | proposal, specs, design, tasks, one at a time | `truss continue` says to implement |
| 4. Implement | | one slice at a time | every task is checked off |
| 5. Verify | `truss verify` (the first time, you) | | it passes |
| 6. Review | | a fresh session | no blocking finding |
| 7. Close | | validate, archive | the change is in `openspec/changes/archive/` |

## 1. Start the change

```bash
node .truss/bin/truss.mjs new "Add retry policy"
node .truss/bin/truss.mjs continue
```

`continue` prints the next step and the files to load. Hand it to your agent in every prompt below, or run it yourself and paste what it says.

## 2. Discover what to do

Skip this when the change is small and its acceptance criteria are clear. When they are not, do a Grill round (see [Discovery](../workflows/discovery.md)). If you have a document to start from, name it:

> Active TRUSS change: `add-retry-policy`. Use the `grill-with-docs` skill (`.truss/.truss/skills/grill-with-docs.SKILL.md`) on `docs/retry-requirements.md`. Scope: the retry behavior of the HTTP client only. First tell me what the document already decides, what it only proposes and what it contradicts. Then ask me questions only about what is still open, in small batches. Do not write any artifact yet.

Two details of that prompt matter. It asks for the **classification first**, so that you see what the agent took as a decision and what as a proposal, and it ends with **"do not write any artifact yet"**, so the agent does not jump from a question to a spec.

When the round ends, you can ask for a roadmap, which a Grill does not produce on its own:

> Now break the work into candidate changes: for each, a one-line goal, what it depends on and whether it can go first. Order them. Do not create them yet.

The result of the round is **ephemeral**: it lives in that session. What lasts is what the next step writes into the artifacts.

## 3. Write the artifacts, one at a time

A prompt that works for each artifact:

> Write only the `proposal` artifact for `add-retry-policy`. First run `openspec instructions proposal --change add-retry-policy` and follow it. Re-read the earlier artifacts from disk. Add no behavior that we did not decide in the discovery; if something is missing, ask me. Do not mention TRUSS in the artifact.

"Do not mention TRUSS" is there because `openspec/` is committed and read by teammates who may not use it. Repeat with `specs`, `design` and `tasks`, reading each result before the next. Add "then run `openspec validate add-retry-policy`" from the `specs` artifact on: before it the change has no spec deltas, and `validate` reports `Change must have at least one delta`. This one-at-a-time rhythm lets you catch a drift while it is still a paragraph. The rule behind "add no behavior we did not decide" is that every requirement in the specs traces to a decision in the proposal; a requirement that does not is new behavior, and the agent should ask before it adds it.

### What `openspec instructions` prints

```bash
openspec instructions proposal --change add-retry-policy
```

It prints the purpose of the artifact, its format and the exact path to write, plus the project's context from `openspec/config.yaml`. It is **read-only**: it writes nothing (checked by listing the files before and after). TRUSS does not run it; the agent does, and `truss continue` names it in its instruction. The same works for `specs`, `design` and `tasks`.

### Writing artifacts in another language

`openspec init --language Spanish` records in `openspec/config.yaml` that artifacts are written in that language and that OpenSpec's structural headings and the `SHALL` and `MUST` keywords stay in English. The project's context repeats this to the agent every time it runs `instructions`. It matters because of how OpenSpec checks a spec:

- A requirement without `SHALL` or `MUST` gets a warning: `ADDED "…" should contain SHALL or MUST`.
- `WHEN` and `THEN` in a scenario were **not** checked: a scenario written with Spanish words passed. Keep them in English anyway, to match the template.

### `validate` and `validate --strict`

```bash
openspec validate add-retry-policy
openspec validate add-retry-policy --strict
```

On the requirement without `SHALL`, the first said `Change 'add-retry-policy' is valid` and exited `0`; the second exited `1`. `--strict` turns warnings into errors. Use `--strict` before you archive. If you want OpenSpec's check in the evidence of `truss verify`, add it to the command list; see [a TypeScript project with pnpm and Vitest](../configuration/examples.md#a-typescript-project-with-pnpm-and-vitest).

### Changing a spec that already exists

When a change alters a requirement that is already in `openspec/specs/`, the change's delta uses `## MODIFIED Requirements`, and the block must contain the **whole** requirement, with all its scenarios, not only the part that changes. OpenSpec checks it: a delta that left out a scenario of the current spec failed `validate` with `MODIFIED "…" omits scenario(s) the current spec still has`, and `archive` refused with `Aborted. No files were changed.` Copy the full requirement into the delta, then edit it.

## 4. Implement

> Implement the active TRUSS change. Run `truss continue` and follow it. Take one slice at a time: a failing test first, then the minimum code, then refactor. Check off each task in `tasks.md` as you finish it (`- [x]`). Stop after every two or three task groups and tell me where you are. Do not commit, and do not pass `--trust` to `truss verify`.

The pause is what keeps a long implementation reviewable. "Do not commit" is for when you want to review the diff first; leave it out if you prefer the agent to commit.

## 5. Verify

The first time, run `node .truss/bin/truss.mjs verify` yourself and approve the list (see [approve the verification commands yourself](agents.md#approve-the-verification-commands-yourself-once)). After that the agent can run it.

## 6. Review

Open a new session, and point to the skill's file, not to the built-in command of your agent (see [skills](../skills/overview.md#code-review-and-claude-codes-code-review)):

> Review the active change with `.truss/.truss/skills/code-review.SKILL.md`. Read the spec first. If there are no commits, do not rely on `git diff`: read the files. Give me a table of each spec scenario and the test that covers it, check that proposal, specs, design and tasks agree, and list findings by severity. Do not modify any file.

Then take the report back to the implementer, as [use TRUSS with a coding agent](agents.md#review-in-a-separate-session-then-back-to-the-implementer) describes.

## 7. Close

> Run `truss verify`. Review what changed since the last review. Then run `openspec validate add-retry-policy --strict`, and, if it passes, `openspec archive add-retry-policy`. Tell me what is left open before you do.

`openspec archive` moves the change to `openspec/changes/archive/` and merges its deltas into `openspec/specs/`. Commit `openspec/` and the code, as separate commits if you can, so the history shows the implementation and the spec update apart. TRUSS notices the archive the next time you run `status` or `continue`.

## See also

- [Getting started](../getting-started.md)
- [Discovery (Grill)](../workflows/discovery.md)
- [Lifecycle commands](../workflows/lifecycle-commands.md)
- [Use TRUSS with a coding agent](agents.md)
