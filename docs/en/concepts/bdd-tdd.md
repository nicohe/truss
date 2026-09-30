# BDD and TDD

BDD is the macro-loop: acceptance behavior RED → implementation → acceptance GREEN. TDD is the micro-loop: RED → GREEN → Refactor. They are policies, not standalone TRUSS skills. Verification remains independent and deterministic.

TRUSS cannot observe whether tests came first, but it can check that tests changed at all: with `verification.tests_required` set to `warn` or `block`, `truss verify` reports (or refuses) a change that touches source code without touching any test. See [`truss verify`](../reference/verify.md#tests-required-gate).
