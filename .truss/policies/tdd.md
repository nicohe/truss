# TDD Policy

For internal behavior: write a focused failing test, verify RED, implement the minimum behavior, verify GREEN, then refactor while keeping tests green.

## The cycle

- **One test, one behavior, one reason to fail.** The test name states that behavior. If the name needs "and" or "or", it is two tests. Several assertions are fine when together they establish the same behavior.
- **RED must be the right red.** Run the test and confirm it fails because the behavior is missing, not because of a typo, a bad import or broken setup. A test you never saw fail proves nothing.
- **GREEN is the minimum.** Write only what makes the failing test pass. Do not add behavior without first seeing its test fail. Run that test, then the relevant suite.
- **Work in vertical slices.** One failing test, the smallest code that passes it, then the next test. Do not write a batch of imagined tests first: each green slice can change what the next one should be.
- **Refactor only while green,** after a finished red-green slice. Refactor the tests or the code in a pass, not both, and rerun the relevant suite after each pass.

## What a good test looks like

- It exercises observable behavior through the public interface. Do not test private methods or assert the order of internal calls: such tests break on a refactor that changes nothing a caller can see.
- Its expected value is known independently, written as a literal. Do not compute it with the same logic the code is meant to implement; that test can pass while the rule is wrong.
- Parameterize only when the cases are the same behavior with different data. Shared setup and helpers are fine when they make the behavior clearer, not when they hide several behaviors in one test.

## Mocks

Replace only what sits at a system boundary: an external service, the clock, randomness and, when needed, the database or the file system. Do not mock code the application owns; prefer real in-process collaborators. Pass the boundary in (as an argument or a dependency) so a test can supply a substitute, and give each boundary a focused operation, such as `getUser` or `createOrder`, rather than one generic call that needs conditional mock logic.

## What `truss verify` adds

When `verification.tests_required` is `warn` or `block`, `truss verify` also reports a change that touches source code without touching any test. Treat that as a failed TDD step, not something to silence.
