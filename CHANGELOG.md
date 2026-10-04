# Changelog

All notable changes to TRUSS are documented here.

## [Unreleased]

### Documentation
- **The Graphify page says what TRUSS does with the graph and what it does not (EN/ES).** TRUSS builds and refreshes the graph and reminds the agent in `continue`; it never runs a query or installs anything, so an agent searches as usual unless told to use the graph. The page lists what Graphify's own agent installers write (`claude install` and `codex install` write into the project, `hook install` adds git hooks and a `.gitattributes` line, `devin install` writes to your user account), how to query the graph, that `.truss/` must be ignored or the graph indexes TRUSS itself (51 files instead of 3 in a test), that freshness follows commits and not uncommitted edits, when to adopt it, and what `enabled: false` silences.
- **Skills, the review flow and reopening a change (EN/ES).** The skills page says skills are files the agent reads and not menu entries, separates TRUSS's `code-review` from Claude Code's `/code-review`, shows `caveman` in each mode and what not to compress, and says who wins between a policy and an external skill. The agent guide describes the review in a separate session and how its findings go back to the implementer, and the permission mode. The lifecycle page explains how to reopen a finished change with a new task group (run on a real change) and what to check before archiving. The `handoff` reference has a filled-in note, and the glossary says which terms stay in English.
- **A guide to choosing where TRUSS lives (EN/ES).** It compares one TRUSS at the root with `components`, one per project folder and one per module, and states the rules that are easy to trip over: a component's empty `AGENTS.md` still wins over the root one, an `openspec/` folder made by hand is ignored by OpenSpec while `truss components` calls it `OpenSpec: component`, `verify` runs from the root with one list, and there is one active change at a time. It also covers a change that crosses two TRUSS projects. Linked from the documentation index, the component reference and the getting-started guide.
- **A TypeScript, pnpm and Vitest verification example, and the verification pitfalls (EN/ES).** The configuration examples have a command list that ran green and explain its four deliberate choices: `pnpm test run` instead of a Vitest watch that makes `verify` wait forever in your own terminal, keeping Vitest out of `.truss/`, `prettier --check src`, and `allowBuilds` for pnpm 12. The troubleshooting guide lists the matching messages and the `command not found: truss` of an alias, the `verify` reference says commands inherit your terminal, and the getting-started guide notes that an alias is per terminal.
- **A guide to using TRUSS in a shared repository (EN/ES).** It covers keeping `.truss/` and your agent guidance local with `.git/info/exclude`, the personal guidance file of Claude Code, Devin and Codex (and how Claude Code stops reading a shared `AGENTS.md` once a `CLAUDE.local.md` exists), what Prettier does to `.truss/`, and what `git clean` removes. It is linked from the documentation index, the getting-started guide and the agent guide.
- **The testing page and the v0.2 contract (EN/ES) say which CI cells run now.** They still listed Ubuntu / Node 22 and Windows / Node 24, which were paused in 0.2.17, and the contract said CI covered Windows.

## [0.2.18] - 2026-09-30

Patch release, from testing TRUSS as a new user in four isolated projects. A command now fails on an option it does not have instead of ignoring it, and `truss handoff` writes the phase OpenSpec reports now.

### Upgrade notes
- **A command that is given an option it does not have now exits `2`** with `× Unknown option "--x" for "truss <command>".`, and does nothing. Before, the option was ignored. A script that passed one (`truss doctor --trust`, for example) has to drop it. The options are the ones `truss <command> --help` lists: `--component <name>` for `new` and `use`, `--trust` for `verify`.
- `--component` without a value, and `--component=api`, are errors too: write `--component api`.
- `truss handoff` asks OpenSpec for the phase when it writes the note. Without OpenSpec or with an invalid configuration it still writes the note, with the phase last recorded.
- Nothing else changes for an existing project.

### Fixed
- **A command no longer ignores an option it does not have.** `truss new "Add retry" --componnet api` created the change in the workspace without a word, because the typo was dropped; `truss new --component` created a change called `component`, taking the option for the title; and `truss verify --bogus` ran the verification. Now the options a command accepts are the ones its help lists. Anything else fails before anything is done, with exit code `2`, `× Unknown option "--componnet" for "truss new".` and the closest option the command has. An option that needs a value and has none (`--component` alone), or is written `--component=api`, is an error as well. The title of `new` is the first argument that is not an option or its value, so `truss new --component api "Add retry"` works. Only long options count: a title or a name that starts with a single dash is unchanged. `--help` still wins over everything. A script that passed an option the command never had (`truss doctor --trust`, say) now fails with exit code `2`.
- **`truss handoff` writes the phase OpenSpec reports now.** It copied the phase from `.truss/state.json`, which only `new`, `use`, `status` and `continue` refresh, so a note could say `implementation` for a change that was already `complete`, or the reverse, and mislead whoever picked it up. It now asks OpenSpec when it writes the note. When OpenSpec or the configuration cannot be used (`handoff` has never needed either), it still writes the note, with the phase last recorded and `(last recorded; OpenSpec could not be asked)` after it.

### Documentation
- **The CLI reference, the `handoff` reference and the troubleshooting guide (EN/ES) describe the option check and the phase of a handoff note.**

## [0.2.17] - 2026-09-30

Patch release. `truss continue` lists `.truss/config.yaml` under "Context to load", and CI no longer runs the Ubuntu / Node 22 and Windows / Node 24 cells for now.

### Upgrade notes
- No exit code changes.
- `truss continue` prints one more line under "Context to load" while the agent implements: `.truss/config.yaml`. Nothing else in the output changes.
- The CI change affects this repository only, not the package. Nothing is tested on Windows while its cell is off.
- Nothing else changes for an existing project.

### Changed
- **`truss continue` lists `.truss/config.yaml` under "Context to load".** The project's settings (the verification gates, the verification commands, the policies) were never on the list, so an agent only learned of them from the loops `continue` says are off. It is one more line while the agent implements, after the change. Nothing else in the output changes, and TRUSS still does not make the agent read it.

