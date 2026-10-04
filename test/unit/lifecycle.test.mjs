import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {
  describeOpenChange,
  LifecycleError,
  openChanges,
  pickUpCommand,
  readLifecycleState,
  shortTaskTitle,
  slugifyChange,
  useCommand,
  writeLifecycleState,
} from '../../lib/lifecycle.mjs';
import { cleanup, tempDir } from './helpers.mjs';

test('slugifyChange creates OpenSpec-safe change names', () =>
  assert.equal(slugifyChange(' Add Retry Policy! '), 'add-retry-policy'));
test('slugifyChange returns empty slug when no safe characters remain', () => assert.equal(slugifyChange('!!!'), ''));
test('lifecycle state defaults to no active change', () => {
  const d = tempDir();
  try {
    assert.deepEqual(readLifecycleState(d), {});
  } finally {
    cleanup(d);
  }
});
test('lifecycle state round-trips', () => {
  const d = tempDir();
  try {
    const s = { change: 'x', component: 'api', phase: 'spec', path: 'openspec/changes/x' };
    writeLifecycleState(d, s);
    assert.deepEqual(readLifecycleState(d), s);
    assert.ok(fs.existsSync(path.join(d, '.truss/state.json')));
  } finally {
    cleanup(d);
  }
});
test('lifecycle state write leaves no temp files behind', () => {
  const d = tempDir();
  try {
    writeLifecycleState(d, { change: 'x' });
    writeLifecycleState(d, { change: 'y' });
    assert.deepEqual(fs.readdirSync(path.join(d, '.truss')), ['state.json']);
    assert.equal(readLifecycleState(d).change, 'y');
  } finally {
    cleanup(d);
  }
});
test('lifecycle state with invalid JSON raises LifecycleError with exit code 2', () => {
  const d = tempDir();
  try {
    fs.mkdirSync(path.join(d, '.truss'), { recursive: true });
    fs.writeFileSync(path.join(d, '.truss', 'state.json'), '{not json');
    assert.throws(
      () => readLifecycleState(d),
      (e) => e instanceof LifecycleError && e.exitCode === 2 && /Invalid TRUSS state file.*Delete it/.test(e.message),
    );
  } finally {
    cleanup(d);
  }
});
test('lifecycle state that is empty is also invalid', () => {
  const d = tempDir();
  try {
    fs.mkdirSync(path.join(d, '.truss'), { recursive: true });
    fs.writeFileSync(path.join(d, '.truss', 'state.json'), '');
    assert.throws(() => readLifecycleState(d), LifecycleError);
  } finally {
    cleanup(d);
  }
});
test('slugifyChange collapses separators and trims dashes', () => {
  assert.equal(slugifyChange('  --Add   retry__policy--  '), 'add-retry-policy');
  assert.equal(slugifyChange('Añadir política de reintentos'), 'anadir-politica-de-reintentos');
  assert.equal(slugifyChange('Über café'), 'uber-cafe');
});

const makeChange = (root, ...segments) => fs.mkdirSync(path.join(root, ...segments), { recursive: true });

test('openChanges lists the project, then each component with its own openspec/, and leaves out the archive', () => {
  const d = tempDir();
  try {
    for (const change of ['b-change', 'a-change', 'archive/2026-09-30-old', '.hidden']) {
      makeChange(d, 'openspec', 'changes', ...change.split('/'));
    }
    fs.writeFileSync(path.join(d, 'openspec', 'changes', 'notes.md'), 'not a change');
    makeChange(d, 'apps', 'api', 'openspec', 'changes', 'api-change');
    makeChange(d, 'apps', 'web');
    const config = { components: { api: { path: './apps/api' }, web: { path: './apps/web' } } };
    assert.deepEqual(openChanges(d, config), [
      { change: 'a-change', component: null },
      { change: 'b-change', component: null },
      { change: 'api-change', component: 'api' },
    ]);
  } finally {
    cleanup(d);
  }
});

test('openChanges lists a folder once, even when a component is the project root', () => {
  const d = tempDir();
  try {
    makeChange(d, 'openspec', 'changes', 'add-retry');
    assert.deepEqual(openChanges(d, { components: { root: { path: '.' } } }), [
      { change: 'add-retry', component: null },
    ]);
  } finally {
    cleanup(d);
  }
});

test('openChanges is empty without an openspec/ folder, and skips what it cannot read', () => {
  const d = tempDir();
  try {
    assert.deepEqual(openChanges(d, {}), []);
    assert.deepEqual(openChanges(d, { components: {} }), []);
    makeChange(d, 'openspec', 'changes', 'add-retry');
    makeChange(d, 'apps', 'broken', 'openspec');
    fs.writeFileSync(path.join(d, 'apps', 'broken', 'openspec', 'changes'), 'not a folder');
    const config = { components: { ghost: { path: './apps/ghost' }, broken: { path: './apps/broken' } } };
    assert.deepEqual(openChanges(d, config), [{ change: 'add-retry', component: null }]);
  } finally {
    cleanup(d);
  }
});

test('the open-change wording: the command to run, and how a change is named', () => {
  assert.equal(useCommand('add-retry'), 'truss use add-retry');
  assert.equal(useCommand('add-retry', 'api'), 'truss use add-retry --component api');
  assert.equal(describeOpenChange({ change: 'add-retry', component: null }), 'add-retry');
  assert.equal(describeOpenChange({ change: 'add-retry', component: 'api' }), 'add-retry (component api)');
  assert.equal(pickUpCommand([{ change: 'add-retry', component: 'api' }]), 'truss use add-retry --component api');
  assert.equal(
    pickUpCommand([
      { change: 'a', component: null },
      { change: 'b', component: null },
    ]),
    'truss use <change>',
  );
});

test('shortTaskTitle keeps a short task and cuts a long one to a single line with an ellipsis', () => {
  assert.deepEqual(shortTaskTitle('1.2 Add tests'), { text: '1.2 Add tests', cut: false });
  assert.deepEqual(shortTaskTitle('a\n  b\tc'), { text: 'a b c', cut: false });
  assert.deepEqual(shortTaskTitle(undefined), { text: '', cut: false });
  const exact = 'x'.repeat(80);
  assert.equal(shortTaskTitle(exact).cut, false);
  const long = shortTaskTitle(`${'word '.repeat(40)}end`);
  assert.equal(long.cut, true);
  assert.ok(long.text.length <= 80, long.text);
  assert.ok(long.text.endsWith('…'));
  assert.ok(!long.text.endsWith(' …'), 'no space before the ellipsis');
});
