# Skill: pr

## Purpose
Write the description of a pull request so that a reviewer can tell in a minute what changed, whether it works, and where to spend their attention.

## Use when
A change is implemented and verified, and a pull request is about to be opened or updated.

## Do not use when
The change is a typo or another edit with nothing to explain; one line is enough.

## Inputs
The diff and its commits, the active OpenSpec change, the `truss verify` result and any review findings.

## Output contract
The body has three sections, in this order:

1. **Summary.** What changes and why, in a form faster to read than prose. Name the OpenSpec change it implements. Pick the form from what changed:

   | What changed | Form of the Summary |
   |---|---|
   | a rule or function gained branches | pseudocode of the new flow, with the changed lines marked |
   | who calls whom, or in what order | a call tree, with the new or changed nodes marked |
   | pieces that talk to each other or change state | a Mermaid diagram if the platform renders it (GitHub does), otherwise an indented text tree |
   | a behavior that was one way and is now another | a before and after table |
   | files moved, renamed or deleted | a file tree marked added, changed or removed |
   | a small, local change | the smallest fragment of the diff that shows it |

2. **Evidence.** What shows that it works, as a before and after: a test that failed and now passes, the output of a command, the `truss verify` result. State what was not verified and why.
3. **Merge risk.** Whether the change is a two-way door (reverting the pull request restores the earlier state) or a one-way door (a migration, a published release, a message sent, any effect outside the repository). Give the blast radius: who or what is affected if it is wrong, and what to look at first.

Add a short **Out of scope** list only when something a reviewer would expect is deliberately left for later.

## Rules
- Start the Summary with the change itself. No opening sentence that restates the title, announces what follows or praises the work.
- Use one form, two at most. If the visual needs more than about twenty lines, the change is probably too big for one pull request: say so, because that is information for the reviewer.
- Use the names the spec and the project use, not new ones.
- Do not retell the diff line by line; the reviewer can read it.
- Evidence comes from runs that happened. Never invent output, and never write "tests pass" without having run them.
- Say what you did not check. A reviewer trusts a stated gap more than a silent one.
- Call a change reversible only if reverting really restores the state: data that was migrated or deleted is not restored by a revert.
- Keep the length in proportion to the risk. A small, reversible change gets a short body.