### Changed
- **CI no longer runs `ubuntu-latest` / Node 22 or `windows-latest` / Node 24, for now,** to shorten the run. Two `exclude` entries in `ci.yml` switch them off, and deleting them brings them back. The documentation check, lint and coverage floor, which ran only in the Ubuntu / Node 22 cell, run in `ubuntu-latest` / Node 24 instead. Nothing is tested on Windows while its cell is off. The required checks of `main` are the four jobs that still run. TRUSS itself is unchanged.

## [0.2.16] - 2026-09-30

Patch release. `truss new` and `truss handoff` say which changes are open in OpenSpec when none is active, as `status` and `continue` already did, and the docs spell out that the `tests_required` gate looks at the whole branch.

### Upgrade notes
- No exit code changes.
- `truss new` prints one more line when no change was active and others are open in OpenSpec (a fresh clone, for example). `truss handoff` with no active change, or an archived one, prints an `Open changes` line and `truss use` when some are open. With nothing open the output is what it was.
- The `tests_required` gate is unchanged.
- Nothing else changes for an existing project.

### Changed
- **`truss new` says which open changes it walks past when no change was active, and `truss handoff` with no active change lists what is open.** `.truss/state.json` is local to each checkout, so on a fresh clone `truss new` created a second change next to ones already open in OpenSpec without a word: it only warned about the change it replaced, and there was none. It now adds `○ Also open in OpenSpec: a, b. None was the active change, and "x" is now: ...` with `truss use <change>` (the exact command when one is open, `--component` for a change in a component), and never together with the existing line about a replaced change. `handoff` with no active change, or with an archived one, lists the open changes and points to `truss use`, as `status` does; with nothing open it still prints the one line it did. `handoff` still does not need a valid configuration: one that cannot be read lists nothing. No exit code changes.

### Documentation
- **The `tests_required` gate now says that it compares the whole branch with the base, not each commit,** in the configuration reference and the `verify` reference (EN/ES): a test changed in an earlier commit of the branch also satisfies a later commit that only changes code, and any test file of the component counts. It recommends a coverage threshold in `verification.commands` for tests that exercise the code. The gate itself is unchanged.
- **The lifecycle commands page and the `handoff` reference (EN/ES) describe the new `new` and `handoff` output.**

## [0.2.15] - 2026-09-30

Patch release, from testing TRUSS in `spec.mode: anchored` with the real Graphify and OpenSpec. `truss status` and `truss continue` list the changes that are open when no change is active, and `truss continue` tells the agent when a development loop is off and lists `AGENTS.md` only when the project has one.

### Upgrade notes
- No exit code changes.
- `truss status` and `truss continue` print more when no change is active and OpenSpec has open changes (a fresh clone or a CI checkout, for example): an `Open changes` line and `truss use` ahead of `truss new`. With nothing open the output is what it was.
- `truss continue` prints one more line while the agent implements for each of `development.bdd` and `development.tdd` that is `false`, and no longer lists `AGENTS.md` under "Context to load" when the project has none. With the default settings and an `AGENTS.md`, nothing changes.
- TRUSS still does not check the BDD or TDD loops: they remain agent policy, and `continue` now says so to the agent.
- Nothing else changes for an existing project.

### Changed
- **`truss status` and `truss continue` list the changes that are open in OpenSpec when no change is active.** `.truss/state.json` is local to each checkout, so a fresh clone or a CI machine has no active change even when OpenSpec has changes in flight, and both commands answered `No active change` and pointed only to `truss new`: the one step that starts a duplicate and never mentions `truss use`. `status` now adds an `Open changes` line and puts `truss use <change>` first, with `truss new "Change name"` as the alternative; `continue` says the same in its one instruction. When a single change is open the command names it, and a change in a component's own `openspec/` is listed as `add-retry (component api)` with `--component api` in the command. The same list follows the message that the active change was archived. It reads the `openspec/changes` folders, as `truss use` does, so it does not need the OpenSpec CLI, and a component that does not resolve or a folder that cannot be read is left out instead of failing. With nothing open the output is exactly what it was, and no exit code changes.
- **`truss continue` tells the agent when `development.bdd` or `development.tdd` is off.** Both settings were agent policy that never reached the agent: `continue` said "follow configured BDD/TDD policies" and listed no configuration file, and the `execute-change` workflow only says "if BDD is enabled", so the output was identical with both loops on or off. While the agent implements, the next action now adds `BDD is off (development.bdd: false): ...` and `TDD is off (development.tdd: false): ...`, after the spec policy lines. Both on, the default, adds nothing. TRUSS still does not check either loop.
- **`truss continue` lists `AGENTS.md` under "Context to load" only when the project has one.** It was always listed, although `init` does not create it, so a project without one was told to load a file that is not there. A component's own `AGENTS.md` is listed with its path, else the workspace's.

### Documentation
- **The lifecycle commands page, the troubleshooting guide, the quick start and the CLI reference say what a fresh clone shows,** and that `truss use` is how it picks up a change that is already in flight.
- **The configuration reference, the effects table, the BDD/TDD concept page and the lifecycle commands page (EN/ES) say that `continue` states a loop that is off, and when it lists `AGENTS.md`.**

## [0.2.14] - 2026-09-30

Patch release, from testing TRUSS in `spec.mode: source` with the real Graphify. `truss continue` now tells the agent about the Graphify code graph and about what `spec.mode: source` and `spec.zone_guard` ask of it, a damaged `graphify-out/graph.json` is reported instead of reading as `ready`, and the docs check makes heading anchors the way GitHub does.

### Upgrade notes
- No exit code changes.
- `truss continue` prints more while the agent implements. With Graphify installed, it ends with a **Code graph** section (Graphify is enabled by default); with `spec.mode: source` or `spec.zone_guard: true`, the next action gains one or two lines. A project with the default spec settings and no Graphify sees no change.
- `truss doctor` and `truss graphify` can report a new state, `damaged`, for a `graph.json` that is empty or cut short and used to read as `ready`: an optional warning, or a failure when Graphify is required.
- TRUSS still does not check `spec.mode` or `spec.zone_guard`: they remain agent policy, and `continue` now says so to the agent.
- Nothing else changes for an existing project.

