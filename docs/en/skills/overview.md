# TRUSS Skills

TRUSS v0.2 ships seven portable agent skills. They are instruction contracts, not vendor-specific commands.

| Skill | Purpose | When to use it |
|---|---|---|
| grill-me | Discover missing requirements/decisions from an idea or change. | An unclear idea or change, before writing the spec. |
| grill-with-docs | Discover ambiguities from existing requirements/docs. | Requirements, proposals, diagrams or examples already exist. |
| prototype | Resolve one technical uncertainty with a bounded experiment. | Before committing to an uncertain technical decision. |
| code-review | Independent review across Spec, Standards, and Risk. | After an implementation that passes verification. |
| handoff | Transfer minimal live state across context boundaries. | A change of agent, runtime, session or reviewer. |
| writing-for-agents | Keep agent-facing repository context small and reliable. | `AGENTS.md`, specs, ADRs, workflows and docs. |
| caveman | Compress ephemeral agent communication without changing meaning. | Status updates, handoffs and operational messages. |

You do not need every skill on every change: load a skill when its situation arises, and none otherwise (see [context management](../concepts/context-management.md)).

Skills live in `.truss/skills/*.SKILL.md` so any runtime can read the same source. Runtime-specific adapters may later expose native commands while preserving these contracts.

BDD, TDD, Spec-Anchored, Spec-as-Source, Verification, and Review are policies rather than skills. OpenSpec and Graphify are integrations. `execute-change` is the central workflow.
