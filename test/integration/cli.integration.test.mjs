import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fakeGraphify, fakeOpenSpec, hasAnsi, plain, posix, run, validConfig, workspace } from './helpers.mjs';

test('config: valid workspace exits 0 and prints resolved config', () => {
  const root = workspace({ config: validConfig });
  const result = run(root, ['config']);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /valid \.truss\/config\.yaml/);
  assert.match(result.stdout, /"mode": "anchored"/);
});

test('config: invalid workspace exits 2', () => {
  const root = workspace({ config: 'version: 1\nunknown: true\n' });
  const result = run(root, ['config']);
  assert.equal(result.status, 2);
  assert.match(result.stdout, /invalid config/);
  assert.match(result.stdout, /unknown property/);
});

test('verify: successful configured command exits 0 and writes evidence', () => {
  const root = workspace({ config: validConfig });
  const result = run(root, ['verify', '--trust']);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /Verification passed/);
  const evidence = JSON.parse(fs.readFileSync(path.join(root, '.truss', 'verification', 'latest.json'), 'utf8'));
  assert.equal(evidence.status, 'passed');
  assert.equal(evidence.commands.length, 1);
});

test('verify: failing command exits 1 and does not run later command', () => {
  const config = validConfig.replace(
    '    - node -e "process.exit(0)"',
    "    - node -e \"process.exit(7)\"\n    - node -e \"require('fs').writeFileSync('should-not-exist','x')\"",
  );
  const root = workspace({ config });
  const result = run(root, ['verify', '--trust']);
  assert.equal(result.status, 1);
  assert.equal(fs.existsSync(path.join(root, 'should-not-exist')), false);
  assert.match(result.stdout, /Remaining commands were not executed/);
});

test('doctor: healthy required setup exits 0 with optional Graphify fallback', posix, () => {
  const root = workspace({ config: validConfig });
  const osBin = fakeOpenSpec(root);
  const result = run(root, ['doctor'], { binDirs: [osBin] });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /TRUSS doctor passed/);
  assert.match(result.stdout, /Graphify/);
  assert.match(result.stdout, /optional/);
});

test('doctor: incompatible OpenSpec exits 1', posix, () => {
  const root = workspace({ config: validConfig });
  const osBin = fakeOpenSpec(root, { version: '2.0.0' });
  const result = run(root, ['doctor'], { binDirs: [osBin] });
  assert.equal(result.status, 1);
  assert.match(result.stdout, /unsupported_newer|unsupported newer/);
});

test('doctor: required Graphify missing exits 1', () => {
  const config = validConfig.replace('required: false', 'required: true');
  const root = workspace({ config });
  const osBin = fakeOpenSpec(root);
  const result = run(root, ['doctor'], { binDirs: [osBin] });
  assert.equal(result.status, 1);
  assert.match(result.stdout, /missing \(required; blocks\)/);
});

test('doctor: required Graphify with fresh index exits 0', posix, () => {
  const config = validConfig.replace('required: false', 'required: true');
  const root = workspace({ config });
  const osBin = fakeOpenSpec(root);
  const graphBin = fakeGraphify(root, { withIndex: true });
  const result = run(root, ['doctor'], { binDirs: [osBin, graphBin] });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /ready v0\.1\.0/);
});

test('init: adopts existing config and OpenSpec without changing either', posix, () => {
  const root = workspace({ config: validConfig });
  const osBin = fakeOpenSpec(root);
  const configBefore = fs.readFileSync(path.join(root, '.truss', 'config.yaml'), 'utf8');
  const specBefore = fs.readFileSync(path.join(root, 'openspec', 'config.yaml'), 'utf8');
  const result = run(root, ['init'], { binDirs: [osBin] });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /adopted/);
  assert.equal(fs.readFileSync(path.join(root, '.truss', 'config.yaml'), 'utf8'), configBefore);
  assert.equal(fs.readFileSync(path.join(root, 'openspec', 'config.yaml'), 'utf8'), specBefore);
});

