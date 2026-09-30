# Policy: Spec-as-Source

When `spec.mode: source`, expected behavior is authoritative in the active spec. Behavioral changes begin in the spec. During implementation, treat the spec as read-only; if behavior must change, transition back to spec work, update/review it, then resume implementation.

When `spec.zone_guard: true`, runtimes that support write controls should enforce separate spec/code zones. TRUSS v0.2 declares this policy; automatic enforcement belongs to runtime adapters.
