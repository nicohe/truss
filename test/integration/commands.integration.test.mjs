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

// A fake Graphify that logs each call, so a test can say which commands ran and in what order.
const logged = (reply) => `fs.appendFileSync('graphify-calls.log', process.argv.slice(2).join(' ') + '\\n');\n${reply}`;
const calls = (root) => fs.readFileSync(path.join(root, 'graphify-calls.log'), 'utf8').trim().split('\n');

test('graphify bootstrap: when extract fails, its own error is shown and no other command runs', () => {
  const root = workspace({ config: validConfig });
  const bin = fakeGraphify(root, {
    behavior: logged(
      "console.error('error: Cannot read graphify-out/graph.json for incremental merge. Delete the file and run a full rebuild.'); process.exit(1);",
    ),
  });
  const r = run(root, ['graphify', 'bootstrap'], { binDirs: [bin] });
  assert.equal(r.status, 0, 'a failure is still non-blocking when Graphify is optional');
  assert.match(out(r), /Graphify update failed/);
  assert.match(out(r), /Command\s+graphify extract \. --code-only/);
  assert.match(out(r), /Cannot read graphify-out\/graph\.json for incremental merge\. Delete the file/);
  assert.deepEqual(calls(root), ['extract . --code-only'], 'the path-first command did not run');

  const required = workspace({ config: validConfig.replace('required: false', 'required: true') });
  const blocked = run(required, ['graphify', 'bootstrap'], {
    binDirs: [fakeGraphify(required, { behavior: logged('process.exit(1);') })],
  });
  assert.equal(blocked.status, 1);
  assert.deepEqual(calls(required), ['extract . --code-only']);
});

test('graphify bootstrap: a Graphify without extract falls back to the path-first command', () => {
  const root = workspace({ config: validConfig });
  const bin = fakeGraphify(root, {
    behavior:
      logged(`if (process.argv[2] === 'extract') { console.error("error: unknown command 'extract'"); process.exit(1); }
fs.mkdirSync('graphify-out', { recursive: true }); fs.writeFileSync('graphify-out/graph.json', '{}');`),
  });
  const r = run(root, ['graphify', 'bootstrap'], { binDirs: [bin] });
  assert.equal(r.status, 0, r.stdout);
  assert.match(out(r), /graph updated/);
  assert.match(out(r), /Command\s+graphify \. --no-viz/, 'it names the command that ran, not the one that failed');
  assert.deepEqual(calls(root), ['extract . --code-only', '. --no-viz']);
});

test('graphify bootstrap: if the path-first command fails too, that failure is the one shown, with its command', () => {
  const root = workspace({ config: validConfig });
  const bin = fakeGraphify(root, {
    behavior:
      logged(`if (process.argv[2] === 'extract') { console.error("error: unknown command 'extract'"); process.exit(1); }
console.error('path-first failed'); process.exit(2);`),
  });
  const r = run(root, ['graphify', 'bootstrap'], { binDirs: [bin] });
  assert.match(out(r), /Command\s+graphify \. --no-viz/);
  assert.match(out(r), /path-first failed/);
});

test('graphify bootstrap: a long failure is cut to its last lines, which hold the message', () => {
  const root = workspace({ config: validConfig });
  const bin = fakeGraphify(root, {
    behavior: logged(
      "for (let i = 1; i <= 40; i++) console.error('traceback line ' + i); console.error('RuntimeError: delete the file and rebuild'); process.exit(1);",
    ),
  });
  const r = out(run(root, ['graphify', 'bootstrap'], { binDirs: [bin] }));
  assert.match(r, /\(29 earlier lines omitted\)/);
  assert.match(r, /RuntimeError: delete the file and rebuild/);
  assert.match(r, /traceback line 40/);
  assert.doesNotMatch(r, /traceback line 1\n/);
});

// A project in the implementation phase (planning done, one task open) with a fake Graphify that has a fresh graph.
function graphWorkspace({ required = false } = {}) {
  const { root, bin } = tasksWorkspace('off', '- [ ] one\n');
  if (required)
    fs.writeFileSync(
      path.join(root, '.truss', 'config.yaml'),
      tasksConfig('off').replace('required: false', 'required: true'),
    );
  fakeGraphify(root, { withIndex: true });
  return { root, bin };
}
const graphFile = (root) => path.join(root, 'graphify-out', 'graph.json');
const commitSomething = (root) => {
  fs.writeFileSync(path.join(root, 'another.txt'), 'x');
  spawnSync('git', ['add', 'another.txt'], { cwd: root });
  spawnSync('git', ['commit', '-qm', 'another'], { cwd: root });
};
const continueOut = (root, bin) => {
  const r = run(root, ['continue'], { binDirs: [bin] });
  assert.equal(r.status, 0, 'continue reports the state of the graph; it never stops the agent');
  return out(r);
};

test('continue: a fresh code graph is pointed out to the agent as something to use', () => {
  const { root, bin } = graphWorkspace();
  assert.match(
    continueOut(root, bin),
    /\nCode graph\nThe Graphify code graph is fresh \(graphify-out\/graph\.json\): use it for impact and cross-module questions before searching the tree\.\n/,
  );
});

test('continue: a graph that is stale, missing or damaged says what to do, and is firmer when Graphify is required', () => {
  const states = {
    stale: { make: commitSomething, say: /The Graphify code graph is stale: run truss graphify update to refresh it/ },
    missing: {
      make: (root) => fs.rmSync(path.join(root, 'graphify-out'), { recursive: true }),
      say: /There is no Graphify code graph yet: truss graphify bootstrap builds one/,
    },
    damaged: {
      make: (root) => fs.writeFileSync(graphFile(root), '{"nodes": [1, 2'),
      say: /The Graphify code graph is damaged: delete graphify-out\/graph\.json and run truss graphify bootstrap/,
    },
  };
  for (const [name, { make, say }] of Object.entries(states)) {
    const optional = graphWorkspace();
    make(optional.root);
    const soft = continueOut(optional.root, optional.bin);
    assert.match(soft, say, name);
    assert.match(soft, /, or search the tree natively\./, `${name}: optional, so there is a way out`);

    const required = graphWorkspace({ required: true });
    make(required.root);
    const firm = continueOut(required.root, required.bin);
    assert.match(firm, say, name);
    assert.match(firm, /before you implement \(Graphify is required\)\./, `${name}: required`);
  }
});

