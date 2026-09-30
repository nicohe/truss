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
  assert.ok(fs.existsSync(path.join(root, 'openspec', 'changes', 'add-retry-policy', 'proposal.md')));
  const state = JSON.parse(fs.readFileSync(path.join(root, '.truss', 'state.json'), 'utf8'));
  assert.equal(state.change, 'add-retry-policy');
  assert.equal(state.phase, 'spec');

  result = run(root, ['continue'], { binDirs: [bin] });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /proposal/);
  assert.match(result.stdout, /Use Grill first/);

  const change = path.join(root, 'openspec', 'changes', 'add-retry-policy');
  fs.writeFileSync(
    path.join(change, 'specs', 'retry.md'),
    'Given retryable failure\nWhen retrying\nThen apply policy\n',
  );
  fs.writeFileSync(path.join(change, 'design.md'), '# Design\n');
  fs.writeFileSync(path.join(change, 'tasks.md'), '- [ ] implement retry\n');
  fs.writeFileSync(path.join(change, '.planning-complete'), '');

  result = run(root, ['status'], { binDirs: [bin] });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Phase\s+implementation/);
  result = run(root, ['continue'], { binDirs: [bin] });
  assert.match(result.stdout, /execute-change\.md/);
  assert.match(result.stdout, /BDD\/TDD/);

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

  fs.writeFileSync(path.join(change, 'tasks.md'), '- [x] implement retry\n');
  fs.writeFileSync(path.join(change, '.complete'), '');
  result = run(root, ['continue'], { binDirs: [bin] });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /code review and OpenSpec verification\/archive/);
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
