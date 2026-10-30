import assert from 'node:assert/strict';
import test from 'node:test';
import { formattersScanningTruss, formatterWarning } from '../../lib/formatters.mjs';
import { cleanup, tempDir, write } from './helpers.mjs';

function project(files) {
  const root = tempDir('truss-formatters-');
  for (const [name, content] of Object.entries(files)) write(root, name, content);
  return root;
}
const scan = (files, gitIgnored = true) => {
  const root = project(files);
  try {
    return formattersScanningTruss(root, { gitIgnored });
  } finally {
    cleanup(root);
  }
};

test('a project with no formatter has nothing to warn about', () => {
  assert.deepEqual(scan({ 'package.json': '{"name":"x"}' }), []);
  assert.deepEqual(scan({}), []);
});

test('Prettier 2 does not read .gitignore, so it scans .truss/ unless .prettierignore says otherwise', () => {
  const files = { 'package.json': '{"devDependencies":{"prettier":"^2.8.0"}}' };
  assert.deepEqual(
    scan(files).map((f) => f.tool),
    ['Prettier'],
  );
  assert.deepEqual(scan({ ...files, '.prettierignore': 'dist\n.truss/\n' }), []);
  assert.deepEqual(scan({ ...files, '.prettierignore': '.truss/**\n' }), []);
});

test('Prettier 3 skips what .gitignore ignores, but not when .truss/ is not ignored or .prettierignore exists without it', () => {
  const files = { '.prettierrc': '{}', 'package.json': '{"devDependencies":{"prettier":"^3.2.0"}}' };
  assert.deepEqual(scan(files, true), []);
  assert.deepEqual(
    scan(files, false).map((f) => f.tool),
    ['Prettier'],
  );
  assert.deepEqual(
    scan({ ...files, '.prettierignore': 'dist\n' }, true).map((f) => f.tool),
    ['Prettier'],
  );
});

test('the installed Prettier version wins over the declared range', () => {
  const files = {
    'package.json': '{"devDependencies":{"prettier":"latest"}}',
    'node_modules/prettier/package.json': '{"version":"3.3.3"}',
  };
  assert.deepEqual(scan(files, true), []);
  assert.deepEqual(scan({ ...files, 'node_modules/prettier/package.json': '{"version":"2.8.8"}' }, true).length, 1);
});

test('a Prettier config with no known version is warned about unless .truss is excluded', () => {
  assert.equal(scan({ 'prettier.config.mjs': 'export default {}' }, true).length, 1);
});

test('Biome scans .truss/ unless its config mentions it or it follows the ignore file', () => {
  assert.deepEqual(
    scan({ 'biome.json': '{"files":{"includes":["**"]}}' }).map((f) => f.tool),
    ['Biome'],
  );
  assert.deepEqual(scan({ 'biome.json': '{"files":{"includes":["**","!.truss"]}}' }), []);
  assert.deepEqual(scan({ 'biome.jsonc': '{"files":{"ignore":[".truss/**"]}}' }), []);
  assert.deepEqual(scan({ 'biome.json': '{"vcs":{"enabled":true,"useIgnoreFile":true}}' }, true), []);
  assert.equal(scan({ 'biome.json': '{"vcs":{"useIgnoreFile":true}}' }, false).length, 1);
});

test('the warning names each tool and what to add', () => {
  const text = formatterWarning(scan({ 'prettier.config.js': '', 'biome.json': '{}' }, false));
  assert.match(text, /^Prettier and Biome will scan \.truss\//);
  assert.match(text, /\.prettierignore/);
  assert.match(text, /biome\.json/);
});
