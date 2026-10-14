# Skill: retro

## Purpose
Look back over a coding session and propose improvements to the environment the agent works in, so the next run goes better. It changes the environment, not the code.

## Use when
A session was harder than it should have been: the agent searched too long for something, repeated a mistake a tool could have caught, or needed information it could not reach. Ask for it; TRUSS never does.

## Do not use when
- The session was smooth: there is little to learn from it.
- You want a verdict on the code the session produced: use `code-review`.

## Inputs
The record of the session (the current one, unless the user names another), the project's guidance files (`AGENTS.md`), `verification.commands` in `.truss/config.yaml`, and the project's own checks and CI workflow.

## Procedure
1. Read the session record and list the moments where the agent struggled.
2. For each moment, find the cause in the environment and place it in one category:
   - **Navigation:** the agent took long to find a file or fact. Fix: a pointer from a file it already reads.
   - **Automated checks:** the agent made a mistake a tool could have caught. First read what the project already runs (`verification.commands`, its scripts, its CI). If a check exists but is not part of `verification.commands`, or is broken, the finding is to connect or repair it, not to invent another. A project with no deterministic check at all is a finding by itself.
   - **Standards:** the reviewer missed a mistake. A mechanical rule (a banned API, an import shape, where a file goes) becomes a deterministic check, preferably in `verification.commands`. Only a judgement call that no tool can decide becomes written guidance, and it goes where the reviewer reads, not in `AGENTS.md`.
   - **Guidance size:** `AGENTS.md` is large or full of steering. Fix: move rules to checks or standards, and leave pointers.
   - **Tool economy:** a tool call was expensive for what it returned. Fix: streamline or replace the tool.
   - **No-ops:** lines in a guidance file that change nothing the agent does. Fix: delete them.
   - **Information access:** the agent lacked information it could not reach. Fix: widen its access, for example by writing a log to a file.
3. Rank the candidates by severity and present them. For each one give the moment in the session, the category, the proposed fix and the file it goes in.
4. Wait for the user to choose. Change nothing until they do.

## Rules
- Every candidate must trace to a specific moment in the session. If it cannot, discard it: generic advice to fill a category is noise.
- A recurring mistake does not earn a line in `AGENTS.md`: that file is loaded in every session, whether it applies or not. The fix is a check, or a standard the reviewer reads.
- Standards belong to the reviewer, who receives a diff and has room to apply them, not to the implementer, who is busy exploring and debugging.
- A proposed check is code. Try it on the repository before it is allowed to block a merge.
- This skill sees one session. It cannot tell that an old rule now fires too often; say so instead of claiming to prune.
- It is not a memory: it records nothing about what happened. It changes the environment so the mistake cannot happen again.
- Write what you propose in the style of `writing-for-agents`.
