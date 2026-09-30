import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  checkDocs,
  checkDrift,
  checkLinks,
  checkTranslations,
  doctorCheckNames,
  environmentVariables,
  findMissingTranslations,
  findOrphans,
  headingAnchors,
  linksOf,
  listMarkdown,
  resolveTarget,
  schemaOptions,
  slugify,
  stripCode,
  structureOf,
} from '../../scripts/check-docs.mjs';
import { trussRoot } from '../integration/helpers.mjs';
import { cleanup } from './helpers.mjs';

// A throwaway documentation tree: `tree({ 'docs/en/a.md': '# A' })` returns its root.
function tree(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'truss-docs-'));
  for (const [file, content] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), content);
  }
  return root;
}
const withTree = (files, fn) => {
  const root = tree(files);
  try {
    return fn(root);
  } finally {
    cleanup(root);
  }
};
const messages = (errors) => errors.map((e) => `${e.file}${e.line ? `:${e.line}` : ''} ${e.message}`);

test('slugify follows GitHub: lower case, punctuation dropped, spaces become hyphens', () => {
  assert.equal(slugify('Getting started'), 'getting-started');
  assert.equal(slugify('`truss verify`'), 'truss-verify');
  assert.equal(slugify('`verification.tests_required`'), 'verificationtests_required');
  assert.equal(slugify('Tests-required gate'), 'tests-required-gate');
  assert.equal(slugify('What is guaranteed?'), 'what-is-guaranteed');
  assert.equal(slugify('A — B'), 'a--b', 'each space keeps its hyphen, as on GitHub');
  assert.equal(slugify('[Link text](page.md) and **bold**'), 'link-text-and-bold');
  assert.equal(slugify('Añadir política'), 'añadir-política', 'letters outside ASCII are kept');
});

test('heading anchors: repeated headings get numeric suffixes; code fences are ignored; code headings count', () => {
  const anchors = headingAnchors(
    [
      '# Title',
      '## Usage',
      '## Usage',
      '## `TRUSS_HOME`',
      '```md',
      '## Not a heading',
      '```',
      '### Trailing hashes ###',
    ].join('\n'),
  );
  assert.deepEqual([...anchors].sort(), ['title', 'trailing-hashes', 'truss_home', 'usage', 'usage-1']);
});

test('links: inline, images, reference definitions and titles are found with their line; code is ignored', () => {
  const text = [
    'See [a](one.md) and ![img](pic.svg "title").',
    '',
    '`[x](in-code.md)` and',
    '```',
    '[y](in-fence.md)',
    '```',
    '[ref]: two.md',
    '[angled](<three four.md>)',
  ].join('\n');
  assert.deepEqual(linksOf(text), [
    { target: 'one.md', line: 1 },
    { target: 'pic.svg', line: 1 },
    { target: 'three four.md', line: 8 },
    { target: 'two.md', line: 7 },
  ]);
  assert.equal(stripCode(text).split('\n').length, text.split('\n').length, 'line numbers are preserved');
});

test('resolveTarget: relative, root-absolute, fragment-only and encoded links; external links are skipped', () => {
  assert.equal(resolveTarget('docs/en/a.md', 'https://example.com/x'), null);
  assert.equal(resolveTarget('docs/en/a.md', 'mailto:a@b.c'), null);
  assert.deepEqual(resolveTarget('docs/en/a.md', '../es/b.md#top'), { file: 'docs/es/b.md', fragment: 'top' });
  assert.deepEqual(resolveTarget('docs/en/a.md', '/README.md'), { file: 'README.md', fragment: '' });
  assert.deepEqual(resolveTarget('docs/en/a.md', '#part'), { file: 'docs/en/a.md', fragment: 'part' });
  assert.deepEqual(resolveTarget('a.md', 'my%20page.md'), { file: 'my page.md', fragment: '' });
});

test('listMarkdown finds Markdown, skips node_modules and hidden directories, keeps .github and .truss', () => {
  withTree(
    {
      'README.md': '# R',
      'docs/a.MD': '# A',
      'node_modules/x/readme.md': '# no',
      '.hidden/secret.md': '# no',
      '.github/PULL_REQUEST_TEMPLATE.md': '# yes',
      '.truss/skills/s.md': '# yes',
      'notes.txt': 'no',
    },
    (root) => {
      assert.deepEqual(listMarkdown(root), [
        '.github/PULL_REQUEST_TEMPLATE.md',
        '.truss/skills/s.md',
        'README.md',
        'docs/a.MD',
      ]);
    },
  );
});