test('init: initializes missing OpenSpec once and second run is idempotent', posix, () => {
  const root = workspace({ config: validConfig });
  const osBin = fakeOpenSpec(root, { initialized: false });
  const first = run(root, ['init'], { binDirs: [osBin] });
  assert.equal(first.status, 0, first.stderr || first.stdout);
  assert.match(plain(first.stdout), /initialized\s+with --tools none/);
  const configAfterFirst = fs.readFileSync(path.join(root, '.truss', 'config.yaml'), 'utf8');
  const specAfterFirst = fs.readFileSync(path.join(root, 'openspec', 'config.yaml'), 'utf8');
  const second = run(root, ['init'], { binDirs: [osBin] });
  assert.equal(second.status, 0, second.stderr || second.stdout);
  assert.match(plain(second.stdout), /OpenSpec\s+.*adopted/);
  assert.equal(fs.readFileSync(path.join(root, '.truss', 'config.yaml'), 'utf8'), configAfterFirst);
  assert.equal(fs.readFileSync(path.join(root, 'openspec', 'config.yaml'), 'utf8'), specAfterFirst);
});

test('output: piped stdout has no ANSI escapes by default', () => {
  const root = workspace({ config: validConfig });
  const result = run(root, ['config'], { env: { FORCE_COLOR: '', NO_COLOR: '' } });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(hasAnsi(result.stdout), false);
});

test('output: FORCE_COLOR enables color and NO_COLOR overrides it', () => {
  const root = workspace({ config: validConfig });
  const forced = run(root, ['config'], { env: { FORCE_COLOR: '1', NO_COLOR: '' } });
  assert.equal(hasAnsi(forced.stdout), true);
  const disabled = run(root, ['config'], { env: { FORCE_COLOR: '1', NO_COLOR: '1' } });
  assert.equal(hasAnsi(disabled.stdout), false);
});

test('handoff: reports a corrupt state file instead of crashing', () => {
  const root = workspace({ config: validConfig });
  fs.writeFileSync(path.join(root, '.truss', 'state.json'), '{not json');
  const result = run(root, ['handoff']);
  assert.equal(result.status, 2);
  assert.match(plain(result.stdout), /Invalid TRUSS state file/);
});

test('unknown command falls back to help', () => {
  const root = workspace({ config: validConfig });
  const result = run(root, ['constructor']);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Usage: truss <command>/);
});

test('verify trust: untrusted commands are refused non-interactively and nothing runs', () => {
  const marker = 'ran-marker';
  const config = validConfig.replace(
    '    - node -e "process.exit(0)"',
    `    - node -e "require('fs').writeFileSync('${marker}','x')"`,
  );
  const root = workspace({ config });
  const result = run(root, ['verify']);
  assert.equal(result.status, 1);
  assert.match(plain(result.stdout), /not trusted/i);
  assert.match(plain(result.stdout), /--trust/);
  assert.equal(fs.existsSync(path.join(root, marker)), false);
  assert.equal(fs.existsSync(path.join(root, '.truss', 'verification', 'latest.json')), false);
});

test('verify trust: --trust runs once and later runs need no flag', () => {
  const root = workspace({ config: validConfig });
  assert.equal(run(root, ['verify', '--trust']).status, 0);
  const again = run(root, ['verify']);
  assert.equal(again.status, 0, again.stdout);
  assert.doesNotMatch(plain(again.stdout), /not trusted/i);
});

test('verify trust: TRUSS_TRUST=1 works like --trust', () => {
  const root = workspace({ config: validConfig });
  const result = run(root, ['verify'], { env: { TRUSS_TRUST: '1' } });
  assert.equal(result.status, 0, result.stdout);
});

test('verify trust: changing the command list requires approval again', () => {
  const root = workspace({ config: validConfig });
  assert.equal(run(root, ['verify', '--trust']).status, 0);
  const changed = validConfig.replace(
    '    - node -e "process.exit(0)"',
    '    - node -e "process.exit(0)"\n    - node -e "process.exit(0)"',
  );
  fs.writeFileSync(path.join(root, '.truss', 'config.yaml'), changed);
  const result = run(root, ['verify']);
  assert.equal(result.status, 1);
  assert.match(plain(result.stdout), /not trusted/i);
});

test('verify trust: config created by init starts trusted', posix, () => {
  const root = workspace({ config: null });
  const osBin = fakeOpenSpec(root);
  assert.equal(run(root, ['init'], { binDirs: [osBin] }).status, 0);
  const result = run(root, ['verify'], { binDirs: [osBin] });
  assert.doesNotMatch(plain(result.stdout), /not trusted/i);
});

test('doctor: reports whether verification commands are trusted', () => {
  const root = workspace({ config: validConfig });
  const before = plain(run(root, ['doctor']).stdout);
  assert.match(before, /Trust\s+not trusted yet/);
  run(root, ['verify', '--trust']);
  assert.match(plain(run(root, ['doctor']).stdout), /Trust\s+commands approved/);
});
