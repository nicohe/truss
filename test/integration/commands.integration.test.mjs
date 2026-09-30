import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { workspace, fakeOpenSpec, fakeGraphify, fakeBin, executable, run, validConfig } from './helpers.mjs';

const plain = s => s.replace(/\x1b\[[0-9;]*m/g, '');
const out = r => plain(r.stdout);
// Fake OpenSpec/Graphify CLIs are POSIX shell scripts.
const posix = { skip: process.platform === 'win32' && 'needs a POSIX shell' };

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
  const root = workspace({ config: validConfig.replace('components: {}', 'components:\n  api:\n    path: ./apps/api') });
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

test('graphify update: failure is non-blocking when optional and blocking when required', posix, () => {
  const failing = 'if [ "${1:-}" = "--version" ]; then echo "graphify 0.1.0"; exit 0; fi; echo nope >&2; exit 4';
  const optional = workspace({ config: validConfig });
  executable(fakeBin(optional), 'graphify', failing);
  const o = run(optional, ['graphify', 'update'], { binDirs: [path.join(optional, '.fake-bin')] });
  assert.equal(o.status, 0);
  assert.match(out(o), /Graphify update failed/);

  const required = workspace({ config: validConfig.replace('required: false', 'required: true') });
  executable(fakeBin(required), 'graphify', failing);
  const r = run(required, ['graphify', 'bootstrap'], { binDirs: [path.join(required, '.fake-bin')] });
  assert.equal(r.status, 1);
});

test('graphify bootstrap: builds the index, records the git head and then reports ready', posix, () => {
  const root = workspace({ config: validConfig });
  const bin = fakeBin(root);
  executable(bin, 'graphify', 'if [ "${1:-}" = "--version" ]; then echo "graphify 0.1.0"; exit 0; fi\nmkdir -p graphify-out; echo {} > graphify-out/graph.json');
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

test('graphify status: an index older than the current git head is reported as stale', posix, () => {
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

test('new: a title with no usable characters is rejected', posix, () => {
  const root = workspace({ config: validConfig });
  const bin = fakeOpenSpec(root);
  const r = run(root, ['new', '!!!'], { binDirs: [bin] });
  assert.equal(r.status, 2);
  assert.match(out(r), /empty after kebab-case/);
});

test('new: surfaces OpenSpec failures', posix, () => {
  const root = workspace({ config: validConfig });
  const bin = fakeBin(root);
  executable(bin, 'openspec', 'if [ "${1:-}" = "--version" ]; then echo 1.13.2; exit 0; fi\nif [ "${1:-}" = "new" ]; then echo "already exists" >&2; exit 1; fi\nexit 0');
  fs.mkdirSync(path.join(root, 'openspec', 'changes'), { recursive: true });
  fs.writeFileSync(path.join(root, 'openspec', 'config.yaml'), 'schema: spec-driven\n');
  const r = run(root, ['new', 'Add retry'], { binDirs: [bin] });
  assert.equal(r.status, 1);
  assert.match(out(r), /could not create change "add-retry".*already exists/);
});

test('status and continue: report no active change', posix, () => {
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
  fs.writeFileSync(path.join(root, '.truss', 'state.json'), JSON.stringify({ change: 'add-retry', component: 'api', phase: 'spec', path: 'openspec/changes/add-retry' }));
  const r = run(root, ['handoff']);
  assert.equal(r.status, 0);
  const file = path.join(root, '.truss', 'handoffs', 'add-retry.md');
  const text = fs.readFileSync(file, 'utf8');
  assert.match(text, /Component: api/);
  assert.match(text, /Phase: spec/);
  assert.match(text, /Branch: (main|master)/);
});

test('init: exit codes for missing, incompatible and partial OpenSpec', posix, () => {
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

test('init: warns when .truss/ is not git-ignored', posix, () => {
  const root = workspace({ config: validConfig, ignore: false });
  const bin = fakeOpenSpec(root);
  const r = run(root, ['init'], { binDirs: [bin] });
  assert.match(out(r), /no \.gitignore detected/);
});

test('openspec: reports a missing CLI with exit 1 and a healthy one with exit 0', posix, () => {
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
  const root = workspace({ config: validConfig.replace('  commands:\n    - node -e "process.exit(0)"\n', '  commands: []\n') });
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
