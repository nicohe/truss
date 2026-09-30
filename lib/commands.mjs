import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ConfigError, formatConfigError, loadConfig } from './config.mjs';
import { detectOpenSpec, OPENSPEC_COMPATIBILITY } from './openspec.mjs';
import { detectGraphify, graphifySummary, updateGraphify } from './graphify.mjs';
import { componentSummary, resolveComponent, resolveComponents } from './components.mjs';
import { initializeProject } from './init.mjs';
import { runVerification } from './verification.mjs';
import { diagnoseProject } from './doctor.mjs';
import { isTrusted, trustCommands, trustRequestedByEnv } from './trust.mjs';
import { LifecycleError, createChange, lifecycleStatus, nextLifecycleAction, readLifecycleState } from './lifecycle.mjs';

const HELP = `
Usage: truss <command>

  init                         initialize .truss
  new "Change name" [--component name]
  status                       show active change
  continue                     show next action
  verify [--trust]             run configured verification
  doctor                       check local setup
  config                       validate and show resolved config
  openspec                     inspect OpenSpec CLI/project compatibility
  graphify [status|update|bootstrap]
                               inspect or refresh code graph
  components [name]            resolve configured project components
  handoff                      write a concise handoff
  skills                       list portable TRUSS skills

Docs: docs/en/getting-started.md`;

