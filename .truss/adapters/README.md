# Runtime adapters

Adapters translate TRUSS capabilities into runtime-specific mechanics. The core should describe intent (`fresh_review_context`, `parallel_execution`, `isolated_workspace`, `code_graph`, `handoff`) rather than hardcoding vendor commands.

Initial adapters are intentionally not bundled in v0.2; add them without changing the core workflow contract.
