import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { getTaskProgress, phaseFor } from '../../lib/lifecycle.mjs';
import { evaluateTasksGate } from '../../lib/tasks-gate.mjs';
import { fakeOpenSpec, fakeStatefulOpenSpec, workspace } from '../integration/helpers.mjs';
import { cleanup } from './helpers.mjs';

const cfg = (mode = 'block', components = {}) => ({ verification: { tasks_complete: mode }, components });

function withEnv(vars, fn) {
  const saved = Object.fromEntries(Object.keys(vars).map((k) => [k, process.env[k]]));
  Object.assign(process.env, vars);
  try {
    return fn();
  } finally {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

// A project with an initialized (fake, real-shaped) OpenSpec and an active change.
function project(tasks, { active = true, component = null } = {}) {
  const root = workspace({ config: null });
  const bin = fakeStatefulOpenSpec(root, { initialized: true });
  const change = path.join(root, 'openspec', 'changes', 'add-retry');
  fs.mkdirSync(change, { recursive: true });
  if (tasks !== null) fs.writeFileSync(path.join(change, 'tasks.md'), tasks);
  if (active) {
    fs.mkdirSync(path.join(root, '.truss'), { recursive: true });
    fs.writeFileSync(path.join(root, '.truss', 'state.json'), JSON.stringify({ change: 'add-retry', component }));
  }
  return { root, env: { TRUSS_OPENSPEC_PATH: path.join(bin, 'openspec') } };
}
const withProject = (tasks, options, fn) => {
  const { root, env } = project(tasks, options);
  try {
    withEnv(env, () => fn(root));
  } finally {
    cleanup(root);
  }
};

test('off (the default) does nothing', () => {
  assert.deepEqual(evaluateTasksGate('/nonexistent', { verification: {} }), {
    mode: 'off',
    status: 'skipped',
    blocking: false,
  });
});

test('open tasks are a violation; it blocks only in block mode and lists what is left', () => {
  withProject('## A\n- [x] one\n- [ ] two\n- [ ] three\n', undefined, (root) => {
    const block = evaluateTasksGate(root, cfg('block'));
    assert.equal(block.status, 'violation');
    assert.equal(block.blocking, true);
    assert.equal(block.change, 'add-retry');
    assert.deepEqual([block.total, block.complete], [3, 1]);
    assert.deepEqual(
      block.remaining.map((t) => t.description),
      ['two', 'three'],
    );
    const warn = evaluateTasksGate(root, cfg('warn'));
    assert.equal(warn.status, 'violation');
    assert.equal(warn.blocking, false);
  });
});

test('all tasks checked off passes', () => {
  withProject('- [x] one\n- [X] two\n', undefined, (root) => {
    const r = evaluateTasksGate(root, cfg());
    assert.equal(r.status, 'passed');
    assert.equal(r.blocking, false);
    assert.deepEqual(r.remaining, []);
  });
});

test('no active change means there is nothing to check', () => {
  withProject('- [ ] one\n', { active: false }, (root) => {
    assert.equal(evaluateTasksGate(root, cfg()).status, 'no_active_change');
  });
});

test('unknown progress never blocks: no tasks, no tasks.md, missing OpenSpec, corrupt state', () => {
  withProject('# no checkboxes here\n', undefined, (root) => {
    const empty = evaluateTasksGate(root, cfg());
    assert.equal(empty.status, 'unknown');
    assert.match(empty.reason, /no tasks/);
    assert.equal(empty.blocking, false);
  });
  withProject(null, undefined, (root) => {
    const r = evaluateTasksGate(root, cfg());
    assert.equal(r.status, 'unknown');
    assert.equal(r.blocking, false);
  });
  withProject('- [ ] one\n', undefined, (root) => {
    const missing = withEnv({ TRUSS_OPENSPEC_PATH: '', PATH: '' }, () => evaluateTasksGate(root, cfg()));
    assert.equal(missing.status, 'unknown');
    assert.match(missing.reason, /not installed/);
    fs.writeFileSync(path.join(root, '.truss', 'state.json'), '{not json');
    const corrupt = evaluateTasksGate(root, cfg());
    assert.equal(corrupt.status, 'unknown');
    assert.match(corrupt.reason, /Invalid TRUSS state file/);
    assert.equal(corrupt.blocking, false);
  });
});

test('an OpenSpec that does not report task progress is unknown, not complete', () => {
  const root = workspace({ config: null });
  try {
    const bin = fakeOpenSpec(root); // prints nothing for `instructions apply`
    fs.mkdirSync(path.join(root, '.truss'), { recursive: true });
    fs.writeFileSync(path.join(root, '.truss', 'state.json'), JSON.stringify({ change: 'add-retry' }));
    const r = withEnv({ TRUSS_OPENSPEC_PATH: path.join(bin, 'openspec') }, () => evaluateTasksGate(root, cfg()));
    assert.equal(r.status, 'unknown');
    assert.equal(r.blocking, false);
  } finally {
    cleanup(root);
  }
});

test('getTaskProgress reads OpenSpec task progress and reports unavailability', () => {
  withProject('- [x] a\n- [ ] b\n', undefined, (root) => {
    const p = getTaskProgress(root, cfg(), 'add-retry');
    assert.equal(p.available, true);
    assert.deepEqual([p.total, p.complete, p.remaining], [2, 1, 1]);
    assert.deepEqual(p.tasks, [
      { id: '1', description: 'a', done: true },
      { id: '2', description: 'b', done: false },
    ]);
    const none = withEnv({ TRUSS_OPENSPEC_PATH: '', PATH: '' }, () => getTaskProgress(root, cfg(), 'add-retry'));
    assert.equal(none.available, false);
  });
});

test('phase: complete only when planning is done and every task is checked off', () => {
  const planned = { isPlanningComplete: true };
  const progress = (total, remaining) => ({ available: true, total, complete: total - remaining, remaining });
  assert.equal(phaseFor({ isPlanningComplete: false }, progress(3, 0)), 'spec');
  assert.equal(phaseFor(planned, progress(3, 2)), 'implementation');
  assert.equal(phaseFor(planned, progress(3, 0)), 'complete');
  assert.equal(phaseFor(planned, progress(0, 0)), 'implementation', 'a change with no tasks is not complete');
  assert.equal(phaseFor(planned, { available: false }), 'implementation', 'unknown progress is never complete');
  assert.equal(phaseFor(planned, null), 'implementation');
});
