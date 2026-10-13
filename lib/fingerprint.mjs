import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

// A fingerprint of the files Git sees in the project: what `truss verify` was looking at, and what is there now.
//
// It is the hash of every (path, content id) pair, so it changes when a file is edited, added or removed, committed
// or not, and does not change when the same content is staged or committed. It only reads: `git hash-object`
// without `-w` computes an id and writes no object, and nothing in the work tree is touched.
//
// `.truss/` is left out because it holds the evidence itself, and `openspec/` because ticking a task or fixing a
// spec after a verify is normal and is not the code. What Git ignores is out by definition.

const PATHSPEC = ['--', '.', ':(exclude).truss', ':(exclude,glob)**/openspec/**'];

const git = (cwd, args, input) => spawnSync('git', args, { cwd, encoding: 'utf8', input, maxBuffer: 1 << 28 });
const entries = (result) => result.stdout.split('\0').filter(Boolean);

// What kind of thing is at `file`: 'gone', 'directory' (a submodule), 'link' or 'file'.
function kindOf(cwd, file) {
  try {
    const stat = fs.lstatSync(path.join(cwd, file));
    return stat.isDirectory() ? 'directory' : stat.isSymbolicLink() ? 'link' : 'file';
  } catch {
    return 'gone';
  }
}

// The ids of many regular files with one `git hash-object` process: one process per file took seconds for a few
// thousand files. A name with a line break cannot go through `--stdin-paths`, and neither can a batch that fails
// (a file removed meanwhile), so those are asked one at a time.
function hashFiles(cwd, files) {
  const ids = new Map();
  const batchable = files.filter((file) => !/[\r\n]/.test(file));
  if (batchable.length) {
    const result = git(cwd, ['hash-object', '--stdin-paths'], `${batchable.join('\n')}\n`);
    const lines = result.status === 0 ? result.stdout.split('\n').filter(Boolean) : [];
    if (lines.length === batchable.length) for (const [i, file] of batchable.entries()) ids.set(file, lines[i]);
  }
  for (const file of files) {
    if (ids.has(file)) continue;
    const result = git(cwd, ['hash-object', '--', file]);
    ids.set(file, result.status === 0 ? result.stdout.trim() : null);
  }
  return ids;
}

function contentIds(cwd, files) {
  const ids = new Map();
  const regular = [];
  for (const file of files) {
    const kind = kindOf(cwd, file);
    if (kind === 'gone') ids.set(file, null);
    // A directory here is a submodule; the id the index holds for it is the one to keep.
    else if (kind === 'directory') ids.set(file, undefined);
    else if (kind === 'link') {
      const result = git(cwd, ['hash-object', '--stdin'], fs.readlinkSync(path.join(cwd, file)));
      ids.set(file, result.status === 0 ? result.stdout.trim() : null);
    } else regular.push(file);
  }
  for (const [file, id] of hashFiles(cwd, regular)) ids.set(file, id);
  return ids;
}

/**
 * `{ fingerprint, files, ids }` (`ids` maps each path to its content id), or `null` when Git cannot say (not a work
 * tree, or Git failed).
 */
export function workingTreeFingerprint(projectRoot) {
  const staged = git(projectRoot, ['ls-files', '-s', '-z', ...PATHSPEC]);
  if (staged.status !== 0) return null;

  const ids = new Map();
  for (const entry of entries(staged)) {
    const [meta, file] = entry.split('\t');
    ids.set(file, meta.split(' ')[1]);
  }
  const lists = ['-d', '-m', '-o --exclude-standard'].map((flags) =>
    git(projectRoot, ['ls-files', ...flags.split(' '), '-z', ...PATHSPEC]),
  );
  if (lists.some((list) => list.status !== 0)) return null;
  const [deleted, modified, untracked] = lists.map(entries);

  const gone = new Set(deleted);
  for (const file of gone) ids.delete(file);
  const toRead = [...new Set([...modified, ...untracked])].filter((file) => !gone.has(file));
  for (const [file, id] of contentIds(projectRoot, toRead)) {
    if (id === null) ids.delete(file);
    else if (id !== undefined) ids.set(file, id);
  }

  const lines = [...ids].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([file, id]) => `${id} ${file}`);
  return {
    fingerprint: createHash('sha256').update(lines.join('\n')).digest('hex'),
    files: ids.size,
    ids: Object.fromEntries(ids),
  };
}

/** Which files differ between two `ids` maps: `{ changed, added, removed }`, each sorted. */
export function diffIds(before, now) {
  const changed = [];
  const added = [];
  for (const [file, id] of Object.entries(now)) {
    if (!(file in before)) added.push(file);
    else if (before[file] !== id) changed.push(file);
  }
  const removed = Object.keys(before).filter((file) => !(file in now));
  return { changed: changed.sort(), added: added.sort(), removed: removed.sort() };
}
