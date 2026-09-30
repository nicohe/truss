import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { findExecutable, parseNpmCmdShim, pickWindowsExecutable, resolveLaunch, spawnCli } from '../../lib/spawn.mjs';
import { fakeBin, fakeCli, workspace } from '../integration/helpers.mjs';
import { cleanup } from './helpers.mjs';

// What npm's cmd-shim writes for a global install of a package whose bin is bin/cli.js.
const npmShim = (script) =>
  [
    '@ECHO off',
    'GOTO start',
    ':find_dp0',
    'SET dp0=%~dp0',
    'EXIT /b',
    ':start',
    'SETLOCAL',
    'CALL :find_dp0',
    '',
    'IF EXIST "%dp0%\\node.exe" (',
    '  SET "_prog=%dp0%\\node.exe"',
    ') ELSE (',
    '  SET "_prog=node"',
    '  SET PATHEXT=%PATHEXT:;.JS;=;%',
    ')',
    '',
    `endLocal & goto #_undefined_# 2>NUL || title %COMSPEC% & "%_prog%"  "%dp0%\\${script}" %*`,
    '',
  ].join('\r\n');

test('where output: the extensionless npm sh shim is skipped in favor of the .cmd shim', () => {
  const lines = ['C:\\npm\\openspec', 'C:\\npm\\openspec.cmd'];
  assert.equal(pickWindowsExecutable(lines), 'C:\\npm\\openspec.cmd');
});

test('where output: .exe wins when it is listed first, and nothing runnable yields null', () => {
  assert.equal(pickWindowsExecutable(['C:\\bin\\graphify.exe', 'C:\\bin\\graphify.cmd']), 'C:\\bin\\graphify.exe');
  assert.equal(pickWindowsExecutable(['C:\\npm\\openspec', 'C:\\npm\\openspec.ps1']), null);
  assert.equal(pickWindowsExecutable([]), null);
});

test('npm cmd shim: the target script is extracted from the last line', () => {
  assert.deepEqual(parseNpmCmdShim(npmShim('node_modules\\@fission-ai\\openspec\\bin\\openspec.js')), [
    'node_modules',
    '@fission-ai',
    'openspec',
    'bin',
    'openspec.js',
  ]);
});

test('pnpm-style shims with .. segments and .mjs targets are understood', () => {
  const parsed = parseNpmCmdShim(npmShim('..\\..\\global\\5\\node_modules\\x\\bin.mjs'));
  assert.deepEqual(parsed, ['..', '..', 'global', '5', 'node_modules', 'x', 'bin.mjs']);
});

test('a .cmd that is not an npm shim is not parsed', () => {
  assert.equal(parseNpmCmdShim('@echo off\r\nsome-tool.exe %*\r\n'), null);
  assert.equal(parseNpmCmdShim(''), null);
});

test('POSIX and .exe launches pass through untouched', () => {
  assert.deepEqual(resolveLaunch('/usr/bin/openspec', ['--version'], { platform: 'linux' }), {
    command: '/usr/bin/openspec',
    args: ['--version'],
  });
  assert.deepEqual(resolveLaunch('C:\\bin\\graphify.exe', ['x'], { platform: 'win32' }), {
    command: 'C:\\bin\\graphify.exe',
    args: ['x'],
  });
});

test('on Windows an npm .cmd shim is launched as node + script, arguments untouched', () => {
  const root = workspace({ config: null, git: false });
  try {
    const script = path.join(root, 'node_modules', 'pkg', 'bin', 'cli.js');
    fs.mkdirSync(path.dirname(script), { recursive: true });
    fs.writeFileSync(script, '');
    const shim = path.join(root, 'cli.cmd');
    fs.writeFileSync(shim, npmShim('node_modules\\pkg\\bin\\cli.js'));
    const dangerous = 'Fix A & B | calc "quoted" %PATH% ^caret';
    const launch = resolveLaunch(shim, ['new', '--goal', dangerous], { platform: 'win32' });
    assert.equal(launch.command, process.execPath);
    assert.deepEqual(launch.args, [script, 'new', '--goal', dangerous]);
  } finally {
    cleanup(root);
  }
});

test('on Windows a .cmd whose script is missing or that is not an npm shim cannot be launched', () => {
  const root = workspace({ config: null, git: false });
  try {
    const missing = path.join(root, 'missing.cmd');
    fs.writeFileSync(missing, npmShim('node_modules\\nope\\bin\\cli.js'));
    assert.equal(resolveLaunch(missing, [], { platform: 'win32' }), null);
    const custom = path.join(root, 'custom.bat');
    fs.writeFileSync(custom, '@echo off\r\necho hi\r\n');
    assert.equal(resolveLaunch(custom, [], { platform: 'win32' }), null);
    assert.equal(resolveLaunch(path.join(root, 'absent.cmd'), [], { platform: 'win32' }), null);
  } finally {
    cleanup(root);
  }
});

test('spawnCli launches a real npm-style fake CLI on this OS and reports launch failures', () => {
  const root = workspace({ config: null, git: false });
  try {
    const dir = fakeCli(fakeBin(root), 'tool', "console.log('hello ' + process.argv.slice(2).join('|'));");
    const executable = process.platform === 'win32' ? path.join(dir, 'tool.cmd') : path.join(dir, 'tool');
    const ok = spawnCli(executable, ['a b', '&x']);
    assert.equal(ok.status, 0, ok.stderr);
    assert.equal(ok.stdout.trim(), 'hello a b|&x');
    const missing = spawnCli(path.join(dir, 'nope'), []);
    assert.equal(missing.status, null);
    assert.ok(missing.error);
  } finally {
    cleanup(root);
  }
});

test('findExecutable resolves a CLI from PATH and returns null when absent', () => {
  const root = workspace({ config: null, git: false });
  const saved = process.env.PATH;
  try {
    const dir = fakeCli(fakeBin(root), 'truss-fake-tool', 'process.exit(0);');
    process.env.PATH = [dir, saved].join(path.delimiter);
    const found = findExecutable('truss-fake-tool');
    assert.ok(found, 'expected the fake tool to be found');
    assert.match(found, process.platform === 'win32' ? /\.cmd$/i : /truss-fake-tool$/);
    assert.equal(findExecutable('truss-definitely-not-installed'), null);
  } finally {
    process.env.PATH = saved;
    cleanup(root);
  }
});
