import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { ConfigError } from '../../lib/config.mjs';
import { DEFAULT_CONFIG, initializeProject } from '../../lib/init.mjs';
import { executable, fakeBin, fakeOpenSpec, posix, validConfig, workspace } from '../integration/helpers.mjs';
import { cleanup, mkdir, write } from './helpers.mjs';

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
const withOpenSpec = (bin, fn) => withEnv({ TRUSS_OPENSPEC_PATH: path.join(bin, 'openspec') }, fn);
const noOpenSpec = (fn) => withEnv({ TRUSS_OPENSPEC_PATH: '', PATH: '' }, fn);

test('init creates the default config when none exists', posix, () => {
  const root = workspace({ config: null });
  try {
    const bin = fakeOpenSpec(root);
    const r = withOpenSpec(bin, () => initializeProject(root));
    assert.equal(r.config.state, 'created');
    assert.equal(fs.readFileSync(path.join(root, '.truss', 'config.yaml'), 'utf8'), DEFAULT_CONFIG);
    assert.equal(r.openspec.state, 'adopted');
    assert.equal(r.gitignore.state, 'ignored');
  } finally {
    cleanup(root);
  }
});

test('init adopts an existing valid config without rewriting it', posix, () => {
  const root = workspace({ config: validConfig });
  try {
    const bin = fakeOpenSpec(root);
    const r = withOpenSpec(bin, () => initializeProject(root));
    assert.equal(r.config.state, 'adopted');
    assert.equal(fs.readFileSync(path.join(root, '.truss', 'config.yaml'), 'utf8'), validConfig);
    assert.equal(r.changed, false);
  } finally {
    cleanup(root);
  }
});

test('init never overwrites an invalid config', () => {
  const invalid = 'version: 1\nunknown: true\n';
  const root = workspace({ config: invalid });
  try {
    assert.throws(() => initializeProject(root), ConfigError);
    assert.equal(fs.readFileSync(path.join(root, '.truss', 'config.yaml'), 'utf8'), invalid);
  } finally {
    cleanup(root);
  }
});

test('init reports a missing OpenSpec CLI but still writes the config', () => {
  const root = workspace({ config: null });
  try {
    const r = noOpenSpec(() => initializeProject(root));
    assert.equal(r.config.state, 'created');
    assert.equal(r.openspec.state, 'missing_cli');
  } finally {
    cleanup(root);
  }
});

test('init refuses an incompatible OpenSpec version and does not touch openspec/', posix, () => {
  const root = workspace({ config: validConfig });
  try {
    const bin = fakeOpenSpec(root, { version: '0.9.0', initialized: false });
    const r = withOpenSpec(bin, () => initializeProject(root));
    assert.equal(r.openspec.state, 'incompatible_cli');
    assert.equal(fs.existsSync(path.join(root, 'openspec')), false);
  } finally {
    cleanup(root);
  }
});

test('init preserves a partial or legacy openspec/ directory', posix, () => {
  const root = workspace({ config: validConfig });
  try {
    const bin = fakeOpenSpec(root, { initialized: false });
    mkdir(root, 'openspec/specs');
    write(root, 'openspec/specs/keep.md', 'mine');
    const r = withOpenSpec(bin, () => initializeProject(root));
    assert.equal(r.openspec.state, 'partial_requires_attention');
    assert.equal(fs.readFileSync(path.join(root, 'openspec/specs/keep.md'), 'utf8'), 'mine');
  } finally {
    cleanup(root);
  }
});

test('init reports failure when `openspec init` fails', posix, () => {
  const root = workspace({ config: validConfig });
  try {
    const bin = fakeBin(root);
    executable(bin, 'openspec', 'if [ "${1:-}" = "--version" ]; then echo 1.13.2; exit 0; fi\necho boom >&2\nexit 3');
    const r = withOpenSpec(bin, () => initializeProject(root));
    assert.equal(r.openspec.state, 'init_failed');
    assert.match(r.openspec.init.stderr, /boom/);
  } finally {
    cleanup(root);
  }
});

test('init reports unverified initialization when openspec/ does not appear', posix, () => {
  const root = workspace({ config: validConfig });
  try {
    const bin = fakeOpenSpec(root, { initialized: false, initCreatesProject: false });
    const r = withOpenSpec(bin, () => initializeProject(root));
    assert.equal(r.openspec.state, 'init_unverified');
  } finally {
    cleanup(root);
  }
});

test('init can skip initializing OpenSpec', posix, () => {
  const root = workspace({ config: validConfig });
  try {
    const bin = fakeOpenSpec(root, { initialized: false });
    const r = withOpenSpec(bin, () => initializeProject(root, { initializeOpenSpec: false }));
    assert.equal(r.openspec.state, 'not_initialized');
    assert.equal(fs.existsSync(path.join(root, 'openspec')), false);
  } finally {
    cleanup(root);
  }
});

test('init reports whether .truss/ is git-ignored', () => {
  const root = workspace({ config: validConfig, ignore: false });
  try {
    assert.equal(noOpenSpec(() => initializeProject(root)).gitignore.state, 'missing');
    fs.writeFileSync(path.join(root, '.gitignore'), 'node_modules/\n');
    assert.equal(noOpenSpec(() => initializeProject(root)).gitignore.state, 'not_ignored');
    fs.writeFileSync(path.join(root, '.gitignore'), '.truss\n');
    assert.equal(noOpenSpec(() => initializeProject(root)).gitignore.state, 'ignored');
  } finally {
    cleanup(root);
  }
});
