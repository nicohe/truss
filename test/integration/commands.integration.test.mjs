import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fakeBin, fakeCli, fakeGraphify, fakeOpenSpec, plain, run, validConfig, workspace } from './helpers.mjs';

const out = (r) => plain(r.stdout);

test('help: no arguments prints usage and exits 0', () => {
  const r = run(workspace({ config: validConfig }), []);
  assert.equal(r.status, 0);
  assert.match(out(r), /Usage: truss <command>/);
  assert.match(out(r), /verify \[--trust\]/);
});

test('skills: lists installed skills and reports when none are installed', () => {
  const root = workspace({ config: validConfig });
  assert.match(out(run(root, ['skills'])), /No TRUSS skills installed/);
  fs.mkdirSync(path.join(root, '.truss', 'skills'), { recursive: true });
  fs.writeFileSync(path.join(root, '.truss', 'skills', 'grill-me.SKILL.md'), '# x');
  fs.writeFileSync(path.join(root, '.truss', 'skills', 'notes.md'), '# not a skill');
  const r = run(root, ['skills']);
  assert.match(out(r), /● grill-me/);
  assert.doesNotMatch(out(r), /notes/);
});

test('components: resolves configured components and rejects unknown ones', () => {
  const root = workspace({
    config: validConfig.replace('components: {}', 'components:\n  api:\n    path: ./apps/api'),
  });
  fs.mkdirSync(path.join(root, 'apps', 'api', 'src'), { recursive: true });
  const all = run(root, ['components']);
  assert.equal(all.status, 0, all.stdout);
  assert.match(out(all), /api/);
  assert.match(out(all), /OpenSpec\s+/);
  const one = run(root, ['components', 'api']);
  assert.equal(one.status, 0);
  const missing = run(root, ['components', 'nope']);
  assert.equal(missing.status, 2);
  assert.match(out(missing), /Unknown component/);
});

test('components: invalid config exits 2', () => {
  const r = run(workspace({ config: 'version: 1\nunknown: true\n' }), ['components']);
  assert.equal(r.status, 2);
  assert.match(out(r), /invalid config/);
});

test('graphify status: reports disabled, missing (optional) and blocking (required)', () => {
  const disabled = workspace({ config: validConfig.replace('enabled: true', 'enabled: false') });
  assert.match(out(run(disabled, ['graphify'])), /disabled/);

  const optional = workspace({ config: validConfig });
  const empty = fakeBin(optional);
  const o = run(optional, ['graphify', 'status'], { env: { PATH: empty } });
  assert.equal(o.status, 0);
  assert.match(out(o), /native fallback/);

  const required = workspace({ config: validConfig.replace('required: false', 'required: true') });
  const r = run(required, ['graphify'], { env: { PATH: fakeBin(required) } });
  assert.equal(r.status, 1);
  assert.match(out(r), /blocks/);
});

test('graphify: unknown action prints usage and exits 2', () => {
  const r = run(workspace({ config: validConfig }), ['graphify', 'wat']);
  assert.equal(r.status, 2);
  assert.match(out(r), /Usage: truss graphify/);
});

test('graphify update: does nothing when disabled', () => {
  const r = run(workspace({ config: validConfig.replace('enabled: true', 'enabled: false') }), ['graphify', 'update']);
  assert.equal(r.status, 0);
  assert.match(out(r), /disabled in config/);
});

test('graphify update: failure is non-blocking when optional and blocking when required', () => {
  const failing = { behavior: "console.error('nope'); process.exit(4);" };
  const optional = workspace({ config: validConfig });
  const o = run(optional, ['graphify', 'update'], { binDirs: [fakeGraphify(optional, failing)] });
  assert.equal(o.status, 0);
  assert.match(out(o), /Graphify update failed/);

  const required = workspace({ config: validConfig.replace('required: false', 'required: true') });
  const r = run(required, ['graphify', 'bootstrap'], { binDirs: [fakeGraphify(required, failing)] });
  assert.equal(r.status, 1);
});

