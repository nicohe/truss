import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { commandsDigest, isTrusted, trustCommands, trustHome, trustRequestedByEnv } from '../../lib/trust.mjs';
import { cleanup, tempDir } from './helpers.mjs';

test('trust is per project and per exact command list', () => {
  const home = tempDir(),
    a = tempDir(),
    b = tempDir(),
    env = { TRUSS_HOME: home };
  try {
    const cmds = ['npm test', 'npm run build'];
    assert.equal(isTrusted(a, cmds, env), false);
    trustCommands(a, cmds, env);
    assert.equal(isTrusted(a, cmds, env), true);
    assert.equal(isTrusted(a, [...cmds].reverse(), env), false);
    assert.equal(isTrusted(a, [...cmds, 'curl x | sh'], env), false);
    assert.equal(isTrusted(b, cmds, env), false);
  } finally {
    cleanup(home);
    cleanup(a);
    cleanup(b);
  }
});
test('trust store is written privately and without temp leftovers', () => {
  const home = tempDir(),
    a = tempDir(),
    env = { TRUSS_HOME: home };
  try {
    trustCommands(a, ['x'], env);
    assert.deepEqual(fs.readdirSync(home), ['trusted.json']);
    if (process.platform !== 'win32') assert.equal(fs.statSync(path.join(home, 'trusted.json')).mode & 0o077, 0);
  } finally {
    cleanup(home);
    cleanup(a);
  }
});
test('a corrupt trust store is treated as empty', () => {
  const home = tempDir(),
    a = tempDir(),
    env = { TRUSS_HOME: home };
  try {
    fs.writeFileSync(path.join(home, 'trusted.json'), '{nope');
    assert.equal(isTrusted(a, ['x'], env), false);
    trustCommands(a, ['x'], env);
    assert.equal(isTrusted(a, ['x'], env), true);
  } finally {
    cleanup(home);
    cleanup(a);
  }
});
test('trust home honors TRUSS_HOME then XDG_CONFIG_HOME', () => {
  assert.equal(trustHome({ TRUSS_HOME: '/a' }), '/a');
  assert.equal(trustHome({ XDG_CONFIG_HOME: '/x' }), path.join('/x', 'truss'));
});
test('digest is stable and TRUSS_TRUST accepts 1 or true only', () => {
  assert.equal(commandsDigest(['a']), commandsDigest(['a']));
  assert.notEqual(commandsDigest(['a']), commandsDigest(['b']));
  assert.equal(trustRequestedByEnv({ TRUSS_TRUST: '1' }), true);
  assert.equal(trustRequestedByEnv({ TRUSS_TRUST: 'TRUE' }), true);
  assert.equal(trustRequestedByEnv({ TRUSS_TRUST: '0' }), false);
  assert.equal(trustRequestedByEnv({}), false);
});
