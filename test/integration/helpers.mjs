import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const trussRoot = path.resolve(here, '../..');
export const cli = path.join(trussRoot, 'bin', 'truss.mjs');

// ANSI escapes are matched through a RegExp built from the ESC character (control characters in regex literals are linted).
export const ESC = String.fromCharCode(27);
export const plain = (s) => s.replace(new RegExp(`${ESC}\\[[0-9;]*m`, 'g'), '');
export const hasAnsi = (s) => s.includes(`${ESC}[`);

export function workspace({ config = null, git = true, ignore = true } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'truss-integration-'));
  fs.mkdirSync(path.join(root, '.truss', 'schema'), { recursive: true });
  fs.copyFileSync(
    path.join(trussRoot, '.truss', 'schema', 'config.schema.json'),
    path.join(root, '.truss', 'schema', 'config.schema.json'),
  );
  if (config !== null) fs.writeFileSync(path.join(root, '.truss', 'config.yaml'), config);
  if (ignore) fs.writeFileSync(path.join(root, '.gitignore'), '.truss/\n');
  if (git) {
    spawnSync('git', ['init', '-q'], { cwd: root });
    spawnSync('git', ['config', 'user.email', 'truss@example.invalid'], { cwd: root });
    spawnSync('git', ['config', 'user.name', 'TRUSS Test'], { cwd: root });
    fs.writeFileSync(path.join(root, 'README.md'), '# fixture\n');
    spawnSync('git', ['add', 'README.md', '.gitignore'], { cwd: root });
    spawnSync('git', ['commit', '-qm', 'fixture'], { cwd: root });
  }
  return root;
}