### Added
- **`truss continue` tells the agent about the Graphify code graph while it implements.** `continue` never mentioned the graph, although the `execute-change` workflow lists it as context. A new **Code graph** section says to use the graph when it is fresh, and what to run when it is stale (`truss graphify update`), missing or damaged (`truss graphify bootstrap`), with a way out when Graphify is optional and "before you implement" when it is required. It says nothing when Graphify is off, or optional and not installed, and only appears in the implementation phase. It is a report: `continue` keeps its exit code, and `doctor` and `graphify` are still what fail when a required Graphify is not ready.
- **A damaged `graphify-out/graph.json` has its own state, `damaged`.** An empty file, or one that is cut short or overwritten, used to read as `ready` and `fresh`, because TRUSS only looked at its dates. It is now reported by `truss graphify`, `truss doctor` and `truss continue` (blocking when Graphify is required), with what to do: delete the file and run `truss graphify bootstrap`. TRUSS reads only the two ends of the file, so a sound graph is never flagged, however large.

### Changed
- **`truss graphify update` and `bootstrap` do not run Graphify over a damaged graph.** Graphify cannot update or rebuild over it and answers with a Python traceback; TRUSS now says so first, in one sentence, and leaves the file for you to delete.
- **`truss continue` tells the agent what `spec.mode: source` and `spec.zone_guard: true` ask of it.** Both settings were agent policy with no effect on anything TRUSS prints: `continue` said the same in `anchored` and in `source` mode, so the agent only knew the mode if it read the configuration. While the agent implements, the next action now adds, in `source` mode, that the spec is authoritative and read-only and that behavior which has to change goes back to the spec first, and, with the zone guard on, that spec work and code work are kept in separate steps. A project with the default settings sees no change. TRUSS still does not check it: a change to the code that never touches the spec passes `truss verify`, and the docs say so.

### Documentation
- **The Graphify lifecycle page says two things it left out:** any commit makes the graph `stale`, because freshness follows Git HEAD (and `update` is incremental), and `graphify-out/` is generated output that TRUSS neither ignores nor checks, so committing it moves HEAD.
- **The configuration reference, the effects table, the specification modes page, the enforcement model and the spec-driven development page say what TRUSS does about these two settings in v0.2:** it states them to the agent, and does not enforce them.

### Quality
- **The docs check makes heading anchors the way GitHub does when a heading has `<…>` in code.** It removed `<change>` from ``## `truss use <change> [--component name]` `` as if it were HTML, even inside a code span, and computed `truss-use----component-name` where GitHub makes `truss-use-change---component-name`. A link to such a heading would have passed the check and been broken on GitHub, and a correct one would have been reported as broken. Code spans now keep their text, only real HTML tags are dropped (`a < b > c` has none), and a link with code as its label keeps it. The expected anchors in the tests were taken from GitHub's own renderer. No heading in the repository changes its anchor: all 657 were compared.

## [0.2.13] - 2026-09-30

Patch release: `truss graphify bootstrap` and `update` show why `graphify extract` failed instead of the failure of a second command, and that second command now runs only when Graphify does not know `extract`. Found by testing TRUSS with the real Graphify.

### Upgrade notes
- No exit code changes: a Graphify failure is still non-blocking when Graphify is optional and exits `1` when it is required.
- The text of a failed `truss graphify bootstrap` or `update` changes: it names the command and shows the last 12 lines of Graphify's output.
- Nothing else changes for an existing project.

### Fixed
- **`truss graphify bootstrap` and `update` no longer hide why `graphify extract` failed, and no longer run a second command that can call a language model.** When `graphify extract . --code-only` failed, TRUSS ran `graphify . --no-viz` and showed only that second failure. With a corrupt `graphify-out/graph.json`, Graphify said exactly what to do (`Delete the file and run a full rebuild`) and TRUSS showed `no LLM API key found` instead. Worse, that second command has no `--code-only`, so with an API key in the environment it could have sent the project's documents to a language model. TRUSS now runs the older path-first command only when Graphify does not know `extract` (`unknown command`), and any other failure is shown as it is.
- **A failed Graphify command is now printed with the command and its last 12 lines of output.** The success message already named the command; it also named `extract` when the path-first fallback was the one that ran. Graphify fails with a Python traceback, whose last line holds the message, so the long ones are cut and the omitted lines are counted.

## [0.2.12] - 2026-09-30

Patch release: `truss use <change>` goes back to a change that is already open in OpenSpec. Until now, `truss new` could leave a change behind and the only way back was to edit `.truss/state.json` by hand. The warning `truss new` prints now ends with the command that goes back.

### Upgrade notes
- One new command, `truss use`. No existing command changes its behavior or its exit codes.
- The warning `truss new` prints when it leaves another change behind now ends with `Go back to it with: truss use <change>`, plus `--component <name>` when the change lives in a component.
- Nothing else changes for an existing project.

### Added
- **`truss use <change> [--component name]` makes a change that is already open in OpenSpec the active one again.** Until now, going back to a change that `truss new` had left behind meant editing `.truss/state.json` by hand. `use` only moves the record of which change is active: it creates and changes nothing in OpenSpec, and it is safe to repeat. The change has to be open (a missing or archived one is an error, exit code `1`, and the message lists what is open, and names the component when the change lives in one); no name, or a name that is not a change id, is a usage error (exit code `2`).

### Changed
- **The warning `truss new` prints when it leaves another change behind now ends with the command that goes back**, `Go back to it with: truss use add-retry-policy`, with `--component` when the change lives in a component.

### Documentation
- **The lifecycle commands page documents `use`**, and the CLI reference, the README and Troubleshooting list it.

## [0.2.11] - 2026-09-30

Patch release: `truss new` now warns when it leaves another change behind. Starting a change while another was still open in OpenSpec used to replace the active change without a word, and there is no command to go back to it, so the first change looked lost.

### Upgrade notes
- No exit code changes: `truss new` still exits `0` when it creates the change.
- `truss new` prints one more line, `○ "x" is still open in OpenSpec (path) and is no longer the active change: …`, when another change was still open. A script that reads the whole output of `truss new` would see it.
- Nothing else changes for an existing project.

