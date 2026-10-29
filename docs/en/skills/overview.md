# TRUSS Skills

TRUSS v0.2 ships nine portable agent skills. They are instruction contracts, not vendor-specific commands.

| Skill | Purpose | When to use it |
|---|---|---|
| grill-me | Discover missing requirements/decisions from an idea or change. | An unclear idea or change, before writing the spec. |
| grill-with-docs | Discover ambiguities from existing requirements/docs. | Requirements, proposals, diagrams or examples already exist. |
| prototype | Resolve one technical uncertainty with a bounded experiment. | Before committing to an uncertain technical decision. |
| code-review | Independent review across Spec, Standards, and Risk. | After an implementation that passes verification. |
| handoff | Transfer minimal live state across context boundaries. | A change of agent, runtime, session or reviewer. |
| writing-for-agents | Keep agent-facing repository context small and reliable. | `AGENTS.md`, specs, ADRs, workflows and docs. |
| caveman | Compress ephemeral agent communication without changing meaning. | Status updates, handoffs and operational messages. |
| retro | Review a session and propose improvements to the agent's environment, not the code. | After a session that was harder than it should have been. |
| pr | Write a pull request description a reviewer can act on quickly. | When a verified change is ready to be opened as a pull request. |

You do not need every skill on every change: load a skill when its situation arises, and none otherwise (see [context management](../concepts/context-management.md)). For the two Grill skills and `prototype`, see [Discovery](../workflows/discovery.md).

Skills live in `.truss/skills/*.SKILL.md` so any runtime can read the same source. Runtime-specific adapters may later expose native commands while preserving these contracts.

## Skills are files, not menu entries

A TRUSS skill is a Markdown file the agent reads. It is not registered in any agent, so it does **not** appear in the `/` menu of Claude Code, Codex or Devin, and typing its name as a command does nothing. In a project that follows the quick start the files are in `.truss/.truss/skills/` (the clone's own `.truss/` folder); `truss skills` lists them with the real path of each file for your layout (copy that path into the prompt, or skip it: `truss skills grill-me` prints that skill, so the prompt can say *run `truss skills grill-me` and follow it*), and `truss continue` prints the paths of the workflow and the policies. Name the file in your prompt:

> Review the change `add-retry-policy` with the skill in `.truss/.truss/skills/code-review.SKILL.md`. Read the spec first, then the diff.

### `code-review` and Claude Code's `/code-review`

They are two different things with the same name. The TRUSS skill is the file above: a review across three axes (Spec, Standards, Risk) that starts from the active spec and the verification evidence. The `/code-review` command of Claude Code is a built-in command that reviews the current diff for correctness bugs, with effort levels and `--fix` ([commands](https://code.claude.com/docs/en/commands)). It does not read your OpenSpec change unless you tell it to. To run the TRUSS review in Claude Code, point to the skill's path as in the prompt above; `/code-review` is a useful extra pass, not a replacement.

### `retro`

`retro` is manual: TRUSS never asks for it. You ask for it after a session that went badly, and it reads the record of the session and proposes changes to the environment the agent works in, not to the code. Each proposal must trace to a specific moment of that session, and falls in one category: a pointer to help find things, an automated check, a standard for the reviewer, a smaller `AGENTS.md`, a cheaper tool, a deleted no-op, or more access to information. It changes nothing until you choose.

A mistake that a tool can catch becomes a check, and the natural place for it is `verification.commands`, which `truss verify` runs and records. A judgement call that no tool can decide becomes written guidance for the reviewer. A recurring mistake does not earn a line in `AGENTS.md`, because that file is loaded into every session.

> Run a retro on the last session with the skill in `.truss/.truss/skills/retro.SKILL.md`. Trace each proposal to a moment of the session, and read the project's existing checks before proposing a new one.

### `pr`

`pr` is manual too: TRUSS never asks for it, and it does not open the pull request. You ask for it when the change is verified and reviewed, and it writes the body: a summary in the quickest form for what changed (pseudocode for a rule that gained branches, a call tree for who calls whom, a diagram for pieces that talk to each other, a before and after table for a changed behavior, a file tree for moved files, or the smallest diff fragment for a small change; one form, two at most, starting with the change itself and not with an introduction), the evidence that it works and what was not verified, and the merge risk, meaning whether reverting restores the earlier state and what to look at first.

> Write the description of the pull request for `add-retry-policy` with the skill in `.truss/.truss/skills/pr.SKILL.md`. Use the `truss verify` result as evidence and say what you did not check.

The repository's own pull request template has the same three sections.

### `caveman`

`caveman` is manual: TRUSS never turns it on, and nothing in `truss continue` asks for it. You ask for it in the prompt, for output that is read once and thrown away: status messages, handoffs, intermediate messages between agents. An illustration of the same status line in each mode (the wording will vary):

| Mode | Example |
|---|---|
| none | I have finished the first two tasks and the tests pass, but I could not run the type check because the build is failing on an unrelated file, so I am going to look at that next. |
| `lite` | First two tasks done, tests pass. Type check blocked by a build failure in an unrelated file; investigating. |
| `full` | Tasks 1-2 done. Tests pass. Typecheck blocked: build fails, unrelated file. Checking. |
| `ultra` | T1-2 ok. Tests ok. Typecheck blocked: unrelated build fail. Checking. |

Do not use it for what must keep its reasoning: a review report, a spec, a design, an ADR. The skill itself excludes them, because compression can drop the "why" that makes a finding actionable. If you asked a reviewer for a compressed copy, give the implementer the original report and use the compressed one only as a summary.

### Policies and external skills

BDD and TDD are policies, set by `development.bdd` and `development.tdd` in `.truss/config.yaml`, and `truss continue` points the agent at them. If you also install a third-party skill about tests, it is an extra instruction in the agent's context, and TRUSS cannot tell which of the two wins when they differ. Say it in your prompt or guidance file (for example, "the TRUSS TDD policy decides; the extra skill only adds examples"), and check that the vocabulary matches the policy's: RED, GREEN, refactor and *vertical slice*.

BDD, TDD, Spec-Anchored, Spec-as-Source, Verification, and Review are policies rather than skills. OpenSpec and Graphify are integrations. `execute-change` is the central workflow.