test('continue: says nothing about the graph when Graphify is off (an optional one that is not installed is the same path)', () => {
  const off = workspace({ config: tasksConfig('off').replace('enabled: true', 'enabled: false') });
  const offBin = fakeStatefulOpenSpec(off, { initialized: true });
  assert.equal(run(off, ['new', 'Add retry'], { binDirs: [offBin] }).status, 0);
  const change = path.join(off, 'openspec', 'changes', 'add-retry');
  fs.writeFileSync(path.join(change, 'proposal.md'), '# Proposal\n');
  fs.mkdirSync(path.join(change, 'specs'), { recursive: true });
  fs.writeFileSync(path.join(change, 'specs', 'retry.md'), 'spec\n');
  fs.writeFileSync(path.join(change, 'design.md'), '# Design\n');
  fs.writeFileSync(path.join(change, 'tasks.md'), '- [ ] one\n');
  fakeGraphify(off, { withIndex: true });
  const disabled = continueOut(off, offBin);
  assert.match(disabled, /Context to load/, 'the implementation phase is shown');
  assert.doesNotMatch(disabled, /Code graph/);
});

test('continue: the code graph is only mentioned while the agent is implementing', () => {
  const planning = workspace({ config: validConfig });
  const bin = fakeStatefulOpenSpec(planning, { initialized: true });
  assert.equal(run(planning, ['new', 'Add retry'], { binDirs: [bin] }).status, 0);
  fakeGraphify(planning, { withIndex: true });
  assert.doesNotMatch(continueOut(planning, bin), /Code graph/);

  const done = tasksWorkspace('off', '- [x] one\n');
  fakeGraphify(done.root, { withIndex: true });
  const complete = continueOut(done.root, done.bin);
  assert.match(complete, /Phase\s+complete/);
  assert.doesNotMatch(complete, /Code graph/);
});

test('graphify status and doctor: a graph.json that is cut short or empty is damaged, and a sound one is not', () => {
  const damaged = ['', '   \n', '{ roto', '{"nodes": [1, 2', 'not json at all', '[1, 2', '{"a": 1}}x'];
  const sound = ['{}\n', '[]', '  {"nodes": [], "links": []}\n\n', '﻿{"a": 1}'];
  for (const content of [...damaged, ...sound]) {
    const root = workspace({ config: validConfig });
    const bin = fakeGraphify(root, { withIndex: true });
    fs.writeFileSync(graphFile(root), content);
    const status = out(run(root, ['graphify', 'status'], { binDirs: [bin] }));
    if (damaged.includes(content)) {
      assert.match(status, /Freshness\s+damaged/, JSON.stringify(content));
      assert.match(
        status,
        /graph\.json damaged; delete it and run truss graphify bootstrap \(optional; native fallback\)/,
      );
    } else {
      assert.match(status, /Freshness\s+fresh/, `${JSON.stringify(content)} is not flagged`);
    }
  }

  const optional = workspace({ config: validConfig });
  const optionalBin = fakeGraphify(optional, { withIndex: true });
  fs.writeFileSync(graphFile(optional), '{ roto');
  const soft = run(optional, ['doctor', '--trust'], { binDirs: [optionalBin, fakeOpenSpec(optional)] });
  assert.match(out(soft), /○ Graphify\s+graph\.json damaged/);
  assert.equal(soft.status, 0);

  const required = workspace({ config: validConfig.replace('required: false', 'required: true') });
  const requiredBin = fakeGraphify(required, { withIndex: true });
  fs.writeFileSync(graphFile(required), '{ roto');
  const blocked = run(required, ['graphify', 'status'], { binDirs: [requiredBin] });
  assert.equal(blocked.status, 1);
  assert.match(out(blocked), /× graph\.json damaged; delete it and run truss graphify bootstrap \(required; blocks\)/);
});

