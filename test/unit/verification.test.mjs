import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { runVerification, staleEvidence } from '../../lib/verification.mjs';
import { cleanup, tempDir } from './helpers.mjs';

test('verification passes sequential successful commands and writes evidence', () => {
  const d = tempDir();
  try {
    const r = runVerification(
      d,
      [`${process.execPath} -e "process.exit(0)"`, `${process.execPath} -e "process.exit(0)"`],
      { stdio: 'ignore' },
    );
    assert.equal(r.ok, true);
    assert.equal(r.evidence.commands.length, 2);
    assert.ok(fs.existsSync(path.join(d, r.evidencePath)));
  } finally {
    cleanup(d);
  }
});
test('verification is fail-fast', () => {
  const d = tempDir();
  try {
    const marker = path.join(d, 'should-not-exist');
    const r = runVerification(
      d,
      [
        `${process.execPath} -e "process.exit(7)"`,
        `${process.execPath} -e "require('fs').writeFileSync('${marker.replaceAll('\\', '\\\\')}','x')"`,
      ],
      { stdio: 'ignore' },
    );
    assert.equal(r.ok, false);
    assert.equal(r.failed.exitCode, 7);
    assert.equal(r.evidence.commands.length, 1);
    assert.equal(fs.existsSync(marker), false);
  } finally {
    cleanup(d);
  }
});
test('verification with no commands fails safely', () => {
  const d = tempDir();
  try {
    const r = runVerification(d, [], { stdio: 'ignore' });
    assert.equal(r.ok, false);
    assert.equal(r.reason, 'no_commands');
    assert.equal(r.evidence.status, 'not_configured');
  } finally {
    cleanup(d);
  }
});

function gitProject() {
  const d = tempDir();
  const git = (...args) => assert.equal(spawnSync('git', args, { cwd: d }).status, 0);
  git('init', '-q');
  git('config', 'user.email', 'truss@example.invalid');
  git('config', 'user.name', 'TRUSS Test');
  fs.writeFileSync(path.join(d, 'a.js'), 'one\n');
  git('add', '-A');
  git('commit', '-qm', 'base');
  return d;
}
const pass = (d) => runVerification(d, [`${process.execPath} -e "process.exit(0)"`], { stdio: 'ignore' });

test('a passing verification records the fingerprint of the files, and a failing one does not', () => {
  const d = gitProject();
  try {
    const ok = pass(d);
    assert.match(ok.evidence.workingTree.fingerprint, /^[0-9a-f]{64}$/);
    assert.equal(ok.evidence.workingTree.files, 1);
    const bad = runVerification(d, [`${process.execPath} -e "process.exit(3)"`], { stdio: 'ignore' });
    assert.equal(bad.evidence.workingTree, undefined);
  } finally {
    cleanup(d);
  }
});

test('outside a work tree the evidence has no fingerprint and nothing is ever stale', () => {
  const d = tempDir();
  try {
    assert.equal(pass(d).evidence.workingTree, undefined);
    assert.equal(staleEvidence(d), null);
  } finally {
    cleanup(d);
  }
});

test('evidence is stale after an edit, and a new verification makes it fresh again', () => {
  const d = gitProject();
  try {
    const { evidence } = pass(d);
    assert.equal(staleEvidence(d), null, 'nothing changed since the verify');
    fs.appendFileSync(path.join(d, 'a.js'), 'two\n');
    assert.deepEqual(staleEvidence(d), {
      finishedAt: evidence.finishedAt,
      files: { changed: ['a.js'], added: [], removed: [] },
    });
    pass(d);
    assert.equal(staleEvidence(d), null);
  } finally {
    cleanup(d);
  }
});

test('evidence says nothing when there is none, when the run failed, or when it predates the fingerprint', () => {
  const d = gitProject();
  try {
    assert.equal(staleEvidence(d), null, 'never verified');
    const file = path.join(d, '.truss', 'verification', 'latest.json');
    pass(d);
    fs.appendFileSync(path.join(d, 'a.js'), 'two\n');
    const recorded = JSON.parse(fs.readFileSync(file, 'utf8'));
    fs.writeFileSync(file, JSON.stringify({ ...recorded, status: 'failed' }));
    assert.equal(staleEvidence(d), null, 'a failed run is already the news');
    const { workingTree, ...old } = recorded;
    fs.writeFileSync(file, JSON.stringify(old));
    assert.equal(staleEvidence(d), null, 'evidence from before the fingerprint');
    fs.writeFileSync(file, '{not json');
    assert.equal(staleEvidence(d), null);
  } finally {
    cleanup(d);
  }
});

test('the warning names the files edited, added and removed, and still warns when the list is gone', () => {
  const d = gitProject();
  try {
    fs.writeFileSync(path.join(d, 'b.js'), 'b\n');
    pass(d);
    fs.appendFileSync(path.join(d, 'a.js'), 'two\n');
    fs.writeFileSync(path.join(d, 'c.js'), 'c\n');
    fs.rmSync(path.join(d, 'b.js'));
    assert.deepEqual(staleEvidence(d).files, { changed: ['a.js'], added: ['c.js'], removed: ['b.js'] });
    fs.rmSync(path.join(d, '.truss', 'verification', 'working-tree.json'));
    assert.equal(staleEvidence(d).files, null, 'stale all the same, without names');
    fs.writeFileSync(path.join(d, '.truss', 'verification', 'working-tree.json'), '{"fingerprint":"other","ids":{}}');
    assert.equal(staleEvidence(d).files, null, 'a list from another run is not used');
  } finally {
    cleanup(d);
  }
});
