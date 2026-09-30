import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fakeStatefulOpenSpec, plain, trussRoot } from './helpers.mjs';

// The documented quick start: TRUSS is installed apart from the project (README: a clone inside the project's
// `.truss/`) and run on it. The install holds the schema, skills, policies and workflows; the project must not
// need a copy of any of them. This test copies the working tree, so it also covers uncommitted changes.

function installTruss(destination) {
  fs.cpSync(trussRoot, destination, {
    recursive: true,
    filter: (source) => !/[\\/](\.git|node_modules|\.fake-bin|\.truss-home)([\\/]|$)/.test(source),
  });
}

function newProject() {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), 'truss-quickstart-'));
  spawnSync('git', ['init', '-q'], { cwd: project });
  spawnSync('git', ['config', 'user.email', 'truss@example.invalid'], { cwd: project });
  spawnSync('git', ['config', 'user.name', 'TRUSS Test'], { cwd: project });
  fs.writeFileSync(path.join(project, '.gitignore'), '.truss/\n');
  fs.writeFileSync(path.join(project, 'README.md'), '# project\n');
  spawnSync('git', ['add', '-A'], { cwd: project });
  spawnSync('git', ['commit', '-qm', 'initial'], { cwd: project });
  return project;
}

const layouts = {
  'cloned into the project as .truss (the documented layout)': (project) => path.join(project, '.truss'),
  'installed in a separate directory': (project) => path.join(project, '..', `${path.basename(project)}-truss-install`),
};

const runner =
  (project, install, bin) =>
  (...args) => {
    const result = spawnSync(process.execPath, [path.join(install, 'bin', 'truss.mjs'), ...args], {
      cwd: project,
      encoding: 'utf8',
      env: {
        ...process.env,
        NO_COLOR: '1',
        TRUSS_TRUST: '',
        TRUSS_HOME: path.join(project, '.truss-home'),
        PATH: `${bin}${path.delimiter}${process.env.PATH}`,
      },
    });
    return { status: result.status, out: plain(result.stdout) };
  };
const cleanupAll = (...dirs) => {
  for (const dir of dirs) fs.rmSync(dir, { recursive: true, force: true });
};

for (const [name, locate] of Object.entries(layouts)) {
  test(`quick start works with TRUSS ${name}`, () => {
    const project = newProject();
    const install = locate(project);
    installTruss(install);
    const bin = fakeStatefulOpenSpec(project, { initialized: false });
    const run = runner(project, install, bin);

    try {
      let r = run('init');
      assert.equal(r.status, 0, r.out);
      assert.match(r.out, /created/);
      assert.ok(fs.existsSync(path.join(project, '.truss', 'config.yaml')), 'init writes the project config');
      assert.equal(
        fs.existsSync(path.join(project, '.truss', 'schema')),
        false,
        'the project does not get a copy of the schema',
      );

      r = run('config');
      assert.equal(r.status, 0, r.out);

      r = run('doctor');
      assert.equal(r.status, 0, r.out);
      assert.match(r.out, /Config\s+\.truss\/config\.yaml valid/);

      r = run('skills');
      assert.equal(r.status, 0);
      assert.match(r.out, /● grill-me/);
      assert.match(r.out, /● code-review/);

      r = run('new', 'Add retry policy');
      assert.equal(r.status, 0, r.out);
      r = run('status');
      assert.equal(r.status, 0, r.out);

      // Fill in the planning artifacts so `continue` reaches the implementation instructions.
      const change = path.join(project, 'openspec', 'changes', 'add-retry-policy');
      fs.writeFileSync(path.join(change, 'proposal.md'), '# Proposal\n');
      fs.mkdirSync(path.join(change, 'specs'), { recursive: true });
      fs.writeFileSync(path.join(change, 'specs', 'retry.md'), 'spec\n');
      fs.writeFileSync(path.join(change, 'design.md'), '# Design\n');
      fs.writeFileSync(path.join(change, 'tasks.md'), '- [ ] implement retry\n');
      r = run('continue');
      assert.equal(r.status, 0, r.out);

      // Every path `continue` tells an agent to read must exist from the project's point of view.
      const listed = [...r.out.matchAll(/^- (\S+?)\/? ?(?:\(|$)/gm)].map((match) => match[1]);
      const harnessFiles = listed.filter((entry) => /workflows|policies/.test(entry));
      assert.equal(harnessFiles.length, 2, `expected the workflow and policies paths in:\n${r.out}`);
      for (const entry of harnessFiles) {
        assert.ok(fs.existsSync(path.resolve(project, entry)), `${entry} does not exist from ${project}`);
      }
    } finally {
      cleanupAll(project, install);
    }
  });
}

test('a broken TRUSS installation fails clearly and init leaves no half-created config behind', () => {
  const project = newProject();
  const install = path.join(project, '.truss');
  installTruss(install);
  fs.rmSync(path.join(install, '.truss', 'schema'), { recursive: true });
  const bin = fakeStatefulOpenSpec(project, { initialized: false });
  try {
    const r = runner(project, install, bin)('init');
    assert.equal(r.status, 2, r.out);
    assert.match(r.out, /installation is incomplete: config schema not found/);
    assert.equal(fs.existsSync(path.join(project, '.truss', 'config.yaml')), false, 'no config is left behind');
  } finally {
    cleanupAll(project);
  }
});
