// Documentation check. Dependency-free; run with `npm run check:docs`.
//
// Structure checks (Markdown only, no network):
//   - every relative link points to a file that exists;
//   - every `#anchor` matches a heading of the target page;
//   - every page under an enforced docs directory (`docs/en`, `docs/es`) is linked from somewhere.
// Drift checks (docs against the code they describe):
//   - every CLI command is in the CLI reference;
//   - every schema option is in the configuration reference;
//   - every `truss doctor` check is in the doctor reference;
//   - every environment variable TRUSS reads is in the environment reference.
//   A translation (`docs/es`) is held to the same drift checks for each of those pages it has.
// Translation checks (a translated page against its English original):
//   - it has the same structure: headings, code blocks, table rows, list items and relative links;
//   - it has exactly one translation note.
//
// Warnings never fail the check: pages of another docs directory that nothing links to, and English pages that a
// translation does not have yet.
//
// Options: `--strict` enforces the orphan check in every docs directory; `--root <dir>` checks another tree.
// Exit code 0 when there are no errors (warnings never fail); 1 otherwise.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Pages under these directories must be reachable from another page. Other docs directories only warn, until they
// are brought up to date. `--strict` enforces every directory.
export const ENFORCED_ORPHAN_DIRS = ['docs/en', 'docs/es'];

// Translations of `docs/en`. `note` matches the line every translated page carries to say so. A translation has to be
// complete only for the pages it already has, so a page that is not translated yet is not an error.
export const TRANSLATIONS = [{ directory: 'docs/es', note: /^> Traducción al español\./ }];
export const TRANSLATION_DIRS = TRANSLATIONS.map(({ directory }) => directory);

const toPosix = (value) => value.split(path.sep).join('/');

// --- Files ---------------------------------------------------------------------------------------------------------

// Markdown files under `root`, as sorted POSIX paths relative to it. Dot-directories are skipped, except the ones
// that hold documentation of their own.
export function listMarkdown(root) {
  const found = [];
  const walk = (directory) => {
    for (const entry of fs.readdirSync(path.join(root, directory), { withFileTypes: true })) {
      const relative = directory ? `${directory}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        const hidden = entry.name.startsWith('.') && !['.github', '.truss'].includes(entry.name);
        if (!hidden && entry.name !== 'node_modules') walk(relative);
      } else if (entry.name.toLowerCase().endsWith('.md')) found.push(relative);
    }
  };
  walk('');
  return found.sort();
}

// --- Markdown parsing ----------------------------------------------------------------------------------------------

// Blanks out fenced code blocks, keeping every newline so line numbers stay valid.
export function stripFences(text) {
  let fence = null;
  return text
    .split('\n')
    .map((line) => {
      const marker = line.match(/^\s{0,3}(`{3,}|~{3,})/)?.[1];
      if (fence) {
        if (marker && marker[0] === fence[0] && marker.length >= fence.length) fence = null;
        return '';
      }
      if (marker) {
        fence = marker;
        return '';
      }
      return line;
    })
    .join('\n');
}

// Also blanks inline code. Links inside code are examples, not real ones. Headings must not use this: a heading such
// as "## `TRUSS_HOME`" is made of inline code and still has an anchor.
export function stripCode(text) {
  return stripFences(text).replace(/(`+)[^`\n]*?\1/g, (span) => ' '.repeat(span.length));
}

