import assert from 'node:assert/strict';
import test from 'node:test';
import { detectGraphify, graphifySummary } from '../../lib/graphify.mjs';
import { cleanup, tempDir } from './helpers.mjs';

test('disabled Graphify is ignored', () => {
  const d = tempDir();
  try {
    const s = detectGraphify(d, { enabled: false, required: false });
    assert.equal(s.status, 'disabled');
    assert.equal(s.blocking, false);
  } finally {
    cleanup(d);
  }
});
test('missing optional Graphify uses native fallback', { concurrency: false }, () => {
  const d = tempDir();
  const old = process.env.PATH;
  try {
    process.env.PATH = '';
    const s = detectGraphify(d, { enabled: true, required: false });
    assert.equal(s.status, 'missing');
    assert.equal(s.fallback, true);
    assert.equal(s.blocking, false);
  } finally {
    process.env.PATH = old;
    cleanup(d);
  }
});
test('missing required Graphify blocks', { concurrency: false }, () => {
  const d = tempDir();
  const old = process.env.PATH;
  try {
    process.env.PATH = '';
    const s = detectGraphify(d, { enabled: true, required: true });
    assert.equal(s.status, 'missing');
    assert.equal(s.blocking, true);
    assert.match(graphifySummary(s), /blocks/);
  } finally {
    process.env.PATH = old;
    cleanup(d);
  }
});
