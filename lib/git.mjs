import { spawnSync } from 'node:child_process';

// What TRUSS asks Git about where the work is: the branch, the commit, the branches that exist. It only reads, never
// writes inside `.git`, and never throws: a question Git cannot answer (not a work tree, no commit yet, Git missing)
// gives `null`, and the caller goes on without it. Always run it in the project root: in the documented layout the
// harness folder `.truss/` is a clone of its own, and its branch is not the project's.

const run = (cwd, args) => {
  try {
    const result = spawnSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 1 << 24 });
    return result.error ? null : result;
  } catch {
    return null;
  }
};

const HEADS = 'refs/heads/';

/** The branch HEAD is on, or `null` when it is detached, there is no repository, or Git cannot be run. */
export function currentBranch(cwd) {
  const result = run(cwd, ['symbolic-ref', '-q', 'HEAD']);
  const ref = result?.status === 0 ? result.stdout.trim() : '';
  return ref.startsWith(HEADS) ? ref.slice(HEADS.length) : null;
}

/** The first `length` characters of the commit HEAD points to, or `null` when there is none yet. */
export function headCommit(cwd, length = 12) {
  const result = run(cwd, ['rev-parse', '--verify', '-q', 'HEAD']);
  const id = result?.status === 0 ? result.stdout.trim() : '';
  return /^[0-9a-f]{40,64}$/.test(id) ? id.slice(0, length) : null;
}

/** The names of the local branches as a `Set`, or `null` when Git cannot list them. */
export function localBranches(cwd) {
  const result = run(cwd, ['for-each-ref', '--format=%(refname)', HEADS]);
  if (result?.status !== 0) return null;
  return new Set(
    result.stdout
      .split('\n')
      .filter((ref) => ref.startsWith(HEADS))
      .map((ref) => ref.slice(HEADS.length)),
  );
}

/**
 * Whether `commit` is in the history of HEAD: `true`, `false`, or `null` when that cannot be told (not a hex id,
 * unknown to this repository, Git missing). Only a hex id is ever passed to Git.
 */
export function isAncestor(cwd, commit) {
  if (typeof commit !== 'string' || !/^[0-9a-f]{7,64}$/.test(commit)) return null;
  const result = run(cwd, ['merge-base', '--is-ancestor', commit, 'HEAD']);
  if (!result) return null;
  if (result.status === 0) return true;
  return result.status === 1 ? false : null;
}

/** `{ branch, commit }`, each `null` when unknown. */
export function gitPlace(cwd) {
  return { branch: currentBranch(cwd), commit: headCommit(cwd) };
}
