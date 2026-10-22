import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { readActiveChange, refreshActiveChange, saveActiveChange } from '../../lib/lifecycle.mjs';
import { cleanup, tempDir, write } from './helpers.mjs';

const git = (cwd, ...args) => {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  return r.stdout.trim();
};

function repo({ commit = true } = {}) {
  const root = tempDir('truss-active-');
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

const record = (change, extra = {}) => ({
  change,
  title: change,
  component: null,
  phase: 'implementation',
  path: `openspec/changes/${change}`,
  updatedAt: '2026-10-22T00:00:00.000Z',
  ...extra,
});
const file = (root) => path.join(root, '.truss', 'state.json');
const stored = (root) => JSON.parse(fs.readFileSync(file(root), 'utf8'));

test('an old state.json, with no branches, is read as the active change on any branch', () => {
  const root = repo();
  try {
    write(root, '.truss/state.json', JSON.stringify(record('demo')));
    assert.deepEqual(readActiveChange(root), { state: record('demo'), branch: 'main', source: 'last' });
    git(root, 'checkout', '-q', '-b', 'feat');
    assert.equal(readActiveChange(root).state.change, 'demo');
  } finally {
    cleanup(root);
  }
});

test('with nothing recorded there is no active change', () => {
  const root = repo();
  try {
    assert.deepEqual(readActiveChange(root), { state: {}, branch: 'main', source: 'none' });
  } finally {
    cleanup(root);
  }
});

test('each branch remembers its own change, and the top level is the one made active last', () => {
  const root = repo();
  try {
    saveActiveChange(root, record('demo'));
    git(root, 'checkout', '-q', '-b', 'feat');
    assert.equal(readActiveChange(root).source, 'last', 'a branch with no entry falls back to the top level');
    saveActiveChange(root, record('other'));
    assert.equal(readActiveChange(root).state.change, 'other');
    git(root, 'checkout', '-q', 'main');
    assert.deepEqual(readActiveChange(root), { state: record('demo'), branch: 'main', source: 'branch' });
    const saved = stored(root);
    assert.equal(saved.change, 'other', 'the top level is the last one made active');
    assert.deepEqual(Object.keys(saved.branches).sort(), ['feat', 'main']);
  } finally {
    cleanup(root);
  }
});

test('a detached HEAD, or no Git, writes only the top level and keeps the map', () => {
  const root = repo();
  try {
    saveActiveChange(root, record('demo'));
    git(root, 'checkout', '-q', '--detach');
    saveActiveChange(root, record('other'));
    const saved = stored(root);
    assert.equal(saved.change, 'other');
    assert.deepEqual(Object.keys(saved.branches), ['main'], 'the entry of main is kept');
    assert.equal(readActiveChange(root).source, 'last');
  } finally {
    cleanup(root);
  }
  const plain = tempDir('truss-nogit-');
  try {
    saveActiveChange(plain, record('demo'));
    assert.deepEqual(stored(plain), record('demo'), 'no branches key without Git');
    assert.equal(readActiveChange(plain).state.change, 'demo');
  } finally {
    cleanup(plain);
  }
});

test('entries of branches that no longer exist are dropped at the next write, never the current one', () => {
  const root = repo();
  try {
    saveActiveChange(root, record('demo'));
    git(root, 'checkout', '-q', '-b', 'feat/x');
    saveActiveChange(root, record('other'));
    git(root, 'checkout', '-q', 'main');
    git(root, 'branch', '-D', 'feat/x');
    assert.deepEqual(Object.keys(stored(root).branches).sort(), ['feat/x', 'main'], 'not dropped by deleting');
    saveActiveChange(root, record('demo'));
    assert.deepEqual(Object.keys(stored(root).branches), ['main']);
  } finally {
    cleanup(root);
  }
});

test('a branch with no commit yet keeps the entry it just wrote', () => {
  const root = repo({ commit: false });
  try {
    saveActiveChange(root, record('demo'));
    assert.deepEqual(Object.keys(stored(root).branches), ['main'], 'the unborn branch is not in the list of branches');
    assert.equal(readActiveChange(root).source, 'branch');
  } finally {
    cleanup(root);
  }
});

test('a branch called __proto__ or constructor is an ordinary name', () => {
  const root = repo();
  try {
    for (const name of ['__proto__', 'constructor', 'toString']) {
      git(root, 'checkout', '-q', '-b', name);
      saveActiveChange(root, record(`for-${name.replaceAll('_', '')}`));
      assert.equal(readActiveChange(root).state.change, `for-${name.replaceAll('_', '')}`);
    }
    assert.deepEqual(Object.keys(stored(root).branches).sort(), ['__proto__', 'constructor', 'toString']);
    assert.equal(Object.getPrototypeOf(readActiveChange(root).state), Object.prototype);
  } finally {
    cleanup(root);
  }
});

test('a damaged branches map is ignored and only invalid JSON is an error', () => {
  const root = repo();
  try {
    for (const bad of [[], 'text', { main: 'nope' }, { main: { phase: 'spec' } }, null]) {
      write(root, '.truss/state.json', JSON.stringify({ ...record('demo'), branches: bad }));
      assert.deepEqual(readActiveChange(root), { state: record('demo'), branch: 'main', source: 'last' });
    }
    write(root, '.truss/state.json', '{ not json');
    assert.throws(() => readActiveChange(root), /Invalid TRUSS state file/);
    saveActiveChange(root, record('fresh'));
    assert.equal(stored(root).change, 'fresh', 'an unreadable file is replaced');
  } finally {
    cleanup(root);
  }
});

test('a phase refresh updates only the record it read, so "last made active" does not move', () => {
  const root = repo();
  try {
    saveActiveChange(root, record('demo'));
    git(root, 'checkout', '-q', '-b', 'feat');
    saveActiveChange(root, record('other'));
    git(root, 'checkout', '-q', 'main');
    // main's entry says demo; the top level says other (the last made active).
    refreshActiveChange(root, record('demo', { phase: 'complete' }), { source: 'branch', branch: 'main' });
    const saved = stored(root);
    assert.equal(saved.change, 'other', 'the top level still names the change last made active');
    assert.equal(saved.phase, 'implementation');
    assert.equal(saved.branches.main.phase, 'complete');
    assert.equal(saved.branches.feat.phase, 'implementation');
    // When the entry is also the top level, both move.
    refreshActiveChange(root, record('other', { phase: 'complete' }), { source: 'branch', branch: 'feat' });
    assert.equal(stored(root).phase, 'complete');
    // A record read from the top level moves the top level only.
    refreshActiveChange(root, record('other', { phase: 'spec' }), { source: 'last', branch: 'feat' });
    assert.equal(stored(root).phase, 'spec');
    assert.equal(stored(root).branches.feat.phase, 'complete');
  } finally {
    cleanup(root);
  }
});

test('the file stays small with many branches and leaves no temporary file', () => {
  const root = repo();
  try {
    for (let i = 0; i < 20; i += 1) {
      git(root, 'checkout', '-q', '-b', `feat-${i}`);
      saveActiveChange(root, record(`change-${i}`));
    }
    assert.equal(Object.keys(stored(root).branches).length, 20);
    assert.ok(fs.statSync(file(root)).size < 8000);
    assert.deepEqual(
      fs.readdirSync(path.join(root, '.truss')).filter((name) => name.endsWith('.tmp')),
      [],
    );
  } finally {
    cleanup(root);
  }
});
