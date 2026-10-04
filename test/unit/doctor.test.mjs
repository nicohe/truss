import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { diagnoseProject } from '../../lib/doctor.mjs';
import { fakeOpenSpec, validConfig, workspace } from '../integration/helpers.mjs';
import { cleanup } from './helpers.mjs';

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
const check = (r, section, name) => r.checks.find((c) => c.section === section && c.name === name);
// Graphify is optional in validConfig, so an absent CLI must not affect the result.
const diagnose = (root, bin) =>
  withEnv(
    { TRUSS_OPENSPEC_PATH: bin ? path.join(bin, 'openspec') : '', TRUSS_HOME: path.join(root, '.truss-home') },
    () => diagnoseProject(root),
  );

test('doctor is healthy for a valid project with a compatible OpenSpec', () => {
  const root = workspace({ config: validConfig });
  try {
    const r = diagnose(root, fakeOpenSpec(root));
    assert.equal(r.healthy, true);
    assert.equal(r.exitCode, 0);
    assert.equal(check(r, 'Core', 'Config').status, 'pass');
    assert.equal(check(r, 'OpenSpec', 'Compatibility').status, 'pass');
    assert.equal(check(r, 'Verification', 'Commands').status, 'pass');
  } finally {
    cleanup(root);
  }
});

test('doctor exits 2 and skips config-dependent checks when the config is invalid', () => {
  const root = workspace({ config: 'version: 1\nunknown: true\n' });
  try {
    const r = diagnose(root, fakeOpenSpec(root));
    assert.equal(r.exitCode, 2);
    assert.equal(r.healthy, false);
    assert.equal(check(r, 'Core', 'Config').status, 'fail');
    assert.equal(check(r, 'Capabilities', 'Graphify').status, 'skip');
    assert.equal(check(r, 'Verification', 'Commands').status, 'skip');
  } finally {
    cleanup(root);
  }
});

test('doctor exits 2 when the config file is missing', () => {
  const root = workspace({ config: null });
  try {
    const r = diagnose(root, null);
    assert.equal(r.exitCode, 2);
    assert.match(check(r, 'Core', 'Config').detail, /not found/);
  } finally {
    cleanup(root);
  }
});

test('doctor fails when OpenSpec is not installed', () => {
  const root = workspace({ config: validConfig });
  try {
    const r = withEnv({ TRUSS_OPENSPEC_PATH: '', PATH: '' }, () => diagnoseProject(root));
    assert.equal(check(r, 'OpenSpec', 'CLI').status, 'fail');
    assert.equal(r.healthy, false);
    assert.equal(r.exitCode, 1);
  } finally {
    cleanup(root);
  }
});

test('doctor fails outside a git work tree', () => {
  const root = workspace({ config: validConfig, git: false });
  try {
    const r = diagnose(root, fakeOpenSpec(root));
    assert.equal(check(r, 'Core', 'Git repository').status, 'fail');
    assert.equal(r.healthy, false);
  } finally {
    cleanup(root);
  }
});

test('doctor only warns when .truss/ is not ignored', () => {
  const root = workspace({ config: validConfig, ignore: false });
  try {
    const r = diagnose(root, fakeOpenSpec(root));
    assert.equal(check(r, 'Core', '.truss ignore').status, 'warn');
    assert.equal(r.healthy, true);
    assert.ok(r.warnings >= 1);
  } finally {
    cleanup(root);
  }
});

test('doctor warns when no verification commands are configured', () => {
  const root = workspace({
    config: validConfig.replace('  commands:\n    - node -e "process.exit(0)"\n', '  commands: []\n'),
  });
  try {
    const r = diagnose(root, fakeOpenSpec(root));
    assert.equal(check(r, 'Verification', 'Commands').status, 'warn');
    assert.equal(check(r, 'Verification', 'Trust'), undefined);
    assert.equal(r.healthy, true);
  } finally {
    cleanup(root);
  }
});

test('doctor reports an invalid component definition without crashing', () => {
  const root = workspace({
    config: validConfig.replace('components: {}', 'components:\n  bad:\n    path: ../outside'),
  });
  try {
    const r = diagnose(root, fakeOpenSpec(root));
    assert.equal(check(r, 'Project', 'Components').status, 'fail');
  } finally {
    cleanup(root);
  }
});

test('doctor warns about an empty AGENTS.md, and says when it replaces the workspace one', () => {
  const root = workspace({
    config: validConfig.replace('components: {}', 'components:\n  api:\n    path: ./apps/api'),
  });
  try {
    fs.mkdirSync(path.join(root, 'apps', 'api'), { recursive: true });
    assert.equal(
      check(diagnose(root, fakeOpenSpec(root)), 'Project', 'AGENTS.md (api)'),
      undefined,
      'no file, no warning',
    );

    fs.writeFileSync(path.join(root, 'AGENTS.md'), '# Guide\n');
    fs.writeFileSync(path.join(root, 'apps', 'api', 'AGENTS.md'), '  \n');
    const r = diagnose(root, fakeOpenSpec(root));
    const found = check(r, 'Project', 'AGENTS.md (api)');
    assert.equal(found.status, 'warn');
    assert.equal(found.required, false);
    assert.match(found.detail, /apps[\\/]api[\\/]AGENTS\.md is empty and replaces the workspace one/);
    assert.match(found.detail, /writing-for-agents/);
    assert.equal(r.healthy, true);
    assert.equal(r.exitCode, 0);

    fs.writeFileSync(path.join(root, 'apps', 'api', 'AGENTS.md'), '# API guide\n');
    assert.equal(check(diagnose(root, fakeOpenSpec(root)), 'Project', 'AGENTS.md (api)'), undefined);
  } finally {
    cleanup(root);
  }
});

test('doctor warns about an empty workspace AGENTS.md without saying it replaces anything', () => {
  const root = workspace({ config: validConfig });
  try {
    fs.writeFileSync(path.join(root, 'AGENTS.md'), '');
    const found = check(diagnose(root, fakeOpenSpec(root)), 'Project', 'AGENTS.md');
    assert.equal(found.status, 'warn');
    assert.match(found.detail, /^AGENTS\.md is empty; add guidance/);
  } finally {
    cleanup(root);
  }
});
