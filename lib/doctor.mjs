import { spawnSync } from 'node:child_process';
import { resolveComponents } from './components.mjs';
import { ConfigError, formatConfigError, loadConfig } from './config.mjs';
import { detectGraphify, graphifySummary } from './graphify.mjs';
import { detectOpenSpec, OPENSPEC_COMPATIBILITY } from './openspec.mjs';
import { isTrusted } from './trust.mjs';

const run = (cmd, args, cwd) => spawnSync(cmd, args, { cwd, encoding: 'utf8' });
const executable = (name) => run(process.platform === 'win32' ? 'where' : 'which', [name], process.cwd()).status === 0;
const major = (version) => Number(String(version).replace(/^v/, '').split('.')[0]) || 0;

export function diagnoseProject(projectRoot) {
  const checks = [];
  const add = (section, name, status, detail, required = true) =>
    checks.push({ section, name, status, detail, required });

  const nodeOk = major(process.version) >= 20;
  add('Core', 'Node', nodeOk ? 'pass' : 'fail', `${process.version} (>=20 required)`);

  const gitInstalled = executable('git');
  add('Core', 'Git CLI', gitInstalled ? 'pass' : 'fail', gitInstalled ? 'installed' : 'not found');
  const gitRepo = gitInstalled && run('git', ['rev-parse', '--is-inside-work-tree'], projectRoot).status === 0;
  add('Core', 'Git repository', gitRepo ? 'pass' : 'fail', gitRepo ? 'work tree detected' : 'not a Git work tree');

  const ignored = gitRepo && run('git', ['check-ignore', '-q', '.truss/'], projectRoot).status === 0;
  add(
    'Core',
    '.truss ignore',
    ignored ? 'pass' : 'warn',
    ignored ? '.truss/ ignored' : '.truss/ is not ignored',
    false,
  );

  let config = null;
  try {
    config = loadConfig(projectRoot).config;
    add('Core', 'Config', 'pass', '.truss/config.yaml valid');
  } catch (error) {
    add(
      'Core',
      'Config',
      'fail',
      error instanceof ConfigError ? formatConfigError(error).replace(/\n/g, ' | ') : error.message,
    );
  }

  if (config) {
    try {
      const resolved = resolveComponents(projectRoot, config);
      add('Project', 'Components', 'pass', resolved.map((c) => `${c.name}:${c.rootRelative}`).join(', '));
    } catch (error) {
      add('Project', 'Components', 'fail', error.message);
    }
  } else add('Project', 'Components', 'skip', 'config invalid');

  const os = detectOpenSpec(projectRoot);
  add(
    'OpenSpec',
    'CLI',
    os.cli.installed ? 'pass' : 'fail',
    os.cli.installed ? (os.cli.version ? `v${os.cli.version}` : 'version unknown') : 'not installed',
  );
  add(
    'OpenSpec',
    'Compatibility',
    os.compatibility.compatible ? 'pass' : 'fail',
    `${os.compatibility.status} (${OPENSPEC_COMPATIBILITY.range})`,
  );
  add(
    'OpenSpec',
    'Project',
    os.project.initialized ? 'pass' : 'fail',
    os.project.configPath || os.project.state.replaceAll('_', ' '),
  );

  if (config) {
    const g = detectGraphify(projectRoot, config.integrations.graphify);
    const graphStatus = g.ready ? 'pass' : g.blocking ? 'fail' : 'warn';
    add('Capabilities', 'Graphify', graphStatus, graphifySummary(g), Boolean(config.integrations.graphify.required));
    add('Capabilities', 'Native search fallback', 'pass', 'filesystem / grep / runtime-native search', false);
    add(
      'Capabilities',
      'Git worktrees',
      gitInstalled ? 'pass' : 'warn',
      gitInstalled ? 'available through Git' : 'unavailable without Git',
      false,
    );

    const commands = config.verification?.commands || [];
    add(
      'Verification',
      'Commands',
      commands.length ? 'pass' : 'warn',
      commands.length ? `${commands.length} configured` : 'none configured',
      false,
    );
    const testsRequired = config.verification?.tests_required ?? 'off';
    add(
      'Verification',
      'Tests required',
      'pass',
      testsRequired === 'off' ? 'off (not enforced)' : testsRequired,
      false,
    );
    const tasksComplete = config.verification?.tasks_complete ?? 'off';
    add(
      'Verification',
      'Tasks complete',
      'pass',
      tasksComplete === 'off' ? 'off (not enforced)' : tasksComplete,
      false,
    );
    if (commands.length) {
      const trusted = isTrusted(projectRoot, commands);
      add(
        'Verification',
        'Trust',
        trusted ? 'pass' : 'warn',
        trusted ? 'commands approved for this project' : 'not trusted yet; truss verify will ask before running them',
        false,
      );
    }
  } else {
    add('Capabilities', 'Graphify', 'skip', 'config invalid', false);
    add('Verification', 'Commands', 'skip', 'config invalid', false);
  }

  const requiredFailures = checks.filter((c) => c.required && c.status === 'fail');
  const configFailed = checks.some((c) => c.section === 'Core' && c.name === 'Config' && c.status === 'fail');
  const warnings = checks.filter((c) => c.status === 'warn');
  return {
    checks,
    healthy: requiredFailures.length === 0,
    exitCode: configFailed ? 2 : requiredFailures.length ? 1 : 0,
    warnings: warnings.length,
  };
}
