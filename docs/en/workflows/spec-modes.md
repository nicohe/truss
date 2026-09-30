# Specification modes

TRUSS requires OpenSpec. `spec.mode` controls how implementation is allowed to interact with the active specification.

## Spec-Anchored (`anchored`) — default

OpenSpec remains the durable anchor, but implementation discoveries may legitimately refine the specification, design, tests, or tasks. Any divergence must be explicit and reconciled before completion.

```text
Intent / bug / feature
        ↓
Discovery / Grill when needed
        ↓
OpenSpec proposal + behavior + design + tasks
        ↓
execute-change
        ↓
Implement vertical slice
        ↓
Discovery contradicts or refines the spec?
   ├─ no ───────────────────────────┐
   └─ yes                           │
        ↓                           │
      evaluate                      │
        ↓                           │
      update affected spec/design/ │
      tests/tasks/ADR explicitly   │
        ↓                           │
      reconcile implementation     │
        └───────────────────────────┘
                    ↓
               verification
                    ↓
               code review
                    ↓
            OpenSpec alignment
                    ↓
                 archive
```

Rules:
- Code and specification must never diverge silently.
- A discovered requirement is not automatically accepted; evaluate it first.
- Update only the artifacts affected by the discovery.
- Use an ADR only for a durable architectural decision.
- Review checks the final implementation against the reconciled specification.

## Spec-as-Source (`source`)

Expected behavior in OpenSpec is authoritative during implementation. Behavioral changes start in the specification phase, not in code.

```text
Intent / bug / feature
        ↓
Discovery / Grill
        ↓
OpenSpec
        ↓
Spec reviewed / ready
        ↓
Implementation phase
        ↓
execute-change
        ↓
Need to change specified behavior?
   ├─ no ───────────────────────────┐
   └─ yes                           │
        ↓                           │
       STOP implementation          │
        ↓                           │
       return to Spec Zone          │
        ↓                           │
       update/review OpenSpec       │
        ↓                           │
       return to Code Zone          │
        └───────────────────────────┘
                    ↓
               verification
                    ↓
               code review
                    ↓
            OpenSpec alignment
                    ↓
                 archive
```

When `spec.zone_guard: true`, runtimes that support write controls should enforce the Spec Zone / Code Zone separation. In v0.2 this is an agent policy; runtime enforcement is planned for adapters/orchestration.

What TRUSS does in v0.2 is tell the agent. While the agent implements, `truss continue` adds to its next action that the spec is authoritative and read-only, and that behavior which has to change goes back to the spec first (in `source` mode), and that the zone guard is on (when it is). A project with the default settings sees no difference. TRUSS does not check that the agent obeys: a change to the code that never touches the spec still passes `truss verify`.

## Choosing a mode

| Concern | `anchored` | `source` |
|---|---|---|
| Default | Yes | No |
| Spec is durable anchor | Yes | Yes |
| Spec may be edited during implementation | Yes, explicitly | No; return to spec phase first |
| Best fit | Most product engineering | Strict/spec-controlled environments |
| Zone Guard | Usually off | Often useful |

Changing modes does not rewrite existing OpenSpec artifacts. The selected mode changes the workflow rules applied from that point forward.
