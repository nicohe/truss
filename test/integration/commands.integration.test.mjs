import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {
  fakeBin,
  fakeCli,
  fakeGraphify,
  fakeOpenSpec,
  fakeStatefulOpenSpec,
  plain,
  run,
  validConfig,
  workspace,
} from './helpers.mjs';

const out = (r) => plain(r.stdout);

test('help: no arguments prints usage and exits 0', () => {
  const r = run(workspace({ config: validConfig }), []);
  assert.equal(r.status, 0);
  assert.match(out(r), /Usage: truss <command>/);
  assert.match(out(r), /verify \[--trust\]/);
});

test('skills: lists the skills shipped with the TRUSS installation, whatever the project contains', () => {
  const root = workspace({ config: validConfig });
  assert.equal(fs.existsSync(path.join(root, '.truss', 'skills')), false);
  const r = run(root, ['skills']);
  assert.equal(r.status, 0);
  for (const skill of [
    'grill-me',
    'grill-with-docs',
    'prototype',
    'code-review',
    'handoff',
    'writing-for-agents',
    'caveman',
  ]) {
    assert.match(out(r), new RegExp(`● ${skill}\\b`));
  }
  assert.doesNotMatch(out(r), /No TRUSS skills installed/);
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

test('handoff: an existing note is never overwritten, and a new one starts by deleting it', () => {
  const root = workspace({ config: validConfig });
  fs.writeFileSync(
    path.join(root, '.truss', 'state.json'),
    JSON.stringify({ change: 'add-retry', component: 'api', phase: 'spec', path: 'openspec/changes/add-retry' }),
  );
  const file = path.join(root, '.truss', 'handoffs', 'add-retry.md');
  assert.equal(run(root, ['handoff']).status, 0);
  const template = fs.readFileSync(file, 'utf8');
  const filled = `${template}NOTES WRITTEN BY THE AGENT\n`;
  fs.writeFileSync(file, filled);

  const again = run(root, ['handoff']);
  assert.equal(again.status, 0, 'keeping a note is not a failure');
  assert.match(out(again), /already exists and was not changed/);
  assert.match(out(again), /delete it to start a new note/);
  assert.equal(fs.readFileSync(file, 'utf8'), filled, 'the filled-in note was replaced by the template');

  fs.rmSync(file);
  assert.equal(run(root, ['handoff']).status, 0);
  assert.equal(fs.readFileSync(file, 'utf8'), template, 'deleting the note lets a new one be written');
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

// --- verification.tests_required -------------------------------------------------------------------------------

const gateConfig = (mode) => validConfig.replace('  commands:\n', `  tests_required: ${mode}\n  commands:\n`);
const gateGit = (root, ...args) => spawnSync('git', args, { cwd: root, encoding: 'utf8' });
// A repo with code and tests on the base branch and HEAD on a feature branch.
function gateWorkspace(mode) {
  const root = workspace({ config: gateConfig(mode) });
  for (const file of ['src/app.js', 'test/app.test.js']) {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), 'x\n');
  }
  gateGit(root, 'add', 'src', 'test');
  gateGit(root, 'commit', '-qm', 'base');
  gateGit(root, 'checkout', '-qb', 'feature');
  return root;
}
const evidenceOf = (root) =>
  JSON.parse(fs.readFileSync(path.join(root, '.truss', 'verification', 'latest.json'), 'utf8'));

test('tests_required block: source without tests fails verify, runs no command and records evidence', () => {
  const root = gateWorkspace('block');
  const marker = 'command-ran';
  fs.writeFileSync(
    path.join(root, '.truss', 'config.yaml'),
    gateConfig('block').replace(
      '    - node -e "process.exit(0)"',
      `    - node -e "require('fs').writeFileSync('${marker}','x')"`,
    ),
  );
  fs.writeFileSync(path.join(root, 'src', 'app.js'), 'changed\n');
  const r = run(root, ['verify', '--trust']);
  assert.equal(r.status, 1, r.stdout);
  assert.match(out(r), /Tests required\s+block/);
  assert.match(out(r), /missing tests/);
  assert.match(out(r), /src\/app\.js/);
  assert.match(out(r), /tests are required\. No command was executed/);
  assert.equal(fs.existsSync(path.join(root, marker)), false);
  const evidence = evidenceOf(root);
  assert.equal(evidence.status, 'failed');
  assert.equal(evidence.reason, 'tests_required');
  assert.deepEqual(evidence.commands, []);
  assert.equal(evidence.testsRequired.status, 'violation');
});

test('tests_required block: adding a test lets verify pass and is recorded in the evidence', () => {
  const root = gateWorkspace('block');
  fs.writeFileSync(path.join(root, 'src', 'app.js'), 'changed\n');
  fs.writeFileSync(path.join(root, 'test', 'app.test.js'), 'changed\n');
  const r = run(root, ['verify', '--trust']);
  assert.equal(r.status, 0, r.stdout);
  assert.match(out(r), /● passed\s+1 source and 1 test file\(s\) changed/);
  assert.match(out(r), /Verification passed/);
  assert.equal(evidenceOf(root).testsRequired.status, 'passed');
});

test('tests_required warn: reports the problem but still runs the commands and exits 0', () => {
  const root = gateWorkspace('warn');
  fs.writeFileSync(path.join(root, 'src', 'app.js'), 'changed\n');
  const r = run(root, ['verify', '--trust']);
  assert.equal(r.status, 0, r.stdout);
  assert.match(out(r), /Warning only/);
  assert.match(out(r), /Verification passed/);
  assert.equal(evidenceOf(root).status, 'passed');
  assert.equal(evidenceOf(root).testsRequired.blocking, false);
});

test('tests_required: an unevaluable gate is reported but never blocks', () => {
  const root = workspace({ config: gateConfig('block'), git: false });
  const r = run(root, ['verify', '--trust']);
  assert.equal(r.status, 0, r.stdout);
  assert.match(out(r), /could not evaluate: not a Git work tree\. Not blocking/);
});

test('tests_required off (the default) prints nothing and adds no evidence field', () => {
  const root = workspace({ config: validConfig });
  const r = run(root, ['verify', '--trust']);
  assert.equal(r.status, 0);
  assert.doesNotMatch(out(r), /Tests required/);
  assert.equal('testsRequired' in evidenceOf(root), false);
});

test('tests_required: the trust check still comes first', () => {
  const root = gateWorkspace('block');
  fs.writeFileSync(path.join(root, 'src', 'app.js'), 'changed\n');
  const r = run(root, ['verify']);
  assert.equal(r.status, 1);
  assert.match(out(r), /not trusted/i);
  assert.doesNotMatch(out(r), /Tests required/);
});

test('tests_required: invalid values and malformed options are rejected by config validation', () => {
  for (const [line, pattern] of [
    ['  tests_required: sometimes\n', /tests_required.*one of/],
    ['  base_ref: ""\n', /base_ref.*empty/],
    ['  source_paths: src\n', /source_paths.*expected array/],
  ]) {
    const root = workspace({ config: validConfig.replace('  commands:\n', `${line}  commands:\n`) });
    const r = run(root, ['config']);
    assert.equal(r.status, 2, line);
    assert.match(out(r), pattern);
  }
});

test('doctor reports the tests_required mode', () => {
  const root = workspace({ config: gateConfig('warn') });
  assert.match(out(run(root, ['doctor'])), /Tests required\s+warn/);
  const off = workspace({ config: validConfig });
  assert.match(out(run(off, ['doctor'])), /Tests required\s+off \(not enforced\)/);
});

// --- verification.tasks_complete -------------------------------------------------------------------------------

const tasksConfig = (mode) => validConfig.replace('  commands:\n', `  tasks_complete: ${mode}\n  commands:\n`);
// A project with an active change whose planning is done and whose tasks.md has the given content.
function tasksWorkspace(mode, tasks) {
  const root = workspace({ config: tasksConfig(mode) });
  const bin = fakeStatefulOpenSpec(root, { initialized: true });
  assert.equal(run(root, ['new', 'Add retry'], { binDirs: [bin] }).status, 0);
  const change = path.join(root, 'openspec', 'changes', 'add-retry');
  fs.writeFileSync(path.join(change, 'proposal.md'), '# Proposal\n');
  fs.mkdirSync(path.join(change, 'specs'), { recursive: true });
  fs.writeFileSync(path.join(change, 'specs', 'retry.md'), 'spec\n');
  fs.writeFileSync(path.join(change, 'design.md'), '# Design\n');
  fs.writeFileSync(path.join(change, 'tasks.md'), tasks);
  return { root, bin };
}

test('tasks_complete block: open tasks fail verify, list what is left and run no command', () => {
  const { root, bin } = tasksWorkspace('block', '- [x] one\n- [ ] add the tests\n- [ ] update the docs\n');
  const marker = 'command-ran';
  fs.writeFileSync(
    path.join(root, '.truss', 'config.yaml'),
    tasksConfig('block').replace(
      '    - node -e "process.exit(0)"',
      `    - node -e "require('fs').writeFileSync('${marker}','x')"`,
    ),
  );
  const r = run(root, ['verify', '--trust'], { binDirs: [bin] });
  assert.equal(r.status, 1, r.stdout);
  assert.match(out(r), /Tasks complete\s+block/);
  assert.match(out(r), /2 of 3 task\(s\) still open in "add-retry"/);
  assert.match(out(r), /add the tests/);
  assert.match(out(r), /update the docs/);
  assert.match(out(r), /the active change still has open tasks\. No command was executed/);
  assert.equal(fs.existsSync(path.join(root, marker)), false);
  const evidence = evidenceOf(root);
  assert.equal(evidence.status, 'failed');
  assert.equal(evidence.reason, 'tasks_incomplete');
  assert.deepEqual(evidence.commands, []);
  assert.equal(evidence.tasksComplete.status, 'violation');
  assert.equal(evidence.tasksComplete.remaining.length, 2);
});

test('tasks_complete block: with every task checked off verify runs and records the pass', () => {
  const { root, bin } = tasksWorkspace('block', '- [x] one\n- [x] two\n');
  const r = run(root, ['verify', '--trust'], { binDirs: [bin] });
  assert.equal(r.status, 0, r.stdout);
  assert.match(out(r), /● passed\s+all 2 task\(s\) of "add-retry" are complete/);
  assert.equal(evidenceOf(root).tasksComplete.status, 'passed');
});

test('tasks_complete warn: reports open tasks but still verifies and exits 0', () => {
  const { root, bin } = tasksWorkspace('warn', '- [ ] one\n');
  const r = run(root, ['verify', '--trust'], { binDirs: [bin] });
  assert.equal(r.status, 0, r.stdout);
  assert.match(out(r), /Warning only \(verification\.tasks_complete: warn\)/);
  assert.match(out(r), /Verification passed/);
});

test('tasks_complete: no active change, or OpenSpec unavailable, is reported but never blocks', () => {
  const noChange = workspace({ config: tasksConfig('block') });
  const a = run(noChange, ['verify', '--trust'], { binDirs: [fakeStatefulOpenSpec(noChange, { initialized: true })] });
  assert.equal(a.status, 0, a.stdout);
  assert.match(out(a), /no active change; nothing to check/);

  const { root } = tasksWorkspace('block', '- [ ] one\n');
  // A broken OpenSpec (its path does not exist); PATH is left alone so the verification command can still run.
  const b = run(root, ['verify', '--trust'], { env: { TRUSS_OPENSPEC_PATH: path.join(root, 'no-such-openspec') } });
  assert.equal(b.status, 0, b.stdout);
  assert.match(out(b), /could not evaluate: .*not compatible.*Not blocking/);
});

test('tasks_complete off (the default) prints nothing and adds no evidence field', () => {
  const { root, bin } = tasksWorkspace('off', '- [ ] one\n');
  const r = run(root, ['verify', '--trust'], { binDirs: [bin] });
  assert.equal(r.status, 0);
  assert.doesNotMatch(out(r), /Tasks complete/);
  assert.equal('tasksComplete' in evidenceOf(root), false);
});

test('both gates: each report is printed, the first blocking one names the reason, and both are recorded', () => {
  const { root, bin } = tasksWorkspace('block', '- [ ] one\n');
  fs.writeFileSync(
    path.join(root, '.truss', 'config.yaml'),
    validConfig.replace('  commands:\n', '  tests_required: block\n  tasks_complete: block\n  commands:\n'),
  );
  for (const file of ['src/app.js', 'test/app.test.js']) {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), 'x\n');
  }
  gateGit(root, 'add', 'src', 'test', 'openspec');
  gateGit(root, 'commit', '-qm', 'base');
  gateGit(root, 'checkout', '-qb', 'feature');
  fs.writeFileSync(path.join(root, 'src', 'app.js'), 'changed\n');
  const r = run(root, ['verify', '--trust'], { binDirs: [bin] });
  assert.equal(r.status, 1, r.stdout);
  assert.match(out(r), /Tests required\s+block/);
  assert.match(out(r), /Tasks complete\s+block/);
  const evidence = evidenceOf(root);
  assert.equal(evidence.reason, 'tests_required');
  assert.equal(evidence.testsRequired.status, 'violation');
  assert.equal(evidence.tasksComplete.status, 'violation');
});

