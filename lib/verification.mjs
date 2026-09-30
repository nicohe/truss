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

export function runVerification(projectRoot, commands, { stdio = 'inherit', gate = null } = {}) {
  const startedAt = nowIso();
  const results = [];
  // The "tests required" result is recorded with the evidence whenever the gate is enabled.
  const withGate = (evidence) => (gate && gate.mode !== 'off' ? { ...evidence, testsRequired: gate } : evidence);

  if (gate?.blocking) {
    const evidence = withGate({
      status: 'failed',
      reason: 'tests_required',
      startedAt,
      finishedAt: nowIso(),
      commands: [],
    });
    return { ok: false, reason: 'tests_required', evidence, evidencePath: writeEvidence(projectRoot, evidence) };
  }

  if (!Array.isArray(commands) || commands.length === 0) {
    const evidence = withGate({ status: 'not_configured', startedAt, finishedAt: nowIso(), commands: [] });
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
      const evidence = withGate({
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

  const evidence = withGate({ status: 'passed', startedAt, finishedAt: nowIso(), commands: results });
  return { ok: true, evidence, evidencePath: writeEvidence(projectRoot, evidence) };
}
