import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { evaluateTestGate } from '../../lib/require-tests.mjs';
import { workspace } from '../integration/helpers.mjs';
import { cleanup } from './helpers.mjs';

const git = (root, ...args) => {
  const r = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
  assert.equal(r.status, 0, `git ${args.join(' ')}: ${r.stderr}`);
};
const put = (root, rel, text = 'x\n') => {
  fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
  fs.writeFileSync(path.join(root, rel), text);
};
const commitAll = (root, message) => {
  git(root, 'add', '-A');
  git(root, 'commit', '-qm', message);
};
const cfg = (verification = {}, components = {}) => ({
  verification: { tests_required: 'block', ...verification },
  components,
});
// A repo whose base branch already has code and tests, with HEAD on a feature branch.
function repo(setup = () => {}) {
  const root = workspace({ config: null });
  put(root, 'src/app.js');
  put(root, 'test/app.test.js');
  setup(root);
  commitAll(root, 'base');
  git(root, 'checkout', '-qb', 'feature');
  return root;
}
const evaluate = (root, verification, components) => evaluateTestGate(root, cfg(verification, components));
const withRepo = (setup, fn) => {
  const root = repo(setup);
  try {
    fn(root);
  } finally {
    cleanup(root);
  }
};

test('off (the default) does nothing, even outside a repository', () => {
  assert.deepEqual(evaluateTestGate('/nonexistent', { verification: {} }), {
    mode: 'off',
    status: 'skipped',
    blocking: false,
  });
  assert.equal(evaluateTestGate('/nonexistent', { verification: { tests_required: 'off' } }).status, 'skipped');
});

test('source changed without tests is a violation, blocking only in block mode', () => {
  withRepo(undefined, (root) => {
    put(root, 'src/app.js', 'changed\n');
    const block = evaluate(root);
    assert.equal(block.status, 'violation');
    assert.equal(block.blocking, true);
    assert.deepEqual(block.violations, [{ component: 'workspace', sourceFiles: ['src/app.js'] }]);
    const warn = evaluate(root, { tests_required: 'warn' });
    assert.equal(warn.status, 'violation');
    assert.equal(warn.blocking, false);
  });
});

test('source and tests changed together pass', () => {
  withRepo(undefined, (root) => {
    put(root, 'src/app.js', 'changed\n');
    put(root, 'test/app.test.js', 'changed\n');
    const r = evaluate(root);
    assert.equal(r.status, 'passed');
    assert.equal(r.sourceFiles, 1);
    assert.equal(r.testFiles, 1);
  });
});

test('changes that touch only tests, only docs, or nothing pass', () => {
  withRepo(undefined, (root) => {
    assert.equal(evaluate(root).status, 'passed');
    put(root, 'README.md', 'docs\n');
    put(root, 'src/notes.md', 'not code\n');
    put(root, 'src/data.json', '{}\n');
    assert.equal(evaluate(root).status, 'passed');
    assert.equal(evaluate(root).sourceFiles, 0);
    put(root, 'test/app.test.js', 'changed\n');
    assert.equal(evaluate(root).status, 'passed');
  });
});

test('committed work on the branch is compared against the base, not only uncommitted changes', () => {
  withRepo(undefined, (root) => {
    put(root, 'src/app.js', 'committed change\n');
    commitAll(root, 'work');
    const r = evaluate(root);
    assert.equal(r.status, 'violation');
    assert.ok(r.base.ref === 'main' || r.base.ref === 'master');
    put(root, 'test/app.test.js', 'committed test\n');
    commitAll(root, 'tests');
    assert.equal(evaluate(root).status, 'passed');
  });
});

test('staged changes and new untracked files count', () => {
  withRepo(undefined, (root) => {
    put(root, 'src/new.js');
    assert.equal(evaluate(root).status, 'violation');
    git(root, 'add', 'src/new.js');
    assert.equal(evaluate(root).status, 'violation');
    put(root, 'test/new.test.js');
    assert.equal(evaluate(root).status, 'passed');
  });
});