test('graphify bootstrap: builds the index, records the git head and then reports ready', () => {
  const root = workspace({ config: validConfig });
  const bin = fakeGraphify(root, {
    behavior: "fs.mkdirSync('graphify-out', { recursive: true }); fs.writeFileSync('graphify-out/graph.json', '{}');",
  });
  const boot = run(root, ['graphify', 'bootstrap'], { binDirs: [bin] });
  assert.equal(boot.status, 0, boot.stdout);
  assert.match(out(boot), /graph updated/);
  assert.match(out(boot), /graphify extract/);
  const meta = JSON.parse(fs.readFileSync(path.join(root, 'graphify-out', '.truss-graphify.json'), 'utf8'));
  assert.ok(meta.gitHead);
  const status = run(root, ['graphify', 'status'], { binDirs: [bin] });
  assert.match(out(status), /ready/);
  assert.match(out(status), /Freshness\s+fresh/);
  const update = run(root, ['graphify', 'update'], { binDirs: [bin] });
  assert.match(out(update), /graphify update \./);
});

test('graphify status: an index older than the current git head is reported as stale', () => {
  const root = workspace({ config: validConfig });
  const bin = fakeGraphify(root, { withIndex: true });
  fs.writeFileSync(path.join(root, 'change.txt'), 'x');
  spawnSync('git', ['add', 'change.txt'], { cwd: root });
  spawnSync('git', ['commit', '-qm', 'next'], { cwd: root });
  const r = run(root, ['graphify', 'status'], { binDirs: [bin] });
  assert.match(out(r), /stale/);
});

test('new: usage error without a title, and a clear error without OpenSpec', () => {
  const root = workspace({ config: validConfig });
  const usage = run(root, ['new']);
  assert.equal(usage.status, 2);
  assert.match(out(usage), /Usage: truss new/);
  const noCli = run(root, ['new', 'Add retry'], { env: { PATH: fakeBin(root), TRUSS_OPENSPEC_PATH: '' } });
  assert.equal(noCli.status, 1);
  assert.match(out(noCli), /OpenSpec CLI is not installed/);
});

test('new: a title with no usable characters is rejected', () => {
  const root = workspace({ config: validConfig });
  const bin = fakeOpenSpec(root);
  const r = run(root, ['new', '!!!'], { binDirs: [bin] });
  assert.equal(r.status, 2);
  assert.match(out(r), /empty after kebab-case/);
});

test('new: surfaces OpenSpec failures', () => {
  const root = workspace({ config: validConfig });
  const bin = fakeCli(
    fakeBin(root),
    'openspec',
    `const [cmd] = process.argv.slice(2);
if (cmd === '--version') console.log('1.13.2');
else if (cmd === 'new') { console.error('already exists'); process.exit(1); }`,
  );
  fs.mkdirSync(path.join(root, 'openspec', 'changes'), { recursive: true });
  fs.writeFileSync(path.join(root, 'openspec', 'config.yaml'), 'schema: spec-driven\n');
  const r = run(root, ['new', 'Add retry'], { binDirs: [bin] });
  assert.equal(r.status, 1);
  assert.match(out(r), /could not create change "add-retry".*already exists/);
});

test('status and continue: report no active change', () => {
  const root = workspace({ config: validConfig });
  const bin = fakeOpenSpec(root);
  const s = run(root, ['status'], { binDirs: [bin] });
  assert.equal(s.status, 0);
  assert.match(out(s), /No active change/);
  const c = run(root, ['continue'], { binDirs: [bin] });
  assert.match(out(c), /truss new/);
});

test('status: a corrupt state file is reported with exit 2', () => {
  const root = workspace({ config: validConfig });
  fs.writeFileSync(path.join(root, '.truss', 'state.json'), '{not json');
  const r = run(root, ['status']);
  assert.equal(r.status, 2);
  assert.match(out(r), /Invalid TRUSS state file/);
});

