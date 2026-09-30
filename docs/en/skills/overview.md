# TRUSS Skills

TRUSS v0.1 ships seven portable agent skills. They are instruction contracts, not vendor-specific commands.

| Skill | Purpose |
|---|---|
| grill-me | Discover missing requirements/decisions from an idea or change. |
| grill-with-docs | Discover ambiguities from existing requirements/docs. |
| prototype | Resolve one technical uncertainty with a bounded experiment. |
| code-review | Independent review across Spec, Standards, and Risk. |
| handoff | Transfer minimal live state across context boundaries. |
| writing-for-agents | Keep agent-facing repository context small and reliable. |
| caveman | Compress ephemeral agent communication without changing meaning. |

Skills live in `.truss/skills/*.SKILL.md` so any runtime can read the same source. Runtime-specific adapters may later expose native commands while preserving these contracts.

BDD, TDD, Spec-Anchored, Spec-as-Source, Verification, and Review are policies rather than skills. OpenSpec and Graphify are integrations. `execute-change` is the central workflow.
