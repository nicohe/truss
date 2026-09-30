import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { hasAnsi, run, trussRoot, validConfig, workspace } from './helpers.mjs';

const packageVersion = JSON.parse(fs.readFileSync(path.join(trussRoot, 'package.json'), 'utf8')).version;

test('--version, -v and version print the installed version and nothing else', () => {
  const root = workspace();
  for (const args of [['--version'], ['-v'], ['version']]) {
    const result = run(root, args);
    assert.equal(result.status, 0, args.join(' '));
    assert.equal(result.stdout, `truss ${packageVersion}\n`, args.join(' '));
  }
});

test('version needs no project: it works outside a TRUSS workspace', () => {
  const root = workspace({ config: null });
  assert.equal(run(root, ['--version']).status, 0);
});

test('no command, --help and -h list the commands and exit 0', () => {
  const root = workspace();
  for (const args of [[], ['--help'], ['-h'], ['help']]) {
    const result = run(root, args);
    assert.equal(result.status, 0, args.join(' ') || '(none)');
    assert.match(result.stdout, /Usage: truss <command>/);
    assert.match(result.stdout, /verify \[--trust\]/);
    assert.match(result.stdout, /Run "truss <command> --help"/);
  }
});

test('an unknown command fails with exit code 2, names itself and suggests the closest command', () => {
  const root = workspace();
  const typo = run(root, ['verfy']);
  assert.equal(typo.status, 2);
  assert.match(typo.stdout, /× Unknown command "verfy"\./);
  assert.match(typo.stdout, /Did you mean "verify"\?/);
  assert.doesNotMatch(typo.stdout, /Usage: truss <command>/, 'it should not dump the whole command list');

  const far = run(root, ['deploy']);
  assert.equal(far.status, 2);
  assert.doesNotMatch(far.stdout, /Did you mean/);
  assert.match(far.stdout, /Run "truss help"/);
});

test('an unknown command is not silently a success for a script', () => {
  const root = workspace({ config: validConfig });
  const result = run(root, ['verfy', '--trust']);
  assert.notEqual(result.status, 0);
  assert.equal(fs.existsSync(path.join(root, '.truss', 'verification', 'latest.json')), false);
});

test('<command> --help explains the command and does not run it', () => {
  const marker = "node -e \"require('fs').writeFileSync('ran','x')\"";
  const root = workspace({ config: validConfig.replace('    - node -e "process.exit(0)"', `    - ${marker}`) });
  for (const args of [
    ['verify', '--help'],
    ['verify', '-h', '--trust'],
    ['help', 'verify'],
  ]) {
    const result = run(root, args);
    assert.equal(result.status, 0, args.join(' '));
    assert.match(result.stdout, /Usage: truss verify \[--trust\]/);
    assert.match(result.stdout, /Exit codes:/);
    assert.match(result.stdout, /Docs: docs\/en\/reference\/verify\.md/);
  }
  assert.equal(fs.existsSync(path.join(root, 'ran')), false, 'verify ran a command');
  assert.equal(fs.existsSync(path.join(root, '.truss', 'verification', 'latest.json')), false);
});

test('new --help does not create a change', () => {
  const root = workspace({ config: validConfig });
  const result = run(root, ['new', '--help']);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /--component <name>/);
  assert.equal(fs.existsSync(path.join(root, '.truss', 'state.json')), false);
});

test('help for an unknown command fails with exit code 2', () => {
  const result = run(workspace(), ['help', 'nope']);
  assert.equal(result.status, 2);
  assert.match(result.stdout, /Unknown command "nope"/);
});

test('help output is plain when it is not going to a terminal', () => {
  const result = run(workspace(), ['verify', '--help']);
  assert.equal(hasAnsi(result.stdout), false);
});
