import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

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

  const evidence = withGates({ status: 'passed', startedAt, finishedAt: nowIso(), commands: results });
  return { ok: true, evidence, evidencePath: writeEvidence(projectRoot, evidence) };
}
