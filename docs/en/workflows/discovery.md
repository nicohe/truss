# Discovery (Grill)

Discovery is the work before the spec: turning an unclear idea into decisions, so that your agent does not have to invent requirements when it writes the OpenSpec artifacts. It is done with a **Grill** round, a short conversation in which the agent asks and you answer. TRUSS runs nothing here: Grill is a skill your agent follows, step 2 of the [lifecycle](lifecycle.md).

## When to do it, and when to skip it

Do it when:

- requirements are ambiguous;
- important constraints, or the behavior that would show the change works, are unknown;
- several materially different designs are plausible.

Skip it when the change is trivial and already has clear acceptance criteria. `truss continue` says "Use Grill first if material ambiguity remains"; whether it remains is a judgment for you and your agent, not something TRUSS decides.

## Two skills, one way to choose

| You start from | Skill | What it does first |
|---|---|---|
| An idea, a feature request, a bug or a design question | `grill-me` | reads only the project context it needs, then looks for the unknowns that could change behavior, scope, architecture, risk or verification |
| Documents: requirements, a proposal, a ticket, an ADR, a diagram or examples | `grill-with-docs` | reads the documents before asking anything, then asks only what they leave open |

The rule the agent follows, in the `grill` workflow, is: if source documents exist, use `grill-with-docs`; otherwise use `grill-me`. When you start from documents, name them in the request: *Use the `grill-with-docs` skill on `docs/retry-proposal.md`, then write the OpenSpec artifacts.* If you name none, the agent should ask which to use.

`grill-with-docs` reads with care: a proposal is not automatically a requirement, example code is illustrative unless it says otherwise, and existing behavior is evidence, not necessarily the behavior you want.

## What you do

You answer. The agent asks focused questions in small batches and prefers questions that settle a decision ("retry only on network errors, or on any failure?") over open-ended ones. It keeps facts, assumptions, proposals and open questions apart.

The decisions are yours. The agent must not silently decide product requirements, nor turn an implementation preference into a requirement. If you do not know an answer, say so: it goes into the result as an unresolved question instead of being guessed.

## When a technical question blocks a decision

If the answer depends on evidence and not on opinion (how a library behaves, whether an API can do something, what an approach costs), the agent uses the `prototype` skill for that one question. It states the question, sets a boundary and success criteria, builds the smallest throwaway experiment and records what it found and its limits. The prototype is evidence, not the implementation: its code is discarded unless it is deliberately promoted.

## How it ends

The agent stops when another agent could write the spec without inventing requirements. The durable decisions and the acceptance behavior then move into the active spec, and are not kept in two places: the spec is the one that lasts (see [durable vs ephemeral state](../concepts/durable-vs-ephemeral.md)).

## What it produces

A concise result with these fields, from both skills: the goal; what is in and out of scope; the observable acceptance behavior; constraints; decisions made; assumptions; unresolved questions; relevant risks; and a suggested next step, either a prototype or the spec.

`grill-with-docs` adds three that come from working with documents: the sources of the important statements, the contradictions it found and how each was resolved or left open, and what it took as a proposal or an example and not as a requirement.

The shape is the same whichever skill was used, so the session that writes the spec can start from it even when a different session did the asking (see [who does what](../concepts/who-does-what.md)).

## Where the skills and the workflow are

They live in the TRUSS installation: `skills/grill-me.SKILL.md`, `skills/grill-with-docs.SKILL.md`, `skills/prototype.SKILL.md` and `workflows/grill.md`. In the quick start layout they are under `.truss/.truss/`, and `truss skills` lists the skills. See the [skills overview](../skills/overview.md).