### Changed
- **`truss new` warns when it leaves another change behind.** Starting a change while another was still open in OpenSpec replaced the active change without a word, and there is no command to go back to it, so the first change looked lost. `new` still creates the new change and makes it the active one, exit code `0`, and now adds `○ "x" is still open in OpenSpec (path) and is no longer the active change: TRUSS follows one change at a time.` There is no warning when the previous change was archived or is gone from OpenSpec, or when the state file cannot be read.

### Documentation
- **The lifecycle commands page says what the warning means and how to make the first change active again** (edit `.truss/state.json`; a change in a component needs its `component` too), and Troubleshooting lists the line.

## [0.2.10] - 2026-09-30

Patch release: three rough edges found by trying TRUSS end to end on a small todo-list project. `truss new` now shows what OpenSpec said instead of its JSON, two errors say how to get out of them, and the documentation explains the warning Git prints when you clone a release.

### Upgrade notes
- No exit code changes. Only the text of three errors changes: `truss new` when OpenSpec refuses the change, `TRUSS config not found` and `Invalid TRUSS state file`.
- Nothing else changes for an existing project.

### Changed
- **`truss new` shows what OpenSpec said, not its JSON.** When OpenSpec refuses a change (the id already exists, the name is too long), `truss new` printed OpenSpec's whole JSON reply, and a long id twice over. It now prints the message, `OpenSpec could not create change "x": Change 'x' already exists at …`, and shortens a very long id in it. The exit code is still `1`.
- **Two errors now say how to get out of them.** `TRUSS config not found: .truss/config.yaml` adds `Run truss init to create it.`, and `Invalid TRUSS state file` adds that the file only remembers the active change, so you delete it and start again with `truss new`. Exit codes do not change.

### Documentation
- **Getting started and Troubleshooting explain the `warning: refs/tags/… is not a commit!` line** that Git prints when cloning a release, which is harmless, and Troubleshooting lists the `OpenSpec could not create change` failure of `truss new`.

## [0.2.9] - 2026-09-30

Patch release: `truss handoff` and the `tasks_complete` gate now recognize a change that was closed with `openspec archive`, as `status` and `continue` already did. The documentation separates its historical documents from the current ones.

### Upgrade notes
- No exit code changes. `truss handoff` on an archived change now says so and writes no note (it used to write one), and the `tasks_complete` gate reports it as `archived` (in the output and in `.truss/verification/latest.json`) instead of `could not evaluate`. A script that read the gate's `unknown` status for this case should also accept `archived`.
- Nothing else changes for an existing project.

### Fixed
- **`truss handoff` and the `tasks_complete` gate now recognize a change that was closed with `openspec archive`**, as `status` and `continue` already did. `handoff` used to write a note for it, with a phase that was no longer true; it now says the change was archived (and where), points to `truss new`, and writes nothing. The gate used to say `could not evaluate: OpenSpec did not report task progress`; it now reports `the active change "x" was archived (...); nothing to check`, records `archived` in the evidence, and never blocks. Exit codes do not change.

### Documentation
- **The historical documents are separated from the current ones.** The index has a new "Archive" section for the v0.1.0 release contract and the v0.1 documentation audit, and each of them opens with a note that it describes an earlier release and points to what holds today. The v0.2 release contract is now titled for the whole v0.2 line, not for 0.2.0, and its release gate asks for the version metadata to match the release instead of being `0.2.0`.

## [0.2.8] - 2026-09-30

Patch release: `truss new`, `status` and `continue` now exit `2` and list the errors when the configuration is invalid, as `config`, `verify` and `components` already did. The documentation gains a troubleshooting page.

### Upgrade notes
- **Exit code.** `truss new`, `status` and `continue` used to exit `1` when the configuration was invalid or missing, and printed only `× Invalid TRUSS configuration.` They now print `× invalid config` followed by the errors, and exit `2`. `truss new --component <name>` also exits `2` for an unknown component, where it exited `1`. A script that relied on `1` in these cases must accept `2`. This is what the CLI reference already documented.
- Nothing else changes for an existing project.

### Fixed
- **`truss new`, `status` and `continue` now exit `2` and list the errors when the configuration is invalid or missing, and `new --component` exits `2` for an unknown component.** The CLI reference already said so, and `config`, `verify` and `components` already did it. These three printed only `× Invalid TRUSS configuration.` (no detail) or `× TRUSS config not found` and exited `1`, so an invalid config looked the same as a failed precondition. They now print `× invalid config` followed by the errors, as the others do. A script that relied on exit `1` for these cases needs to accept `2`.

### Documentation
- **New page: [Troubleshooting](docs/en/guides/troubleshooting.md)**, in English and Spanish. It lists what TRUSS prints when something is wrong, what it means and what to do, in five groups: setup, verification, changes and the agent, the TRUSS installation and Windows. The messages are quoted from the real CLI. The table in Getting started stays for the first run and now points to it.

## [0.2.7] - 2026-09-30

Patch release: `truss continue` now names the OpenSpec commands the agent needs, and CI no longer cancels runs on `main`. Nothing else about the CLI changes.

### Upgrade notes
- The wording of two of `truss continue`'s instructions changed: while planning, it now adds `Run openspec instructions <artifact> --change <id> for its format and path`, and when every task is checked off it now says `openspec validate <id>` and `openspec archive <id>` instead of "OpenSpec verification/archive". A script that matched the old wording of either needs updating. `Use Grill first` and `first incomplete task` are unchanged, and no exit code changes.
- Nothing else changes for an existing project.

### Changed
- **`truss continue` names the OpenSpec commands the agent needs.** While planning, its instruction now says `Run openspec instructions <artifact> --change <id> for its format and path`, because `init` installs no OpenSpec commands in the agent and nothing else told it how to write an artifact. When every task is checked off, it says `openspec validate <id>` and, once that passes, `openspec archive <id>`, instead of "OpenSpec verification/archive". For a component that has its own `openspec/` directory, where TRUSS itself runs the CLI from, the commands carry `(from <component path>)`. A script that matched the old wording of the planning or the complete instruction needs updating; `Use Grill first` and `first incomplete task` are unchanged.
- CI no longer cancels runs on `main`. The workflow cancelled any run in progress on the same ref when a new one started, which is right for a pull request but left a commit on `main` without its Windows result when another run started on `main` two minutes later. Runs on `main` now have one concurrency group per commit; pull requests still cancel their own older runs.