const plainHeading = (text) =>
  text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\[[^\]]*\]/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/[*`]/g, '')
    .trim();

// GitHub's anchor for a heading: lower case, punctuation removed (letters, digits, `_` and `-` stay), each space
// becomes a hyphen. Repeated headings get `-1`, `-2`... appended by `headingAnchors`.
export function slugify(heading) {
  return plainHeading(heading)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\p{M}\s_-]/gu, '')
    .replace(/\s/g, '-');
}

export function headingAnchors(text) {
  const seen = new Map();
  const anchors = new Set();
  for (const line of stripFences(text).split('\n')) {
    const match = line.match(/^ {0,3}#{1,6}\s+(.*?)\s*#*\s*$/);
    if (!match) continue;
    const slug = slugify(match[1]);
    const count = seen.get(slug) ?? 0;
    seen.set(slug, count + 1);
    anchors.add(count ? `${slug}-${count}` : slug);
  }
  return anchors;
}

// Inline links and images, and reference definitions, with the line they are on.
export function linksOf(text) {
  const links = [];
  const stripped = stripCode(text);
  const inline = /!?\[[^\]]*\]\(\s*(<[^>]*>|[^)\s]*)(?:\s+"[^"]*")?\s*\)/g;
  const reference = /^ {0,3}\[[^\]]+\]:\s*(<[^>]*>|\S+)/gm;
  for (const pattern of [inline, reference]) {
    for (const match of stripped.matchAll(pattern)) {
      const target = match[1].replace(/^<|>$/g, '');
      links.push({ target, line: stripped.slice(0, match.index).split('\n').length });
    }
  }
  return links;
}

// --- Structure checks ----------------------------------------------------------------------------------------------

const isExternal = (target) => /^[a-z][a-z0-9+.-]*:/i.test(target);

// Resolves `target` as written in `from`. Returns null for external links, otherwise the file it points to and the
// fragment.
export function resolveTarget(from, target) {
  if (isExternal(target)) return null;
  const [rawPath, rawFragment = ''] = target.split('#');
  let file = from;
  if (rawPath) {
    const decoded = decodeURIComponent(rawPath);
    file = decoded.startsWith('/')
      ? path.posix.normalize(decoded.slice(1))
      : path.posix.normalize(path.posix.join(path.posix.dirname(from), decoded));
  }
  return { file, fragment: decodeURIComponent(rawFragment) };
}

export function checkLinks(root, files = listMarkdown(root)) {
  const errors = [];
  const anchorCache = new Map();
  const anchorsOf = (file) => {
    if (!anchorCache.has(file)) anchorCache.set(file, headingAnchors(fs.readFileSync(path.join(root, file), 'utf8')));
    return anchorCache.get(file);
  };
  const inbound = new Map(files.map((file) => [file, new Set()]));

  for (const from of files) {
    const text = fs.readFileSync(path.join(root, from), 'utf8');
    const lines = text.split('\n');
    // The note that opens a translated page links to its original. That link is not a reference to the page from the
    // documentation, so it must not make the original look linked (it would hide every orphan that has a translation).
    const note = TRANSLATIONS.find(({ directory }) => from.startsWith(`${directory}/`))?.note;
    for (const { target, line } of linksOf(text)) {
      let resolved;
      try {
        resolved = resolveTarget(from, target);
      } catch {
        errors.push({ file: from, line, message: `${target}  (malformed link)` });
        continue;
      }
      if (!resolved) continue;
      const exists = fs.existsSync(path.join(root, resolved.file));
      if (!exists) {
        errors.push({ file: from, line, message: `${target}  (no such file: ${resolved.file})` });
        continue;
      }
      if (resolved.file !== from && !note?.test(lines[line - 1] ?? '')) inbound.get(resolved.file)?.add(from);
      if (resolved.fragment && resolved.file.toLowerCase().endsWith('.md')) {
        const known = [...anchorsOf(resolved.file)];
        if (!known.includes(resolved.fragment.toLowerCase())) {
          errors.push({
            file: from,
            line,
            message: `${target}  (no heading "${resolved.fragment}" in ${resolved.file})`,
          });
        }
      }
    }
  }
  return { errors, inbound };
}

// Pages under docs/ that no other page links to. README files are entry points and are not reported.
export function findOrphans(files, inbound, { enforced = ENFORCED_ORPHAN_DIRS, strict = false } = {}) {
  const errors = [];
  const warnings = [];
  for (const file of files) {
    if (!file.startsWith('docs/') || /(^|\/)README\.md$/i.test(file) || inbound.get(file)?.size) continue;
    const isEnforced = strict || enforced.some((directory) => file.startsWith(`${directory}/`));
    (isEnforced ? errors : warnings).push({ file, message: 'no other page links to it' });
  }
  return { errors, warnings };
}

// English pages with no counterpart in a translation directory (`docs/en/a/b.md` -> `docs/es/a/b.md`). Only a warning: a
// missing translation does not break the documentation, but it should be visible.
export function findMissingTranslations(files, { translations = TRANSLATION_DIRS } = {}) {
  const known = new Set(files);
  const missing = [];
  for (const file of files) {
    if (!file.startsWith('docs/en/')) continue;
    for (const directory of translations) {
      const counterpart = `${directory}/${file.slice('docs/en/'.length)}`;
      if (!known.has(counterpart)) missing.push({ file: counterpart, message: `no translation of ${file}` });
    }
  }
  return missing;
}

// --- Translation checks: a translated page against its English original ----------------------------------------------

// What a translation must keep of its original, counted outside code blocks (a code block counts once). The
// translation note is not part of the original, so it is left out, and so are links that point into another language's
// directory (`skipLinks`): the English index links to the Spanish one, and the Spanish note links back.
export function structureOf(text, { note, skipLinks } = {}) {
  const lines = text.split('\n').filter((line) => !note?.test(line));
  let fence = null;
  let codeBlocks = 0;
  for (const line of lines) {
    const marker = line.match(/^\s{0,3}(`{3,}|~{3,})/)?.[1];
    if (fence) {
      if (marker && marker[0] === fence[0] && marker.length >= fence.length) fence = null;
    } else if (marker) {
      fence = marker;
      codeBlocks += 1;
    }
  }
  const outside = stripFences(lines.join('\n')).split('\n');
  const count = (pattern) => outside.filter((line) => pattern.test(line)).length;
  return {
    headings: count(/^ {0,3}#{1,6}\s/),
    'code blocks': codeBlocks,
    'table rows': count(/^\|(?![\s:|-]+\|?$)/),
    'list items': count(/^\s*(?:[-*]|\d+\.)\s/),
    links: linksOf(lines.join('\n')).filter(({ target }) => !isExternal(target) && !skipLinks?.test(target)).length,
  };
}

