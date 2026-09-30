# Skill: prototype

## Purpose
Resolve a specific technical uncertainty cheaply before committing the production design.

## Use when
A decision depends on evidence: library behavior, API feasibility, performance shape, integration compatibility, concurrency semantics, or an unfamiliar runtime capability.

## Procedure
1. State the question the prototype must answer.
2. Define a time/complexity boundary and success criteria.
3. Build the smallest disposable experiment.
4. Record observations and limitations.
5. Decide whether the evidence changes the spec/design.
6. Discard prototype code unless it independently meets production standards and is deliberately promoted.

## Output contract
Question, experiment, result, limitations, decision, and spec/design impact.

## Guardrail
A prototype is evidence, not production implementation by default.
