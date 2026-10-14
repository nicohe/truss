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

1. **Summary.** What changes and why, in a form faster to read than prose: pseudocode, a call tree, a diagram, or a before and after table of behavior. Name the OpenSpec change it implements.
2. **Evidence.** What shows that it works, as a before and after: a test that failed and now passes, the output of a command, the `truss verify` result. State what was not verified and why.
3. **Merge risk.** Whether the change is a two-way door (reverting the pull request restores the earlier state) or a one-way door (a migration, a published release, a message sent, any effect outside the repository). Give the blast radius: who or what is affected if it is wrong, and what to look at first.

Add a short **Out of scope** list only when something a reviewer would expect is deliberately left for later.

## Rules
- Do not retell the diff line by line; the reviewer can read it.
- Evidence comes from runs that happened. Never invent output, and never write "tests pass" without having run them.
- Say what you did not check. A reviewer trusts a stated gap more than a silent one.
- Call a change reversible only if reverting really restores the state: data that was migrated or deleted is not restored by a revert.
- Keep the length in proportion to the risk. A small, reversible change gets a short body.