## [0.2.6] - 2026-09-30

Patch release with no change to the CLI. The `grill-with-docs` skill gets an output contract, and the documentation gains a page on discovery (Grill) and says that Grill comes as two skills.

### Upgrade notes
- Nothing to do for an existing project: `lib/` and `bin/` are unchanged since 0.2.5. The one change outside the documentation is the text of the `grill-with-docs` skill, which lives in the TRUSS installation, so a project gets it when it moves to this release (see the [update guide](docs/en/guides/update-and-remove.md)). An agent that used the skill before will simply return a result with more fields.

### Changed
- **The `grill-with-docs` skill now has an output contract**, like `grill-me`, `prototype` and `code-review`. It was the only discovery skill without one ("produce input suitable for the active spec"), so two agents could return differently shaped results. It now asks for the same fields as `grill-me` (goal, scope, observable acceptance behavior, constraints, decisions, assumptions, unresolved questions, risks, suggested next step) plus three that come from working with documents: the sources of important statements, the contradictions found and how they were resolved, and what was taken as a proposal or example rather than a requirement. It also says to ask which documents to use when the request names none. Skills live in the TRUSS installation, so a project gets this when it moves to the release that includes it.

### Documentation
- **New page: [Discovery (Grill)](docs/en/workflows/discovery.md)**, in English and Spanish. It gathers what was spread over Getting started, "Who does what", the glossary and the lifecycle: when to do a Grill round and when to skip it, the two skills (`grill-me` for an idea, `grill-with-docs` for documents) and how to choose, what you do, when `prototype` is used, how discovery ends, and the fields both skills produce. The `grill` workflow had no page of its own.
- Getting started and "Who does what" now say that Grill comes as two skills: `grill-me` for an idea, and `grill-with-docs` when there are requirements, a proposal, a ticket or an ADR to start from, with an example prompt. They only named `grill-me` before.

## [0.2.5] - 2026-09-30

Patch release with no change to the CLI. The quick start now installs a release instead of `main`, the guide to update TRUSS is rewritten for that, and Getting started explains Grill and the doubled `.truss/.truss/` where the reader first meets them. CI and the release checklist also change.

### Upgrade notes
- Nothing to do for an existing project: `lib/`, `bin/` and the skills, policies and workflows are unchanged since 0.2.4.
- A clone made with the new quick start is pinned to a release (a "detached HEAD"), so `git pull` does not update it. Use `git fetch --tags` and `git checkout vX.Y.Z`, as the [update guide](docs/en/guides/update-and-remove.md) says. A clone of `main` made earlier keeps working as before.

### Changed
- The quick start (README and Getting started) now clones a release, `git clone --depth 1 --branch v0.2.5 ...`, instead of `main`, so what a newcomer installs is what was published and tested, and `truss --version` identifies it. The guide to update or remove TRUSS is rewritten for a pinned clone (`git fetch --tags` and `git checkout`), with a short section on following `main`. `npm run check:docs` now also keeps that version in step with `package.json`. An existing clone of `main` is not affected.
- CI runs 6 jobs instead of 9: Ubuntu on Node 20, 22 and 24, macOS on 20 and 24, and Windows on 24. macOS and Windows exist to catch what depends on the operating system, and the range of Node versions is covered on Ubuntu, the cheapest runner. A problem specific to an older Node on Windows, or to Node 22 on macOS or Windows, is no longer caught by CI.
- [Releasing](docs/en/development/releasing.md) says how to extract the changelog section as the release notes, with an `awk` command that works on macOS and Linux and a check that the file is not empty.

### Documentation
- Getting started explains Grill where it first appears (after the first `truss continue` output) and explains the doubled `.truss/.truss/` in the paths before the output that shows it, instead of after.

## [0.2.4] - 2026-09-30

Patch release: `truss status` and `truss continue` now cope with a change closed by `openspec archive`, and the documentation says what the agent does at each step and how a change is finished. Nothing else about the CLI changes.

### Upgrade notes
- After `openspec archive`, `truss status` and `truss continue` used to fail with OpenSpec's raw JSON error. They now report that the active change was archived and exit `0`. A script that treated that failure as a signal that the change was closed should look for the message `was archived` instead.
- Nothing else changes for an existing project.

### Fixed
- **`truss status` and `truss continue` no longer fail after a change is archived.** `openspec archive` moves the change to `openspec/changes/archive/<date>-<name>` but TRUSS kept pointing at it, so both commands failed with the raw `Change '...' not found` JSON. They now find the archived change and say so (with its new location), then point to `truss new`; the exit code is `0` and nothing is written. If the change is missing from OpenSpec without having been archived (its folder was deleted), the error names the missing folder and exits `1`. Any other failure to read the status is reported as before.

### Documentation
- **Getting started says what the agent does.** A new "What your agent does" section explains how the agent writes each planning artifact (`openspec instructions <artifact> --change <id>`, which works even though `init` installs no OpenSpec commands in the agent), when to use Grill and how tasks are checked off. A new "After verify passes" section covers review, `openspec validate` and `openspec archive`. The `AGENTS.md` snippet gains a line about `openspec instructions`.
- **The README quick start ends with the agent step** instead of "follow the active OpenSpec", and `execute-change` lists the commands used along the way.
- **The lifecycle commands page is rewritten for people who use TRUSS:** the three phases, real output of `new`, `status` and `continue`, and when to use each. The internals stay in a short closing section.
- **`npm run check:docs` compares the version written in the docs with `package.json`:** the pinned installs in the guides, the `--version` example and the bug report placeholder, so a release cannot leave them behind.
- **New page: [Releasing](docs/en/development/releasing.md)**, in English and Spanish: the checklist for a version, a tag and a GitHub release.

