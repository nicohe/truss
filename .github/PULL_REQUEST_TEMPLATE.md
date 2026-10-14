## Summary

<!-- What changes and why, in the form that is quickest to read: pseudocode, a call tree, a diagram or a before/after table. Name the OpenSpec change if there is one. -->

## Evidence

<!-- What shows that it works, before and after: a test that failed and now passes, command output, the `truss verify` result. Say what you did not verify. -->

## Merge risk

<!-- Two-way door (reverting restores the earlier state) or one-way door (a migration, a release, a message sent, an effect outside the repository)? Who or what is affected if it is wrong, and what should the reviewer look at first? -->

## Checklist

- [ ] Change is focused and explained above
- [ ] Tests added or updated for behavior changes
- [ ] `npm run ci` passes locally
- [ ] Docs (`docs/en/`, and `docs/es/` if translated) updated for config, CLI, workflow or compatibility changes
- [ ] No confidential material or third-party content without a compatible license (see `THIRD_PARTY.md`)
