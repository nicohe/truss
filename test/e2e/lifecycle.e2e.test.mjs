import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { executable, fakeBin, fakeGraphify, posix, run, validConfig, workspace } from './helpers.mjs';

function fakeStatefulOpenSpec(root, { initialized = false } = {}) {
  const dir = fakeBin(root);
  executable(
    dir,
    'openspec',
    `\
if [ "${'$'}{1:-}" = "--version" ]; then echo "1.13.2"; exit 0; fi
if [ "${'$'}{1:-}" = "init" ]; then
  mkdir -p openspec/specs openspec/changes
  [ -f openspec/config.yaml ] || printf "schema: spec-driven\\n" > openspec/config.yaml
  exit 0
fi
if [ "${'$'}{1:-}" = "new" ] && [ "${'$'}{2:-}" = "change" ]; then
  name="${'$'}{3}"
  mkdir -p "openspec/changes/${'$'}name/specs"
  printf "# Proposal\\n" > "openspec/changes/${'$'}name/proposal.md"
  printf '{"change":"%s"}\\n' "${'$'}name"
  exit 0
fi
if [ "${'$'}{1:-}" = "status" ]; then
  name=""
  prev=""
  for arg in "${'$'}@"; do
    if [ "${'$'}prev" = "--change" ]; then name="${'$'}arg"; break; fi
    prev="${'$'}arg"
  done
  base="openspec/changes/${'$'}name"
  if [ -f "${'$'}base/.complete" ]; then
    printf '%s\\n' '{"artifacts":[{"id":"proposal","status":"done"},{"id":"specs","status":"done"},{"id":"design","status":"done"},{"id":"tasks","status":"done"}],"applyRequires":["tasks"],"isPlanningComplete":true,"isComplete":true}'
  elif [ -f "${'$'}base/.planning-complete" ]; then
    printf '%s\\n' '{"artifacts":[{"id":"proposal","status":"done"},{"id":"specs","status":"done"},{"id":"design","status":"done"},{"id":"tasks","status":"done"}],"applyRequires":["tasks"],"isPlanningComplete":true,"isComplete":false}'
  else
    printf '%s\\n' '{"artifacts":[{"id":"proposal","status":"ready"},{"id":"specs","status":"blocked"},{"id":"design","status":"blocked"},{"id":"tasks","status":"blocked"}],"applyRequires":["tasks"],"isPlanningComplete":false,"isComplete":false}'
  fi
  exit 0
fi
exit 0`,
  );
  if (initialized) {
    fs.mkdirSync(path.join(root, 'openspec', 'specs'), { recursive: true });
    fs.mkdirSync(path.join(root, 'openspec', 'changes'), { recursive: true });
    fs.writeFileSync(path.join(root, 'openspec', 'config.yaml'), 'schema: spec-driven\n');
  }
  return dir;
}

function configWithVerifyMarker() {
  return validConfig.replace(
    '    - node -e "process.exit(0)"',
    "    - node -e \"require('fs').writeFileSync('verified.marker','ok')\"",
  );
}

test('E2E: new workspace completes init -> new -> planning -> implementation -> verify -> completion', posix, () => {
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

test('E2E: existing OpenSpec project is adopted without changing durable files', posix, () => {
  const root = workspace({ config: validConfig });
  const bin = fakeStatefulOpenSpec(root, { initialized: true });
  fs.writeFileSync(path.join(root, 'openspec', 'specs', 'existing.md'), '# Existing contract\n');
  const before = fs.readFileSync(path.join(root, 'openspec', 'specs', 'existing.md'), 'utf8');
  const result = run(root, ['init'], { binDirs: [bin] });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /adopted/);
  assert.equal(fs.readFileSync(path.join(root, 'openspec', 'specs', 'existing.md'), 'utf8'), before);
});

test('E2E: Graphify can be enabled after project adoption without blocking when optional', posix, () => {
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