export function fakeBin(root) {
  const dir = path.join(root, '.fake-bin');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// Fake CLIs are installed the way npm installs a global one, so they behave the same on every OS:
//   <name>       POSIX sh shim          <name>.cmd   Windows cmd shim (npm's cmd-shim format)
//   node_modules/<name>-fake/bin/<name>.js   the Node script both shims launch
// On Windows `where <name>` lists the extensionless sh shim first, which cannot be executed there.
export function fakeCli(dir, name, source) {
  const pkg = path.join(dir, 'node_modules', `${name}-fake`);
  fs.mkdirSync(path.join(pkg, 'bin'), { recursive: true });
  fs.writeFileSync(path.join(pkg, 'package.json'), '{"type":"commonjs"}\n');
  fs.writeFileSync(path.join(pkg, 'bin', `${name}.js`), source);
  const sh = path.join(dir, name);
  fs.writeFileSync(
    sh,
    `#!/bin/sh\nbasedir=$(dirname "$0")\nexec "${process.execPath}" "$basedir/node_modules/${name}-fake/bin/${name}.js" "$@"\n`,
  );
  fs.chmodSync(sh, 0o755);
  const cmd = [
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
    `endLocal & goto #_undefined_# 2>NUL || title %COMSPEC% & "%_prog%"  "%dp0%\\node_modules\\${name}-fake\\bin\\${name}.js" %*`,
    '',
  ].join('\r\n');
  fs.writeFileSync(path.join(dir, `${name}.cmd`), cmd);
  return dir;
}

const seedOpenSpecProject = (root) => {
  fs.mkdirSync(path.join(root, 'openspec', 'specs'), { recursive: true });
  fs.mkdirSync(path.join(root, 'openspec', 'changes'), { recursive: true });
  fs.writeFileSync(path.join(root, 'openspec', 'config.yaml'), 'schema: spec-driven\n');
};

export function fakeOpenSpec(root, { version = '1.13.2', initialized = true, initCreatesProject = true } = {}) {
  fakeCli(
    fakeBin(root),
    'openspec',
    `const fs = require('node:fs');
const [cmd] = process.argv.slice(2);
if (cmd === '--version') console.log(${JSON.stringify(version)});
else if (cmd === 'init' && ${initCreatesProject}) {
  fs.mkdirSync('openspec/specs', { recursive: true });
  fs.mkdirSync('openspec/changes', { recursive: true });
  fs.writeFileSync('openspec/config.yaml', 'schema: spec-driven\\n');
} else if (cmd === 'status') console.log('{"artifacts":[],"applyRequires":[]}');
`,
  );
  if (initialized) seedOpenSpecProject(root);
  return path.join(root, '.fake-bin');
}

// A stateful OpenSpec that mirrors the real CLI (checked against @fission-ai/openspec 1.12):
// - `status`: an artifact is done when its file exists; `isPlanningComplete` and `isComplete` both mean "all
//   artifacts exist" (NOT "all tasks are checked off");
// - `instructions apply`: task progress is read from the checkboxes of tasks.md.
export function fakeStatefulOpenSpec(root, { initialized = false } = {}) {
  fakeCli(
    fakeBin(root),
    'openspec',
    `const fs = require('node:fs');
const path = require('node:path');
const args = process.argv.slice(2);
const changeArg = () => args[args.indexOf('--change') + 1];
const dirOf = (name) => path.resolve('openspec', 'changes', name);
const exists = (dir, file) => fs.existsSync(path.join(dir, file));
const hasSpecs = (dir) => exists(dir, 'specs') && fs.readdirSync(path.join(dir, 'specs')).length > 0;
const DEPENDS = { proposal: [], specs: ['proposal'], design: ['proposal'], tasks: ['specs', 'design'] };
const present = (dir) => ({
  proposal: exists(dir, 'proposal.md'),
  specs: hasSpecs(dir),
  design: exists(dir, 'design.md'),
  tasks: exists(dir, 'tasks.md'),
});
const tasksOf = (dir) => {
  if (!exists(dir, 'tasks.md')) return [];
  const boxes = fs.readFileSync(path.join(dir, 'tasks.md'), 'utf8').split('\\n').map((line) => line.match(/^\\s*- \\[( |x|X)\\] (.+)$/)).filter(Boolean);
  return boxes.map((m, index) => ({ id: String(index + 1), description: m[2], done: m[1] !== ' ' }));
};
if (args[0] === '--version') console.log('1.12.0');
else if (args[0] === 'init') {
  fs.mkdirSync('openspec/specs', { recursive: true });
  fs.mkdirSync('openspec/changes', { recursive: true });
  if (!fs.existsSync('openspec/config.yaml')) fs.writeFileSync('openspec/config.yaml', 'schema: spec-driven\\n');
} else if (args[0] === 'new' && args[1] === 'change') {
  const dir = dirOf(args[2]);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, '.openspec.yaml'), 'schema: spec-driven\\n');
  console.log(JSON.stringify({ change: { id: args[2], path: dir, schema: 'spec-driven' } }));
} else if (args[0] === 'status') {
  const name = changeArg();
  const dir = dirOf(name);
  const done = present(dir);
  const artifacts = Object.keys(DEPENDS).map((id) => ({
    id,
    status: done[id] ? 'done' : DEPENDS[id].every((dep) => done[dep]) ? 'ready' : 'blocked',
  }));
  const all = Object.values(done).every(Boolean);
  console.log(JSON.stringify({ changeName: name, changeRoot: dir, artifacts, applyRequires: ['tasks'], isPlanningComplete: all, isComplete: all }));
} else if (args[0] === 'instructions' && args[1] === 'apply') {
  const name = changeArg();
  const tasks = tasksOf(dirOf(name));
  const complete = tasks.filter((t) => t.done).length;
  const state = !exists(dirOf(name), 'tasks.md') ? 'blocked' : tasks.length && complete === tasks.length ? 'all_done' : 'ready';
  console.log(JSON.stringify({ changeName: name, state, progress: { total: tasks.length, complete, remaining: tasks.length - complete }, tasks }));
}
`,
  );
  if (initialized) seedOpenSpecProject(root);
  return path.join(root, '.fake-bin');
}

// Behavior is a JS snippet run after the --version check, e.g. "process.exit(3)".
export function fakeGraphify(root, { withIndex = false, behavior = '' } = {}) {
  fakeCli(
    fakeBin(root),
    'graphify',
    `const fs = require('node:fs');
if (process.argv[2] === '--version') { console.log('graphify 0.1.0'); process.exit(0); }
${behavior}
`,
  );
  if (withIndex) {
    fs.mkdirSync(path.join(root, 'graphify-out'), { recursive: true });
    fs.writeFileSync(path.join(root, 'graphify-out', 'graph.json'), '{}\n');
    const head = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).stdout.trim();
    fs.writeFileSync(
      path.join(root, 'graphify-out', '.truss-graphify.json'),
      `${JSON.stringify({ gitHead: head, updatedAt: new Date().toISOString() }, null, 2)}\n`,
    );
  }
  return path.join(root, '.fake-bin');
}

export function run(root, args, { binDirs = [], env = {} } = {}) {
  // An explicit env.PATH replaces the inherited one, so a test can hide host-installed CLIs.
  const pathValue = [...binDirs, env.PATH ?? process.env.PATH].filter(Boolean).join(path.delimiter);
  return spawnSync(process.execPath, [cli, ...args], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, TRUSS_HOME: path.join(root, '.truss-home'), TRUSS_TRUST: '', ...env, PATH: pathValue },
  });
}

export const validConfig = `version: 1
spec:
  mode: anchored
  gherkin: true
  zone_guard: false
development:
  bdd: true
  tdd: true
verification:
  commands:
    - node -e "process.exit(0)"
integrations:
  graphify:
    enabled: true
    required: false
components: {}
`;
