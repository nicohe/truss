import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const which = (name) => {
  const r = spawnSync(process.platform === 'win32' ? 'where' : 'which', [name], { encoding: 'utf8' });
  return r.status === 0 ? r.stdout.trim().split(/\r?\n/)[0] : null;
};
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
  const cliPath = which('graphify');
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
  const vr = run('graphify', ['--version'], projectRoot);
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

export function updateGraphify(projectRoot, { bootstrap = false } = {}) {
  const before = detectGraphify(projectRoot, { enabled: true, required: false });
  if (!before.cli?.installed) return { ok: false, reason: 'Graphify CLI is not installed.' };
  const args = bootstrap || !before.index?.exists ? ['extract', '.', '--code-only'] : ['update', '.'];
  let r = run('graphify', args, projectRoot);
  // Current Graphify also supports path-first extraction; keep a compatibility fallback.
  if (r.status !== 0 && args[0] === 'extract') r = run('graphify', ['.', '--no-viz'], projectRoot);
  if (r.status !== 0)
    return {
      ok: false,
      reason: (r.stderr || r.stdout || `graphify exited ${r.status}`).trim(),
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
