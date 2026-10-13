# BDD Policy

Express externally observable acceptance behavior as scenarios. A vertical slice should move its acceptance scenario from RED to GREEN and remain traceable to OpenSpec.

## Writing a scenario

A scenario is a concrete example: a known state, one event, an outcome someone can see.

- **Given** puts the system in a known state. It does not describe a user interaction.
- **When** is one meaningful event.
- **Then** is an outcome visible to a user or an external system. Do not assert hidden state, such as a database row, unless that is the real external contract.
- Use the language of the domain, not clicks, HTTP calls, queues or mocks. That knowledge belongs in the step code, not in the scenario.
- Keep it short, usually three to five steps, with concrete values rather than placeholders.
- Use a scenario outline only when the examples are the same behavior with different data. Keep any shared background short; if it grows, split by business rule.
- Do not reuse the same step text under different keywords.

When `spec.gherkin` is `true` the scenarios are expected as Given/When/Then; with `false`, structured acceptance criteria are enough. The rules above hold either way.

## Slices

Cut work into vertical slices. Each slice states the scenario first, watches it fail for the right reason, then implements until it passes, with no pending or undefined steps left. Each scenario stays traceable to the requirement it demonstrates in the OpenSpec change.
