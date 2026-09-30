# Skill: grill-with-docs

## Purpose
Discover requirements and ambiguities when source documents already exist.

## Inputs
Requirements, proposals, diagrams, ADRs, tickets, examples, code snippets, or existing documentation. If the request names no documents, ask which ones to use.

## Procedure
1. Read the supplied documents before questioning.
2. Classify statements as goals, requirements, acceptance criteria, constraints, proposed design, decisions, examples, assumptions, ambiguities, or open questions.
3. Compare relevant claims with the current codebase when needed.
4. Ask only questions not already answered by the documents.
5. Resolve contradictions explicitly; preserve provenance of important source material.
6. Produce the output below, in a form the active spec can take as input.

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
- sources: the document each important statement comes from;
- contradictions found, and how each was resolved or left open;
- statements taken as proposals or examples, not as requirements;
- suggested next step: prototype or spec.

## Rules
- A proposal is not automatically a requirement.
- Example code is illustrative unless explicitly normative.
- Existing behavior is evidence, not automatically the desired behavior.
- Do not rewrite source documents merely to make them agree with the implementation.
