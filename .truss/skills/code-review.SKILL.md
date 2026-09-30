# Skill: code-review

## Purpose
Review a completed or reviewable slice independently from implementation reasoning.

## Inputs
Active spec, diff, tests, verification evidence, relevant project standards, and risk context.

## Review axes
1. Spec — does behavior and scope match the active specification?
2. Standards — architecture, readability, maintainability, tests, project conventions.
3. Risk — correctness, security, concurrency, performance, data integrity, regressions, operability.

## Procedure
1. Prefer fresh context when available.
2. Read the spec before judging implementation intent.
3. Inspect the diff and the smallest relevant surrounding context.
4. Check deterministic verification evidence.
5. Report findings by severity and evidence; avoid style-only noise.
6. Distinguish blocking findings from optional improvements.

## Output contract
- findings with file/location when possible;
- why each finding matters;
- required fix or verification;
- residual risks;
- review status: ready only when no blocking finding remains.
