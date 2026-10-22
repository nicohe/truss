import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { diffIds, workingTreeFingerprint } from './fingerprint.mjs';
import { currentBranch, gitPlace } from './git.mjs';
import { commandsDigest } from './trust.mjs';

function nowIso() {
  return new Date().toISOString();
}

function writeEvidence(projectRoot, evidence) {
  const dir = path.join(projectRoot, '.truss', 'verification');
  const file = path.join(dir, 'latest.json');
  fs.mkdirSync(dir, { recursive: true });
  // Where the run happened, so a later reader can be told when the evidence comes from another branch. Left out when
  // Git cannot say.
  const { branch, commit } = gitPlace(projectRoot);
  const place = { ...(branch ? { branch } : {}), ...(commit ? { commit } : {}) };
  fs.writeFileSync(file, `${JSON.stringify({ ...evidence, ...place }, null, 2)}\n`);
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
  if (snapshot) {
    writeTreeIds(projectRoot, snapshot);
    recordPassingRun(projectRoot, {
      fingerprint: snapshot.fingerprint,
      files: snapshot.files,
      finishedAt: evidence.finishedAt,
      ...gitPlace(projectRoot),
      commands: commandsDigest(commands).slice(0, DIGEST_LENGTH),
    });
  }
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

// ---- A short history of the runs that passed -----------------------------------------------------------------------------
//
// The evidence is valid again when the files are the ones that passed, whichever branch they are on. So `verify` keeps
// the last few passing runs, each with the fingerprint of the tree (ADR 0002, amendment; ADR 0004). Only the newest
// keeps the content id of every file (`working-tree.json`), so the files that changed can be named only against it.

export const EVIDENCE_HISTORY_LIMIT = 10;
const DIGEST_LENGTH = 12;
const historyPath = (projectRoot) => path.join(projectRoot, '.truss', 'verification', 'history.json');

/** The runs that passed, newest first. A missing, damaged or foreign file is an empty history. */
export function readEvidenceHistory(projectRoot) {
  try {
    const history = JSON.parse(fs.readFileSync(historyPath(projectRoot), 'utf8'));
    const passed = Array.isArray(history?.passed) ? history.passed : [];
    return passed.filter((entry) => entry && typeof entry.fingerprint === 'string');
  } catch {
    return [];
  }
}

// Newest first; a run on a tree that is already there replaces its older entry, so repeating `verify` on one tree
// never pushes other trees out. Best effort: without the history the evidence still works, it just remembers less.
function recordPassingRun(projectRoot, entry) {
  try {
    const kept = readEvidenceHistory(projectRoot).filter((old) => old.fingerprint !== entry.fingerprint);
    const clean = Object.fromEntries(
      Object.entries(entry).filter(([, value]) => value !== null && value !== undefined),
    );
    const passed = [clean, ...kept].slice(0, EVIDENCE_HISTORY_LIMIT);
    fs.writeFileSync(historyPath(projectRoot), `${JSON.stringify({ version: 1, passed })}\n`);
  } catch {
    /* the history is an extra */
  }
}

/**
 * Where the evidence stands against the files as they are now:
 * - `current`: the files are those of the newest passing run, or of one in the history (an older run is accepted only
 *   if its command list has the same digest as `commands`, when both are known);
 * - `stale`: they are not, and there is a passing run to compare with;
 * - `failed`: the last run did not pass, and no passing run matches;
 * - `none`: `verify` has not run;
 * - `unknown`: Git cannot say, or the evidence has no fingerprint.
 * `{ state, finishedAt, branch, commit, files, here }`: the run the answer is about, the files that changed (against the
 * newest passing run, and only when it was on this branch or the branch is unknown) and the branch we are on.
 */
export function evidenceState(projectRoot, { commands } = {}) {
  let latest = null;
  try {
    latest = JSON.parse(fs.readFileSync(path.join(projectRoot, '.truss', 'verification', 'latest.json'), 'utf8'));
  } catch {
    /* no evidence yet */
  }
  if (!latest) return { state: 'none' };
  const newest = latest.status === 'passed' && typeof latest.workingTree?.fingerprint === 'string' ? latest : null;
  const candidates = [
    ...(newest
      ? [
          {
            fingerprint: newest.workingTree.fingerprint,
            finishedAt: newest.finishedAt,
            branch: newest.branch,
            commit: newest.commit,
            newest: true,
          },
        ]
      : []),
    ...readEvidenceHistory(projectRoot),
  ].filter((entry, i, all) => all.findIndex((other) => other.fingerprint === entry.fingerprint) === i);
  if (!candidates.length) {
    if (latest.status === 'passed') return { state: 'unknown' };
    return { state: latest.status === 'not_configured' ? 'none' : 'failed', finishedAt: latest.finishedAt };
  }
  const now = workingTreeFingerprint(projectRoot);
  if (!now) return { state: 'unknown' };
  const digest = Array.isArray(commands) && commands.length ? commandsDigest(commands).slice(0, DIGEST_LENGTH) : null;
  const here = currentBranch(projectRoot);
  const match = candidates.find(
    (entry) =>
      entry.fingerprint === now.fingerprint &&
      (entry.newest || !entry.commands || !digest || entry.commands === digest),
  );
  if (match)
    return { state: 'current', finishedAt: match.finishedAt, branch: match.branch, commit: match.commit, here };
  // The latest pass has no fingerprint (an older TRUSS, or no Git): whether the files changed since cannot be told, and an
  // older run in the history says nothing about it.
  if (!newest && latest.status === 'passed') return { state: 'unknown' };
  if (!newest)
    return { state: latest.status === 'not_configured' ? 'none' : 'failed', finishedAt: latest.finishedAt, here };
  const last = candidates[0];
  const sameBranch = !last.branch || !here || last.branch === here;
  const before = sameBranch ? readTreeIds(projectRoot, last.fingerprint) : null;
  return {
    state: latest.status === 'passed' ? 'stale' : 'failed',
    // For a stale answer the run that passed; for a failed one the run that failed, which is what the warning dates.
    finishedAt: latest.status === 'passed' ? last.finishedAt : latest.finishedAt,
    branch: last.branch,
    commit: last.commit,
    files: before ? diffIds(before, now.ids) : null,
    here,
  };
}

/**
 * Whether the files changed after the last passing `verify`: `{ finishedAt, branch, here, files }` when they did
 * (`files` is `{ changed, added, removed }`, or `null` when the list recorded then is gone or was made on another branch),
 * `null` when they did not or when there is nothing to compare (no evidence, a failed run, evidence from before the
 * fingerprint, or no Git). A tree that matches a run in the history is not stale.
 */
export function staleEvidence(projectRoot, { commands } = {}) {
  const found = evidenceState(projectRoot, { commands });
  if (found.state !== 'stale') return null;
  const { finishedAt, branch, here, files } = found;
  return { finishedAt, branch, here, files };
}
