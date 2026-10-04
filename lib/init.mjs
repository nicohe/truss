import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { loadConfig } from './config.mjs';
import { detectOpenSpec } from './openspec.mjs';
import { spawnCli } from './spawn.mjs';

export const DEFAULT_CONFIG = `version: 1
spec:
  mode: anchored
  gherkin: true
  zone_guard: false

development:
  bdd: true
  tdd: true

verification:
  commands:
    - npm test --if-present
    - npm run lint --if-present
    - npm run typecheck --if-present
    - npm run build --if-present

integrations:
  graphify:
    enabled: true
    required: false

components: {}
`;

// Where Git says `.truss/` is ignored, or null. `.gitignore` is the usual place and needs no mention; a private
// exclude file (`.git/info/exclude`) or a global one does, because it is invisible to the rest of the team.
function ignoredByGit(projectRoot) {
  const result = spawnSync('git', ['check-ignore', '-v', '.truss/'], { cwd: projectRoot, encoding: 'utf8' });
  if (result.status !== 0 || !result.stdout) return null;
  const source = result.stdout.split(':')[0];
  return path.basename(source) === '.gitignore' ? { source: null } : { source: source.replace(/\\/g, '/') };
}

function ensureGitignore(projectRoot) {
  const viaGit = ignoredByGit(projectRoot);
  if (viaGit) return { state: 'ignored', changed: false, source: viaGit.source };
  const file = path.join(projectRoot, '.gitignore');
  if (!fs.existsSync(file)) return { state: 'missing', changed: false };
  const raw = fs.readFileSync(file, 'utf8');
  const ignored = raw.split(/\r?\n/).some((line) => line.trim() === '.truss/' || line.trim() === '.truss');
  return { state: ignored ? 'ignored' : 'not_ignored', changed: false };
}

function initOpenSpec(projectRoot, cliPath) {
  // TRUSS owns the workflow, so initialize only OpenSpec's durable project
  // structure. Runtime/tool-specific OpenSpec files remain an explicit choice.
  const result = spawnCli(cliPath, ['init', projectRoot, '--tools', 'none'], { cwd: projectRoot });
  return {
    ok: result.status === 0,
    status: result.status,
    stdout: result.stdout?.trim() || '',
    stderr: result.stderr?.trim() || '',
  };
}

export function initializeProject(projectRoot, { initializeOpenSpec = true } = {}) {
  const trussDir = path.join(projectRoot, '.truss');
  const configPath = path.join(trussDir, 'config.yaml');
  const report = {
    config: null,
    openspec: null,
    gitignore: ensureGitignore(projectRoot),
    changed: false,
  };

  fs.mkdirSync(trussDir, { recursive: true });

  if (fs.existsSync(configPath)) {
    // Validate before touching anything. Invalid user config is never replaced.
    loadConfig(projectRoot);
    report.config = { state: 'adopted', path: '.truss/config.yaml' };
  } else {
    fs.writeFileSync(configPath, DEFAULT_CONFIG, { flag: 'wx' });
    try {
      loadConfig(projectRoot);
    } catch (error) {
      // Do not leave a config behind that TRUSS itself cannot validate (for example, an incomplete installation).
      fs.rmSync(configPath, { force: true });
      throw error;
    }
    report.config = { state: 'created', path: '.truss/config.yaml' };
    report.changed = true;
  }

  let detected = detectOpenSpec(projectRoot);
  if (!detected.cli.installed) {
    report.openspec = { state: 'missing_cli', changed: false, detected };
    return report;
  }
  if (!detected.compatibility.compatible) {
    report.openspec = { state: 'incompatible_cli', changed: false, detected };
    return report;
  }
  if (detected.project.initialized) {
    report.openspec = { state: 'adopted', changed: false, detected };
    return report;
  }
  if (detected.project.state !== 'not_initialized') {
    // A partial/legacy directory may contain user-authored material. Never repair
    // or overwrite it implicitly.
    report.openspec = { state: 'partial_requires_attention', changed: false, detected };
    return report;
  }
  if (!initializeOpenSpec) {
    report.openspec = { state: 'not_initialized', changed: false, detected };
    return report;
  }

  const init = initOpenSpec(projectRoot, detected.cli.path);
  if (!init.ok) {
    report.openspec = { state: 'init_failed', changed: false, detected, init };
    return report;
  }

  detected = detectOpenSpec(projectRoot);
  if (!detected.project.initialized) {
    report.openspec = { state: 'init_unverified', changed: false, detected, init };
    return report;
  }
  report.openspec = { state: 'created', changed: true, detected, init };
  report.changed = true;
  return report;
}
