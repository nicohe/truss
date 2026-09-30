# Skill: caveman

## Purpose
Reduce token and visual overhead in generated agent communication while preserving technical meaning.

## Modes
- `lite`: concise professional prose; remove filler/hedging.
- `full`: default for operational agent output; fragments are acceptable, standard acronyms are fine, avoid narration and decorative output.
- `ultra`: maximum compression for ephemeral machine-to-machine coordination; preserve clarity, negations, numbers, code symbols, API names, errors, and commands exactly.

## Scope
Apply mainly to status, handoffs, intermediate agent messages, and operational summaries.

## Do not compress by default
Specs, ADRs, public docs, requirements, legal/security-sensitive text, or any artifact where compression can remove rationale or ambiguity controls.

## Rule
Compression must never change semantics merely to save tokens.
