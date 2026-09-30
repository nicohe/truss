# Contributing to TRUSS

Thanks for contributing to TRUSS.

## Principles

- Keep the core portable across coding-agent runtimes.
- Prefer deterministic tooling for deterministic checks.
- Keep durable project intent in OpenSpec, not in agent conversations.
- Avoid adding skills, policies, workflows, or abstractions unless they solve a demonstrated problem.
- Preserve backward compatibility where practical and document intentional breaking changes.

## Before opening a pull request

1. Keep the change focused and explain the problem it solves.
2. Update tests when behavior changes.
3. Run `npm run ci` (syntax check, documentation check, Biome lint and format check, and all test suites). `npm run lint:fix` fixes formatting and safe lint findings.
4. Update documentation when configuration, CLI behavior, workflows, or compatibility changes. `npm run check:docs` fails if you add a command, a configuration option, a `truss doctor` check or an environment variable without documenting it, or leave a broken link. English (`docs/en/`) is canonical and every page has a Spanish translation in `docs/es/` with the same path; a change to an English page should update its translation. The check fails when a translation's structure (headings, code blocks, table rows, list items, links) differs from the English page, and warns about a page that has none.
5. Do not include confidential, proprietary, employer, customer, or otherwise unauthorized material.
6. Do not copy third-party code, prompts, skills, documentation, or assets unless their license permits it and all required notices are preserved. See `THIRD_PARTY.md`.

## Formatting

The code is formatted and linted with [Biome](https://biomejs.dev) (`biome.jsonc`). To keep `git blame` useful after the one-time reformat, run:

```bash
git config blame.ignoreRevsFile .git-blame-ignore-revs
```

## Contributions and license

By submitting a contribution, you agree that your contribution may be distributed under the MIT License that covers TRUSS. You must have the right to submit the contribution.

No Contributor License Agreement (CLA) or Developer Certificate of Origin (DCO) is required for TRUSS v0.2.

## Pull request expectations

A pull request should state:

- what changed;
- why it changed;
- how it was verified;
- whether it changes configuration, compatibility, or documented behavior;
- any third-party material or licensing considerations.

Do not claim a capability is guaranteed by TRUSS unless the implementation or deterministic verification actually enforces it. Agent-followed behavior should remain identified as policy rather than a core guarantee.