export function createCommands({ cwd, args, ui }) {
  const { c, p, header } = ui;
  const readConfig = ({ required = true } = {}) => loadConfig(cwd, { required })?.config ?? null;
  const option = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
  const failure = message => p(`\n${c.red(`× ${message}`)}`);
  const invalidConfig = error => p(`\n${c.red('× invalid config')}\n${error instanceof ConfigError ? formatConfigError(error) : error.message}`);
  const lifecycleFailure = error => {
    failure(error.message);
    process.exitCode = error instanceof LifecycleError ? error.exitCode : 1;
  };

  // verification.commands run through the shell with the user's permissions, so a project's
  // command list must be approved once (and again whenever it changes) before `verify` runs it.
  function ensureTrusted(cmds) {
    if (isTrusted(cwd, cmds)) return true;
    p(`\n${c.cyan('○')} These verification commands are not trusted for this project yet.`);
    p('  They run through your shell with your permissions. Review them first:');
    cmds.forEach(command => p(`    ${command}`));
    if (!args.includes('--trust') && !trustRequestedByEnv()) {
      if (!ui.interactive()) {
        p(`\n${c.red('× Not trusted; nothing was executed.')}\nReview .truss/config.yaml, then re-run with --trust (or TRUSS_TRUST=1).`);
        process.exitCode = 1;
        return false;
      }
      if (!ui.confirm('\nRun and trust these commands?')) {
        p(`\n${c.red('× Not trusted; nothing was executed.')}`);
        process.exitCode = 1;
        return false;
      }
    }
    try { trustCommands(cwd, cmds); p(`\n${c.green('●')} Trusted. You will be asked again only if the command list changes.`); }
    catch (error) { p(`\n${c.cyan('○')} Could not remember trust (${error.message}); you will be asked again next time.`); }
    return true;
  }

  function help() {
    header('engineering harness');
    p(HELP);
  }

  function init() {
    header('init');
    try {
      const result = initializeProject(cwd);
      const configMark = c.green(result.config.state === 'created' ? '● created' : '● adopted');
      p(`\nConfig          ${configMark} ${result.config.path}`);
      if (result.config.state === 'created') {
        // The default command list comes from TRUSS itself, not from the repository, so it starts trusted.
        try { trustCommands(cwd, loadConfig(cwd).config.verification.commands); } catch { /* trust is asked for at verify time */ }
      }

      const os = result.openspec;
      if (os.state === 'adopted') p(`OpenSpec       ${c.green('● adopted')} existing project`);
      else if (os.state === 'created') p(`OpenSpec       ${c.green('● initialized')} with --tools none`);
      else if (os.state === 'missing_cli') {
        p(`OpenSpec       ${c.red('× CLI missing')}`);
        p(`\nInstall a compatible OpenSpec CLI (${OPENSPEC_COMPATIBILITY.range}) and run truss init again.`);
        process.exitCode = 1;
      } else if (os.state === 'incompatible_cli') {
        p(`OpenSpec       ${c.red('× incompatible')} ${os.detected.cli.version || 'unknown'} (${OPENSPEC_COMPATIBILITY.range} required)`);
        p('\nTRUSS does not upgrade or downgrade OpenSpec automatically.');
        process.exitCode = 1;
      } else if (os.state === 'partial_requires_attention') {
        p(`OpenSpec       ${c.red(`× ${os.detected.project.state.replaceAll('_', ' ')}`)}`);
        p('\nExisting openspec/ data was preserved. Resolve or migrate it explicitly, then run truss init again.');
        process.exitCode = 1;
      } else if (os.state === 'init_failed' || os.state === 'init_unverified') {
        p(`OpenSpec       ${c.red('× initialization failed')}`);
        if (os.init?.stderr) p(os.init.stderr);
        process.exitCode = 1;
      }

      if (result.gitignore.state === 'not_ignored') p(`Git ignore      ${c.cyan('○ .truss/ is not ignored')}`);
      else if (result.gitignore.state === 'missing') p(`Git ignore      ${c.cyan('○ no .gitignore detected')}`);
      else p(`Git ignore      ${c.green('● .truss/ ignored')}`);

      if (!process.exitCode) p(`\n${c.green('TRUSS initialization verified.')}\nRun again safely at any time: truss init\nNext: truss doctor`);
    } catch (error) {
      const message = error instanceof ConfigError ? formatConfigError(error) : error.message;
      p(`\n${c.red('× initialization stopped')}\n${message}\n\nExisting configuration and OpenSpec data were not overwritten.`);
      process.exitCode = 2;
    }
  }

  function newChange() {
    const title = args[1];
    if (!title) { p('Usage: truss new "Change name" [--component name]'); process.exitCode = 2; return; }
    const component = option('--component');
    header('new');
    try {
      const result = createChange(cwd, readConfig(), title, component || null);
      p(`\n${c.green('●')} OpenSpec change created`);
      p(`Change          ${result.name}`);
      p(`Component       ${component || 'workspace'}`);
      p(`OpenSpec        ${result.status.changeRootRelative}`);
      p(`Planning        ${result.status.completedArtifacts}/${result.status.artifacts.length} artifacts complete`);
      p('\nNext: truss continue');
    } catch (error) {
      lifecycleFailure(error);
    }
  }

  function status() {
    header('status');
    try {
      const current = lifecycleStatus(cwd, readConfig());
      if (!current.active) { p('\nNo active change.\nNext: truss new "Change name"'); return; }
      const { state, status: changeStatus } = current;
      p(`\nChange          ${state.change}`);
      p(`Component       ${state.component || 'workspace'}`);
      p(`Phase           ${state.phase}`);
      p(`OpenSpec        ${changeStatus.changeRootRelative}`);
      p(`Planning        ${changeStatus.completedArtifacts}/${changeStatus.artifacts.length} artifacts complete`);
      for (const artifact of changeStatus.artifacts) {
        const st = String(artifact.status || 'unknown').toLowerCase();
        const icon = ['done', 'complete', 'completed'].includes(st) ? c.green('●') : st === 'ready' ? c.cyan('◐') : '○';
        p(`  ${icon} ${(artifact.id || artifact.name || artifact.outputPath || 'artifact').padEnd(18)} ${st}`);
      }
      if (changeStatus.applyRequires?.length) p(`Tasks required   ${changeStatus.applyRequires.join(', ')}`);
      p('\nNext: truss continue');
    } catch (error) {
      lifecycleFailure(error);
    }
  }

  function continueChange() {
    header('continue');
    try {
      const next = nextLifecycleAction(cwd, readConfig());
      if (!next.active) { p(`\n${next.instruction}`); return; }
      p(`\nChange          ${next.state.change}`);
      p(`Phase           ${next.state.phase}`);
      p(`OpenSpec        ${next.status.changeRootRelative}`);
      p('Mode            agent-driven (TRUSS v0.1)');
      p(`\nNext action\n${next.instruction}`);
      if (next.kind === 'implementation') {
        p(`\nContext to load\n- AGENTS.md (effective component/workspace guidance)\n- ${next.status.changeRootRelative}\n- .truss/workflows/execute-change.md\n- configured BDD/TDD policies`);
      }
    } catch (error) {
      lifecycleFailure(error);
    }
  }

  function verify() {
    let config;
    try { config = readConfig(); }
    catch (error) {
      header('verification');
      p(`\n${c.red('× invalid config')}\n${formatConfigError(error)}`);
      process.exitCode = 2;
      return;
    }

    header('verification');
    const cmds = config?.verification?.commands || [];
    if (!cmds.length) {
      p(`\n${c.red('× no verification commands configured')}\nConfigure verification.commands in .truss/config.yaml.`);
      const result = runVerification(cwd, []);
      p(`Evidence        ${result.evidencePath}`);
      process.exitCode = 1;
      return;
    }

    if (!ensureTrusted(cmds)) return;

    p(`\nCommands        ${cmds.length}\nMode            sequential / fail-fast`);
    // The runner owns execution order and evidence. Progress is printed here before execution.
    // Commands themselves inherit stdio, so their output remains visible to the caller.
    cmds.forEach((command, i) => p(`${c.cyan(`${i + 1}.`)} ${command}`));
    p('');
    const result = runVerification(cwd, cmds);

    for (const item of result.evidence.commands) {
      const mark = item.status === 'passed' ? c.green('● passed') : c.red('× failed');
      const exit = item.exitCode === null ? 'n/a' : item.exitCode;
      p(`${mark}  [${item.index}/${cmds.length}] ${item.command} (exit ${exit}, ${item.durationMs}ms)`);
    }
    p(`Evidence        ${result.evidencePath}`);

    if (!result.ok) {
      p(`\n${c.red('Verification failed. Remaining commands were not executed.')}`);
      process.exitCode = 1;
      return;
    }
    p(`\n${c.green('Verification passed.')}`);
  }

  function config() {
    header('config');
    try {
      const loaded = loadConfig(cwd);
      p(`\n${c.green('●')} valid .truss/config.yaml\n`);
      p(JSON.stringify(loaded.config, null, 2));
    } catch (error) {
      p(`\n${c.red('× invalid config')}\n${error instanceof ConfigError ? formatConfigError(error) : error.message}`);
      process.exitCode = 2;
    }
  }

  function openspec() {
    header('OpenSpec');
    const result = detectOpenSpec(cwd);
    p(`\nCLI             ${result.cli.installed ? c.green('● installed') : c.red('× not installed')}`);
    if (result.cli.path) p(`Path            ${result.cli.path}`);
    if (result.cli.installed) p(`Version         ${result.cli.version || 'unknown'}`);
    const compat = result.compatibility;
    p(`Compatibility   ${compat.compatible ? c.green('●') : c.red('×')} ${compat.status} (${compat.range})`);
    if (!compat.compatible) p(`Reason          ${compat.reason}`);
    p(`Project         ${result.project.initialized ? c.green('● initialized') : c.cyan(`○ ${result.project.state.replaceAll('_', ' ')}`)}`);
    p(`Directory       ${result.project.directory}`);
    if (result.project.configPath) p(`Config          ${result.project.configPath}`);
    p(`Specs dir       ${result.project.specsDir ? 'present' : 'absent'}`);
    p(`Changes dir     ${result.project.changesDir ? 'present' : 'absent'}`);
    if (!result.cli.installed || !result.compatibility.compatible || !result.project.initialized) process.exitCode = 1;
  }

  function graphify() {
    header('Graphify');
    let config;
    try { config = readConfig(); } catch (error) { invalidConfig(error); process.exitCode = 2; return; }
    const cfg = config.integrations.graphify;
    const action = args[1] || 'status';
    if (action === 'update' || action === 'bootstrap') {
      if (!cfg.enabled) { p(`\n${c.cyan('○')} Graphify is disabled in config.`); return; }
      const result = updateGraphify(cwd, { bootstrap: action === 'bootstrap' });
      if (!result.ok) { p(`\n${c.red('× Graphify update failed')}\n${result.reason}`); process.exitCode = cfg.required ? 1 : 0; return; }
      p(`\n${c.green('●')} graph updated\nCommand         ${result.command}\nStatus          ${graphifySummary(result.state)}`);
      return;
    }
    if (action !== 'status') { p('Usage: truss graphify [status|update|bootstrap]'); process.exitCode = 2; return; }
    const s = detectGraphify(cwd, cfg);
    p(`\nConfigured      ${cfg.enabled ? 'enabled' : 'disabled'}${cfg.required ? ' / required' : ' / optional'}`);
    p(`Status          ${s.ready ? c.green('●') : s.blocking ? c.red('×') : c.cyan('○')} ${graphifySummary(s)}`);
    if (s.cli?.path) p(`CLI             ${s.cli.path}${s.cli.version ? ` (${s.cli.version})` : ''}`);
    if (s.index?.path) p(`Index           ${s.index.path}`);
    if (s.index?.exists) p(`Freshness       ${s.index.freshness}`);
    if (s.fallback) p('Fallback        native search / grep / LSP');
    if (s.blocking) process.exitCode = 1;
  }

  function doctor() {
    header('doctor');
    const result = diagnoseProject(cwd);
    const sectionOrder = ['Core', 'Project', 'OpenSpec', 'Capabilities', 'Verification'];
    const icon = status => status === 'pass' ? c.green('●') : status === 'warn' || status === 'skip' ? c.cyan('○') : c.red('×');
    p('');
    for (const section of sectionOrder) {
      const items = result.checks.filter(check => check.section === section);
      if (!items.length) continue;
      p(section);
      for (const check of items) p(`  ${icon(check.status)} ${check.name.padEnd(22)} ${check.detail}`);
      p('');
    }
    if (result.healthy) p(c.green(`TRUSS doctor passed.${result.warnings ? ` ${result.warnings} optional warning(s).` : ''}`));
    else p(c.red('TRUSS doctor found required setup problems.'));
    process.exitCode = result.exitCode;
  }

  function components() {
    header('components');
    let config;
    try { config = readConfig(); } catch (error) { invalidConfig(error); process.exitCode = 2; return; }
    try {
      const requested = args[1];
      const list = requested ? [resolveComponent(cwd, config, requested)] : resolveComponents(cwd, config);
      p('');
      for (const item of list) {
        p(`${c.green('●')} ${item.name.padEnd(16)} ${componentSummary(item)}`);
        p(`  AGENTS          ${item.agents.effective ? path.relative(cwd, item.agents.effective) : 'not detected'}`);
        p(`  OpenSpec        ${item.openspec.relative} (${item.openspec.scope})`);
        p(`  Source          ${item.sourceDirs.length ? item.sourceDirs.join(', ') : 'not detected'}`);
        p(`  Tests           ${item.testDirs.length ? item.testDirs.join(', ') : 'not detected'}`);
      }
    } catch (error) {
      failure(error.message);
      process.exitCode = 2;
    }
  }

  function skills() {
    header('skills');
    const dir = path.join(cwd, '.truss', 'skills');
    if (!fs.existsSync(dir)) { p('\nNo TRUSS skills installed.'); return; }
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.SKILL.md')).sort();
    p('');
    for (const f of files) p(`${c.green('●')} ${f.replace('.SKILL.md', '')}`);
    p('\nDocs: docs/en/skills/overview.md');
  }

  function handoff() {
    let state;
    try { state = readLifecycleState(cwd); } catch (error) { lifecycleFailure(error); return; }
    if (!state.change) { p('No active change.'); return; }
    const dir = path.join(cwd, '.truss', 'handoffs');
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `${state.change}.md`);
    const branch = spawnSync('git', ['branch', '--show-current'], { cwd, encoding: 'utf8' }).stdout?.trim() || 'unknown';
    fs.writeFileSync(file, `# Handoff: ${state.change}\n\n- Component: ${state.component || 'workspace'}\n- Phase: ${state.phase}\n- OpenSpec: ${state.path}\n- Branch: ${branch}\n\n## Completed\n\n## Discoveries\n\n## Verification\n\n## Blockers\n\n## Next action\n\n`);
    header('handoff');
    p(`\n${c.green('●')} ${path.relative(cwd, file)}`);
  }

  return { help, init, new: newChange, status, continue: continueChange, verify, doctor, openspec, config, graphify, components, handoff, skills };
}
