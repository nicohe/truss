import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { ComponentError, componentSummary, resolveComponent, resolveComponents } from './components.mjs';
import { ConfigError, formatConfigError, loadConfig } from './config.mjs';
import { diagnoseProject } from './doctor.mjs';
import { detectGraphify, graphifyAdvice, graphifySummary, updateGraphify } from './graphify.mjs';
import { COMMAND_HELP, renderCommandHelp, renderHelp, unknownCommandMessage } from './help.mjs';
import { initializeProject } from './init.mjs';
import {
  createChange,
  describeOpenChange,
  findArchivedChange,
  LifecycleError,
  lifecycleStatus,
  nextLifecycleAction,
  openChanges,
  pickUpCommand,
  readLifecycleState,
  useChange,
  useCommand,
} from './lifecycle.mjs';
import { detectOpenSpec, OPENSPEC_COMPATIBILITY } from './openspec.mjs';
import { displayPath, harnessPath, harnessRoot } from './paths.mjs';
import { evaluateTestGate } from './require-tests.mjs';
import { evaluateTasksGate } from './tasks-gate.mjs';
import { isTrusted, trustCommands, trustRequestedByEnv } from './trust.mjs';
import { runVerification } from './verification.mjs';

export function createCommands({ cwd, args, ui }) {
  const { c, p, header } = ui;
  const readConfig = ({ required = true } = {}) => loadConfig(cwd, { required })?.config ?? null;
  const option = (name) => {
    const i = args.indexOf(name);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const failure = (message) => p(`\n${c.red(`× ${message}`)}`);
  const invalidConfig = (error) =>
    p(`\n${c.red('× invalid config')}\n${error instanceof ConfigError ? formatConfigError(error) : error.message}`);
  // Same contract as `config`, `verify` and `components`: a configuration problem, or an unknown component, is
  // reported in full and exits 2 (see the exit codes in docs/en/reference/cli.md).
  const lifecycleFailure = (error) => {
    if (error instanceof ConfigError) {
      invalidConfig(error);
      process.exitCode = 2;
      return;
    }
    failure(error.message);
    process.exitCode = error instanceof LifecycleError ? error.exitCode : error instanceof ComponentError ? 2 : 1;
  };

  // verification.commands run through the shell with the user's permissions, so a project's
  // command list must be approved once (and again whenever it changes) before `verify` runs it.
  function ensureTrusted(cmds) {
    if (isTrusted(cwd, cmds)) return true;
    p(`\n${c.cyan('○')} These verification commands are not trusted for this project yet.`);
    p('  They run through your shell with your permissions. Review them first:');
    for (const command of cmds) p(`    ${command}`);
    if (!args.includes('--trust') && !trustRequestedByEnv()) {
      if (!ui.interactive()) {
        p(
          `\n${c.red('× Not trusted; nothing was executed.')}\nReview .truss/config.yaml, then re-run with --trust (or TRUSS_TRUST=1).`,
        );
        process.exitCode = 1;
        return false;
      }
      if (!ui.confirm('\nRun and trust these commands?')) {
        p(`\n${c.red('× Not trusted; nothing was executed.')}`);
        process.exitCode = 1;
        return false;
      }
    }
    try {
      trustCommands(cwd, cmds);
      p(`\n${c.green('●')} Trusted. You will be asked again only if the command list changes.`);
    } catch (error) {
      p(`\n${c.cyan('○')} Could not remember trust (${error.message}); you will be asked again next time.`);
    }
    return true;
  }

  function printTestGate(gate) {
    p(`\nTests required  ${gate.mode}`);
    if (gate.status === 'unknown') {
      p(`  ${c.cyan('○')} could not evaluate: ${gate.reason}. Not blocking.`);
      return;
    }
    const base = `base ${gate.base.ref} @ ${gate.base.mergeBase.slice(0, 7)}`;
    if (gate.status === 'passed') {
      const scope = gate.sourceFiles
        ? `${gate.sourceFiles} source and ${gate.testFiles} test file(s) changed`
        : 'no source changes';
      p(`  ${c.green('● passed')} ${scope} (${base})`);
      return;
    }
    const mark = gate.blocking ? c.red('× missing tests') : c.cyan('○ missing tests');
    p(`  ${mark} source changed without any test change (${base})`);
    for (const violation of gate.violations) {
      p(`    ${violation.component}:`);
      for (const file of violation.sourceFiles) p(`      ${file}`);
    }
    p(
      gate.blocking
        ? '  Add or update tests, or lower verification.tests_required to warn/off.'
        : '  Warning only (verification.tests_required: warn).',
    );
  }

  function printTasksGate(gate) {
    p(`\nTasks complete  ${gate.mode}`);
    if (gate.status === 'unknown') {
      p(`  ${c.cyan('○')} could not evaluate: ${gate.reason}. Not blocking.`);
      return;
    }
    if (gate.status === 'no_active_change') {
      p(`  ${c.cyan('○')} no active change; nothing to check`);
      return;
    }
    if (gate.status === 'archived') {
      p(`  ${c.cyan('○')} the active change "${gate.change}" was archived (${gate.path}); nothing to check`);
      return;
    }
    if (gate.status === 'passed') {
      p(`  ${c.green('● passed')} all ${gate.total} task(s) of "${gate.change}" are complete`);
      return;
    }
    const mark = gate.blocking ? c.red('× open tasks') : c.cyan('○ open tasks');
    p(`  ${mark} ${gate.remaining.length} of ${gate.total} task(s) still open in "${gate.change}"`);
    for (const task of gate.remaining) p(`      ${task.description}`);
    p(
      gate.blocking
        ? '  Finish or check off these tasks, or lower verification.tasks_complete to warn/off.'
        : '  Warning only (verification.tasks_complete: warn).',
    );
  }

  // `truss help` lists the commands; `truss help <command>` (or `truss <command> --help`) explains one.
  function help() {
    const topic = args[1];
    if (topic === undefined) {
      header('engineering harness');
      p(renderHelp());
      return;
    }
    if (!Object.hasOwn(COMMAND_HELP, topic)) {
      const { problem, hint } = unknownCommandMessage(topic);
      p(`${c.red(`× ${problem}`)}\n${hint}`);
      process.exitCode = 2;
      return;
    }
    header(topic);
    p(renderCommandHelp(topic));
  }

  function version() {
    let installed = 'unknown';
    try {
      installed = JSON.parse(fs.readFileSync(path.join(harnessRoot, 'package.json'), 'utf8')).version ?? installed;
    } catch {
      /* an installation without package.json still works; it just cannot say its version */
    }
    p(`truss ${installed}`);
  }

  function init() {
    header('init');
    try {
      const result = initializeProject(cwd);
      const configMark = c.green(result.config.state === 'created' ? '● created' : '● adopted');
      p(`\nConfig          ${configMark} ${result.config.path}`);
      if (result.config.state === 'created') {
        // The default command list comes from TRUSS itself, not from the repository, so it starts trusted.
        try {
          trustCommands(cwd, loadConfig(cwd).config.verification.commands);
        } catch {
          /* trust is asked for at verify time */
        }
      }

      const os = result.openspec;
      if (os.state === 'adopted') p(`OpenSpec       ${c.green('● adopted')} existing project`);
      else if (os.state === 'created') p(`OpenSpec       ${c.green('● initialized')} with --tools none`);
      else if (os.state === 'missing_cli') {
        p(`OpenSpec       ${c.red('× CLI missing')}`);
        p(`\nInstall a compatible OpenSpec CLI (${OPENSPEC_COMPATIBILITY.range}) and run truss init again.`);
        process.exitCode = 1;
      } else if (os.state === 'incompatible_cli') {
        p(
          `OpenSpec       ${c.red('× incompatible')} ${os.detected.cli.version || 'unknown'} (${OPENSPEC_COMPATIBILITY.range} required)`,
        );
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
      else {
        const via = result.gitignore.source ? ` (via ${result.gitignore.source})` : '';
        p(`Git ignore      ${c.green(`● .truss/ ignored${via}`)}`);
      }

      if (!process.exitCode)
        p(
          `\n${c.green('TRUSS initialization verified.')}\nRun again safely at any time: truss init\nNext: truss doctor`,
        );
    } catch (error) {
      const message = error instanceof ConfigError ? formatConfigError(error) : error.message;
      p(
        `\n${c.red('× initialization stopped')}\n${message}\n\nExisting configuration and OpenSpec data were not overwritten.`,
      );
      process.exitCode = 2;
    }
  }

  // The arguments that are neither an option nor the value of `--component`: the title of `new`, the name for `use`.
  const positionals = () =>
    args.slice(1).filter((arg, i, rest) => !arg.startsWith('--') && rest[i - 1] !== '--component');

  function newChange() {
    const title = positionals()[0];
    if (!title) {
      p('Usage: truss new "Change name" [--component name]');
      process.exitCode = 2;
      return;
    }
    const component = option('--component');
    header('new');
    try {
      const result = createChange(cwd, readConfig(), title, component || null);
      p(`\n${c.green('●')} OpenSpec change created`);
      p(`Change          ${result.name}`);
      p(`Component       ${component || 'workspace'}`);
      p(`OpenSpec        ${result.status.changeRootRelative}`);
      p(`Planning        ${result.status.completedArtifacts}/${result.status.artifacts.length} artifacts complete`);
      if (result.replaced) {
        const { change, component: owner, path: where } = result.replaced;
        p(
          `\n○ "${change}" is still open in OpenSpec (${where}) and is no longer the active change: TRUSS follows one change at a time. Go back to it with: ${useCommand(change, owner)}`,
        );
      } else if (result.alsoOpen.length) {
        p(
          `\n○ Also open in OpenSpec: ${result.alsoOpen.map(describeOpenChange).join(', ')}. None was the active change, and "${result.name}" is now: TRUSS follows one change at a time. Go back to one with: ${pickUpCommand(result.alsoOpen)}`,
        );
      }
      p('\nNext: truss continue');
    } catch (error) {
      lifecycleFailure(error);
    }
  }

  function use() {
    const component = option('--component');
    const name = positionals()[0];
    if (!name) {
      p('Usage: truss use <change> [--component name]');
      process.exitCode = 2;
      return;
    }
    header('use');
    try {
      const result = useChange(cwd, readConfig(), name, component || null);
      p(`\n${c.green('●')} Active change set`);
      p(`Change          ${result.name}`);
      p(`Component       ${component || 'workspace'}`);
      p(`Phase           ${result.state.phase}`);
      p(`OpenSpec        ${result.status.changeRootRelative}`);
      p(`Planning        ${result.status.completedArtifacts}/${result.status.artifacts.length} artifacts complete`);
      if (result.progress?.available)
        p(`Tasks           ${result.progress.complete}/${result.progress.total} complete`);
      p('\nNext: truss continue');
    } catch (error) {
      lifecycleFailure(error);
    }
  }

  // What `status` and `handoff` add when nothing is active: what OpenSpec has open, and the command that picks one up.
  const pickUpLines = (open) =>
    open.length
      ? [
          `Open changes    ${open.map(describeOpenChange).join(', ')}`,
          `Next: ${pickUpCommand(open)}, or truss new "Change name" for a new one`,
        ]
      : ['Next: truss new "Change name"'];
  // `handoff` has never needed a valid configuration, so a configuration that cannot be read lists nothing.
  const openChangesWithoutConfig = () => {
    try {
      return openChanges(cwd, readConfig());
    } catch {
      return [];
    }
  };

  function status() {
    header('status');
    try {
      const current = lifecycleStatus(cwd, readConfig());
      if (!current.active) {
        p(
          current.archived
            ? `\nThe active change "${current.archived.change}" was archived (${current.archived.path}).`
            : '\nNo active change.',
        );
        for (const line of pickUpLines(current.open)) p(line);
        return;
      }
      const { state, status: changeStatus } = current;
      p(`\nChange          ${state.change}`);
      p(`Component       ${state.component || 'workspace'}`);
      p(`Phase           ${state.phase}`);
      p(`OpenSpec        ${changeStatus.changeRootRelative}`);
      p(`Planning        ${changeStatus.completedArtifacts}/${changeStatus.artifacts.length} artifacts complete`);
      if (current.progress?.available)
        p(`Tasks           ${current.progress.complete}/${current.progress.total} complete`);
      for (const artifact of changeStatus.artifacts) {
        const st = String(artifact.status || 'unknown').toLowerCase();
        const icon = ['done', 'complete', 'completed'].includes(st) ? c.green('●') : st === 'ready' ? c.cyan('◐') : '○';
        p(`  ${icon} ${(artifact.id || artifact.name || artifact.outputPath || 'artifact').padEnd(18)} ${st}`);
      }
      if (changeStatus.applyRequires?.length) p(`Needed to implement   ${changeStatus.applyRequires.join(', ')}`);
      p('\nNext: truss continue');
    } catch (error) {
      lifecycleFailure(error);
    }
  }

  function continueChange() {
    header('continue');
    try {
      const config = readConfig();
      const next = nextLifecycleAction(cwd, config);
      if (!next.active) {
        p(`\n${next.instruction}`);
        return;
      }
      p(`\nChange          ${next.state.change}`);
      p(`Phase           ${next.state.phase}`);
      p(`OpenSpec        ${next.status.changeRootRelative}`);
      if (next.progress?.available) p(`Tasks           ${next.progress.complete}/${next.progress.total} complete`);
      p('Mode            agent-driven (TRUSS v0.2)');
      p(`\nNext action\n${[next.instruction, ...(next.policy ?? [])].join('\n')}`);
      if (next.kind === 'implementation') {
        // Only a guidance file that exists is worth loading: `init` does not create one.
        const agents = resolveComponent(cwd, config, next.state.component || null).agents.effective;
        p(
          `\nContext to load${agents ? `\n- ${displayPath(agents, cwd)} (effective component/workspace guidance)` : ''}\n- ${next.status.changeRootRelative}\n- .truss/config.yaml (this project's settings: gates, verification commands, policies)\n- ${displayPath(harnessPath('workflows', 'execute-change.md'), cwd)}\n- ${displayPath(harnessPath('policies'), cwd)}/ (configured BDD/TDD/spec policies)`,
        );
        const advice = graphifyAdvice(detectGraphify(cwd, config.integrations.graphify));
        if (advice) p(`\nCode graph\n${advice}`);
      }
    } catch (error) {
      lifecycleFailure(error);
    }
  }

  function verify() {
    let config;
    try {
      config = readConfig();
    } catch (error) {
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

    const gates = { testsRequired: evaluateTestGate(cwd, config), tasksComplete: evaluateTasksGate(cwd, config) };
    if (gates.testsRequired.mode !== 'off') printTestGate(gates.testsRequired);
    if (gates.tasksComplete.mode !== 'off') printTasksGate(gates.tasksComplete);

    if (!Object.values(gates).some((gate) => gate.blocking)) {
      p(`\nCommands        ${cmds.length}\nMode            sequential / fail-fast`);
      // The runner owns execution order and evidence. Progress is printed here before execution.
      // Commands themselves inherit stdio, so their output remains visible to the caller.
      for (const [i, command] of cmds.entries()) p(`${c.cyan(`${i + 1}.`)} ${command}`);
      p('');
    }
    const result = runVerification(cwd, cmds, { gates });

    for (const item of result.evidence.commands) {
      const mark = item.status === 'passed' ? c.green('● passed') : c.red('× failed');
      const exit = item.exitCode === null ? 'n/a' : item.exitCode;
      p(`${mark}  [${item.index}/${cmds.length}] ${item.command} (exit ${exit}, ${item.durationMs}ms)`);
    }
    p(`Evidence        ${result.evidencePath}`);

    if (result.reason === 'tests_required' || result.reason === 'tasks_incomplete') {
      const why = result.reason === 'tests_required' ? 'tests are required' : 'the active change still has open tasks';
      p(`\n${c.red(`Verification failed: ${why}. No command was executed.`)}`);
      process.exitCode = 1;
      return;
    }
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
    p(
      `Project         ${result.project.initialized ? c.green('● initialized') : c.cyan(`○ ${result.project.state.replaceAll('_', ' ')}`)}`,
    );
    p(`Directory       ${result.project.directory}`);
    if (result.project.configPath) p(`Config          ${result.project.configPath}`);
    p(`Specs dir       ${result.project.specsDir ? 'present' : 'absent'}`);
    p(`Changes dir     ${result.project.changesDir ? 'present' : 'absent'}`);
    if (!result.cli.installed || !result.compatibility.compatible || !result.project.initialized) process.exitCode = 1;
  }

  function graphify() {
    header('Graphify');
    let config;
    try {
      config = readConfig();
    } catch (error) {
      invalidConfig(error);
      process.exitCode = 2;
      return;
    }
    const cfg = config.integrations.graphify;
    const action = args[1] || 'status';
    if (action === 'update' || action === 'bootstrap') {
      if (!cfg.enabled) {
        p(`\n${c.cyan('○')} Graphify is disabled in config.`);
        return;
      }
      const result = updateGraphify(cwd, { bootstrap: action === 'bootstrap' });
      if (!result.ok) {
        p(
          `\n${c.red('× Graphify update failed')}${result.command ? `\nCommand         ${result.command}` : ''}\n${result.reason}`,
        );
        process.exitCode = cfg.required ? 1 : 0;
        return;
      }
      p(
        `\n${c.green('●')} graph updated\nCommand         ${result.command}\nStatus          ${graphifySummary(result.state)}`,
      );
      return;
    }
    if (action !== 'status') {
      p('Usage: truss graphify [status|update|bootstrap]');
      process.exitCode = 2;
      return;
    }
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
    const icon = (status) =>
      status === 'pass' ? c.green('●') : status === 'warn' || status === 'skip' ? c.cyan('○') : c.red('×');
    p('');
    for (const section of sectionOrder) {
      const items = result.checks.filter((check) => check.section === section);
      if (!items.length) continue;
      p(section);
      for (const check of items) p(`  ${icon(check.status)} ${check.name.padEnd(22)} ${check.detail}`);
      p('');
    }
    if (result.healthy)
      p(c.green(`TRUSS doctor passed.${result.warnings ? ` ${result.warnings} optional warning(s).` : ''}`));
    else p(c.red('TRUSS doctor found required setup problems.'));
    process.exitCode = result.exitCode;
  }

  function components() {
    header('components');
    let config;
    try {
      config = readConfig();
    } catch (error) {
      invalidConfig(error);
      process.exitCode = 2;
      return;
    }
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
    const dir = harnessPath('skills');
    if (!fs.existsSync(dir)) {
      p('\nNo TRUSS skills installed.');
      return;
    }
    const files = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('.SKILL.md'))
      .sort();
    p('');
    for (const f of files) p(`${c.green('●')} ${f.replace('.SKILL.md', '')}`);
    p('\nDocs: docs/en/skills/overview.md');
  }

  // `.truss/state.json` is only as fresh as the last `status` or `continue`, and a note that says a change is still in
  // implementation when it is complete (or the other way round) misleads whoever picks it up. So the phase is asked
  // from OpenSpec when the note is written. `handoff` has never needed OpenSpec or a valid configuration, so when they
  // cannot be asked it writes the phase last recorded and says so.
  function currentPhase(state) {
    try {
      const current = lifecycleStatus(cwd, readConfig());
      if (current.active) return current.state.phase;
    } catch {
      /* fall back to what was recorded */
    }
    return `${state.phase} (last recorded; OpenSpec could not be asked)`;
  }

  function handoff() {
    let state;
    try {
      state = readLifecycleState(cwd);
    } catch (error) {
      lifecycleFailure(error);
      return;
    }
    if (!state.change) {
      p('No active change.');
      // With nothing open it stays that one line, as it always was.
      const open = openChangesWithoutConfig();
      if (open.length) for (const line of pickUpLines(open)) p(line);
      return;
    }
    // A note for a change that is finished would carry a phase that is no longer true, and nobody to hand it to.
    const archived = findArchivedChange(cwd, state);
    if (archived) {
      header('handoff');
      p(`\nThe active change "${state.change}" was archived (${archived}); there is nothing to hand off.`);
      for (const line of pickUpLines(openChangesWithoutConfig())) p(line);
      return;
    }
    const phase = currentPhase(state);
    const dir = path.join(cwd, '.truss', 'handoffs');
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `${state.change}.md`);
    const branch =
      spawnSync('git', ['branch', '--show-current'], { cwd, encoding: 'utf8' }).stdout?.trim() || 'unknown';
    const note = `# Handoff: ${state.change}\n\n- Component: ${state.component || 'workspace'}\n- Phase: ${phase}\n- OpenSpec: ${state.path}\n- Branch: ${branch}\n\n## Completed\n\n## Discoveries\n\n## Verification\n\n## Blockers\n\n## Next action\n\n`;
    const shown = path.relative(cwd, file);
    header('handoff');
    try {
      // `wx` fails when the file exists, so a note someone has already filled in is never replaced by the template.
      fs.writeFileSync(file, note, { flag: 'wx' });
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      p(`\n${c.cyan('○')} ${shown} already exists and was not changed.\n  Edit it, or delete it to start a new note.`);
      return;
    }
    p(`\n${c.green('●')} ${shown}`);
  }

  return {
    help,
    init,
    new: newChange,
    use,
    status,
    continue: continueChange,
    verify,
    doctor,
    openspec,
    config,
    graphify,
    components,
    handoff,
    skills,
    version,
  };
}