test('tasks_complete: invalid values are rejected and doctor reports the mode', () => {
  const bad = workspace({ config: tasksConfig('sometimes') });
  const r = run(bad, ['config']);
  assert.equal(r.status, 2);
  assert.match(out(r), /tasks_complete.*one of/);
  const ok = workspace({ config: tasksConfig('warn') });
  assert.match(out(run(ok, ['doctor'])), /Tasks complete\s+warn/);
});

test('status and continue report task progress and only call a change complete when every task is done', () => {
  const { root, bin } = tasksWorkspace('off', '- [x] one\n- [ ] two\n');
  const partial = run(root, ['status'], { binDirs: [bin] });
  assert.match(out(partial), /Phase\s+implementation/);
  assert.match(out(partial), /Tasks\s+1\/2 complete/);
  assert.match(out(run(root, ['continue'], { binDirs: [bin] })), /first incomplete task \("two"\)/);
  fs.writeFileSync(path.join(root, 'openspec', 'changes', 'add-retry', 'tasks.md'), '- [x] one\n- [x] two\n');
  assert.match(out(run(root, ['status'], { binDirs: [bin] })), /Phase\s+complete/);
});

test('status and continue: a change archived with openspec archive is reported, not an error', () => {
  const { root, bin } = tasksWorkspace('off', '- [x] one\n');
  // What `openspec archive` does to the tree: the change moves under changes/archive with a date prefix.
  const changes = path.join(root, 'openspec', 'changes');
  fs.mkdirSync(path.join(changes, 'archive'), { recursive: true });
  fs.renameSync(path.join(changes, 'add-retry'), path.join(changes, 'archive', '2026-09-30-add-retry'));
  const status = run(root, ['status'], { binDirs: [bin] });
  assert.equal(status.status, 0);
  assert.match(
    out(status),
    /The active change "add-retry" was archived \(openspec[\\/]changes[\\/]archive[\\/]2026-09-30-add-retry\)\./,
  );
  assert.match(out(status), /Next: truss new "Change name"/);
  const next = run(root, ['continue'], { binDirs: [bin] });
  assert.equal(next.status, 0);
  assert.match(out(next), /The change "add-retry" was archived\. Create the next one with: truss new "Change name"/);
  assert.equal(run(root, ['new', 'Second change'], { binDirs: [bin] }).status, 0);
  assert.match(out(run(root, ['status'], { binDirs: [bin] })), /Change\s+second-change/);
});

