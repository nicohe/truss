> Canonical TRUSS documentation.

# Graphify

Graphify is a codebase relationship/impact capability, not durable requirements storage. Use it when cross-module relationships or impact analysis matter. When optional and unavailable, fall back to native search, grep, LSP and runtime exploration.

This page says what TRUSS does with Graphify and what it does not, so you know what to expect. For the configuration, the states and the commands, see the [Graphify lifecycle](graphify-lifecycle.md).

## What TRUSS does, and what it does not

TRUSS **manages** the graph: `truss graphify bootstrap` builds it, `truss graphify update` refreshes it, and, while a change is being implemented, `truss continue` ends with a short **Code graph** paragraph that says whether the graph is fresh, stale or missing. That is all.

TRUSS does **not** make the agent use the graph. It never runs a Graphify query, never installs Graphify, and does not write anything into the agent's guidance or settings. An agent will search with `grep` and `find` as usual unless something tells it to query the graph. The paragraph in `continue` is that something only in the weak sense of a sentence the agent reads.

## Making an agent use the graph

That part belongs to Graphify. It has commands that set up each agent, and they **write files**. From a throwaway repository, with a throwaway home folder:

| Command | What it wrote |
|---|---|
| `graphify claude install` | a section in `CLAUDE.md` and PreToolUse hooks in `.claude/settings.json`, in the project |
| `graphify codex install` | a section in `AGENTS.md` and `.codex/hooks.json`, in the project |
| `graphify hook install` | `post-commit` and `post-checkout` hooks in `.git/hooks/` (local to your clone) and a line in `.gitattributes` that registers a merge driver for `graphify-out/graph.json` (a tracked file) |

Nothing was written to the home folder. Other agents differ, and Graphify's own help says where: `graphify devin install` writes a skill to `~/.config/devin/skills/graphify/` (your user account, not the project), while `graphify cursor install` writes `.cursor/rules/graphify.mdc` (the project). Run `graphify --help` for the list, and `graphify <agent> uninstall` to undo one.

In a repository your team shares, the project-level ones put files in front of everyone. Prefer a user-level install, or skip the installers and put one line in your [personal guidance file](../guides/shared-repo.md#guidance-for-your-agent-that-stays-with-you), for example: *Before searching the tree for callers or impact, query the graph with `graphify query`, `explain`, `path` or `affected`.*

## Asking the graph

With a graph built, these are the commands an agent (or you) can run, from Graphify's help:

```bash
graphify query "<question>"     # breadth-first search of the graph for a question
graphify explain "X"            # a node and its neighbors, in plain language
graphify path "A" "B"           # shortest path between two nodes
graphify affected "X"           # what depends on X, by reverse traversal
```

They read `graphify-out/graph.json` and call no model. A name that is not a node in the graph gives `No matching nodes found.`

## Keep `.truss/` out of the graph

Graphify indexes the code in the project, and `.truss/` is code. In a throwaway project with three code files, `graphify extract . --code-only` read **3** files when `.truss/` was ignored (through `.git/info/exclude`) and **51** when it was not, with TRUSS's own functions in the graph. Ignore `.truss/` and `graphify-out/` before you build the graph; see [use TRUSS in a shared repository](../guides/shared-repo.md#ignore-truss-without-touching-gitignore).

## The graph follows commits, not your working tree

TRUSS compares the graph with Git HEAD. In a test, the graph was `fresh` after an edit that was not committed, so it did not contain the edit, and it became `stale` only after the commit. If you work on code that is not committed yet, run `truss graphify update` yourself before you rely on the graph. If you installed Graphify's git hook, a commit also starts a background rebuild.

## When to adopt it

This is a recommendation. Graphify earns its place when the code has several layers with dependencies between them, when other modules use the one you are changing, or when changes keep breaking something nobody expected. In a small module, `grep` finds what you need and the graph adds a step to maintain. Start without it, and add it when the agent keeps missing what a change touches.

## Silence the reminder

With `integrations.graphify.enabled: false`, `truss continue` stops printing the **Code graph** paragraph. `truss doctor` still lists one line, `○ Graphify   disabled`, and counts it as an optional warning. Keep `required` at `false` when it is disabled: that pair is invalid, and the configuration check rejects `enabled: false` with `required: true`.

