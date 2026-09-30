# Engineering Workflow

## Default

```text
Intent
  ↓
Discovery / Grill (only when needed)
  ↓
OpenSpec: proposal + behavior + design + tasks
  ↓
Vertical slice
  ├── BDD: acceptance scenario RED → GREEN
  └── TDD: unit RED → GREEN → refactor
  ↓
Verification
  ↓
Code review against spec + standards + risk
  ↓
Verify alignment and archive
```

## Task design

Prefer vertical behavioral slices that can be implemented and verified independently. Avoid horizontal tasks such as “database”, “API”, “tests” when they cannot demonstrate user-visible behavior alone.

## Review axes

1. Spec: did the change implement agreed behavior and scope?
2. Standards: architecture, maintainability and code quality.
3. Risk: security, concurrency, performance and regression risk.

A fresh reviewer context is preferred. Handoff is needed only when context/responsibility changes.
