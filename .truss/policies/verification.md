# Policy: Verification

Verification is deterministic evidence, separate from BDD/TDD method and from human/agent review.

Run it with `truss verify`. It runs every command configured in `.truss/config.yaml` under `verification.commands`, in order, and records the result in `.truss/verification/latest.json`. Running those commands by hand is not verification: no evidence is recorded. A failed required command blocks completion. Do not claim verification passed from reasoning alone.

`truss verify` asks for approval of a command list that is new or changed, and applies the opt-in `tests_required` and `tasks_complete` checks when they are enabled. Read the list before approving it.