// Errors for every translated page that lost or gained something its English original has, or that does not carry
// exactly one translation note. Only pages that have an English original are compared; the rest only need the note.
export function checkTranslations(root, files = listMarkdown(root), { translations = TRANSLATIONS } = {}) {
  const errors = [];
  const known = new Set(files);
  for (const { directory, note } of translations) {
    for (const file of files.filter((candidate) => candidate.startsWith(`${directory}/`))) {
      const text = fs.readFileSync(path.join(root, file), 'utf8');
      const notes = text.split('\n').filter((line) => note.test(line)).length;
      if (notes !== 1) {
        errors.push({
          file,
          message: notes ? `has ${notes} translation notes; it needs exactly one` : 'has no translation note',
        });
      }
      const original = `docs/en/${file.slice(directory.length + 1)}`;
      if (!known.has(original)) continue;
      const toTranslation = new RegExp(`(^|/)${path.basename(directory)}/`);
      const expected = structureOf(fs.readFileSync(path.join(root, original), 'utf8'), { skipLinks: toTranslation });
      const actual = structureOf(text, { note });
      const differences = Object.keys(expected)
        .filter((key) => expected[key] !== actual[key])
        .map((key) => `${actual[key]} ${key} (English ${expected[key]})`);
      if (differences.length) errors.push({ file, message: `differs from ${original}: ${differences.join(', ')}` });
    }
  }
  return errors;
}

// --- Drift checks: documentation against the code it describes -----------------------------------------------------

const read = (root, file) => {
  const target = path.join(root, file);
  return fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : null;
};

function walkFiles(root, directory, extensions) {
  const start = path.join(root, directory);
  if (!fs.existsSync(start)) return [];
  const out = [];
  const visit = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) visit(full);
      else if (extensions.some((extension) => entry.name.endsWith(extension)))
        out.push(toPosix(path.relative(root, full)));
    }
  };
  visit(start);
  return out;
}

// Names of options at the leaves of the config schema, as dotted paths (`integrations.graphify.enabled`).
export function schemaOptions(schema) {
  const options = [];
  const walk = (node, prefix) => {
    for (const [key, child] of Object.entries(node.properties ?? {})) {
      const name = `${prefix}${key}`;
      if (child.type === 'object' && child.properties) walk(child, `${name}.`);
      else options.push(name);
    }
  };
  walk(schema, '');
  return options;
}

