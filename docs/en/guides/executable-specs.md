# Run the scenarios of your specs as tests

With `spec.mode: source` the spec is the authority on behavior. This guide shows one way to make that literal: write the scenarios of your OpenSpec specs in Gherkin, and have a test runner execute them against your application, so a scenario that no longer holds fails `truss verify`.

TRUSS does not ship a runner, and it will not: running Gherkin needs a tool for your language (cucumber-js, behave and others), and TRUSS does not choose your toolchain. What TRUSS gives you is the place to plug it in. `verification.commands` runs any command, in order, and records the result. The runner itself comes from elsewhere.

## One implementation to start from

The [intent-driven-template](https://github.com/intent-driven-dev/intent-driven-template) (MIT license) documents a complete setup in its `acceptance-test-authoring` and `spec-as-source` skills. This page summarizes how it works from reading those files; it does not copy them. TRUSS ran the setup end to end in a scratch project (see [what was checked](#what-was-checked-and-what-was-not)). Read the template's files before you adopt anything, and keep its license notice if you copy any of its files into your project.

How it works, in short:

1. The scenario steps go in a fenced `gherkin` block inside each requirement of a `spec.md`, under the usual `#### Scenario:` heading. The headings carry the structure (capability, requirement, scenario); the block holds only `Given`, `When` and `Then` steps. Each `spec.md`, deltas included, starts with a single `# <capability>` title, which the extractor requires and OpenSpec does not create (see below).
2. An **extractor** turns every `spec.md` under `openspec/` into a `.feature` file in a generated folder (`acceptance-tests/.extracted/`, ignored by Git and rebuilt on each run). The specs stay the source; the `.feature` files are never edited by hand.
3. A **runner** (cucumber-js for JavaScript, behave for Python) executes those files against the running application. Step definitions and page objects live in `acceptance-tests/`, a test project of its own that starts the application before the suite and stops it after.
4. The run covers the **effective spec**: the specs in force with the deltas of the active changes applied. Rules that a delta modifies or removes are left out, and `openspec/changes/archive/` never runs.
5. Tasks go acceptance-test first: set up the runner, then one task per pending step (see it fail for the right reason, implement, see it pass), then a full run with no pending or undefined steps.

## Plug it into `truss verify`

Once the project exists, list its single command in `.truss/config.yaml`, after your other checks:

```yaml
spec:
  mode: source
  gherkin: true
verification:
  commands:
    - cd acceptance-tests && npm test
```

For the Python stack the template documents `python run_acceptance.py` from inside `acceptance-tests/`. Both stacks need their own dependencies (for Python, `behave` and `behave-html-formatter`). Because you wrote the list, the first `truss verify` asks you to approve it (see [trust](../reference/verify.md#trust)). The evidence in `latest.json` then shows the run, and a failing scenario stops `verify` like any other failing command.

## What was checked, and what was not

Checked in a scratch project with OpenSpec 1.13.2 (the fenced-block behavior also with 1.14.1) and the template at commit `73f54d5`, on both stacks (cucumber-js and behave), with a small HTTP application:

- A delta spec with a fenced `gherkin` block passes `openspec validate --strict`, and `openspec archive` copies the block unchanged into `openspec/specs/<capability>/spec.md`, titled `# <capability> Specification`. The extractor reads that title, and the archived change is never run.
- A scenario whose expected text is wrong fails the run (exit 1), and the failing line in the `.feature` file is the same line of the `spec.md`.
- A `MODIFIED` delta replaces the scenarios of the requirement it changes: the old ones are listed as left out, the delta's run. `--specs` runs only the specs in force. The lint step passes.
- Plugged into `verification.commands` as `cd acceptance-tests && npm run test:specs`, `truss verify` asks for approval, then records the run as passed.

Two things to know before you start:

- **A delta spec needs a title.** The extractor stops with `no H1 title` on a `spec.md` that has none, and OpenSpec creates deltas starting at `## ADDED Requirements`. Put `# <capability>` as the first line of each delta; `openspec validate --strict` accepts it.
- **Dependencies and terminals.** For Python, install `behave-html-formatter` as well as `behave`, or the run stops with `BAD_FORMAT=html`. cucumber-js exits with 1 and no message under a pseudo-terminal of size 0×0 (a test harness, not a normal terminal).

Not checked: the page-object conventions and the template's own agent skills. The application here was a few lines, so a real one that must start and stop from a command is yet to be tried.

## Cost, and when it is worth it

This is the heaviest option TRUSS documents: a second test project, a runner dependency and an application that can start from a command. It pays off when the behavior in the specs is observable from outside (HTTP, a UI) and you want the specs to be the tests. For a library or a tool whose behavior is already covered by unit tests, the [BDD and TDD policies](../concepts/bdd-tdd.md) and `tests_required` are usually enough.

`spec.zone_guard` is a separate matter: TRUSS declares it, but a runtime adapter enforces it, not this setup. See [specification modes](../workflows/spec-modes.md).
