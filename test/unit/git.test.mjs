import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { currentBranch, gitPlace, headCommit, isAncestor, localBranches } from '../../lib/git.mjs';
import { cleanup, tempDir, write } from './helpers.mjs';

const git = (cwd, ...args) => {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  return r.stdout.trim();
};

function repo({ commit = true } = {}) {
  const root = tempDir('truss-git-');
  git(root, 'init', '-q', '-b', 'main');
  git(root, 'config', 'user.email', 'truss@example.invalid');
  git(root, 'config', 'user.name', 'TRUSS Test');
  if (commit) {
    write(root, 'a.txt', 'a\n');
    git(root, 'add', '-A');
    git(root, 'commit', '-qm', 'base');
  }
  return root;
}

test('currentBranch names the branch, with its slashes, and is null when detached', () => {
  const root = repo();
  try {
    assert.equal(currentBranch(root), 'main');
    git(root, 'checkout', '-q', '-b', 'feat/login');
    assert.equal(currentBranch(root), 'feat/login');
    git(root, 'checkout', '-q', '--detach');
    assert.equal(currentBranch(root), null);
  } finally {
    cleanup(root);
  }
});

test('currentBranch gives the plain name when a tag has the same name', () => {
  const root = repo();
  try {
    git(root, 'tag', 'main');
    assert.equal(currentBranch(root), 'main');
  } finally {
    cleanup(root);
  }
});

test('a repository with no commit has a branch but no commit and no listed branches', () => {
  const root = repo({ commit: false });
  try {
    assert.equal(currentBranch(root), 'main');
    assert.equal(headCommit(root), null);
    assert.deepEqual([...localBranches(root)], []);
  } finally {
    cleanup(root);
  }
});

test('outside a repository, every question is null and nothing throws', () => {
  const root = tempDir('truss-nogit-');
  try {
    assert.equal(currentBranch(root), null);
    assert.equal(headCommit(root), null);
    assert.equal(localBranches(root), null);
    assert.equal(isAncestor(root, 'abcdef1'), null);
    assert.deepEqual(gitPlace(root), { branch: null, commit: null });
  } finally {
    cleanup(root);
  }
});

test('headCommit is the start of the commit id, and localBranches lists what exists', () => {
  const root = repo();
  try {
    const full = git(root, 'rev-parse', 'HEAD');
    assert.equal(headCommit(root), full.slice(0, 12));
    assert.equal(headCommit(root, 7), full.slice(0, 7));
    git(root, 'branch', 'feat/x');
    assert.deepEqual([...localBranches(root)].sort(), ['feat/x', 'main']);
    git(root, 'branch', '-D', 'feat/x');
    assert.deepEqual([...localBranches(root)], ['main']);
  } finally {
    cleanup(root);
  }
});

test('isAncestor says whether a commit is in the history of HEAD, and null when it cannot tell', () => {
  const root = repo();
  try {
    const first = headCommit(root, 40);
    write(root, 'b.txt', 'b\n');
    git(root, 'add', '-A');
    git(root, 'commit', '-qm', 'second');
    assert.equal(isAncestor(root, first), true);
    git(root, 'checkout', '-q', '-b', 'other', first);
    write(root, 'c.txt', 'c\n');
    git(root, 'add', '-A');
    git(root, 'commit', '-qm', 'other');
    git(root, 'checkout', '-q', 'main');
    assert.equal(isAncestor(root, git(root, 'rev-parse', 'other')), false);
    assert.equal(isAncestor(root, '0123456789abcdef'), null, 'unknown to this repository');
    assert.equal(isAncestor(root, '--all'), null, 'not a hex id: never passed to Git');
    assert.equal(isAncestor(root, undefined), null);
  } finally {
    cleanup(root);
  }
});