test('graphify update and bootstrap: a damaged graph is reported before Graphify is run on it', () => {
  for (const action of ['update', 'bootstrap']) {
    const root = workspace({ config: validConfig });
    const bin = fakeGraphify(root, { withIndex: true, behavior: logged('process.exit(0);') });
    fs.writeFileSync(graphFile(root), '{"nodes": [1, 2');
    const r = run(root, ['graphify', action], { binDirs: [bin] });
    assert.equal(r.status, 0, 'optional: not a blocking failure');
    assert.match(out(r), /Graphify update failed/);
    assert.match(out(r), /graphify-out\/graph\.json is damaged .*Delete it and run truss graphify bootstrap\./);
    assert.doesNotMatch(out(r), /Command\s+graphify/, 'no command ran, so none is named');
    assert.equal(fs.existsSync(path.join(root, 'graphify-calls.log')), false, `${action} did not call Graphify`);
    assert.equal(fs.readFileSync(graphFile(root), 'utf8'), '{"nodes": [1, 2', 'the damaged file is left for the user');
  }
  const required = workspace({ config: validConfig.replace('required: false', 'required: true') });
  const bin = fakeGraphify(required, { withIndex: true });
  fs.writeFileSync(graphFile(required), '');
  assert.equal(run(required, ['graphify', 'bootstrap'], { binDirs: [bin] }).status, 1);
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

// Real OpenSpec prints failures as JSON on stdout ({ status: [{ severity, message }] }) and exits 1.
function failingNew(root, title, reply) {
  const bin = fakeCli(
    fakeBin(root),
    'openspec',
    `const [cmd] = process.argv.slice(2);
if (cmd === '--version') console.log('1.13.2');
else if (cmd === 'new') { ${reply} process.exit(1); }`,
  );
  fs.mkdirSync(path.join(root, 'openspec', 'changes'), { recursive: true });
  fs.writeFileSync(path.join(root, 'openspec', 'config.yaml'), 'schema: spec-driven\n');
  return run(root, ['new', title], { binDirs: [bin] });
}
const openspecError = (message) =>
  `console.log(JSON.stringify({ change: null, status: [{ severity: 'error', code: 'change_error', message: ${JSON.stringify(message)} }] }, null, 2));`;

test('new: an OpenSpec failure shows its message, not its JSON', () => {
  const r = failingNew(
    workspace({ config: validConfig }),
    'Add retry',
    openspecError("Change 'add-retry' already exists at /p/add-retry"),
  );
  assert.equal(r.status, 1);
  assert.match(out(r), /could not create change "add-retry": Change 'add-retry' already exists at \/p\/add-retry/);
  assert.doesNotMatch(out(r), /[{}]|severity|change_error/);
});

test('new: a failure that is not JSON is shown as plain text', () => {
  const r = failingNew(workspace({ config: validConfig }), 'Add retry', "console.error('already exists');");
  assert.equal(r.status, 1);
  assert.match(out(r), /could not create change "add-retry": already exists/);
});

test('new: a very long change name is shortened in the error', () => {
  const r = failingNew(
    workspace({ config: validConfig }),
    'a'.repeat(300),
    openspecError('Change name is too long (200 characters max)'),
  );
  assert.equal(r.status, 1);
  assert.match(out(r), /could not create change "a{57}\.\.\.": Change name is too long \(200 characters max\)/);
  assert.doesNotMatch(out(r), /a{100}/);
});

test('status and continue: report no active change', () => {
  const root = workspace({ config: validConfig });
  const bin = fakeOpenSpec(root);
  const s = run(root, ['status'], { binDirs: [bin] });
  assert.equal(s.status, 0);
  assert.match(out(s), /No active change/);
  assert.doesNotMatch(out(s), /Open changes/, 'nothing is open, so there is nothing to list');
  const c = run(root, ['continue'], { binDirs: [bin] });
  assert.match(out(c), /truss new/);
  assert.doesNotMatch(out(c), /Open in OpenSpec/);
});

test('status: a corrupt state file is reported with exit 2', () => {
  const root = workspace({ config: validConfig });
  fs.writeFileSync(path.join(root, '.truss', 'state.json'), '{not json');
  const r = run(root, ['status']);
  assert.equal(r.status, 2);
  assert.match(out(r), /Invalid TRUSS state file/);
  assert.match(out(r), /Delete it .*truss new "Change name"/, 'says how to get out of it');
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
  assert.doesNotMatch(out(status), /Open changes/, 'nothing else is open');
  const next = run(root, ['continue'], { binDirs: [bin] });
  assert.equal(next.status, 0);
  assert.match(out(next), /The change "add-retry" was archived\. Create the next one with: truss new "Change name"/);
  const second = run(root, ['new', 'Second change'], { binDirs: [bin] });
  assert.equal(second.status, 0);
  assert.doesNotMatch(
    out(second),
    /still open/,
    'an archived change is not left behind, so there is nothing to warn about',
  );
  assert.match(out(run(root, ['status'], { binDirs: [bin] })), /Change\s+second-change/);
});

test('new: a first change is created without a warning', () => {
  const root = workspace({ config: validConfig });
  const bin = fakeStatefulOpenSpec(root, { initialized: true });
  const first = run(root, ['new', 'Add retry'], { binDirs: [bin] });
  assert.equal(first.status, 0);
  assert.doesNotMatch(out(first), /still open|no longer the active/);
});

test('new: replacing a change that is still open in OpenSpec says so, and still creates the new one', () => {
  const { root, bin } = tasksWorkspace('off', '- [ ] one\n');
  const second = run(root, ['new', 'Second change'], { binDirs: [bin] });
  assert.equal(second.status, 0, 'a warning, not a failure');
  assert.match(out(second), /Change\s+second-change/);
  assert.match(
    out(second),
    /○ "add-retry" is still open in OpenSpec \(openspec[\\/]changes[\\/]add-retry\) and is no longer the active change: TRUSS follows one change at a time\./,
  );
  assert.match(out(second), /Next: truss continue/);
  assert.match(out(run(root, ['status'], { binDirs: [bin] })), /Change\s+second-change/);
  assert.ok(fs.existsSync(path.join(root, 'openspec', 'changes', 'add-retry')), 'the first change is left as it was');
});

test('new: no warning when the active change is gone from OpenSpec, or the state cannot be read', () => {
  const gone = tasksWorkspace('off', '- [ ] one\n');
  fs.rmSync(path.join(gone.root, 'openspec', 'changes', 'add-retry'), { recursive: true });
  const afterGone = run(gone.root, ['new', 'Second change'], { binDirs: [gone.bin] });
  assert.equal(afterGone.status, 0);
  assert.doesNotMatch(out(afterGone), /still open/);

  const corrupt = tasksWorkspace('off', '- [ ] one\n');
  fs.writeFileSync(path.join(corrupt.root, '.truss', 'state.json'), '{not json');
  const afterCorrupt = run(corrupt.root, ['new', 'Second change'], { binDirs: [corrupt.bin] });
  assert.equal(afterCorrupt.status, 0, 'a corrupt state file is still replaced, as before');
  assert.doesNotMatch(out(afterCorrupt), /still open/);
});

test('new: the warning gives the path of a change that lives in a component', () => {
  const root = workspace({
    config: validConfig.replace('components: {}', 'components:\n  api:\n    path: ./apps/api'),
  });
  const bin = fakeStatefulOpenSpec(root, { initialized: true });
  fs.mkdirSync(path.join(root, 'apps', 'api', 'openspec'), { recursive: true });
  assert.equal(run(root, ['new', 'Add retry', '--component', 'api'], { binDirs: [bin] }).status, 0);
  const second = run(root, ['new', 'Second change'], { binDirs: [bin] });
  assert.equal(second.status, 0);
  assert.match(
    out(second),
    /"add-retry" is still open in OpenSpec \(apps[\\/]api[\\/]openspec[\\/]changes[\\/]add-retry\)/,
  );
});

test('new: the warning says how to go back, with the component when the change has one', () => {
  const { root, bin } = tasksWorkspace('off', '- [ ] one\n');
  const plain = out(run(root, ['new', 'Second change'], { binDirs: [bin] }));
  assert.match(plain, /Go back to it with: truss use add-retry\n/);

  const withComponent = workspace({
    config: validConfig.replace('components: {}', 'components:\n  api:\n    path: ./apps/api'),
  });
  const componentBin = fakeStatefulOpenSpec(withComponent, { initialized: true });
  fs.mkdirSync(path.join(withComponent, 'apps', 'api', 'openspec'), { recursive: true });
  assert.equal(run(withComponent, ['new', 'Add retry', '--component', 'api'], { binDirs: [componentBin] }).status, 0);
  const second = out(run(withComponent, ['new', 'Second change'], { binDirs: [componentBin] }));
  assert.match(second, /Go back to it with: truss use add-retry --component api\n/);
});

test('use: goes back to a change that new left behind, and status follows it', () => {
  const { root, bin } = tasksWorkspace('off', '- [x] one\n- [ ] two\n');
  assert.equal(run(root, ['new', 'Second change'], { binDirs: [bin] }).status, 0);
  assert.match(out(run(root, ['status'], { binDirs: [bin] })), /Change\s+second-change/);

  const back = run(root, ['use', 'add-retry'], { binDirs: [bin] });
  assert.equal(back.status, 0, out(back));
  assert.match(out(back), /● Active change set/);
  assert.match(out(back), /Change\s+add-retry/);
  assert.match(out(back), /Phase\s+implementation/);
  assert.match(out(back), /Tasks\s+1\/2 complete/);
  assert.match(out(back), /Next: truss continue/);
  assert.match(out(run(root, ['status'], { binDirs: [bin] })), /Change\s+add-retry/);
  assert.match(out(run(root, ['continue'], { binDirs: [bin] })), /first incomplete task \("two"\)/);
  assert.ok(
    fs.existsSync(path.join(root, 'openspec', 'changes', 'second-change')),
    'the other change is left as it was',
  );

  const again = run(root, ['use', 'add-retry'], { binDirs: [bin] });
  assert.equal(again.status, 0, 'naming the active change again is harmless');
});

test('use: without a name, or with something that is not a change id, it is a usage error', () => {
  const { root, bin } = tasksWorkspace('off', '- [x] one\n');
  const none = run(root, ['use'], { binDirs: [bin] });
  assert.equal(none.status, 2);
  assert.match(out(none), /Usage: truss use <change> \[--component name\]/);
  for (const bad of ['../etc', 'archive', 'a/b', '.hidden']) {
    const r = run(root, ['use', bad], { binDirs: [bin] });
    assert.equal(r.status, 2, `"${bad}" is not a change id`);
    assert.match(out(r), /is not a change id/);
  }
});

test('use: a change that does not exist lists what is open; an archived one says so', () => {
  const { root, bin } = tasksWorkspace('off', '- [x] one\n');
  assert.equal(run(root, ['new', 'Second change'], { binDirs: [bin] }).status, 0);
  const missing = run(root, ['use', 'nope'], { binDirs: [bin] });
  assert.equal(missing.status, 1);
  assert.match(
    out(missing),
    /There is no open change "nope" in openspec[\\/]changes\. Open there: add-retry, second-change\./,
  );

  const changes = path.join(root, 'openspec', 'changes');
  fs.mkdirSync(path.join(changes, 'archive'), { recursive: true });
  fs.renameSync(path.join(changes, 'add-retry'), path.join(changes, 'archive', '2026-09-30-add-retry'));
  const archived = run(root, ['use', 'add-retry'], { binDirs: [bin] });
  assert.equal(archived.status, 1);
  assert.match(
    out(archived),
    /The change "add-retry" was archived \(openspec[\\/]changes[\\/]archive[\\/]2026-09-30-add-retry\), so there is nothing to go back to\./,
  );
});

test('use: a change in a component is found through that component, and the error says so', () => {
  const root = workspace({
    config: validConfig.replace(
      'components: {}',
      'components:\n  api:\n    path: ./apps/api\n  web:\n    path: ./apps/web',
    ),
  });
  const bin = fakeStatefulOpenSpec(root, { initialized: true });
  fs.mkdirSync(path.join(root, 'apps', 'api', 'openspec'), { recursive: true });
  fs.mkdirSync(path.join(root, 'apps', 'web'), { recursive: true });
  assert.equal(run(root, ['new', 'Add retry', '--component', 'api'], { binDirs: [bin] }).status, 0);
  assert.equal(run(root, ['new', 'Second change'], { binDirs: [bin] }).status, 0);

  const wrong = run(root, ['use', 'add-retry'], { binDirs: [bin] });
  assert.equal(wrong.status, 1);
  assert.match(
    out(wrong),
    /Open there: second-change\. It exists in component "api": truss use add-retry --component api/,
  );

  const right = run(root, ['use', 'add-retry', '--component', 'api'], { binDirs: [bin] });
  assert.equal(right.status, 0, out(right));
  assert.match(out(right), /Component\s+api/);
  assert.match(out(right), /OpenSpec\s+apps[\\/]api[\\/]openspec[\\/]changes[\\/]add-retry/);
  assert.equal(JSON.parse(fs.readFileSync(path.join(root, '.truss', 'state.json'), 'utf8')).component, 'api');

  const flagFirst = run(root, ['use', '--component', 'api', 'add-retry'], { binDirs: [bin] });
  assert.equal(flagFirst.status, 0, 'the component may come before the name');

  const unknown = run(root, ['use', 'add-retry', '--component', 'nope'], { binDirs: [bin] });
  assert.equal(unknown.status, 2);
  assert.match(out(unknown), /Unknown component "nope"\. Available: api, web/);
});

test('use: replaces a state file that cannot be read, and needs a valid configuration', () => {
  const { root, bin } = tasksWorkspace('off', '- [x] one\n');
  fs.writeFileSync(path.join(root, '.truss', 'state.json'), '{not json');
  const r = run(root, ['use', 'add-retry'], { binDirs: [bin] });
  assert.equal(r.status, 0, out(r));
  assert.match(out(run(root, ['status'], { binDirs: [bin] })), /Change\s+add-retry/);

  const invalid = workspace({ config: 'version: 1\nbogus: true\n' });
  const bad = run(invalid, ['use', 'add-retry'], { binDirs: [fakeOpenSpec(invalid)] });
  assert.equal(bad.status, 2);
  assert.match(out(bad), /\$\.bogus: unknown property/);
});

// A clone or a CI checkout has no `.truss/state.json` (it is local to each checkout), so nothing is active there even
// when OpenSpec has changes in flight: what it says must not send anyone to `truss new` for one of them.
const forgetActiveChange = (root) => fs.rmSync(path.join(root, '.truss', 'state.json'));

test('status and continue: with no active change, list what is open in OpenSpec and point to truss use', () => {
  const { root, bin } = tasksWorkspace('off', '- [ ] one\n');
  assert.equal(run(root, ['new', 'Second change'], { binDirs: [bin] }).status, 0);
  forgetActiveChange(root);

  const status = run(root, ['status'], { binDirs: [bin] });
  assert.equal(status.status, 0);
  assert.match(
    out(status),
    /No active change\.\nOpen changes\s+add-retry, second-change\nNext: truss use <change>, or truss new "Change name" for a new one/,
  );
  const next = run(root, ['continue'], { binDirs: [bin] });
  assert.equal(next.status, 0);
  assert.match(
    out(next),
    /No active change\. Open in OpenSpec: add-retry, second-change\.\nMake one of them the active change with: truss use <change>, or create a new one with: truss new "Change name"/,
  );

  assert.equal(run(root, ['use', 'add-retry'], { binDirs: [bin] }).status, 0, 'what it points to works');
  assert.doesNotMatch(
    out(run(root, ['status'], { binDirs: [bin] })),
    /Open changes/,
    'and only while nothing is active',
  );
});

test('status and continue: a single open change is named in the command to run', () => {
  const { root, bin } = tasksWorkspace('off', '- [ ] one\n');
  forgetActiveChange(root);
  assert.match(
    out(run(root, ['status'], { binDirs: [bin] })),
    /Open changes\s+add-retry\nNext: truss use add-retry, or truss new "Change name" for a new one/,
  );
  assert.match(
    out(run(root, ['continue'], { binDirs: [bin] })),
    /Open in OpenSpec: add-retry\.\nMake it the active change with: truss use add-retry, or create a new one with: truss new "Change name"/,
  );
});

test('status and continue: a change in a component is listed with its component, and the command names it', () => {
  const root = workspace({
    config: validConfig.replace(
      'components: {}',
      'components:\n  api:\n    path: ./apps/api\n  web:\n    path: ./apps/web',
    ),
  });
  const bin = fakeStatefulOpenSpec(root, { initialized: true });
  fs.mkdirSync(path.join(root, 'apps', 'api', 'openspec'), { recursive: true });
  fs.mkdirSync(path.join(root, 'apps', 'web'), { recursive: true });
  assert.equal(run(root, ['new', 'Add retry', '--component', 'api'], { binDirs: [bin] }).status, 0);
  assert.equal(run(root, ['new', 'Second change'], { binDirs: [bin] }).status, 0);
  forgetActiveChange(root);
  assert.match(
    out(run(root, ['status'], { binDirs: [bin] })),
    /Open changes\s+second-change, add-retry \(component api\)\nNext: truss use <change>, or/,
    'the project first, then each component',
  );

  const changes = path.join(root, 'openspec', 'changes');
  fs.mkdirSync(path.join(changes, 'archive'), { recursive: true });
  fs.renameSync(path.join(changes, 'second-change'), path.join(changes, 'archive', '2026-09-30-second-change'));
  assert.match(
    out(run(root, ['status'], { binDirs: [bin] })),
    /Open changes\s+add-retry \(component api\)\nNext: truss use add-retry --component api, or truss new/,
  );
  assert.match(
    out(run(root, ['continue'], { binDirs: [bin] })),
    /Make it the active change with: truss use add-retry --component api, or create a new one/,
  );
  assert.equal(run(root, ['use', 'add-retry', '--component', 'api'], { binDirs: [bin] }).status, 0);
});

test('status and continue: a change archived while another is still open lists the one that is', () => {
  const { root, bin } = tasksWorkspace('off', '- [ ] one\n');
  assert.equal(run(root, ['new', 'Second change'], { binDirs: [bin] }).status, 0);
  const changes = path.join(root, 'openspec', 'changes');
  fs.mkdirSync(path.join(changes, 'archive'), { recursive: true });
  fs.renameSync(path.join(changes, 'second-change'), path.join(changes, 'archive', '2026-09-30-second-change'));

  assert.match(
    out(run(root, ['status'], { binDirs: [bin] })),
    /The active change "second-change" was archived \(openspec[\\/]changes[\\/]archive[\\/]2026-09-30-second-change\)\.\nOpen changes\s+add-retry\nNext: truss use add-retry, or truss new "Change name" for a new one/,
  );
  assert.match(
    out(run(root, ['continue'], { binDirs: [bin] })),
    /The change "second-change" was archived\. Open in OpenSpec: add-retry\.\nMake it the active change with: truss use add-retry, or create the next one with: truss new "Change name"/,
  );
});

test('status: a component that does not resolve, or a changes folder that is not a folder, never stops it', () => {
  const root = workspace({
    config: validConfig.replace('components: {}', 'components:\n  ghost:\n    path: ./apps/ghost'),
  });
  const bin = fakeOpenSpec(root);
  fs.mkdirSync(path.join(root, 'openspec', 'changes', 'add-retry'), { recursive: true });
  const listed = run(root, ['status'], { binDirs: [bin] });
  assert.equal(listed.status, 0, out(listed));
  assert.match(out(listed), /Open changes\s+add-retry\n/);

  fs.rmSync(path.join(root, 'openspec', 'changes'), { recursive: true });
  fs.writeFileSync(path.join(root, 'openspec', 'changes'), 'not a folder');
  const broken = run(root, ['status'], { binDirs: [bin] });
  assert.equal(broken.status, 0, out(broken));
  assert.doesNotMatch(out(broken), /Open changes/);
  assert.match(out(broken), /Next: truss new "Change name"/);
});

test('new: with no active change, says what else is open in OpenSpec and how to go back', () => {
  const { root, bin } = tasksWorkspace('off', '- [ ] one\n');
  forgetActiveChange(root);
  const second = run(root, ['new', 'Second change'], { binDirs: [bin] });
  assert.equal(second.status, 0, 'a hint, not a failure');
  assert.match(out(second), /Change\s+second-change/);
  assert.match(
    out(second),
    /○ Also open in OpenSpec: add-retry\. None was the active change, and "second-change" is now: TRUSS follows one change at a time\. Go back to one with: truss use add-retry\n/,
  );
  assert.doesNotMatch(out(second), /still open/, 'nothing was replaced, so it is not the replaced-change line');
  assert.match(out(second), /Next: truss continue/);

  forgetActiveChange(root);
  const third = run(root, ['new', 'Third change'], { binDirs: [bin] });
  assert.match(
    out(third),
    /Also open in OpenSpec: add-retry, second-change\. None was the active change, and "third-change" is now: .* Go back to one with: truss use <change>\n/,
    'the new change is never among the others, and with several the command has a placeholder',
  );
  assert.match(out(run(root, ['status'], { binDirs: [bin] })), /Change\s+third-change/);
});

test('new: with no active change, a change that lives in a component is named with its component', () => {
  const root = workspace({
    config: validConfig.replace('components: {}', 'components:\n  api:\n    path: ./apps/api'),
  });
  const bin = fakeStatefulOpenSpec(root, { initialized: true });
  fs.mkdirSync(path.join(root, 'apps', 'api', 'openspec'), { recursive: true });
  assert.equal(run(root, ['new', 'Add retry', '--component', 'api'], { binDirs: [bin] }).status, 0);
  forgetActiveChange(root);
  const second = run(root, ['new', 'Second change'], { binDirs: [bin] });
  assert.equal(second.status, 0);
  assert.match(out(second), /Also open in OpenSpec: add-retry \(component api\)\./);
  assert.match(out(second), /Go back to one with: truss use add-retry --component api\n/);
});

test('new: no "also open" line when a first change is created, or when it replaces the open active one', () => {
  const root = workspace({ config: validConfig });
  const bin = fakeStatefulOpenSpec(root, { initialized: true });
  assert.doesNotMatch(out(run(root, ['new', 'Add retry'], { binDirs: [bin] })), /Also open/);
  const replacing = run(root, ['new', 'Second change'], { binDirs: [bin] });
  assert.match(out(replacing), /"add-retry" is still open in OpenSpec/, 'the replaced change is already said');
  assert.doesNotMatch(out(replacing), /Also open/, 'and is not said twice');
});

test('handoff: with no active change, lists what is open and points to truss use, as status does', () => {
  const { root, bin } = tasksWorkspace('off', '- [ ] one\n');
  forgetActiveChange(root);
  const r = run(root, ['handoff'], { binDirs: [bin] });
  assert.equal(r.status, 0, out(r));
  assert.match(
    out(r),
    /No active change\.\nOpen changes\s+add-retry\nNext: truss use add-retry, or truss new "Change name" for a new one/,
  );
  assert.equal(fs.existsSync(path.join(root, '.truss', 'handoffs')), false, 'no note is written');
  assert.equal(run(root, ['use', 'add-retry'], { binDirs: [bin] }).status, 0, 'what it points to works');
  assert.equal(run(root, ['handoff'], { binDirs: [bin] }).status, 0);
  assert.ok(fs.existsSync(path.join(root, '.truss', 'handoffs', 'add-retry.md')));
});

test('handoff: with no active change and nothing open it stays one line, and a bad configuration does not stop it', () => {
  const empty = workspace({ config: validConfig });
  const none = run(empty, ['handoff']);
  assert.equal(none.status, 0);
  assert.match(out(none), /No active change\./);
  assert.doesNotMatch(out(none), /Open changes|Next:/);

  const invalid = workspace({ config: 'version: 1\nbogus: true\n' });
  fs.mkdirSync(path.join(invalid, 'openspec', 'changes', 'add-retry'), { recursive: true });
  const r = run(invalid, ['handoff']);
  assert.equal(r.status, 0, 'handoff has never needed a valid configuration');
  assert.match(out(r), /No active change\./);
  assert.doesNotMatch(out(r), /Open changes|invalid config/);
});

test('handoff: an archived change with another still open says which, and how to pick it up', () => {
  const { root, bin } = tasksWorkspace('off', '- [x] one\n');
  assert.equal(run(root, ['new', 'Second change'], { binDirs: [bin] }).status, 0);
  archiveChange(root, 'second-change');
  const r = run(root, ['handoff'], { binDirs: [bin] });
  assert.equal(r.status, 0);
  assert.match(
    out(r),
    /there is nothing to hand off\.\nOpen changes\s+add-retry\nNext: truss use add-retry, or truss new "Change name" for a new one/,
  );
  assert.equal(fs.existsSync(path.join(root, '.truss', 'handoffs', 'second-change.md')), false);
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

// `continue` for a project in the implementation phase whose spec settings are changed from the defaults.
function continueWithSpec(settings, tasks = '- [ ] one\n') {
  const { root, bin } = tasksWorkspace('off', tasks);
  let config = tasksConfig('off');
  for (const [from, to] of Object.entries(settings)) config = config.replace(from, to);
  fs.writeFileSync(path.join(root, '.truss', 'config.yaml'), config);
  const r = run(root, ['continue'], { binDirs: [bin] });
  assert.equal(r.status, 0, out(r));
  return out(r);
}
const SOURCE =
  /The spec is authoritative \(spec\.mode: source\): treat it as read-only while you implement\. If the behavior has to change, stop, go back to the spec \(update its specs and tasks\) and only then resume\./;
const ZONES =
  /Zone guard is on \(spec\.zone_guard\): keep spec work and code work in separate steps\. TRUSS does not enforce it\./;

test('continue: the default spec settings add nothing to what the agent is told', () => {
  const text = continueWithSpec({});
  assert.match(text, /Next action\nImplement add-retry using/);
  assert.doesNotMatch(text, /spec\.mode|spec\.zone_guard|authoritative|Zone guard/);
});

test('continue: in spec.mode source the agent is told the spec is read-only and where to go when behavior must change', () => {
  const text = continueWithSpec({ 'mode: anchored': 'mode: source' });
  const action = text.slice(text.indexOf('Next action'), text.indexOf('Context to load'));
  assert.match(
    action,
    /then run truss verify\.\nThe spec is authoritative/,
    'it is part of the next action, after the instruction',
  );
  assert.match(action, SOURCE);
  assert.doesNotMatch(action, ZONES);
});

test('continue: a zone guard is stated on its own, and together with source mode', () => {
  const guardOnly = continueWithSpec({ 'zone_guard: false': 'zone_guard: true' });
  assert.match(guardOnly, ZONES);
  assert.doesNotMatch(guardOnly, SOURCE);

  const both = continueWithSpec({ 'mode: anchored': 'mode: source', 'zone_guard: false': 'zone_guard: true' });
  assert.match(both, /authoritative[\s\S]*\nZone guard is on/, 'one line each, the mode first');
});

test('continue: the spec policy is only restated while the agent implements', () => {
  const settings = { 'mode: anchored': 'mode: source', 'zone_guard: false': 'zone_guard: true' };
  const complete = continueWithSpec(settings, '- [x] one\n');
  assert.match(complete, /Phase\s+complete/);
  assert.doesNotMatch(complete, /authoritative|Zone guard/);

  const planning = workspace({ config: validConfig.replace('mode: anchored', 'mode: source') });
  const bin = fakeStatefulOpenSpec(planning, { initialized: true });
  assert.equal(run(planning, ['new', 'Add retry'], { binDirs: [bin] }).status, 0);
  const text = out(run(planning, ['continue'], { binDirs: [bin] }));
  assert.match(text, /Phase\s+spec/);
  assert.doesNotMatch(text, /authoritative|Zone guard/);
});

const BDD_OFF = /BDD is off \(development\.bdd: false\): the acceptance RED → GREEN macro-loop is not mandatory\./;
const TDD_OFF =
  /TDD is off \(development\.tdd: false\): the RED → minimal GREEN → refactor micro-loop is not mandatory\./;

test('continue: the default development settings add nothing, and an off loop is stated to the agent', () => {
  assert.doesNotMatch(continueWithSpec({}), /BDD is|TDD is|development\./);

  const bddOff = continueWithSpec({ 'bdd: true': 'bdd: false' });
  assert.match(bddOff.slice(bddOff.indexOf('Next action'), bddOff.indexOf('Context to load')), BDD_OFF);
  assert.doesNotMatch(bddOff, TDD_OFF);

  const tddOff = continueWithSpec({ 'tdd: true': 'tdd: false' });
  assert.match(tddOff, TDD_OFF);
  assert.doesNotMatch(tddOff, BDD_OFF);

  const both = continueWithSpec({
    'mode: anchored': 'mode: source',
    'bdd: true': 'bdd: false',
    'tdd: true': 'tdd: false',
  });
  assert.match(both, /authoritative[\s\S]*\nBDD is off[\s\S]*\nTDD is off/, 'one line each, after the spec policy');
});

test('continue: the development settings are only restated while the agent implements', () => {
  const complete = continueWithSpec({ 'bdd: true': 'bdd: false', 'tdd: true': 'tdd: false' }, '- [x] one\n');
  assert.match(complete, /Phase\s+complete/);
  assert.doesNotMatch(complete, /BDD is off|TDD is off/);
});

test('continue: lists AGENTS.md as context only when the project has one', () => {
  const { root, bin } = tasksWorkspace('off', '- [ ] one\n');
  const without = out(run(root, ['continue'], { binDirs: [bin] }));
  assert.match(without, /Context to load\n- openspec[\\/]changes[\\/]add-retry\n/);
  assert.doesNotMatch(without, /AGENTS\.md/);

  fs.writeFileSync(path.join(root, 'AGENTS.md'), '# Guidance\n');
  assert.match(
    out(run(root, ['continue'], { binDirs: [bin] })),
    /Context to load\n- AGENTS\.md \(effective component\/workspace guidance\)\n- openspec/,
  );
});

test('continue: a component with its own AGENTS.md lists that one, and falls back to the workspace one', () => {
  const root = workspace({
    config: validConfig.replace('components: {}', 'components:\n  api:\n    path: ./apps/api'),
  });
  const bin = fakeStatefulOpenSpec(root, { initialized: true });
  fs.mkdirSync(path.join(root, 'apps', 'api', 'openspec'), { recursive: true });
  assert.equal(run(root, ['new', 'Add retry', '--component', 'api'], { binDirs: [bin] }).status, 0);
  const change = path.join(root, 'apps', 'api', 'openspec', 'changes', 'add-retry');
  fs.writeFileSync(path.join(change, 'proposal.md'), '# Proposal\n');
  fs.mkdirSync(path.join(change, 'specs'), { recursive: true });
  fs.writeFileSync(path.join(change, 'specs', 'retry.md'), 'spec\n');
  fs.writeFileSync(path.join(change, 'design.md'), '# Design\n');
  fs.writeFileSync(path.join(change, 'tasks.md'), '- [ ] one\n');

  fs.writeFileSync(path.join(root, 'AGENTS.md'), '# Workspace\n');
  assert.match(out(run(root, ['continue'], { binDirs: [bin] })), /Context to load\n- AGENTS\.md \(effective/);
  fs.writeFileSync(path.join(root, 'apps', 'api', 'AGENTS.md'), '# Api\n');
  assert.match(
    out(run(root, ['continue'], { binDirs: [bin] })),
    /Context to load\n- apps\/api\/AGENTS\.md \(effective/,
  );
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

test('new, status and continue: an invalid or missing config is reported in full and exits 2, like config and verify', () => {
  const invalid = workspace({ config: 'version: 1\nbogus: true\n' });
  const bin = fakeOpenSpec(invalid);
  for (const args of [['status'], ['continue'], ['new', 'Add retry']]) {
    const r = run(invalid, args, { binDirs: [bin] });
    assert.equal(r.status, 2, `${args[0]} exits 2 for an invalid config`);
    assert.match(out(r), /× invalid config/);
    assert.match(out(r), /\$\.bogus: unknown property/, `${args[0]} lists what is wrong, not just that something is`);
  }
  const missing = workspace();
  for (const args of [['status'], ['continue'], ['new', 'Add retry']]) {
    const r = run(missing, args, { binDirs: [fakeOpenSpec(missing)] });
    assert.equal(r.status, 2, `${args[0]} exits 2 for a missing config`);
    assert.match(out(r), /TRUSS config not found: \.truss[\\/]config\.yaml\. Run truss init to create it\./);
  }
});

test('new: an undeclared component exits 2, as documented, and names the ones that exist', () => {
  const none = workspace({ config: validConfig });
  const r = run(none, ['new', 'Add retry', '--component', 'nope'], { binDirs: [fakeOpenSpec(none)] });
  assert.equal(r.status, 2);
  assert.match(out(r), /Unknown component "nope"\. No components are configured\./);

  const some = workspace({
    config: validConfig.replace('components: {}', 'components:\n  api:\n    path: ./apps/api'),
  });
  fs.mkdirSync(path.join(some, 'apps', 'api'), { recursive: true });
  const listed = run(some, ['new', 'Add retry', '--component', 'nope'], { binDirs: [fakeOpenSpec(some)] });
  assert.equal(listed.status, 2);
  assert.match(out(listed), /Unknown component "nope"\. Available: api/);
});

// What `openspec archive` does to the tree: the change moves under changes/archive with a date prefix.
function archiveChange(root, name = 'add-retry') {
  const changes = path.join(root, 'openspec', 'changes');
  fs.mkdirSync(path.join(changes, 'archive'), { recursive: true });
  fs.renameSync(path.join(changes, name), path.join(changes, 'archive', `2026-09-30-${name}`));
}

test('handoff: a change that was archived has nothing to hand off, and no note is written', () => {
  const { root, bin } = tasksWorkspace('off', '- [x] one\n');
  const open = run(root, ['handoff'], { binDirs: [bin] });
  assert.equal(open.status, 0);
  const note = path.join(root, '.truss', 'handoffs', 'add-retry.md');
  assert.ok(fs.existsSync(note), 'an open change still gets its note');
  fs.rmSync(note);

  archiveChange(root);
  const r = run(root, ['handoff'], { binDirs: [bin] });
  assert.equal(r.status, 0);
  assert.match(
    out(r),
    /The active change "add-retry" was archived \(openspec[\\/]changes[\\/]archive[\\/]2026-09-30-add-retry\)/,
  );
  assert.match(out(r), /there is nothing to hand off/);
  assert.match(out(r), /Next: truss new "Change name"/);
  assert.equal(fs.existsSync(note), false, 'no note for a finished change');
});

test('tasks_complete block: an archived change is reported and does not stop verify', () => {
  const { root, bin } = tasksWorkspace('block', '- [ ] left open\n');
  archiveChange(root);
  const r = run(root, ['verify', '--trust'], { binDirs: [bin] });
  assert.equal(r.status, 0, r.stdout);
  assert.match(
    out(r),
    /the active change "add-retry" was archived \(openspec[\\/]changes[\\/]archive[\\/]2026-09-30-add-retry\); nothing to check/,
  );
  assert.doesNotMatch(out(r), /could not evaluate/);
  const evidence = evidenceOf(root);
  assert.equal(evidence.status, 'passed');
  assert.equal(evidence.tasksComplete.status, 'archived');
});
