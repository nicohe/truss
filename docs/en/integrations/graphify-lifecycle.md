# Graphify lifecycle

Graphify is optional code intelligence. TRUSS remains functional without it unless the project explicitly sets `required: true`.

## Configuration

```yaml
integrations:
  graphify:
    enabled: true
    required: false
```

| enabled | required | Behavior |
|---|---|---|
| false | false | Graphify is ignored. |
| true | false | Use Graphify when ready; otherwise use native search/grep/LSP. |
| true | true | Graphify must be installed and its graph must be ready/fresh; otherwise the capability blocks. |
| false | true | Invalid configuration; rejected by config validation. |

## States

- `disabled`: integration intentionally off.
- `missing`: CLI is unavailable.
- `needs_bootstrap`: CLI exists but `graphify-out/graph.json` does not.
- `ready`: graph exists and is considered fresh.
- `stale`: graph predates/differs from current Git HEAD.
- `unknown_freshness`: graph exists but freshness cannot be established safely.

TRUSS writes `graphify-out/.truss-graphify.json` after a successful TRUSS-managed refresh. It records the Git HEAD used to build/update the graph. For graphs created outside TRUSS, modification time relative to Git HEAD is used as a conservative fallback.

## Commands

```bash
truss graphify
truss graphify bootstrap
truss graphify update
```

Bootstrap uses the Graphify CLI to build a code graph. Update refreshes an existing graph. TRUSS does not install Graphify or silently change its version.

## Failure semantics

When optional, missing/stale/unready Graphify does not block TRUSS and the agent must fall back to native repository exploration. When required, the same states block Graphify-dependent workflow and `truss graphify` returns a non-zero exit code.

Graphify's current upstream CLI supports local code graph extraction, `graphify update .`, and produces `graphify-out/graph.json`. See the official Graphify repository for installation and CLI details.