test('checkLinks reports missing files, bad anchors and malformed links, with file and line', () => {
  withTree(
    {
      'docs/en/a.md': [
        '# A',
        '',
        '[ok](b.md#target)',
        '[gone](missing.md)',
        '[bad anchor](b.md#nope)',
        '[same](#a)',
        '[bad self](#zzz)',
        '[enc](%E0%A4%A.md)',
      ].join('\n'),
      'docs/en/b.md': '# B\n\n## Target\n',
      'docs/en/c.svg': '<svg/>',
    },
    (root) => {
      const { errors } = checkLinks(root);
      assert.deepEqual(messages(errors), [
        'docs/en/a.md:4 missing.md  (no such file: docs/en/missing.md)',
        'docs/en/a.md:5 b.md#nope  (no heading "nope" in docs/en/b.md)',
        'docs/en/a.md:7 #zzz  (no heading "zzz" in docs/en/a.md)',
        'docs/en/a.md:8 %E0%A4%A.md  (malformed link)',
      ]);
    },
  );
});

test('checkLinks accepts links to non-Markdown files, directories and headings in any letter case', () => {
  withTree(
    {
      'docs/a.md': '[asset](x.svg) [dir](sub/) [case](b.md#SECTION-one)',
      'docs/x.svg': '<svg/>',
      'docs/sub/keep': '',
      'docs/b.md': '## Section one\n',
    },
    (root) => {
      assert.deepEqual(checkLinks(root).errors, []);
    },
  );
});

test('orphans: enforced directories error, others warn, README and non-docs files are exempt, --strict enforces all', () => {
  withTree(
    {
      'README.md': '[guide](docs/en/linked.md)',
      'docs/en/README.md': '# index',
      'docs/en/linked.md': '# linked',
      'docs/en/lonely.md': '# lonely',
      'docs/fr/lonely.md': '# seul',
      'CHANGELOG.md': '# not under docs',
    },
    (root) => {
      const files = listMarkdown(root);
      const { inbound } = checkLinks(root, files);
      const relaxed = findOrphans(files, inbound);
      assert.deepEqual(
        relaxed.errors.map((e) => e.file),
        ['docs/en/lonely.md'],
      );
      assert.deepEqual(
        relaxed.warnings.map((e) => e.file),
        ['docs/fr/lonely.md'],
      );
      const strict = findOrphans(files, inbound, { strict: true });
      assert.deepEqual(
        strict.errors.map((e) => e.file),
        ['docs/en/lonely.md', 'docs/fr/lonely.md'],
      );
      assert.deepEqual(strict.warnings, []);
    },
  );
});

test('missing translations: every English page needs a counterpart in each translation directory, and it is only a warning', () => {
  const files = ['docs/en/README.md', 'docs/en/a/b.md', 'docs/es/README.md', 'docs/fr/x.md', 'CHANGELOG.md'];
  assert.deepEqual(findMissingTranslations(files), [
    { file: 'docs/es/a/b.md', message: 'no translation of docs/en/a/b.md' },
  ]);
  assert.deepEqual(
    findMissingTranslations(files, { translations: ['docs/es', 'docs/fr'] }).map((m) => m.file),
    ['docs/fr/README.md', 'docs/es/a/b.md', 'docs/fr/a/b.md'],
  );
  withTree({ 'docs/en/README.md': '# index' }, (root) => {
    const result = checkDocs(root, { commands: [] });
    assert.deepEqual(
      result.missingTranslations.map((m) => m.file),
      ['docs/es/README.md'],
    );
    assert.equal(
      result.groups.every((group) => group.errors.every((e) => !/translation/.test(e.message))),
      true,
    );
  });
});

const NOTE = /^> Traducción al español\./;
const page = [
  '# Title',
  '',
  '## One',
  '',
  '| a | b |',
  '|---|---|',
  '| 1 | 2 |',
  '',
  '- item',
  '1. step',
  '',
  '[x](y.md)',
].join('\n');

test('structureOf counts headings, code blocks, table rows, list items and relative links outside code', () => {
  const text = [
    '# Title',
    '## Section',
    '| h1 | h2 |',
    '|---|---|',
    '| a | b |',
    '| c | d |',
    '- one',
    '* two',
    '1. three',
    'A [link](other.md), an [anchor](#here), a [site](https://example.com).',
    '```bash',
    '# a comment, not a heading',
    '- not an item',
    '| not | a row |',
    '```',
    '```text',
    'second block',
    '```',
  ].join('\n');
  assert.deepEqual(structureOf(text), {
    headings: 2,
    'code blocks': 2,
    'table rows': 3,
    'list items': 3,
    links: 2,
  });
});