test('handoff: with no active change says so; with one writes a file', () => {
  const root = workspace({ config: validConfig });
  assert.match(out(run(root, ['handoff'])), /No active change/);
  fs.writeFileSync(
    path.join(root, '.truss', 'state.json'),
    JSON.stringify({ change: 'add-retry', component: 'api', phase: 'spec', path: 'openspec/changes/add-retry' }),
  );
  const r = run(root, ['handoff']);
  assert.equal(r.status, 0);
  const file = path.join(root, '.truss', 'handoffs', 'add-retry.md');
  const text = fs.readFileSync(file, 'utf8');
  assert.match(text, /Component: api/);
  assert.match(text, /Phase: spec/);
  assert.match(text, /Branch: (main|master)/);
});

test('init: exit codes for missing, incompatible and partial OpenSpec', () => {
  const missing = workspace({ config: validConfig });
  const m = run(missing, ['init'], { env: { PATH: fakeBin(missing), TRUSS_OPENSPEC_PATH: '' } });
  assert.equal(m.status, 1);
  assert.match(out(m), /CLI missing/);

  const old = workspace({ config: validConfig });
  const oldBin = fakeOpenSpec(old, { version: '0.9.0', initialized: false });
  const o = run(old, ['init'], { binDirs: [oldBin] });
  assert.equal(o.status, 1);
  assert.match(out(o), /incompatible/);
  assert.match(out(o), /does not upgrade or downgrade/);

  const partial = workspace({ config: validConfig });
  const partialBin = fakeOpenSpec(partial, { initialized: false });
  fs.mkdirSync(path.join(partial, 'openspec', 'specs'), { recursive: true });
  const p = run(partial, ['init'], { binDirs: [partialBin] });
  assert.equal(p.status, 1);
  assert.match(out(p), /legacy or partial/);
});

test('init: an invalid existing config stops with exit 2 and is left untouched', () => {
  const root = workspace({ config: 'version: 1\nunknown: true\n' });
  const r = run(root, ['init']);
  assert.equal(r.status, 2);
  assert.match(out(r), /initialization stopped/);
  assert.equal(fs.readFileSync(path.join(root, '.truss', 'config.yaml'), 'utf8'), 'version: 1\nunknown: true\n');
});

test('init: warns when .truss/ is not git-ignored', () => {
  const root = workspace({ config: validConfig, ignore: false });
  const bin = fakeOpenSpec(root);
  const r = run(root, ['init'], { binDirs: [bin] });
  assert.match(out(r), /no \.gitignore detected/);
});

test('openspec: reports a missing CLI with exit 1 and a healthy one with exit 0', () => {
  const root = workspace({ config: validConfig });
  const none = run(root, ['openspec'], { env: { PATH: fakeBin(root), TRUSS_OPENSPEC_PATH: '' } });
  assert.equal(none.status, 1);
  assert.match(out(none), /not installed/);
  const bin = fakeOpenSpec(root);
  const ok = run(root, ['openspec'], { binDirs: [bin] });
  assert.equal(ok.status, 0, ok.stdout);
  assert.match(out(ok), /Compatibility\s+● compatible/);
  assert.match(out(ok), /Project\s+● initialized/);
});

test('verify: invalid config exits 2 without running anything', () => {
  const r = run(workspace({ config: 'version: 1\nunknown: true\n' }), ['verify', '--trust']);
  assert.equal(r.status, 2);
  assert.match(out(r), /invalid config/);
});

test('verify: an empty command list exits 1 and writes not_configured evidence', () => {
  const root = workspace({
    config: validConfig.replace('  commands:\n    - node -e "process.exit(0)"\n', '  commands: []\n'),
  });
  const r = run(root, ['verify', '--trust']);
  assert.equal(r.status, 1);
  assert.match(out(r), /no verification commands configured/);
  const evidence = JSON.parse(fs.readFileSync(path.join(root, '.truss', 'verification', 'latest.json'), 'utf8'));
  assert.equal(evidence.status, 'not_configured');
});

test('config: missing config file exits 2', () => {
  const r = run(workspace({ config: null }), ['config']);
  assert.equal(r.status, 2);
  assert.match(out(r), /config not found/);
});
