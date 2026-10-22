# Third-Party Software and Licensing

TRUSS is distributed under the MIT License. That license applies to TRUSS itself; it does not replace or modify the licenses of third-party software used with TRUSS or the projects on which TRUSS operates.

## Rules

Before adding or redistributing third-party code, skills, prompts, documentation, assets, or other material:

1. Identify its license and source.
2. Confirm that the intended use and redistribution are permitted.
3. Preserve copyright, attribution, NOTICE, or license text when required.
4. Record material licensing obligations in the repository when redistribution requires them.
5. Do not assume that public availability means permission to copy or redistribute.
6. Do not include proprietary, confidential, employer, or customer material without authorization.

## External tools

Tools and integrations such as OpenSpec, Graphify, coding-agent runtimes, and optional external skills retain their own licenses and terms. Invoking or interoperating with a tool does not make that tool part of TRUSS and does not relicense it under MIT.

Likewise, using TRUSS to operate on another repository does not change that repository's license.

## Copyleft dependencies

Copyleft software is not categorically prohibited by TRUSS. Before redistributing or incorporating it, however, its obligations must be reviewed for compatibility with the intended distribution model. Do not add a dependency when its obligations are not understood.

## Ideas that came from elsewhere

Some TRUSS material started from an idea in another project. In each case the text in this repository was written from scratch for TRUSS and nothing was copied. The sources are listed so that the credit is not lost, and so that anyone who wants the originals can find them.

| Source | License | What it informed in TRUSS |
|---|---|---|
| [mattpocock/skills](https://github.com/mattpocock/skills), by Matt Pocock | MIT | The `retro` skill (look back over a session and propose improvements to the agent's environment) and the `pr` skill (a pull request description a reviewer can act on quickly) |
| `show-me`, by Dex Horthy (Humanlayer), credited by the repository above | see its repository | The menu of visual forms for the Summary of a pull request, in the `pr` skill |
| [intent-driven-template](https://github.com/intent-driven-dev/intent-driven-template) | MIT | The expanded TDD and BDD policies, the guide to run the scenarios of the specs as tests, the `operations.guidance` recipe, and the warning of `spec.zone_guard` ([ADR 0003](docs/en/development/decisions/0003-zone-warning.md)) |

If you copy or adapt material from those projects into TRUSS, keep its license notice, as the rules above say.

## Review requirement

Any contribution that vendors, copies, modifies, or redistributes third-party material should explicitly identify that material and its license in the pull request.
