import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { workingTreeFingerprint } from '../../lib/fingerprint.mjs';
import { cleanup, mkdir, tempDir, write } from './helpers.mjs';

const git = (cwd, ...args) => {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
};

function repo() {
  const root = tempDir('truss-fingerprint-');
  git(root, 'init', '-q');
  git(root, 'config', 'user.email', 'truss@example.invalid');
  git(root, 'config', 'user.name', 'TRUSS Test');
  write(root, 'src/a.ts', 'export const a = 1;\n');
  write(root, 'openspec/changes/x/tasks.md', '- [ ] one\n');
  git(root, 'add', '-A');
  git(root, 'commit', '-qm', 'base');
  return root;
}
const print = (root) => workingTreeFingerprint(root).fingerprint;

test('the fingerprint changes with every edit, including a second edit of the same file', () => {
  const root = repo();
  try {
    const clean = print(root);
    assert.match(clean, /^[0-9a-f]{64}$/);
    assert.equal(print(root), clean, 'reading it twice gives the same answer');

    fs.appendFileSync(path.join(root, 'src/a.ts'), '// one\n');
    const first = print(root);
    assert.notEqual(first, clean);
    fs.appendFileSync(path.join(root, 'src/a.ts'), '// two\n');
    assert.notEqual(print(root), first, 'status alone could not tell these apart');
  } finally {
    cleanup(root);
  }
});

test('a new file, a deleted file and a restored file are all seen', () => {
  const root = repo();
  try {
    const clean = print(root);
    write(root, 'src/new.ts', 'x\n');
    const added = print(root);
    assert.notEqual(added, clean);
    assert.equal(workingTreeFingerprint(root).files, 2);

    fs.rmSync(path.join(root, 'src/new.ts'));
    assert.equal(print(root), clean, 'back to the committed state');
    fs.rmSync(path.join(root, 'src/a.ts'));
    assert.notEqual(print(root), clean);
    assert.equal(workingTreeFingerprint(root).files, 0);
    git(root, 'checkout', '--', 'src/a.ts');
    assert.equal(print(root), clean);
  } finally {
    cleanup(root);
  }
});

test('staging or committing the same content does not change it', () => {
  const root = repo();
  try {
    fs.appendFileSync(path.join(root, 'src/a.ts'), '// edit\n');
    write(root, 'src/new.ts', 'x\n');
    const edited = print(root);
    git(root, 'add', '-A');
    assert.equal(print(root), edited, 'staged');
    git(root, 'commit', '-qm', 'edit');
    assert.equal(print(root), edited, 'committed');
  } finally {
    cleanup(root);
  }
});

test('.truss/, any openspec/ folder and ignored files are left out', () => {
  const root = repo();
  try {
    const clean = print(root);
    write(root, '.truss/verification/latest.json', '{}');
    write(root, 'openspec/changes/x/tasks.md', '- [x] one\n');
    write(root, 'apps/api/openspec/specs/s.md', 'spec\n');
    assert.equal(print(root), clean, 'neither the evidence nor the specs are the code');

    write(root, '.gitignore', 'dist/\n');
    const ignoring = print(root);
    write(root, 'dist/out.js', 'built\n');
    assert.equal(print(root), ignoring, 'ignored output is not the code');
  } finally {
    cleanup(root);
  }
});

test('the fingerprint works with no commit yet, and for a project folder inside a repository', () => {
  const root = tempDir('truss-fingerprint-');
  try {
    git(root, 'init', '-q');
    write(root, 'a.ts', 'a\n');
    const first = print(root);
    fs.appendFileSync(path.join(root, 'a.ts'), 'b\n');
    assert.notEqual(print(root), first);

    git(root, 'config', 'user.email', 'truss@example.invalid');
    git(root, 'config', 'user.name', 'TRUSS Test');
    write(root, 'calculation/x.ts', 'x\n');
    write(root, 'control-plane/y.ts', 'y\n');
    const calculation = path.join(root, 'calculation');
    const before = print(calculation);
    assert.equal(workingTreeFingerprint(calculation).files, 1, 'only its own folder');
    fs.appendFileSync(path.join(root, 'control-plane/y.ts'), 'more\n');
    assert.equal(print(calculation), before, 'the other folder is not its business');
  } finally {
    cleanup(root);
  }
});

test('a symbolic link is hashed by where it points, and a folder that is not a work tree gives null', () => {
  const root = repo();
  try {
    if (process.platform !== 'win32') {
      fs.symlinkSync('a.ts', path.join(root, 'src/link.ts'));
      const linked = print(root);
      fs.rmSync(path.join(root, 'src/link.ts'));
      fs.symlinkSync('other.ts', path.join(root, 'src/link.ts'));
      assert.notEqual(print(root), linked);
    }
  } finally {
    cleanup(root);
  }
  const plain = tempDir('truss-fingerprint-');
  try {
    mkdir(plain, 'src');
    assert.equal(workingTreeFingerprint(plain), null);
  } finally {
    cleanup(plain);
  }
});

test('a submodule is kept as the commit the index holds, and does not break the fingerprint', (t) => {
  const inner = repo();
  const outer = repo();
  try {
    const add = spawnSync('git', ['-c', 'protocol.file.allow=always', 'submodule', 'add', '-q', inner, 'vendor'], {
      cwd: outer,
      encoding: 'utf8',
    });
    if (add.status !== 0) return t.skip(`this Git cannot add a local submodule: ${add.stderr}`);
    const before = workingTreeFingerprint(outer);
    assert.ok(before, 'a folder that is a submodule is not read as a file');
    fs.appendFileSync(path.join(outer, 'src/a.ts'), '// edit\n');
    assert.notEqual(workingTreeFingerprint(outer).fingerprint, before.fingerprint, 'the project is still seen');
  } finally {
    cleanup(inner);
    cleanup(outer);
  }
});

test('many untracked files, and names with spaces or a line break, are read and tell apart', () => {
  const root = repo();
  try {
    for (let i = 0; i < 300; i += 1) write(root, `gen/f${i}.txt`, `${i}\n`);
    write(root, 'my file.txt', 'one\n');
    fs.writeFileSync(path.join(root, 'two\nlines.txt'), 'two\n');
    const before = workingTreeFingerprint(root);
    assert.equal(before.files, 1 + 300 + 2, 'src/a.ts, the generated files and the two odd names');
    assert.notEqual(before.ids['my file.txt'], before.ids['two\nlines.txt']);
    fs.appendFileSync(path.join(root, 'two\nlines.txt'), 'more\n');
    fs.appendFileSync(path.join(root, 'gen', 'f7.txt'), 'more\n');
    const after = workingTreeFingerprint(root);
    assert.notEqual(after.fingerprint, before.fingerprint);
    const changed = Object.keys(after.ids).filter((file) => after.ids[file] !== before.ids[file]);
    assert.deepEqual(changed.sort(), ['gen/f7.txt', 'two\nlines.txt']);
  } finally {
    cleanup(root);
  }
});