test('status: an active change that OpenSpec lost without archiving it fails with a clear message', () => {
  const { root, bin } = tasksWorkspace('off', '- [x] one\n');
  fs.rmSync(path.join(root, 'openspec', 'changes', 'add-retry'), { recursive: true });
  const result = run(root, ['status'], { binDirs: [bin] });
  assert.equal(result.status, 1);
  assert.match(
    out(result),
    /The active change "add-retry" is not in OpenSpec \(openspec[\\/]changes[\\/]add-retry is missing\)\. Start a new one with: truss new/,
  );
  assert.doesNotMatch(out(result), /Could not read OpenSpec status/);
});

test('continue: names the openspec command to write the next artifact, and the ones that close the change', () => {
  const root = workspace({ config: validConfig });
  const bin = fakeStatefulOpenSpec(root, { initialized: true });
  assert.equal(run(root, ['new', 'Add retry'], { binDirs: [bin] }).status, 0);
  const planning = out(run(root, ['continue'], { binDirs: [bin] }));
  assert.match(planning, /Run openspec instructions proposal --change add-retry for its format and path\./);
  assert.doesNotMatch(planning, /\(from /, 'a project without components is run from its root');

  const { root: done, bin: doneBin } = tasksWorkspace('off', '- [x] one\n');
  const closing = out(run(done, ['continue'], { binDirs: [doneBin] }));
  assert.match(
    closing,
    /code review, then openspec validate add-retry and, once it passes, openspec archive add-retry\./,
  );
});

test('continue: a component with its own openspec/ says where to run the command, as TRUSS itself does', () => {
  const root = workspace({
    config: validConfig.replace('components: {}', 'components:\n  api:\n    path: ./apps/api'),
  });
  const bin = fakeStatefulOpenSpec(root, { initialized: true });
  fs.mkdirSync(path.join(root, 'apps', 'api', 'openspec'), { recursive: true });
  const created = run(root, ['new', 'Add retry', '--component', 'api'], { binDirs: [bin] });
  assert.equal(created.status, 0, out(created));
  const next = out(run(root, ['continue'], { binDirs: [bin] }));
  assert.match(
    next,
    /Run openspec instructions proposal --change add-retry \(from apps[\\/]api\) for its format and path\./,
  );
});
