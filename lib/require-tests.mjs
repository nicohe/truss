import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { resolveComponent, resolveComponents } from './components.mjs';

// "Tests required" gate: did the change touch source code without touching any test?
//
// It answers a narrow, deterministic question from git. It does NOT prove that tests were written first (TDD),
// that they exercise the change, or that they pass; `verification.commands` remain responsible for the latter.

const CODE_EXTENSIONS = new Set(
  'js mjs cjs jsx ts mts cts tsx py rb go rs java kt kts scala cs php swift c h cc cpp hpp m mm dart lua ex exs clj sh'.split(
    ' ',
  ),
);
const TEST_NAME = /(\.(test|spec)|_test)\.[^./]+$/;
// Tried in order when `verification.base_ref` is not set and origin/HEAD is unknown.
const BASE_CANDIDATES = ['origin/main', 'origin/master', 'main', 'master'];

const git = (cwd, args) => spawnSync('git', args, { cwd, encoding: 'utf8' });
const toPosix = (value) => value.split(path.sep).join('/');
const normalizePrefix = (value) => toPosix(value).replace(/^\.\//, '').replace(/\/+$/, '');
const underPrefix = (file, prefix) => prefix === '.' || file === prefix || file.startsWith(`${prefix}/`);
const hasCodeExtension = (file) => CODE_EXTENSIONS.has(path.posix.extname(file).slice(1).toLowerCase());
const lines = (result) =>
  result.stdout
    .split('\0')
    .map((entry) => entry.trim())
    .filter(Boolean);

function resolveBase(projectRoot, baseRef) {
  if (git(projectRoot, ['rev-parse', '--verify', '--quiet', 'HEAD']).status !== 0) {
    return { error: 'the repository has no commits yet' };
  }
  const originHead = git(projectRoot, ['symbolic-ref', '--quiet', '--short', 'refs/remotes/origin/HEAD']);
  const candidates = baseRef
    ? [baseRef]
    : [...(originHead.status === 0 ? [originHead.stdout.trim()] : []), ...BASE_CANDIDATES];
  for (const candidate of candidates) {
    if (git(projectRoot, ['rev-parse', '--verify', '--quiet', `${candidate}^{commit}`]).status !== 0) continue;
    const mergeBase = git(projectRoot, ['merge-base', 'HEAD', candidate]);
    if (mergeBase.status === 0 && mergeBase.stdout.trim())
      return { ref: candidate, mergeBase: mergeBase.stdout.trim() };
    if (baseRef)
      return { error: `no common ancestor between HEAD and "${baseRef}" (shallow clone? fetch more history)` };
  }
  return {
    error: baseRef
      ? `base ref "${baseRef}" does not exist`
      : 'no base branch found (looked for origin/HEAD, origin/main, origin/master, main, master); set verification.base_ref',
  };
}

// Files added, copied, modified, renamed or type-changed since the merge-base (committed, staged or not),
// plus untracked files. Pure deletions do not require tests.
function changedFiles(projectRoot, mergeBase) {
  const tracked = git(projectRoot, ['diff', '--name-only', '-z', '--diff-filter=ACMRT', mergeBase]);
  const untracked = git(projectRoot, ['ls-files', '--others', '--exclude-standard', '-z']);
  if (tracked.status !== 0 || untracked.status !== 0) return null;
  return [...new Set([...lines(tracked), ...lines(untracked)])].map(toPosix).sort();
}

function buildBuckets(projectRoot, config, overrides) {
  const configured = Object.keys(config?.components || {}).length ? resolveComponents(projectRoot, config) : [];
  const workspace = resolveComponent(projectRoot, config, null);
  const buckets = [...configured, workspace].map((component) => ({
    name: component.name,
    root: normalizePrefix(component.rootRelative),
    sourceDirs: overrides.source ?? component.sourceDirs.map(normalizePrefix),
    testDirs: overrides.tests ?? component.testDirs.map(normalizePrefix),
    source: [],
    tests: [],
  }));
  // The most specific component owns a file; the workspace bucket (root ".") is the fallback.
  return buckets.sort((a, b) => b.root.length - a.root.length);
}

function classify(files, buckets) {
  for (const file of files) {
    if (!hasCodeExtension(file)) continue;
    const owner = buckets.find((bucket) => underPrefix(file, bucket.root));
    if (!owner) continue;
    if (TEST_NAME.test(file) || owner.testDirs.some((dir) => underPrefix(file, dir))) owner.tests.push(file);
    else if (owner.sourceDirs.some((dir) => underPrefix(file, dir))) owner.source.push(file);
  }
}

export function evaluateTestGate(projectRoot, config) {
  const verification = config?.verification ?? {};
  const mode = verification.tests_required ?? 'off';
  const result = { mode, status: 'skipped', blocking: false };
  if (mode === 'off') return result;

  const unknown = (reason) => ({ ...result, status: 'unknown', reason });
  if (git(projectRoot, ['rev-parse', '--is-inside-work-tree']).status !== 0) return unknown('not a Git work tree');

  const base = resolveBase(projectRoot, verification.base_ref);
  if (base.error) return unknown(base.error);
  const files = changedFiles(projectRoot, base.mergeBase);
  if (!files) return unknown('could not list changed files with git');

  let buckets;
  try {
    buckets = buildBuckets(projectRoot, config, {
      source: verification.source_paths?.map(normalizePrefix),
      tests: verification.test_paths?.map(normalizePrefix),
    });
  } catch (error) {
    return unknown(error.message);
  }
  classify(files, buckets);

  const touched = buckets.filter((bucket) => bucket.source.length || bucket.tests.length);
  const violations = buckets
    .filter((bucket) => bucket.source.length && !bucket.tests.length)
    .map((bucket) => ({ component: bucket.name, sourceFiles: bucket.source }));
  const status = violations.length ? 'violation' : 'passed';
  return {
    ...result,
    status,
    blocking: status === 'violation' && mode === 'block',
    base: { ref: base.ref, mergeBase: base.mergeBase },
    sourceFiles: touched.reduce((sum, bucket) => sum + bucket.source.length, 0),
    testFiles: touched.reduce((sum, bucket) => sum + bucket.tests.length, 0),
    violations,
  };
}
