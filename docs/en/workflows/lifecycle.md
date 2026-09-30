# Change lifecycle

This is the canonical end-to-end order for a TRUSS change. Not every skill is a lifecycle step: some are conditional or cross-cutting.

## End-to-end

```text
0. truss doctor
        ↓
1. truss new "Change name"
        ↓
2. Discovery when needed
   ├─ grill-me
   └─ grill-with-docs
        ↓
3. prototype? (only for unresolved technical uncertainty)
        ↓
4. Complete/review OpenSpec
        ↓
5. truss continue / execute-change
        ↓
6. BDD macro-loop + TDD micro-loop according to config
        ↓
7. truss verify
        ↓
8. code-review skill / review workflow
        ↓
9. OpenSpec alignment / verify
        ↓
10. OpenSpec archive
```

`handoff` is inserted only when responsibility, agent, runtime, session, or context changes. `writing-for-agents` and `caveman` are cross-cutting. Graphify is an on-demand code-intelligence capability.

## Command / workflow / skill mapping

| Order | Goal | TRUSS CLI | Workflow / policy | Skill or external capability |
|---:|---|---|---|---|
| 0 | Check prerequisites | `truss doctor` | environment readiness | OpenSpec required; Graphify status |
| 1 | Start a change | `truss new "..."` | create active change scaffold | OpenSpec |
| 2 | Resolve ambiguity | no dedicated CLI in v0.2 | [`grill`](discovery.md) | `grill-me` or `grill-with-docs` |
| 3 | Test an uncertain idea | no dedicated CLI | discovery | `prototype` (optional) |
| 4 | Finalize expected behavior | OpenSpec commands/tools | spec phase | OpenSpec |
| 5 | Implement next slice/task | `truss continue` | `execute-change` | coding agent; Graphify when useful |
| 6 | Develop safely | inside `execute-change` | BDD/TDD policies | — |
| 7 | Run deterministic checks | `truss verify` | verification policy | configured commands |
| 8 | Review | no executable `truss review` in v0.2 | code-review workflow | `code-review` |
| 9 | Transfer live state | `truss handoff` | handoff workflow | `handoff` |
| 10 | Check spec alignment | OpenSpec commands/tools | completion | OpenSpec |
| 11 | Close/archive | OpenSpec commands/tools | completion | OpenSpec |

Important: v0.2 is agent-driven. `truss continue` tells the agent what to continue; it does not yet invoke a runtime adapter and execute the task automatically. Full orchestration belongs to v0.3.

## Skills that are not sequential

```text
writing-for-agents ─────────────────────────────── cross-cutting documentation/context
caveman ───────────────────────────────────────── communication compression
handoff ───────────── only at a real context/responsibility transition
Graphify ──────────── on demand for code relationships/impact
prototype ─────────── only when technical uncertainty justifies it
```

Do not load or invoke all skills for every change.
