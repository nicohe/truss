# Skill: grill-with-docs

## Purpose
Discover requirements and ambiguities when source documents already exist.

## Inputs
Requirements, proposals, diagrams, ADRs, tickets, examples, code snippets, or existing documentation.

## Procedure
1. Read the supplied documents before questioning.
2. Classify statements as goals, requirements, acceptance criteria, constraints, proposed design, decisions, examples, assumptions, ambiguities, or open questions.
3. Compare relevant claims with the current codebase when needed.
4. Ask only questions not already answered by the documents.
5. Resolve contradictions explicitly; preserve provenance of important source material.
6. Produce input suitable for the active spec.

## Rules
- A proposal is not automatically a requirement.
- Example code is illustrative unless explicitly normative.
- Existing behavior is evidence, not automatically the desired behavior.
- Do not rewrite source documents merely to make them agree with the implementation.