test('structureOf leaves out the translation note and the links into another language', () => {
  const text =
    '# T\n\n> Traducción al español. Ver [el original](../en/t.md).\n\n[to Spanish](../es/README.md) and [local](a.md)';
  assert.equal(structureOf(text, { note: NOTE, skipLinks: /(^|\/)es\// }).links, 1);
  assert.equal(structureOf(text).links, 3);
});

test('checkTranslations: a page with the same structure and one note passes, and pages without an original only need the note', () => {
  withTree(
    {
      'docs/en/a.md': page,
      'docs/es/a.md': `${page}\n\n> Traducción al español. [original](../en/a.md).`,
      'docs/es/only-here.md': '# Solo\n\n> Traducción al español. Sin original.',
    },
    (root) => assert.deepEqual(checkTranslations(root), []),
  );
});

test('checkTranslations reports what a translation lost or gained, naming both counts', () => {
  withTree(
    {
      'docs/en/a.md': page,
      'docs/es/a.md': [
        '# Title',
        '',
        '> Traducción al español. [original](../en/a.md).',
        '',
        '## One',
        '',
        '- item',
        '1. step',
        '',
        '[x](y.md)',
        '[z](z.md)',
      ].join('\n'),
    },
    (root) =>
      assert.deepEqual(messages(checkTranslations(root)), [
        'docs/es/a.md differs from docs/en/a.md: 0 table rows (English 2), 2 links (English 1)',
      ]),
  );
});

test('checkTranslations needs exactly one translation note', () => {
  withTree(
    {
      'docs/en/a.md': page,
      'docs/es/a.md': `> Traducción al español. Uno.\n\n> Traducción al español. Dos.\n\n${page}`,
      'docs/es/b.md': '# Sin nota',
    },
    (root) =>
      assert.deepEqual(messages(checkTranslations(root)), [
        'docs/es/a.md has 2 translation notes; it needs exactly one',
        'docs/es/b.md has no translation note',
      ]),
  );
});

test('checkTranslations ignores directories that are not translations, and checkDocs reports it as its own group', () => {
  withTree({ 'docs/en/a.md': page, 'docs/fr/a.md': '# tout autre' }, (root) => {
    assert.deepEqual(checkTranslations(root), []);
    assert.equal(
      checkDocs(root, { commands: [] }).groups.at(-1).title,
      'Translations out of step with the English pages',
    );
  });
  withTree({ 'docs/en/a.md': page, 'docs/es/a.md': '# Sin nota ni estructura' }, (root) => {
    const group = checkDocs(root, { commands: [] }).groups.at(-1);
    assert.equal(group.errors.length, 2);
  });
});

test('a page that only links to itself is still an orphan', () => {
  withTree({ 'docs/en/self.md': '# Self\n[me](self.md)' }, (root) => {
    const files = listMarkdown(root);
    assert.equal(findOrphans(files, checkLinks(root, files).inbound).errors.length, 1);
  });
});

test('schemaOptions lists leaf options as dotted paths', () => {
  const schema = {
    properties: {
      version: { type: 'integer' },
      verification: { type: 'object', properties: { commands: { type: 'array' }, tests_required: { type: 'string' } } },
      components: { type: 'object', additionalProperties: {} },
    },
  };
  assert.deepEqual(schemaOptions(schema), [
    'version',
    'verification.commands',
    'verification.tests_required',
    'components',
  ]);
});

test('doctorCheckNames reads names whether the call is on one line or wrapped', () => {
  const source = [
    "add('Core', 'Node', ok);",
    'add(',
    "  'Core',",
    "  '.truss ignore',",
    '  ok,',
    ');',
    "add('Core', 'Node', again);",
  ].join('\n');
  assert.deepEqual(doctorCheckNames(source), ['Node', '.truss ignore']);
});

test('environmentVariables reads env.NAME and TRUSS_* from lib and TRUSS_* from workflows, not from tests', () => {
  withTree(
    {
      'lib/a.mjs': 'const x = env.TRUSS_HOME || process.env.NO_COLOR; const y = env.lowercase;',
      'test/t.mjs': "process.env.TRUSS_TESTONLY = '1'; // a fixture, not something a user sets",
      '.github/workflows/ci.yml': "TRUSS_FROM_CI: '1'",
      'scripts/s.mjs': 'TRUSS_IGNORED_HERE',
    },
    (root) => {
      assert.deepEqual(environmentVariables(root), ['NO_COLOR', 'TRUSS_FROM_CI', 'TRUSS_HOME']);
    },
  );
});

test('drift: undocumented commands, options, doctor checks and variables are each reported; documented ones pass', () => {
  const files = {
    'docs/en/reference/cli.md': 'Use `truss init` and `truss verify`.',
    '.truss/schema/config.schema.json': JSON.stringify({
      properties: { spec: { type: 'object', properties: { mode: {} } } },
    }),
    'docs/en/configuration/reference.md': '## `spec.mode`',
    'lib/doctor.mjs': "add('Core', 'Node', 'pass'); add('Core', 'Git CLI', 'pass');",
    'docs/en/reference/doctor.md': '| Core | Node | yes |',
    'lib/x.mjs': 'const a = env.TRUSS_HOME;',
    'docs/en/reference/environment.md': '`TRUSS_HOME`',
  };
  withTree(files, (root) => {
    assert.deepEqual(messages(checkDrift(root, { commands: ['init', 'verify', 'doctor'] })), [
      'docs/en/reference/cli.md does not document the command doctor',
      'docs/en/reference/doctor.md does not document the doctor check Git CLI',
    ]);
  });
  withTree(
    { ...files, 'docs/en/configuration/reference.md': '## nothing', 'docs/en/reference/environment.md': '' },
    (root) => {
      assert.deepEqual(messages(checkDrift(root, { commands: ['init'] })), [
        'docs/en/configuration/reference.md does not document the option spec.mode',
        'docs/en/reference/doctor.md does not document the doctor check Git CLI',
        'docs/en/reference/environment.md does not document the environment variable TRUSS_HOME',
      ]);
    },
  );
});

test('drift: a translation is held to the same checks for the pages it has, and a missing translation is fine', () => {
  const files = {
    'docs/en/reference/cli.md': '`truss init` and `truss verify`',
    'docs/en/reference/environment.md': '`TRUSS_HOME`',
    'lib/x.mjs': 'const a = env.TRUSS_HOME;',
  };
  withTree(files, (root) => {
    assert.deepEqual(messages(checkDrift(root, { commands: ['init', 'verify'] })), []);
  });
  withTree(
    {
      ...files,
      'docs/es/reference/cli.md': 'Usa `truss init`.',
      'docs/es/reference/environment.md': 'Sin variables.',
    },
    (root) => {
      assert.deepEqual(messages(checkDrift(root, { commands: ['init', 'verify'] })), [
        'docs/es/reference/cli.md does not document the command verify',
        'docs/es/reference/environment.md does not document the environment variable TRUSS_HOME',
      ]);
    },
  );
});

test('drift: a missing reference page is an error, and missing code files are simply not checked', () => {
  withTree({ 'docs/en/README.md': '# x' }, (root) => {
    const errors = messages(checkDrift(root, { commands: ['init'] }));
    assert.deepEqual(errors, [
      'docs/en/reference/cli.md missing, but it must document every CLI command',
      'docs/en/reference/environment.md missing, but it must document every environment variable',
    ]);
  });
});

test('checkDocs groups the results and keeps warnings apart from errors', () => {
  withTree({ 'docs/fr/x.md': '# x', 'docs/en/README.md': '[gone](nope.md)' }, (root) => {
    const result = checkDocs(root, { commands: [] });
    assert.equal(result.files, 2);
    assert.equal(result.groups[0].errors.length, 1);
    assert.deepEqual(
      result.warnings.map((w) => w.file),
      ['docs/fr/x.md'],
    );
  });
});

const script = path.join(trussRoot, 'scripts', 'check-docs.mjs');
const runScript = (...args) => spawnSync(process.execPath, [script, ...args], { encoding: 'utf8', cwd: trussRoot });

test('the script exits 1 and names the problem on a broken tree, and exits 0 on a sound one', () => {
  withTree({ 'docs/en/README.md': '[gone](nope.md)' }, (root) => {
    const broken = runScript('--root', root);
    assert.equal(broken.status, 1);
    assert.match(broken.stdout, /✖ Broken links and anchors \(1\)/);
    assert.match(broken.stdout, /docs\/en\/README\.md:1 {2}nope\.md/);
    assert.match(broken.stdout, /Docs check failed\./);
  });
  const real = runScript();
  assert.equal(real.status, 0, real.stdout);
  assert.match(real.stdout, /Docs check passed \(\d+ Markdown files\)\./);
});
