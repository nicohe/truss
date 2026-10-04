import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fakeGraphify, fakeStatefulOpenSpec, run, validConfig, workspace } from './helpers.mjs';

function configWithVerifyMarker() {
  return validConfig.replace(
    '    - node -e "process.exit(0)"',
    "    - node -e \"require('fs').writeFileSync('verified.marker','ok')\"",
  );
}

test('E2E: new workspace completes init -> new -> planning -> implementation -> verify -> completion', () => {
  const root = workspace({ config: configWithVerifyMarker() });
  const bin = fakeStatefulOpenSpec(root, { initialized: false });

  let result = run(root, ['init'], { binDirs: [bin] });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.ok(fs.existsSync(path.join(root, 'openspec', 'config.yaml')));

  result = run(root, ['new', 'Add retry policy'], { binDirs: [bin] });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const change = path.join(root, 'openspec', 'changes', 'add-retry-policy');
  assert.ok(fs.existsSync(change));
  const state = JSON.parse(fs.readFileSync(path.join(root, '.truss', 'state.json'), 'utf8'));
  assert.equal(state.change, 'add-retry-policy');
  assert.equal(state.phase, 'spec');

  result = run(root, ['continue'], { binDirs: [bin] });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /proposal/);
  assert.match(result.stdout, /Run openspec instructions proposal --change add-retry-policy for its format and path\./);
  assert.match(result.stdout, /Use Grill first/);
  assert.doesNotMatch(result.stdout, /traceable/, 'the proposal is where the decisions are written');

  // Planning: an artifact is done when its file exists, exactly as OpenSpec reports it.
  fs.writeFileSync(path.join(change, 'proposal.md'), '# Proposal\n');
  result = run(root, ['continue'], { binDirs: [bin] });
  assert.match(result.stdout, /Run openspec instructions specs --change add-retry-policy/);
  assert.match(result.stdout, /Keep every requirement traceable to a decision in the proposal, and ask before adding/);
  fs.mkdirSync(path.join(change, 'specs'), { recursive: true });
  fs.writeFileSync(
    path.join(change, 'specs', 'retry.md'),
    'Given retryable failure\nWhen retrying\nThen apply policy\n',
  );
  fs.writeFileSync(path.join(change, 'design.md'), '# Design\n');
  result = run(root, ['status'], { binDirs: [bin] });
  assert.match(result.stdout, /Phase\s+spec/, 'tasks.md is still missing, so planning is not complete');
  fs.writeFileSync(path.join(change, 'tasks.md'), '## 1. Work\n- [ ] implement retry\n- [ ] document retry\n');

  result = run(root, ['status'], { binDirs: [bin] });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Phase\s+implementation/);
  assert.match(result.stdout, /Tasks\s+0\/2 complete/);
  result = run(root, ['continue'], { binDirs: [bin] });
  assert.match(result.stdout, /execute-change\.md/);
  assert.match(result.stdout, /BDD\/TDD/);
  assert.match(result.stdout, /first incomplete task \("implement retry"\)/);

  fs.mkdirSync(path.join(root, 'src'), { recursive: true });
  fs.writeFileSync(path.join(root, 'src', 'retry.js'), 'export const retry = true;\n');
  fs.mkdirSync(path.join(root, 'tests'), { recursive: true });
  fs.writeFileSync(path.join(root, 'tests', 'retry.test.js'), '// simulated product test\n');

  // The test replaced init's default command list with its own, so it needs explicit approval.
  result = run(root, ['verify', '--trust']);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.ok(fs.existsSync(path.join(root, 'verified.marker')));
  const evidence = JSON.parse(fs.readFileSync(path.join(root, '.truss', 'verification', 'latest.json'), 'utf8'));
  assert.equal(evidence.status, 'passed');

  // Regression: one of two tasks done is still implementation. All artifacts existing does not mean done.
  fs.writeFileSync(path.join(change, 'tasks.md'), '## 1. Work\n- [x] implement retry\n- [ ] document retry\n');
  result = run(root, ['status'], { binDirs: [bin] });
  assert.match(result.stdout, /Phase\s+implementation/);
  assert.match(result.stdout, /Tasks\s+1\/2 complete/);
  result = run(root, ['continue'], { binDirs: [bin] });
  assert.match(result.stdout, /first incomplete task \("document retry"\)/);
  assert.doesNotMatch(result.stdout, /are complete/);

  fs.writeFileSync(path.join(change, 'tasks.md'), '## 1. Work\n- [x] implement retry\n- [x] document retry\n');
  result = run(root, ['status'], { binDirs: [bin] });
  assert.match(result.stdout, /Phase\s+complete/);
  result = run(root, ['continue'], { binDirs: [bin] });
  assert.equal(result.status, 0);
  assert.match(
    result.stdout,
    /code review, then openspec validate add-retry-policy and, once it passes, openspec archive add-retry-policy\./,
  );
});

test('E2E: existing OpenSpec project is adopted without changing durable files', () => {
  const root = workspace({ config: validConfig });
  const bin = fakeStatefulOpenSpec(root, { initialized: true });
  fs.writeFileSync(path.join(root, 'openspec', 'specs', 'existing.md'), '# Existing contract\n');
  const before = fs.readFileSync(path.join(root, 'openspec', 'specs', 'existing.md'), 'utf8');
  const result = run(root, ['init'], { binDirs: [bin] });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /adopted/);
  assert.equal(fs.readFileSync(path.join(root, 'openspec', 'specs', 'existing.md'), 'utf8'), before);
});

test('E2E: Graphify can be enabled after project adoption without blocking when optional', () => {
  const root = workspace({ config: validConfig.replace('enabled: true', 'enabled: false') });
  const osBin = fakeStatefulOpenSpec(root, { initialized: true });
  let result = run(root, ['doctor'], { binDirs: [osBin] });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /Graphify/);

  fs.writeFileSync(path.join(root, '.truss', 'config.yaml'), validConfig);
  result = run(root, ['doctor'], { binDirs: [osBin] });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /optional/);

  const graphBin = fakeGraphify(root, { withIndex: true });
  result = run(root, ['doctor'], { binDirs: [osBin, graphBin] });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /ready v0\.1\.0/);
});
