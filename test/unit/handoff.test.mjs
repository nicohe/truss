import assert from 'node:assert/strict';
import test from 'node:test';
import { handoffNote, placeMismatch, readNotePlace } from '../../lib/handoff.mjs';

const note = (place) =>
  handoffNote({
    change: 'add-retry',
    component: null,
    phase: 'implementation',
    openspecPath: 'openspec/changes/add-retry',
    place,
  });

test('a new note records the branch and the commit, or says unknown', () => {
  const text = note({ branch: 'feat-b', commit: '3f2a1bc9d0e4' });
  assert.match(text, /- Branch: feat-b\n- Commit: 3f2a1bc9d0e4\n\n## Completed/);
  const none = note({ branch: null, commit: null });
  assert.match(none, /- Branch: unknown\n\n## Completed/);
  assert.doesNotMatch(none, /Commit:/);
});

test('readNotePlace reads what the note says and treats unknown as nothing', () => {
  assert.deepEqual(readNotePlace(note({ branch: 'feat/b', commit: '3f2a1bc9d0e4' })), {
    branch: 'feat/b',
    commit: '3f2a1bc9d0e4',
  });
  assert.deepEqual(readNotePlace(note({ branch: null, commit: null })), { branch: null, commit: null });
  assert.deepEqual(readNotePlace('# a note written before this field existed\n- Branch: main\n'), {
    branch: 'main',
    commit: null,
  });
});

test('placeMismatch: another branch is reported, normal progress on the same branch is not', () => {
  const here = { branch: 'main', commit: '9d41e02aaaaa' };
  const never = () => assert.fail('the history is not asked when the branch already differs');
  assert.equal(
    placeMismatch('.', { branch: 'feat-b', commit: '3f2a1bc9d0e4' }, here, never),
    'This note was written on branch "feat-b" at 3f2a1bc; you are on "main" at 9d41e02.',
  );
  assert.equal(
    placeMismatch('.', { branch: 'main', commit: '3f2a1bc9d0e4' }, here, () => true),
    null,
  );
});

test('placeMismatch: the same branch at a commit that is not in the history is reported', () => {
  const here = { branch: 'main', commit: '9d41e02aaaaa' };
  assert.equal(
    placeMismatch('.', { branch: 'main', commit: '3f2a1bc9d0e4' }, here, () => false),
    'This note was written at 3f2a1bc, which is not in the history of HEAD (9d41e02).',
  );
  assert.equal(
    placeMismatch('.', { branch: 'main', commit: '3f2a1bc9d0e4' }, here, () => null),
    null,
    'cannot tell',
  );
});

test('placeMismatch: a note that does not say where it was written, or a detached HEAD, compares only what it has', () => {
  const here = { branch: null, commit: '9d41e02aaaaa' };
  assert.equal(
    placeMismatch('.', { branch: null, commit: null }, here, () => false),
    null,
  );
  assert.equal(
    placeMismatch('.', { branch: 'main', commit: null }, here, () => false),
    null,
    'no branch to compare',
  );
  assert.equal(
    placeMismatch('.', { branch: 'main', commit: '3f2a1bc9d0e4' }, here, () => false),
    'This note was written at 3f2a1bc, which is not in the history of HEAD (9d41e02).',
  );
});
