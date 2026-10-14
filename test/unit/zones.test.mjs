import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { zoneMix } from '../../lib/zones.mjs';
import { cleanup, tempDir, write } from './helpers.mjs';

const git = (cwd, ...args) => {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
};

function repo() {
  const root = tempDir('truss-zones-');
  git(root, 'init', '-q');
  git(root, 'config', 'user.email', 'truss@example.invalid');
  git(root, 'config', 'user.name', 'TRUSS Test');
  write(root, 'src/a.ts', 'a\n');
  write(root, 'openspec/changes/x/tasks.md', '- [ ] one\n');
  write(root, 'openspec/changes/x/specs/s/spec.md', 'spec\n');
  git(root, 'add', '-A');
  git(root, 'commit', '-qm', 'base');
  return root;
}

test('a clean tree, or changes in one zone only, are not a mix', () => {
  const root = repo();
  try {
    assert.equal(zoneMix(root), null);
    fs.appendFileSync(path.join(root, 'src', 'a.ts'), 'more\n');
    write(root, 'src/new.ts', 'new\n');
    assert.equal(zoneMix(root), null, 'code only');
    git(root, 'add', '-A');
    git(root, 'commit', '-qm', 'code');
    fs.appendFileSync(path.join(root, 'openspec/changes/x/specs/s/spec.md'), 'more\n');
    assert.equal(zoneMix(root), null, 'specs only');
  } finally {
    cleanup(root);
  }
});

test('uncommitted changes in both zones are listed, staged or not, untracked or not', () => {
  const root = repo();
  try {
    fs.appendFileSync(path.join(root, 'openspec/changes/x/specs/s/spec.md'), 'more\n');
    write(root, 'src/new.ts', 'new\n');
    write(root, 'src/deep/er/new2.ts', 'new\n');
    git(root, 'add', 'src/new.ts');
    assert.deepEqual(zoneMix(root), {
      specs: ['openspec/changes/x/specs/s/spec.md'],
      code: ['src/deep/er/new2.ts', 'src/new.ts'],
    });
  } finally {
    cleanup(root);
  }
});

test('tasks.md, the archive folder and .truss are in neither zone', () => {
  const root = repo();
  try {
    write(root, 'src/new.ts', 'new\n');
    fs.appendFileSync(path.join(root, 'openspec/changes/x/tasks.md'), '- [x] two\n');
    write(root, 'openspec/changes/archive/2026-10-13-x/specs/s/spec.md', 'archived\n');
    write(root, 'packages/api/openspec/changes/archive/y/proposal.md', 'archived\n');
    write(root, '.truss/verification/latest.json', '{}\n');
    assert.equal(zoneMix(root), null, 'only code remains');
    write(root, 'packages/api/openspec/specs/s/spec.md', 'spec\n');
    assert.deepEqual(zoneMix(root).specs, ['packages/api/openspec/specs/s/spec.md'], 'an openspec/ at any depth');
  } finally {
    cleanup(root);
  }
});

test('a rename across zones counts both paths, and a folder outside a work tree gives null', () => {
  const root = repo();
  try {
    git(root, 'mv', 'src/a.ts', 'src/b.ts');
    fs.appendFileSync(path.join(root, 'openspec/changes/x/specs/s/spec.md'), 'more\n');
    assert.deepEqual(zoneMix(root).code, ['src/a.ts', 'src/b.ts']);
  } finally {
    cleanup(root);
  }
  const outside = tempDir('truss-zones-nogit-');
  try {
    assert.equal(zoneMix(outside), null);
  } finally {
    cleanup(outside);
  }
});
