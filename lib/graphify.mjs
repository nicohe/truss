import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { findExecutable, spawnCli } from './spawn.mjs';

const run = (cmd, args, cwd) => spawnSync(cmd, args, { cwd, encoding: 'utf8' });
const gitHead = (cwd) => {
  const r = run('git', ['rev-parse', 'HEAD'], cwd);
  return r.status === 0 ? r.stdout.trim() : null;
};
const gitHeadTime = (cwd) => {
  const r = run('git', ['show', '-s', '--format=%ct', 'HEAD'], cwd);
  return r.status === 0 ? Number(r.stdout.trim()) * 1000 : null;
};

export function detectGraphify(projectRoot, config = { enabled: true, required: false }) {
  if (!config.enabled)
    return { enabled: false, required: false, status: 'disabled', ready: false, fallback: false, blocking: false };
  const cliPath = findExecutable('graphify');
  if (!cliPath)
    return {
      enabled: true,
      required: !!config.required,
      status: 'missing',
      ready: false,
      fallback: !config.required,
      blocking: !!config.required,
      cli: { installed: false, path: null, version: null },
      index: { exists: false, freshness: 'missing' },
    };
  const vr = spawnCli(cliPath, ['--version'], { cwd: projectRoot });
  const version = (vr.stdout || vr.stderr || '').trim().match(/\d+\.\d+\.\d+(?:[-+][\w.-]+)?/)?.[0] || null;
  const out = path.join(projectRoot, 'graphify-out');
  const graph = path.join(out, 'graph.json');
  if (!fs.existsSync(graph))
    return {
      enabled: true,
      required: !!config.required,
      status: 'needs_bootstrap',
      ready: false,
      fallback: !config.required,
      blocking: !!config.required,
      cli: { installed: true, path: cliPath, version },
      index: { exists: false, path: 'graphify-out/graph.json', freshness: 'missing' },
    };

  const stat = fs.statSync(graph);
  const head = gitHead(projectRoot);
  const headTime = gitHeadTime(projectRoot);
  const metaPath = path.join(out, '.truss-graphify.json');
  let meta = null;
  try {
    meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  } catch {}
  let freshness = 'unknown';
  if (meta?.gitHead && head) freshness = meta.gitHead === head ? 'fresh' : 'stale';
  else if (headTime) freshness = stat.mtimeMs >= headTime ? 'fresh' : 'stale';
  const ready = freshness === 'fresh';
  return {
    enabled: true,
    required: !!config.required,
    status: ready ? 'ready' : freshness === 'stale' ? 'stale' : 'unknown_freshness',
    ready,
    fallback: !ready && !config.required,
    blocking: !ready && !!config.required,
    cli: { installed: true, path: cliPath, version },
    index: { exists: true, path: 'graphify-out/graph.json', freshness, mtime: stat.mtime.toISOString() },
    gitHead: head,
  };
}

// Graphify says `error: unknown command '<name>'` for a subcommand it does not have.
const lacksCommand = (result) => /unknown command/i.test(`${result.stderr ?? ''}\n${result.stdout ?? ''}`);

// What went wrong, in its last lines: Graphify is Python, and a failure comes as a traceback whose last line is the
// message worth reading. The earlier lines are counted, not printed.
const MAX_REASON_LINES = 12;
function failureReason(result) {
  const lines = (result.stderr || result.stdout || `graphify exited ${result.status}`).trim().split('\n');
  if (lines.length <= MAX_REASON_LINES) return lines.join('\n');
  return [`(${lines.length - MAX_REASON_LINES} earlier lines omitted)`, ...lines.slice(-MAX_REASON_LINES)].join('\n');
}

export function updateGraphify(projectRoot, { bootstrap = false } = {}) {
  const before = detectGraphify(projectRoot, { enabled: true, required: false });
  if (!before.cli?.installed) return { ok: false, reason: 'Graphify CLI is not installed.' };
  let args = bootstrap || !before.index?.exists ? ['extract', '.', '--code-only'] : ['update', '.'];
  const cliPath = before.cli.path;
  let r = spawnCli(cliPath, args, { cwd: projectRoot });
  // Only a Graphify that does not know `extract` (an older release) builds the graph path-first. Any other failure is
  // the answer: a second command would hide the real error behind its own, and this one has no --code-only, so with
  // an API key in the environment it can send the project's documents to a language model.
  if (r.status !== 0 && args[0] === 'extract' && lacksCommand(r)) {
    args = ['.', '--no-viz'];
    r = spawnCli(cliPath, args, { cwd: projectRoot });
  }
  if (r.status !== 0)
    return {
      ok: false,
      reason: failureReason(r),
      command: `graphify ${args.join(' ')}`,
    };
  const graph = path.join(projectRoot, 'graphify-out', 'graph.json');
  if (!fs.existsSync(graph))
    return { ok: false, reason: 'Graphify completed but graphify-out/graph.json was not created.' };
  const meta = { gitHead: gitHead(projectRoot), updatedAt: new Date().toISOString() };
  fs.writeFileSync(
    path.join(projectRoot, 'graphify-out', '.truss-graphify.json'),
    `${JSON.stringify(meta, null, 2)}\n`,
  );
  return {
    ok: true,
    command: `graphify ${args.join(' ')}`,
    state: detectGraphify(projectRoot, { enabled: true, required: false }),
  };
}

export function graphifySummary(s) {
  if (s.status === 'disabled') return 'disabled';
  if (s.status === 'missing') return s.required ? 'missing (required; blocks)' : 'missing (optional; native fallback)';
  if (s.status === 'needs_bootstrap')
    return s.required ? 'index missing (required; blocks)' : 'index missing (optional; native fallback)';
  if (s.status === 'ready') return `ready${s.cli?.version ? ` v${s.cli.version}` : ''}`;
  return `${s.status.replaceAll('_', ' ')}${s.required ? ' (blocks)' : ' (native fallback)'}`;
}
