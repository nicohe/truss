import assert from 'node:assert/strict';
import test from 'node:test';
import { detectGraphify, graphifyAdvice, graphifySummary } from '../../lib/graphify.mjs';
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

test('graphifyAdvice: one sentence per state, and nothing when there is nothing to say', () => {
  const index = { path: 'graphify-out/graph.json' };
  assert.equal(graphifyAdvice({ status: 'disabled' }), null);
  assert.equal(graphifyAdvice({ status: 'missing', required: false }), null);
  assert.match(graphifyAdvice({ status: 'missing', required: true }), /Graphify is required and is not installed/);
  assert.match(graphifyAdvice({ status: 'ready', index }), /fresh \(graphify-out\/graph\.json\)/);
  assert.match(
    graphifyAdvice({ status: 'stale', required: false, index }),
    /stale: run truss graphify update .*natively\.$/,
  );
  assert.match(
    graphifyAdvice({ status: 'stale', required: true, index }),
    /before you implement \(Graphify is required\)\.$/,
  );
  assert.match(graphifyAdvice({ status: 'unknown_freshness', required: false, index }), /cannot tell whether/);
  assert.match(graphifyAdvice({ status: 'needs_bootstrap', required: false, index }), /no Graphify code graph yet/);
  assert.match(graphifyAdvice({ status: 'damaged', required: false, index }), /delete graphify-out\/graph\.json/);
  assert.equal(graphifyAdvice({ status: 'something new' }), null, 'an unknown state says nothing rather than guess');
});
