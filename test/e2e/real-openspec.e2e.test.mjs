import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { detectOpenSpec } from '../../lib/openspec.mjs';
import { run, validConfig, workspace } from './helpers.mjs';

// Contract test against the REAL OpenSpec CLI. The fake CLIs used everywhere else are only as faithful as we
// make them; this one already caught a real divergence (OpenSpec's `isComplete` means "all artifacts exist",
// not "all tasks are done"). It is skipped when no compatible OpenSpec is installed, unless
// TRUSS_REQUIRE_REAL_OPENSPEC=1 (set by the dedicated CI job), in which case a missing CLI is a failure.
const detected = detectOpenSpec(process.cwd());
const available = detected.cli.installed && detected.compatibility.compatible;
const required = process.env.TRUSS_REQUIRE_REAL_OPENSPEC === '1';
const options = { skip: !available && !required && 'no compatible OpenSpec CLI on PATH' };
const out = (r) => r.stdout.replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g'), '');

test('contract: OpenSpec is available when the contract job requires it', () => {
  if (required)
    assert.ok(available, `a compatible OpenSpec CLI is required: ${JSON.stringify(detected.compatibility)}`);
});

test('contract: lifecycle phases and the tasks gate follow the real OpenSpec task progress', options, () => {
  const config = validConfig.replace('  commands:\n', '  tasks_complete: block\n  commands:\n');
  const root = workspace({ config });

  let r = run(root, ['init']);
  assert.equal(r.status, 0, r.stdout);
  r = run(root, ['new', 'Add retry policy']);
  assert.equal(r.status, 0, r.stdout);
  const change = path.join(root, 'openspec', 'changes', 'add-retry-policy');
  assert.match(out(run(root, ['status'])), /Phase\s+spec/);

  fs.writeFileSync(path.join(change, 'proposal.md'), '## Why\nRetries.\n');
  fs.mkdirSync(path.join(change, 'specs', 'retry'), { recursive: true });
  fs.writeFileSync(
    path.join(change, 'specs', 'retry', 'spec.md'),
    '## ADDED Requirements\n### Requirement: Retry\nThe system SHALL retry.\n#### Scenario: ok\n- **WHEN** a\n- **THEN** b\n',
  );
  fs.writeFileSync(path.join(change, 'design.md'), '## Context\nx\n');
  fs.writeFileSync(path.join(change, 'tasks.md'), '## 1. Work\n- [x] 1.1 Add the policy\n- [ ] 1.2 Add tests\n');

  // All artifacts exist, but a task is open: this is where the fake and the real CLI used to disagree.
  r = run(root, ['status']);
  assert.match(out(r), /Phase\s+implementation/);
  assert.match(out(r), /Tasks\s+1\/2 complete/);
  assert.match(out(r), /Needed to implement\s+tasks/);
  assert.match(out(run(root, ['continue'])), /first incomplete task \("1\.2 Add tests"\)/);

  r = run(root, ['verify', '--trust']);
  assert.equal(r.status, 1, r.stdout);
  assert.match(out(r), /1 of 2 task\(s\) still open/);

  fs.writeFileSync(path.join(change, 'tasks.md'), '## 1. Work\n- [x] 1.1 Add the policy\n- [x] 1.2 Add tests\n');
  assert.match(out(run(root, ['status'])), /Phase\s+complete/);
  r = run(root, ['verify', '--trust']);
  assert.equal(r.status, 0, r.stdout);
  assert.match(out(r), /all 2 task\(s\) of "add-retry-policy" are complete/);
});

test('contract: truss use goes back to a change that truss new left behind', options, () => {
  const root = workspace({ config: validConfig });
  assert.equal(run(root, ['init']).status, 0);
  assert.equal(run(root, ['new', 'Add retry policy']).status, 0);

  const second = run(root, ['new', 'Second change']);
  assert.equal(second.status, 0, second.stdout);
  assert.match(
    out(second),
    /"add-retry-policy" is still open in OpenSpec \(openspec[\\/]changes[\\/]add-retry-policy\)/,
  );
  assert.match(out(second), /Go back to it with: truss use add-retry-policy\n/);
  assert.match(out(run(root, ['status'])), /Change\s+second-change/);

  const back = run(root, ['use', 'add-retry-policy']);
  assert.equal(back.status, 0, back.stdout);
  assert.match(out(back), /Change\s+add-retry-policy/);
  assert.match(out(run(root, ['status'])), /Change\s+add-retry-policy/);

  const missing = run(root, ['use', 'nope']);
  assert.equal(missing.status, 1);
  assert.match(
    out(missing),
    /There is no open change "nope" in openspec[\\/]changes\. Open there: add-retry-policy, second-change\./,
  );
});

test('contract: with no active change, status lists what the real OpenSpec has open', options, () => {
  const root = workspace({ config: validConfig });
  assert.equal(run(root, ['init']).status, 0);
  assert.equal(run(root, ['new', 'Add retry policy']).status, 0);
  assert.equal(run(root, ['new', 'Second change']).status, 0);
  // A fresh clone or CI checkout has no state file, while OpenSpec still has both changes (and its archive/ folder).
  fs.rmSync(path.join(root, '.truss', 'state.json'));

  const status = run(root, ['status']);
  assert.equal(status.status, 0, status.stdout);
  assert.match(out(status), /No active change\.\nOpen changes\s+add-retry-policy, second-change\n/);
  assert.doesNotMatch(out(status), /archive/);
  assert.match(out(run(root, ['continue'])), /Open in OpenSpec: add-retry-policy, second-change\./);
});
