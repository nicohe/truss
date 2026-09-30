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
- `damaged`: `graphify-out/graph.json` exists but is not a complete JSON document (empty, cut short or overwritten). Graphify cannot update or rebuild over it: delete the file and run `truss graphify bootstrap`. TRUSS only reads the two ends of the file, so it never flags a sound graph, but it cannot tell that the middle of a file is sound.

TRUSS writes `graphify-out/.truss-graphify.json` after a successful TRUSS-managed refresh. It records the Git HEAD used to build/update the graph. For graphs created outside TRUSS, modification time relative to Git HEAD is used as a conservative fallback.

Freshness follows Git HEAD, so **any** commit makes the graph `stale`, even one that touches no code. `truss graphify update` is incremental (it re-reads only what changed), and `truss continue` tells the agent to run it.

`graphify-out/` is generated output. TRUSS does not edit your `.gitignore` and does not check whether it is ignored: decide whether to commit it or ignore it. If you commit it, that commit moves HEAD, so the graph is `stale` until the next `truss graphify update`.

## Commands

```bash
truss graphify
truss graphify bootstrap
truss graphify update
```

Bootstrap uses the Graphify CLI to build a code graph. Update refreshes an existing graph. TRUSS does not install Graphify or silently change its version.

`bootstrap`, and `update` when there is no graph yet, run `graphify extract . --code-only`: it indexes the code only and calls no language model. `update` with a graph runs `graphify update .`. When the command fails, `truss graphify` prints it with the error Graphify gave, cut to its last 12 lines (a Python traceback ends with the message that matters), and a corrupt `graphify-out/graph.json` is fixed the way Graphify says: delete the file and run `bootstrap` again. Only when your Graphify does not know `extract` (an older release) does TRUSS run the older form, `graphify . --no-viz`, and then it prints that command instead.

## Failure semantics

When optional, missing/stale/unready Graphify does not block TRUSS and the agent must fall back to native repository exploration. While the agent implements, `truss continue` ends with a **Code graph** section that says which case it is in: use the graph when it is fresh, and what to run when it is stale, missing or damaged. It is a report: `continue` never stops, and `truss doctor` and `truss graphify` are what fail when a required Graphify is not ready. When required, the same states block Graphify-dependent workflow and `truss graphify` returns a non-zero exit code.

Graphify's current upstream CLI supports local code graph extraction, `graphify update .`, and produces `graphify-out/graph.json`. See the official Graphify repository for installation and CLI details.