// `truss doctor` check names, read from the `add('Section', 'Name', ...)` calls in its source.
export function doctorCheckNames(source) {
  return [...new Set([...source.matchAll(/add\(\s*'[A-Za-z ]+',\s*'([^']+)'/g)].map((match) => match[1]))];
}

// Environment variables that matter to a user: those the CLI reads (`env.NAME` in lib/) plus any TRUSS_* name a CI
// workflow sets. Tests are not scanned: their fixtures would have to be documented too.
export function environmentVariables(root) {
  const names = new Set();
  const library = walkFiles(root, 'lib', ['.mjs']);
  for (const file of library) {
    for (const match of fs.readFileSync(path.join(root, file), 'utf8').matchAll(/\benv\.([A-Z][A-Z0-9_]+)/g)) {
      names.add(match[1]);
    }
  }
  const scanned = [...library, ...walkFiles(root, '.github', ['.yml', '.yaml'])];
  for (const file of scanned) {
    for (const match of fs.readFileSync(path.join(root, file), 'utf8').matchAll(/\bTRUSS_[A-Z0-9_]+/g)) {
      names.add(match[0]);
    }
  }
  return [...names].sort();
}

export function checkDrift(root, { commands = [] } = {}) {
  const errors = [];
  const expectIn = (docFile, present, subject, { optional = false } = {}) => {
    const text = read(root, docFile);
    if (text === null) {
      if (!optional) errors.push({ file: docFile, message: `missing, but it must document ${subject}` });
      return;
    }
    for (const { name, needle, what } of present) {
      if (!text.includes(needle)) errors.push({ file: docFile, message: `does not document ${what} ${name}` });
    }
  };
  // The canonical page is required; each translation is checked when it exists.
  const expectInEveryLanguage = (page, present, subject) => {
    expectIn(`docs/en/${page}`, present, subject);
    for (const directory of TRANSLATION_DIRS) expectIn(`${directory}/${page}`, present, subject, { optional: true });
  };

  expectInEveryLanguage(
    'reference/cli.md',
    commands.map((name) => ({ name, needle: `truss ${name}`, what: 'the command' })),
    'every CLI command',
  );

  const schemaText = read(root, '.truss/schema/config.schema.json');
  if (schemaText !== null) {
    expectInEveryLanguage(
      'configuration/reference.md',
      schemaOptions(JSON.parse(schemaText)).map((name) => ({ name, needle: `\`${name}\``, what: 'the option' })),
      'every configuration option',
    );
  }

  const doctorSource = read(root, 'lib/doctor.mjs');
  if (doctorSource !== null) {
    expectInEveryLanguage(
      'reference/doctor.md',
      doctorCheckNames(doctorSource).map((name) => ({ name, needle: `| ${name} |`, what: 'the doctor check' })),
      'every doctor check',
    );
  }

  expectInEveryLanguage(
    'reference/environment.md',
    environmentVariables(root).map((name) => ({ name, needle: `\`${name}\``, what: 'the environment variable' })),
    'every environment variable',
  );
  return errors;
}

// --- Whole check ---------------------------------------------------------------------------------------------------

export function checkDocs(root, { commands = [], strict = false } = {}) {
  const files = listMarkdown(root);
  const links = checkLinks(root, files);
  const orphans = findOrphans(files, links.inbound, { strict });
  return {
    files: files.length,
    groups: [
      { title: 'Broken links and anchors', errors: links.errors },
      { title: 'Pages nothing links to', errors: orphans.errors },
      { title: 'Docs out of step with the code', errors: checkDrift(root, { commands }) },
      { title: 'Translations out of step with the English pages', errors: checkTranslations(root, files) },
    ],
    warnings: orphans.warnings,
    missingTranslations: findMissingTranslations(files),
  };
}

function report(result) {
  const failed = result.groups.filter((group) => group.errors.length);
  for (const group of result.groups) {
    const mark = group.errors.length ? '✖' : '●';
    console.log(`${mark} ${group.title}${group.errors.length ? ` (${group.errors.length})` : ''}`);
    for (const { file, line, message } of group.errors) console.log(`    ${file}${line ? `:${line}` : ''}  ${message}`);
  }
  if (result.warnings.length) {
    console.log(`○ ${result.warnings.length} page(s) in directories not enforced yet have no inbound link:`);
    for (const { file } of result.warnings) console.log(`    ${file}`);
  }
  if (result.missingTranslations.length) {
    console.log(`○ ${result.missingTranslations.length} English page(s) have no translation yet:`);
    for (const { file } of result.missingTranslations) console.log(`    ${file}`);
  }
  console.log(failed.length ? '\nDocs check failed.' : `\nDocs check passed (${result.files} Markdown files).`);
  return failed.length ? 1 : 0;
}

async function main() {
  const rootIndex = process.argv.indexOf('--root');
  const root = path.resolve(
    rootIndex >= 0 ? process.argv[rootIndex + 1] : path.join(path.dirname(fileURLToPath(import.meta.url)), '..'),
  );
  const { createCommands } = await import('../lib/commands.mjs');
  const { createUi } = await import('../lib/ui.mjs');
  const commands = Object.keys(createCommands({ cwd: root, args: [], ui: createUi() }));
  process.exit(report(checkDocs(root, { commands, strict: process.argv.includes('--strict') })));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