test('deleting source does not require tests', () => {
  withRepo(undefined, (root) => {
    fs.rmSync(path.join(root, 'src', 'app.js'));
    assert.equal(evaluate(root).status, 'passed');
  });
});

test('test files are recognized by name, and files outside source directories are ignored', () => {
  withRepo(
    (root) => put(root, 'lib/util.js'),
    (root) => {
      put(root, 'lib/util.js', 'changed\n');
      put(root, 'lib/util.test.js');
      assert.equal(evaluate(root).status, 'passed');
      put(root, 'tools/build.js', 'not under a source directory\n');
      assert.equal(evaluate(root).violations.length, 0);
    },
  );
});

test('monorepo: each component needs its own tests', () => {
  const root = workspace({ config: null });
  try {
    for (const name of ['api', 'worker']) {
      put(root, `apps/${name}/src/index.js`);
      put(root, `apps/${name}/test/index.test.js`);
    }
    commitAll(root, 'base');
    git(root, 'checkout', '-qb', 'feature');
    const components = { api: { path: 'apps/api' }, worker: { path: 'apps/worker' } };
    put(root, 'apps/api/src/index.js', 'changed\n');
    put(root, 'apps/worker/test/index.test.js', 'changed\n');
    const r = evaluate(root, {}, components);
    assert.equal(r.status, 'violation');
    assert.deepEqual(
      r.violations.map((v) => v.component),
      ['api'],
    );
    put(root, 'apps/api/test/index.test.js', 'changed\n');
    assert.equal(evaluate(root, {}, components).status, 'passed');
  } finally {
    cleanup(root);
  }
});

test('source_paths and test_paths override the detected directories', () => {
  withRepo(
    (root) => {
      put(root, 'server/handler.js');
      put(root, 'checks/handler.js');
    },
    (root) => {
      put(root, 'server/handler.js', 'changed\n');
      assert.equal(evaluate(root).status, 'passed', 'server/ is not a detected source directory');
      const custom = { source_paths: ['./server/'], test_paths: ['checks'] };
      assert.equal(evaluate(root, custom).status, 'violation');
      put(root, 'checks/handler.js', 'changed\n');
      assert.equal(evaluate(root, custom).status, 'passed');
    },
  );
});

test('an explicit base_ref is used, and an unknown one cannot be evaluated', () => {
  withRepo(undefined, (root) => {
    put(root, 'src/app.js', 'changed\n');
    commitAll(root, 'work');
    git(root, 'branch', 'release');
    assert.equal(evaluate(root, { base_ref: 'release' }).status, 'passed', 'nothing changed since release');
    const missing = evaluate(root, { base_ref: 'nope' });
    assert.equal(missing.status, 'unknown');
    assert.match(missing.reason, /"nope" does not exist/);
    assert.equal(missing.blocking, false);
  });
});

test('outside a repository or before the first commit it is unknown and never blocks', () => {
  const plain = workspace({ config: null, git: false });
  const empty = workspace({ config: null, git: false });
  try {
    const outside = evaluate(plain);
    assert.equal(outside.status, 'unknown');
    assert.equal(outside.blocking, false);
    assert.match(outside.reason, /not a Git work tree/);
    git(empty, 'init', '-q');
    assert.match(evaluate(empty).reason, /no commits/);
  } finally {
    cleanup(plain);
    cleanup(empty);
  }
});

test('a repository whose only branch is unusual has no detectable base and reports how to fix it', () => {
  const root = workspace({ config: null });
  try {
    git(root, 'branch', '-m', 'trunk');
    put(root, 'src/app.js');
    const r = evaluate(root);
    assert.equal(r.status, 'unknown');
    assert.match(r.reason, /verification\.base_ref/);
    assert.equal(r.blocking, false);
    assert.equal(evaluate(root, { base_ref: 'trunk' }).status, 'violation');
  } finally {
    cleanup(root);
  }
});

test('a component path that does not exist makes the gate unknown instead of crashing', () => {
  withRepo(undefined, (root) => {
    const r = evaluate(root, {}, { ghost: { path: 'apps/ghost' } });
    assert.equal(r.status, 'unknown');
    assert.match(r.reason, /ghost/);
  });
});
