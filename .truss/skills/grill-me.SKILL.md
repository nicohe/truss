# Skill: grill-me

## Purpose
Turn an under-specified idea, feature, bug, or architectural change into explicit decisions before specification or implementation.

## Use when
- requirements are ambiguous;
- important constraints or acceptance behavior are unknown;
- multiple materially different designs are plausible.

## Do not use when
The change is trivial and already has clear acceptance criteria.

## Procedure
1. Read only the minimum relevant project context.
2. Identify unknowns that can change behavior, scope, architecture, risk, or verification.
3. Ask focused questions in small batches. Prefer decision questions over generic discovery.
4. Separate facts, assumptions, proposals, and unresolved questions.
5. Stop when another agent could write the spec without inventing requirements.

## Output contract
Produce a concise discovery result containing:
- goal;
- in scope / out of scope;
- observable acceptance behavior;
- constraints;
- decisions made;
- assumptions;
- unresolved questions;
- relevant risks;
- suggested next step: prototype or spec.

## Guardrails
Do not silently decide product requirements. Do not turn implementation preferences into requirements. Do not duplicate durable information once it is moved into the spec.
