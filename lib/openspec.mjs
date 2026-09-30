import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export const OPENSPEC_COMPATIBILITY = Object.freeze({
  minimum: '1.0.0',
  maximumExclusive: '2.0.0',
  range: '>=1.0.0 <2.0.0',
  stableOnly: true,
});

function executablePath(name) {
  const command = process.platform === 'win32' ? 'where' : 'which';
  const result = spawnSync(command, [name], { encoding: 'utf8' });
  if (result.status !== 0) return null;
  return result.stdout.trim().split(/\r?\n/).filter(Boolean)[0] || null;
}

function readVersion(executable = 'openspec') {
  const result = spawnSync(executable, ['--version'], { encoding: 'utf8' });
  if (result.status !== 0) return { version: null, rawVersion: null, versionReadable: false };
  const rawVersion = result.stdout.trim() || result.stderr.trim();
  const match = rawVersion.match(/(?:^|\s)v?(\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?)/);
  return { version: match?.[1] ?? null, rawVersion: rawVersion || null, versionReadable: Boolean(match) };
}

function parseSemver(version) {
  const match = version?.match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/);
  if (!match) return null;
  return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]), prerelease: match[4] ?? null };
}

export function evaluateOpenSpecCompatibility(cli) {
  if (!cli.installed)
    return {
      status: 'missing',
      compatible: false,
      range: OPENSPEC_COMPATIBILITY.range,
      reason: 'OpenSpec CLI is not installed.',
    };
  if (!cli.versionReadable || !cli.version)
    return {
      status: 'unknown',
      compatible: false,
      range: OPENSPEC_COMPATIBILITY.range,
      reason: 'OpenSpec version could not be parsed.',
    };
  const parsed = parseSemver(cli.version);
  if (!parsed)
    return {
      status: 'unknown',
      compatible: false,
      range: OPENSPEC_COMPATIBILITY.range,
      reason: `Unsupported version format: ${cli.version}`,
    };
  if (parsed.prerelease && OPENSPEC_COMPATIBILITY.stableOnly)
    return {
      status: 'unknown',
      compatible: false,
      range: OPENSPEC_COMPATIBILITY.range,
      reason: `Prerelease versions are not guaranteed compatible: ${cli.version}`,
    };
  if (parsed.major < 1)
    return {
      status: 'too_old',
      compatible: false,
      range: OPENSPEC_COMPATIBILITY.range,
      reason: `OpenSpec ${cli.version} is older than ${OPENSPEC_COMPATIBILITY.minimum}.`,
    };
  if (parsed.major >= 2)
    return {
      status: 'unsupported_newer',
      compatible: false,
      range: OPENSPEC_COMPATIBILITY.range,
      reason: `OpenSpec ${cli.version} is outside the supported major version.`,
    };
  return {
    status: 'compatible',
    compatible: true,
    range: OPENSPEC_COMPATIBILITY.range,
    reason: `OpenSpec ${cli.version} is supported.`,
  };
}

function projectEvidence(projectRoot) {
  const dir = path.join(projectRoot, 'openspec');
  const yaml = path.join(dir, 'config.yaml');
  const yml = path.join(dir, 'config.yml');
  const specs = path.join(dir, 'specs');
  const changes = path.join(dir, 'changes');
  const exists = fs.existsSync(dir) && fs.statSync(dir).isDirectory();
  const configPath = fs.existsSync(yaml) ? yaml : fs.existsSync(yml) ? yml : null;
  const specsDir = fs.existsSync(specs) && fs.statSync(specs).isDirectory();
  const changesDir = fs.existsSync(changes) && fs.statSync(changes).isDirectory();
  let state = 'not_initialized';
  if (configPath) state = 'initialized';
  else if (exists && (specsDir || changesDir)) state = 'legacy_or_partial';
  else if (exists) state = 'directory_only';
  return {
    state,
    initialized: state === 'initialized',
    directoryExists: exists,
    directory: path.relative(projectRoot, dir) || 'openspec',
    configPath: configPath ? path.relative(projectRoot, configPath) : null,
    specsDir,
    changesDir,
  };
}

export function detectOpenSpec(projectRoot, { env = process.env } = {}) {
  const cliPath = env.TRUSS_OPENSPEC_PATH || executablePath('openspec');
  let cli = { installed: Boolean(cliPath), path: cliPath, version: null, rawVersion: null, versionReadable: false };
  if (cliPath) cli = { installed: true, path: cliPath, ...readVersion(cliPath) };
  return { cli, compatibility: evaluateOpenSpecCompatibility(cli), project: projectEvidence(projectRoot) };
}

export function openSpecSummary(result) {
  if (!result.cli.installed) return 'CLI not installed';
  const version = result.cli.version ? ` ${result.cli.version}` : ' (version unknown)';
  const project =
    result.project.state === 'initialized'
      ? 'project initialized'
      : result.project.state === 'not_initialized'
        ? 'project not initialized'
        : `project ${result.project.state.replaceAll('_', ' ')}`;
  return `CLI${version}; compatibility ${result.compatibility.status}; ${project}`;
}
