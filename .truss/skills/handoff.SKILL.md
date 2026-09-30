# Skill: handoff

## Purpose
Transfer live work state across an agent, runtime, session, reviewer, or context boundary without copying the whole conversation.

## Use when
Responsibility or usable context changes. Do not create a handoff between every normal workflow phase.

## Include
- active change/spec path;
- current phase and first incomplete task;
- completed work;
- branch and useful commit references;
- important discoveries/decisions not yet obvious from durable artifacts;
- verification status;
- blockers;
- exact next action;
- relevant ADR/spec references.

## Exclude
Long chat history, copied source files, information already easy to retrieve, speculative notes with no bearing on continuation.

## Rule
Durable knowledge belongs in spec, ADRs, tests, or project docs. Handoff is ephemeral coordination state.
