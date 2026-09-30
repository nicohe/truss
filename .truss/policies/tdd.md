# TDD Policy

For internal behavior: write a focused failing test, verify RED, implement the minimum behavior, verify GREEN, then refactor while keeping tests green.

When `verification.tests_required` is `warn` or `block`, `truss verify` also reports a change that touches source code without touching any test. Treat that as a failed TDD step, not something to silence.
