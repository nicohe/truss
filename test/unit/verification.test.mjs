import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {
  EVIDENCE_HISTORY_LIMIT,
  evidenceState,
  readEvidenceHistory,
  runVerification,
  staleEvidence,
} from '../../lib/verification.mjs';
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
  git('init', '-q', '-b', 'main');
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
      branch: 'main',
      here: 'main',
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

const gitIn = (d, ...args) => {
  const r = spawnSync('git', args, { cwd: d, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  return r.stdout.trim();
};
const fail = (d) => runVerification(d, [`${process.execPath} -e "process.exit(3)"`], { stdio: 'ignore' });
const latestOf = (d) => JSON.parse(fs.readFileSync(path.join(d, '.truss', 'verification', 'latest.json'), 'utf8'));

test('the evidence records the branch and the commit it was made on, in every kind of run', () => {
  const d = gitProject();
  try {
    const head = gitIn(d, 'rev-parse', 'HEAD').slice(0, 12);
    pass(d);
    assert.equal(latestOf(d).branch, 'main');
    assert.equal(latestOf(d).commit, head);
    fail(d);
    assert.equal(latestOf(d).branch, 'main', 'a failed run is labelled too');
    runVerification(d, [], { stdio: 'ignore' });
    assert.equal(latestOf(d).commit, head, 'and so is a run with nothing to run');
  } finally {
    cleanup(d);
  }
  const plain = tempDir();
  try {
    pass(plain);
    assert.equal('branch' in latestOf(plain), false, 'left out when Git cannot say');
  } finally {
    cleanup(plain);
  }
});

test('the history keeps the passing runs, newest first, one for each tree, and ignores failures', () => {
  const d = gitProject();
  try {
    pass(d);
    fail(d);
    assert.equal(readEvidenceHistory(d).length, 1, 'a failed run adds nothing');
    pass(d);
    assert.equal(readEvidenceHistory(d).length, 1, 'the same tree replaces its entry');
    fs.appendFileSync(path.join(d, 'a.js'), 'two\n');
    pass(d);
    const history = readEvidenceHistory(d);
    assert.equal(history.length, 2);
    assert.equal(history[0].fingerprint, latestOf(d).workingTree.fingerprint, 'newest first');
    assert.match(history[0].commands, /^[0-9a-f]{12}$/);
    assert.equal(history[0].branch, 'main');
  } finally {
    cleanup(d);
  }
});

test('the history is bounded: the eleventh tree pushes the oldest out', () => {
  const d = gitProject();
  try {
    for (let i = 0; i <= EVIDENCE_HISTORY_LIMIT; i += 1) {
      fs.appendFileSync(path.join(d, 'a.js'), `${i}\n`);
      pass(d);
    }
    const history = readEvidenceHistory(d);
    assert.equal(history.length, EVIDENCE_HISTORY_LIMIT);
    assert.ok(fs.statSync(path.join(d, '.truss', 'verification', 'history.json')).size < 4000);
  } finally {
    cleanup(d);
  }
});

test('a damaged or foreign history is an empty one, and the evidence still works', () => {
  const d = gitProject();
  try {
    for (const bad of ['{ not json', '[]', '{"passed":"x"}', '{"passed":[1,null,{"fingerprint":3}]}']) {
      fs.mkdirSync(path.join(d, '.truss', 'verification'), { recursive: true });
      fs.writeFileSync(path.join(d, '.truss', 'verification', 'history.json'), bad);
      assert.deepEqual(readEvidenceHistory(d), []);
      pass(d);
      assert.equal(evidenceState(d).state, 'current');
    }
  } finally {
    cleanup(d);
  }
});

test('evidenceState: current, stale, failed, none and unknown', () => {
  const d = gitProject();
  try {
    assert.equal(evidenceState(d).state, 'none', 'verify has not run');
    pass(d);
    assert.equal(evidenceState(d).state, 'current');
    fs.appendFileSync(path.join(d, 'a.js'), 'two\n');
    const stale = evidenceState(d);
    assert.equal(stale.state, 'stale');
    assert.deepEqual(stale.files.changed, ['a.js']);
    fail(d);
    assert.equal(evidenceState(d).state, 'failed', 'the last run did not pass and no passing run matches');
  } finally {
    cleanup(d);
  }
  const plain = tempDir();
  try {
    pass(plain);
    assert.equal(evidenceState(plain).state, 'unknown', 'without Git nothing can be compared');
  } finally {
    cleanup(plain);
  }
});

test('the evidence is current again when the files go back to a tree that passed', () => {
  const d = gitProject();
  try {
    const original = fs.readFileSync(path.join(d, 'a.js'), 'utf8');
    pass(d);
    fs.appendFileSync(path.join(d, 'a.js'), 'two\n');
    pass(d);
    assert.equal(evidenceState(d).state, 'current');
    fs.writeFileSync(path.join(d, 'a.js'), original);
    const back = evidenceState(d);
    assert.equal(back.state, 'current', 'the first tree is still in the history');
    assert.equal(staleEvidence(d), null);
    fs.appendFileSync(path.join(d, 'a.js'), 'three\n');
    assert.equal(evidenceState(d).state, 'stale', 'a tree that never passed is stale');
  } finally {
    cleanup(d);
  }
});

test('a run on another branch is accepted for the same files, and labelled when the files differ', () => {
  const d = gitProject();
  try {
    pass(d);
    gitIn(d, 'checkout', '-q', '-b', 'feat');
    fs.appendFileSync(path.join(d, 'a.js'), 'two\n');
    gitIn(d, 'commit', '-qam', 'feat change');
    pass(d);
    assert.equal(latestOf(d).branch, 'feat');
    gitIn(d, 'checkout', '-q', 'main');
    const same = evidenceState(d);
    assert.equal(same.state, 'current', 'main is as it was when it passed, although the last run was on feat');
    assert.equal(same.branch, 'main');
    fs.appendFileSync(path.join(d, 'a.js'), 'three\n');
    const stale = evidenceState(d);
    assert.equal(stale.state, 'stale');
    assert.equal(stale.branch, 'feat', 'the newest passing run was on feat');
    assert.equal(stale.here, 'main');
    assert.equal(stale.files, null, 'a list of files against another branch would be noise');
  } finally {
    cleanup(d);
  }
});

test('an older run is accepted only if the command list is the same', () => {
  const d = gitProject();
  try {
    const first = [`${process.execPath} -e "process.exit(0)"`];
    runVerification(d, first, { stdio: 'ignore' });
    fs.appendFileSync(path.join(d, 'a.js'), 'two\n');
    runVerification(d, first, { stdio: 'ignore' });
    gitIn(d, 'checkout', '-q', '--', 'a.js');
    assert.equal(evidenceState(d, { commands: first }).state, 'current');
    const other = [`${process.execPath} -e "process.exit(0) // other"`];
    assert.equal(evidenceState(d, { commands: other }).state, 'stale', 'other commands: the old run proves nothing');
    assert.equal(evidenceState(d).state, 'current', 'with no list to compare, the fingerprint decides');
  } finally {
    cleanup(d);
  }
});

test('a passing run without a fingerprint is unknown, whatever the history says', () => {
  const d = gitProject();
  try {
    pass(d);
    fs.appendFileSync(path.join(d, 'a.js'), 'two\n');
    const file = path.join(d, '.truss', 'verification', 'latest.json');
    const old = latestOf(d);
    old.workingTree = undefined;
    fs.writeFileSync(file, JSON.stringify(old));
    assert.equal(evidenceState(d).state, 'unknown');
    assert.equal(staleEvidence(d), null);
  } finally {
    cleanup(d);
  }
});
