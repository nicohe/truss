import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { diffIds, workingTreeFingerprint } from './fingerprint.mjs';

function nowIso() {
  return new Date().toISOString();
}

function writeEvidence(projectRoot, evidence) {
  const dir = path.join(projectRoot, '.truss', 'verification');
  const file = path.join(dir, 'latest.json');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(evidence, null, 2)}\n`);
  return path.relative(projectRoot, file);
}

// Gates run before any command. Each is `{ mode, blocking, ... }`; a blocking one stops verification.
const GATE_REASONS = { testsRequired: 'tests_required', tasksComplete: 'tasks_incomplete' };

export function runVerification(projectRoot, commands, { stdio = 'inherit', gates = {} } = {}) {
  const startedAt = nowIso();
  const results = [];
  // Every enabled gate is recorded with the evidence.
  const recorded = Object.fromEntries(Object.entries(gates).filter(([, gate]) => gate && gate.mode !== 'off'));
  const withGates = (evidence) => ({ ...evidence, ...recorded });

  const blocking = Object.keys(recorded).find((key) => recorded[key].blocking);
  if (blocking) {
    const reason = GATE_REASONS[blocking];
    const evidence = withGates({ status: 'failed', reason, startedAt, finishedAt: nowIso(), commands: [] });
    return { ok: false, reason, evidence, evidencePath: writeEvidence(projectRoot, evidence) };
  }

  if (!Array.isArray(commands) || commands.length === 0) {
    const evidence = withGates({ status: 'not_configured', startedAt, finishedAt: nowIso(), commands: [] });
    return { ok: false, reason: 'no_commands', evidence, evidencePath: writeEvidence(projectRoot, evidence) };
  }

  for (let index = 0; index < commands.length; index += 1) {
    const command = commands[index];
    const started = Date.now();
    const result = spawnSync(command, {
      cwd: projectRoot,
      shell: true,
      stdio,
      env: process.env,
    });
    const durationMs = Date.now() - started;
    const passed = !result.error && result.status === 0;
    const record = {
      index: index + 1,
      command,
      status: passed ? 'passed' : 'failed',
      exitCode: Number.isInteger(result.status) ? result.status : null,
      signal: result.signal || null,
      durationMs,
    };
    if (result.error) record.error = result.error.message;
    results.push(record);

    if (!passed) {
      const evidence = withGates({
        status: 'failed',
        startedAt,
        finishedAt: nowIso(),
        failedAt: index + 1,
        commands: results,
      });
      return {
        ok: false,
        reason: 'command_failed',
        failed: record,
        evidence,
        evidencePath: writeEvidence(projectRoot, evidence),
      };
    }
  }

  // Taken once the commands are done, so it covers what they wrote too. `status` and `continue` compare against it.
  const snapshot = workingTreeFingerprint(projectRoot);
  const workingTree = snapshot && { fingerprint: snapshot.fingerprint, files: snapshot.files };
  const evidence = withGates({
    status: 'passed',
    startedAt,
    finishedAt: nowIso(),
    commands: results,
    ...(workingTree ? { workingTree } : {}),
  });
  const evidencePath = writeEvidence(projectRoot, evidence);
  if (snapshot) writeTreeIds(projectRoot, snapshot);
  return { ok: true, evidence, evidencePath };
}

// The id of every file, kept beside the evidence (not in it) so the warning can name the files that changed.
const treePath = (projectRoot) => path.join(projectRoot, '.truss', 'verification', 'working-tree.json');

function writeTreeIds(projectRoot, { fingerprint, ids }) {
  try {
    fs.writeFileSync(treePath(projectRoot), `${JSON.stringify({ fingerprint, ids })}\n`);
  } catch {
    // Without it the warning still appears; it just cannot name the files.
  }
}

function readTreeIds(projectRoot, fingerprint) {
  try {
    const tree = JSON.parse(fs.readFileSync(treePath(projectRoot), 'utf8'));
    return tree.fingerprint === fingerprint && tree.ids && typeof tree.ids === 'object' ? tree.ids : null;
  } catch {
    return null;
  }
}

/**
 * Whether the files changed after the last passing `verify`: `{ finishedAt, files }` when they did (`files` is
 * `{ changed, added, removed }`, or `null` when the list recorded then is gone), `null` when they did not or when
 * there is nothing to compare (no evidence, a failed run, evidence from before the fingerprint, or no Git).
 */
export function staleEvidence(projectRoot) {
  let evidence;
  try {
    evidence = JSON.parse(fs.readFileSync(path.join(projectRoot, '.truss', 'verification', 'latest.json'), 'utf8'));
  } catch {
    return null;
  }
  const recorded = evidence?.status === 'passed' ? evidence.workingTree?.fingerprint : null;
  if (typeof recorded !== 'string') return null;
  const now = workingTreeFingerprint(projectRoot);
  if (!now || now.fingerprint === recorded) return null;
  const before = readTreeIds(projectRoot, recorded);
  return { finishedAt: evidence.finishedAt, files: before ? diffIds(before, now.ids) : null };
}
