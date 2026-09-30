import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const trussRoot = path.resolve(here, '../..');
export const cli = path.join(trussRoot, 'bin', 'truss.mjs');

// The fake OpenSpec/Graphify CLIs are POSIX shell scripts, so tests that rely on them cannot run on Windows.
export const posix = { skip: process.platform === 'win32' && 'needs POSIX shell fake CLIs' };

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

export function executable(dir, name, body) {
  const file = path.join(dir, name);
  fs.writeFileSync(file, `#!/bin/sh\nset -eu\n${body}\n`);
  fs.chmodSync(file, 0o755);
  return file;
}

export function fakeOpenSpec(root, { version = '1.13.2', initialized = true, initCreatesProject = true } = {}) {
  const dir = fakeBin(root);
  executable(
    dir,
    'openspec',
    `\
if [ "${'$'}{1:-}" = "--version" ]; then echo "${version}"; exit 0; fi
if [ "${'$'}{1:-}" = "init" ]; then
  ${initCreatesProject ? 'mkdir -p openspec/specs openspec/changes; printf "schema: spec-driven\\n" > openspec/config.yaml' : ':'}
  exit 0
fi
if [ "${'$'}{1:-}" = "status" ]; then printf '%s\\n' '{"artifacts":[],"applyRequires":[]}'; exit 0; fi
if [ "${'$'}{1:-}" = "new" ]; then exit 0; fi
exit 0`,
  );
  if (initialized) {
    fs.mkdirSync(path.join(root, 'openspec', 'specs'), { recursive: true });
    fs.mkdirSync(path.join(root, 'openspec', 'changes'), { recursive: true });
    fs.writeFileSync(path.join(root, 'openspec', 'config.yaml'), 'schema: spec-driven\n');
  }
  return dir;
}

export function fakeGraphify(root, { withIndex = false } = {}) {
  const dir = fakeBin(root);
  executable(dir, 'graphify', `if [ "${'$'}{1:-}" = "--version" ]; then echo 'graphify 0.1.0'; exit 0; fi; exit 0`);
  if (withIndex) {
    fs.mkdirSync(path.join(root, 'graphify-out'), { recursive: true });
    fs.writeFileSync(path.join(root, 'graphify-out', 'graph.json'), '{}\n');
    const head = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).stdout.trim();
    fs.writeFileSync(
      path.join(root, 'graphify-out', '.truss-graphify.json'),
      `${JSON.stringify({ gitHead: head, updatedAt: new Date().toISOString() }, null, 2)}\n`,
    );
  }
  return dir;
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
