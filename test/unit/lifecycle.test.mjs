import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { LifecycleError, readLifecycleState, slugifyChange, writeLifecycleState } from '../../lib/lifecycle.mjs';
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
      (e) => e instanceof LifecycleError && e.exitCode === 2 && /Invalid TRUSS state file/.test(e.message),
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
