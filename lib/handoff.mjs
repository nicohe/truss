import { isAncestor } from './git.mjs';

// The handoff note: `truss handoff` writes the header and leaves the sections for the agent, and never overwrites a
// note that exists. The header records where the note was written, so that a later reader can be told when they are
// somewhere else.

/** The text of a new note. `place` is `{ branch, commit }`; either may be `null`. */
export function handoffNote({ change, component, phase, openspecPath, place }) {
  const branch = place.branch ?? 'unknown';
  const commit = place.commit ? `\n- Commit: ${place.commit}` : '';
  return `# Handoff: ${change}\n\n- Component: ${component || 'workspace'}\n- Phase: ${phase}\n- OpenSpec: ${openspecPath}\n- Branch: ${branch}${commit}\n\n## Completed\n\n## Discoveries\n\n## Verification\n\n## Blockers\n\n## Next action\n\n`;
}

/** The branch and the commit a note says it was written on (`null` when it does not say, or says `unknown`). */
export function readNotePlace(text) {
  const field = (name) => {
    const found = new RegExp(`^- ${name}: (\\S+)\\s*$`, 'm').exec(text);
    return found && found[1] !== 'unknown' ? found[1] : null;
  };
  return { branch: field('Branch'), commit: field('Commit') };
}

const short = (commit) => (commit ? commit.slice(0, 7) : 'an unknown commit');

/**
 * One line saying that a note was written somewhere else, or `null` when there is nothing to say. A different branch is
 * reported. On the same branch (or when one side does not know it) the note is reported only if the commit it was
 * written at is not in the history of HEAD, for example after an amend or a rebase: a new commit on the same branch is
 * normal progress. `ancestor` decides that and is replaceable in tests.
 */
export function placeMismatch(cwd, note, current, ancestor = isAncestor) {
  const here = `you are on "${current.branch ?? 'no branch'}" at ${short(current.commit)}`;
  if (note.branch && current.branch && note.branch !== current.branch)
    return `This note was written on branch "${note.branch}" at ${short(note.commit)}; ${here}.`;
  if (note.commit && ancestor(cwd, note.commit) === false)
    return `This note was written at ${short(note.commit)}, which is not in the history of HEAD (${short(current.commit)}).`;
  return null;
}