## [0.2.3] - 2026-09-30

Patch release: `truss handoff` no longer loses a note, and the documentation gains three guides, a "who does what" page and checks that keep the Spanish translation and the guide's examples in step with the English pages and the code. Nothing else about the CLI changes.

### Upgrade notes
- `truss handoff` now leaves an existing note untouched (exit `0`, with a message) instead of replacing it with the empty template. A script that ran it twice expecting a fresh template will keep the old note; delete the file to start a new one.
- Nothing else changes for an existing project.

### Changed
- **The verification policy and the `execute-change` workflow now name `truss verify`.** They said "run the configured commands", which an agent can do by hand and leave no evidence. `policies/verification.md` also mentions the approval of a new command list and the two opt-in checks.

- **`npm run check:docs` compares each Spanish page with its English original.** It fails when a translation has a different number of headings, code blocks, table rows, list items or relative links, or does not carry exactly one translation note, and says what differs and by how much. Until now it only checked that a translated page existed, and only four reference pages against the code; a translation could lose a section or repeat a line unnoticed, as `spec-modes.md` did. The orphan-page check also stopped counting the link in a translation's note as a link to the original: it made every translated English page look linked, which hid orphans.

### Fixed
- **`truss handoff` no longer overwrites an existing note.** Running it a second time replaced the note with the empty template, so whatever the agent had written in it was lost, which is the opposite of what a handoff is for. An existing note is now left untouched (exit `0`, with a message that says so); delete it to start a new one. The file is created only if it does not exist, so this holds even if two runs overlap.

