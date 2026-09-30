import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { plain, trussRoot } from '../integration/helpers.mjs';

export * from '../integration/helpers.mjs';

// The documented quick start: TRUSS is installed apart from the project (README: a clone inside the project's
// `.truss/`) and run on it. These helpers build that setup. The install copies the working tree, so a test also
// covers uncommitted changes.
export function installTruss(destination) {
  fs.cpSync(trussRoot, destination, {
    recursive: true,
    filter: (source) => !/[\\/](\.git|node_modules|\.fake-bin|\.truss-home)([\\/]|$)/.test(source),
  });
}

export function newProject() {
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

export const trussRunner =
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
export const cleanupAll = (...dirs) => {
  for (const dir of dirs) fs.rmSync(dir, { recursive: true, force: true });
};