### Documentation
- **New page: [who does what](docs/en/concepts/who-does-what.md)**, in English and Spanish. It settles the first questions of a newcomer: TRUSS runs no agent and picks no model; each phase (analysis, implementation, review) can use a different agent or model, because the state is in files; subagents and worktrees are not automatic and have no setting, and a worktree needs its own `.truss/config.yaml` because Git ignores `.truss/`. Each claim was tried, including a real worktree. The README now says what TRUSS is in a plain sentence, and getting started and the OpenSpec page link to [OpenSpec's repository](https://github.com/Fission-AI/OpenSpec), the only place its formats are documented; no page pointed there before.
- **Three guides**, in English and Spanish: [use TRUSS with a coding agent](docs/en/guides/agents.md) (the loop, where Codex and Claude Code read their guidance, and approving the verification commands once yourself), [use TRUSS in CI](docs/en/guides/ci.md) (a pinned install, the configuration that a fresh checkout lacks, approval without a terminal and an example GitHub Actions workflow) and [update or remove TRUSS](docs/en/guides/update-and-remove.md) (including that `git clean -fd` inside `.truss/` deletes your configuration).
- **New reference page: [`truss handoff`](docs/en/reference/handoff.md).** It documents the note's format, when to use it, its exit codes and that an existing note is kept.
- **The outputs quoted in getting started are now tested:** an end-to-end test runs the guide's steps and checks that every quoted line is what TRUSS prints, in order, and that the Spanish guide quotes the same.
- **The default verification commands assume a Node project, and the docs now say so.** In a project without a `package.json` (Python, Go, the root of a monorepo) the first command fails with `npm error … Could not read package.json` and `truss verify` stops. Getting started, the `verify` page, the configuration reference (which listed the default as "project starter commands") and the examples explain it and show a non-Node list; the troubleshooting table has the error.
- **Getting started shows the full output** of `new` and `continue` (the samples left out lines without saying so) and says what `...` means. Step 4 now has a ready-to-paste `AGENTS.md` snippet for a project that uses TRUSS, and warns that this repository's own `AGENTS.md` uses paths that are wrong in another project (`.truss/skills/` is `.truss/.truss/skills/` there).
- **The glossary defines eight terms** used across many pages without a definition: ADR, discovery, fail-fast, Gherkin, Grill, merge-base, RED / GREEN and vertical slice.
- The README lists `truss version` and `truss help`.
- Fixed a duplicated translation note in the Spanish `spec-modes.md`, introduced in 0.2.2.

## [0.2.2] - 2026-09-30

Patch release: the CLI is easier to use (`--version`, `--help` per command, a clear error for a mistyped command) and the Spanish documentation is complete. The configuration schema and the behavior of `truss verify` do not change.

### Upgrade notes
- An unknown command now exits with `2` instead of `0`. A script that relied on `truss <typo>` succeeding will now fail, which is the point. Running `truss` with no command still lists the commands and exits `0`.
- Nothing else changes for an existing project.

### Added
- **`truss --version`** (also `-v` and `truss version`) prints the installed version. Until now there was no way to tell which TRUSS was installed, and a bug report needs it.
- **`truss <command> --help`** (also `-h`, and `truss help <command>`) shows the usage, options and exit codes of one command, and never runs it. `truss help` lists the commands as before, and now also says how to get more.
- **`npm run check:docs`**, run by `npm run ci` and by a CI step. It fails on broken links, broken anchors and orphan pages under `docs/en/`, and on drift between the docs and the code: an undocumented CLI command, configuration option, `truss doctor` check or environment variable. Tested with real trees and by mutating a copy of the repository with the problems found during the documentation analysis.

### Changed
- **An unknown command now fails with exit code `2`** and says so, with a suggestion when one is close (`Unknown command "verfy". Did you mean "verify"?`). Before, it printed the whole command list and exited `0`, so `truss verfy && deploy` carried on as if verification had passed. Running `truss` with no command still lists the commands and exits `0`.
- **`npm run check:docs` now covers the Spanish docs.** Orphan pages under `docs/es/` fail the check, like those under `docs/en/`, and the Spanish CLI, configuration, `doctor` and environment references are held to the same drift checks as the English ones (a page that is not translated yet is not an error, an out-of-date one is). It also warns, without failing, about an English page that has no counterpart under `docs/es/`.

### Documentation
- **Reference pages brought up to date with the code.** `doctor.md` now has a table of every check (required or not, and when it passes), including `Trust`, `Tests required` and `Tasks complete`. `init.md` says that `init` approves the default command list it writes and documents its exit codes. `cli.md` no longer calls verification commands "gates" (the word now means the two opt-in checks) or the CLI a "starter", and gains an options table and an exit-code section with per-command exceptions.
- **New page: [environment variables](docs/en/reference/environment.md)** covering `TRUSS_TRUST`, `TRUSS_HOME` / `XDG_CONFIG_HOME`, `TRUSS_OPENSPEC_PATH`, `NO_COLOR` / `FORCE_COLOR` / `TERM` and `PATH`. `FORCE_COLOR` was not documented anywhere.
- **Getting started rewritten.** It now lists prerequisites (including how to install OpenSpec), shows the real output of each step, walks one change from `new` to `verify` including the approval prompt, covers monorepos, and has a table of the errors a new user is most likely to hit. The agent prompt no longer hard-codes paths.
- **The documentation index is organized by what you want to do** (understand, do the work, commands, configuration, integrations, guarantees, contribute) and links every page; previously the four concept pages, the glossary and the project structure were not linked from anywhere.
- **ADR 0001** records that the project configuration is local to each checkout (the quick start ignores all of `.truss/`), what a team can do about it today, and the versionable-configuration-file option to revisit later. It resolves the old contradiction with "commit shared TRUSS configuration".
- The four concept pages were 3 to 5 lines each and are now real pages (spec-driven development, BDD and TDD, context management, durable vs ephemeral state); the glossary defines the terms used across the docs.
- **Spanish documentation is complete: every English page has a Spanish counterpart at the same path** (39 pages). Getting started (now in neutral Spanish instead of voseo), `truss verify`, `doctor`, `init`, the CLI reference, environment variables, the five concept pages, the glossary and the project structure were translated first. The six legacy-named pages (`FLUJO`, `SKILLS`, `USO`, `BDD_TDD`, `ARQUITECTURA`, `CONFIGURACION`) were merged into the pages of the current structure and removed; the two facts only they held (when turning `bdd` off makes sense, and when to use each skill) were added to the English pages too. The remaining pages were then translated (lifecycle commands, components, configuration validation, OpenSpec detection and compatibility, Graphify lifecycle, testing, end-to-end tests, CI, ADR 0001, both release contracts, the documentation audit and the brand guide), and the older Spanish configuration pages, which had fallen behind, were rewritten to match: `tests_required`, `tasks_complete`, `base_ref` and the path options were missing from the reference, the effects table and the examples.

## [0.2.1] - 2026-09-30

Patch release: the documented quick start now works. Until now, cloning TRUSS into a project and running `truss init` failed on the first command.

### Upgrade notes
- TRUSS reads its config schema, skills, policies and workflows from its own installation. A `.truss/schema/` copied into a project as a workaround is no longer used, and can be deleted.
- Nothing else changes for a project that already works.

### Fixed
- **The documented quick start did not work.** Cloning TRUSS into a project's `.truss/` (as the README says) and running `truss init` failed with `TRUSS config schema not found`, because TRUSS looked for its schema, skills, policies and workflows inside the *project* instead of in its own installation. Every path the docs and `AGENTS.md` point agents to was missing there, and the same happened with TRUSS installed anywhere else. The tests hid it by copying the schema into each test project. TRUSS now reads that content from its own installation (`lib/paths.mjs`); the project keeps only `config.yaml` and its local state. `truss continue` prints the real path of the workflow and policies to read, `truss skills` lists the installed skills, and a project's own `.truss/schema` is no longer used.
- The README quick start passed `--component worker` to `truss new` on a project with no components, which fails with `Unknown component`. The example no longer uses it, and the README says to declare `components` first.
- `truss init` no longer leaves a half-created `.truss/config.yaml` behind when it cannot validate it (for example, an incomplete installation), and the error now says the installation is incomplete.

## [0.2.0] - 2026-09-29

TRUSS keeps its agent-driven model and gains its first TRUSS-side checks of engineering policy: two opt-in gates in `truss verify`. It still runs no coding agent itself, so the runtime orchestration the docs used to promise for "v0.2" is now planned for v0.3 (all such references were updated). See the [v0.2.0 release contract](docs/en/reference/release-v0.2.md).

### Upgrade notes
Both new gates default to `off`, so nothing changes for a project that does not enable them. Also worth knowing:
- **`truss status` / `truss continue` now report `implementation` (not `complete`) while tasks are open.** The previous output was wrong with a real OpenSpec (see Fixed).
- `truss config` lists the two new options with their defaults.
- The evidence file gains `testsRequired` / `tasksComplete` only when the corresponding gate is enabled.
- Documentation vocabulary moved: "v0.1" (the current model) is now "v0.2", and the future orchestration release is "v0.3". The v0.1.0 contract and audit keep their historical wording.

### Fixed
- **`truss status` / `truss continue` reported a change as complete while tasks were still open.** With a real OpenSpec, `isComplete` from `openspec status` means "all artifacts exist", not "all tasks are done", so the `implementation` phase was effectively unreachable and `continue` said "Implementation tasks are complete" for a change with unchecked tasks. The phase now comes from task progress (`openspec instructions apply`): `complete` only when there are tasks and none remain open. `status` shows `Tasks 1/3 complete` and `continue` names the first incomplete task. If progress is unavailable the change is reported as `implementation`, never `complete`.

### Documentation
- Version vocabulary updated across the English and Spanish docs, plus a new [v0.2.0 release contract](docs/en/reference/release-v0.2.md); the v0.1.0 contract now points forward.
- `SECURITY.md` points to GitHub's private vulnerability reporting, which is now enabled for the repository.

### Added
- **Tasks-complete gate** (`verification.tasks_complete: off | warn | block`, default `off`). `truss verify` can list, or refuse to run while, the active OpenSpec change has open tasks. It never blocks when it cannot decide (no active change, OpenSpec unavailable, no tasks) and records the result under `tasksComplete` in the evidence. `truss doctor` shows the mode.
- Contract test against the real OpenSpec CLI (`test/e2e/real-openspec.e2e.test.mjs`) and a non-required `Contract / real OpenSpec` CI job. The fake OpenSpec used by the other tests now mirrors the real CLI's task-progress semantics.
- **Tests-required gate** (`verification.tests_required: off | warn | block`, default `off`). `truss verify` can now report, or refuse to run, a change that touches source code without touching any test. It compares the working tree with the merge-base of `HEAD` and the base branch (`verification.base_ref`, auto-detected), per component, and records the result in the evidence file. It never blocks when it cannot decide (no Git work tree, no base branch, shallow clone). `verification.source_paths` and `verification.test_paths` override the detected layout. `truss doctor` shows the mode. It proves test files changed, not that they were written first or are meaningful. This is the first step of TRUSS-side enforcement for BDD/TDD.

## [0.1.2] - 2026-09-29

Patch release: makes TRUSS usable on Windows with an npm-installed OpenSpec or Graphify. CLI launching was refactored for every OS, with no behavior change intended on macOS or Linux.

### Fixed
- **Windows: npm-installed OpenSpec and Graphify were not usable.** `where` lists npm's extensionless `sh` shim before the `.cmd` one and Node cannot spawn `.cmd` files, so TRUSS reported a working OpenSpec as incompatible and could not run `init`, `new`, `status` or `doctor`. TRUSS now picks the runnable file and, for an npm-style `.cmd` shim, launches the Node script it points to directly. No shell is involved, so arguments such as a change title are never re-parsed by `cmd.exe`. A `.cmd` that is not an npm shim is reported with a clear error; point `TRUSS_OPENSPEC_PATH` at an `.exe` or at the npm shim. On Windows that path may omit the extension; TRUSS uses the `.exe`/`.cmd` next to it.

### Quality
- The fake OpenSpec/Graphify CLIs in the tests are installed like npm installs a global CLI, so no test is skipped on Windows anymore.

## [0.1.1] - 2026-09-29

Hardening and quality release. It stays within the v0.1 agent-driven model; runtime orchestration is still planned for v0.2.

### Upgrade notes
Three behaviors changed and can affect existing setups:
- **`truss verify` needs approval.** The first run for a project, and any run after `verification.commands` changes, asks for confirmation. Without a terminal (CI, agents) it refuses with exit `1` unless you pass `--trust` or set `TRUSS_TRUST=1`. Review `.truss/config.yaml` before doing so.
- **The config parser is stricter.** Anchors, aliases, tags, block/flow values, lists of objects, unterminated quotes and keys nested under a scalar are now errors instead of being silently kept as strings. Quote any value that starts with one of `& * ! | > [ {`.
- **Change names drop accents** (`Añadir política` becomes `anadir-politica`).

### Security
- `SECURITY.md` documents the trust model for `verification.commands`, which run through the system shell.
- `truss verify` asks before running a new or changed command list and remembers the approval per project in `$TRUSS_HOME/trusted.json` (default `~/.config/truss/`), outside the repository. `truss init` trusts the default list it writes; `truss doctor` reports trust state.

### Fixed
- The config parser rejects what it documents as unsupported instead of accepting it silently or mis-nesting it.
- Change names keep their letters when they contain accents.
- `handoff` reports a corrupt `state.json` instead of crashing.
- An unknown command name falls back to help instead of resolving to an object property.

### Changed
- `bin/truss.mjs` is a thin dispatcher; command logic lives in `lib/commands.mjs` and terminal output in `lib/ui.mjs`. CLI output is unchanged.
- `.truss/state.json` is written atomically (temp file + rename).
- Color output honors `NO_COLOR` and `FORCE_COLOR` and is disabled when stdout is not a TTY.
- `.truss/verification/` is git-ignored.

### Documentation
- README restructured (what it is, quick start, commands, docs, license) and the quick start uses the public repository URL.
- Root-level `docs/*.md` consolidated under `docs/en/`; exact duplicates removed.
- Issue templates, a pull request template and Dependabot for GitHub Actions.

### Quality
- Tests: 29 unit + 10 integration + 3 E2E became 85 unit + 43 integration + 3 E2E; line coverage 84.7% to about 96%, with a coverage floor enforced in CI (`npm run test:coverage`).
- CI runs on Ubuntu, macOS and Windows with Node.js 20, 22 and 24. Tests that need the POSIX fake OpenSpec/Graphify CLIs are skipped on Windows, so spawning a real npm-installed `openspec` there is not covered.
- Biome for linting and formatting (`npm run lint`, `npm run lint:fix`), enforced in CI. The codebase was reformatted; see `.git-blame-ignore-revs`.
- `scripts/run-tests.mjs` starts the suites without relying on shell globbing.

## [0.1.0] - 2026-09-29

First stable TRUSS baseline.

### Core
- Project-local, gitignored `.truss/` operating model.
- Versioned configuration schema and runtime validation.
- Component resolution for single-repo and monorepo workspaces.
- Deterministic CLI exit codes for configuration and verification failures.

### OpenSpec
- Required OpenSpec foundation.
- CLI/project detection and compatibility checks for stable `>=1.0.0 <2.0.0`.
- Non-destructive adoption/initialization; no silent CLI upgrade or downgrade.
- OpenSpec-backed `new`, `status`, and `continue` lifecycle.

### Graphify
- Optional Graphify capability with disabled, missing, bootstrap, ready, stale, and unknown-freshness states.
- Optional native-search fallback policy.
- Blocking diagnostics when Graphify is configured as required.

### Quality
- Sequential fail-fast `truss verify` with machine-readable local evidence.
- `truss doctor` diagnostics.
- 29 unit, 10 integration, and 3 E2E tests.
- GitHub Actions CI on Node.js 20 and 22.

### Governance
- MIT license.
- Contribution, security, and third-party policies.
- Explicit v0.1 enforcement model distinguishing TRUSS, agent, adapter, and declarative behavior.

### Intentionally deferred to v0.2
- Automatic coding-agent invocation and runtime routing.
- Runtime adapters for Claude Code/Codex/other agents.
- Automatic isolated reviewer execution.
- Automatic subagent/team/worktree orchestration.
- Technical zone-guard enforcement.
- Automatic OpenSpec archive/closure.
