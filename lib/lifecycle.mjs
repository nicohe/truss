import fs from 'node:fs';
import path from 'node:path';
import { resolveComponent } from './components.mjs';
import { detectOpenSpec } from './openspec.mjs';
import { displayPath, harnessPath } from './paths.mjs';
import { spawnCli } from './spawn.mjs';

export class LifecycleError extends Error {
  constructor(message, exitCode = 1, code = null) {
    super(message);
    this.name = 'LifecycleError';
    this.exitCode = exitCode;
    this.code = code;
  }
}

const statePath = (root) => path.join(root, '.truss', 'state.json');
export function readLifecycleState(root) {
  const file = statePath(root);
  if (!fs.existsSync(file)) return {};
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    throw new LifecycleError(
      `Invalid TRUSS state file: ${path.relative(root, file)}. Delete it (it only remembers the active change) and start again with: truss new "Change name"`,
      2,
    );
  }
}
export function writeLifecycleState(root, state) {
  const file = statePath(root);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  // Write to a temp file and rename so an interrupted process never leaves a truncated state file.
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(state, null, 2)}\n`);
  fs.renameSync(tmp, file);
}

export function slugifyChange(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .replace(/-{2,}/g, '-');
}

function runJson(executable, args, cwd) {
  const result = spawnCli(executable, args, { cwd });
  let json = null;
  if (result.stdout?.trim()) {
    try {
      json = JSON.parse(result.stdout);
    } catch {}
  }
  return { status: result.status, stdout: result.stdout?.trim() || '', stderr: result.stderr?.trim() || '', json };
}

// OpenSpec reports a failure as JSON: { status: [{ severity, message }] }. Show the messages, not the JSON.
function openspecFailure(result) {
  const messages = (Array.isArray(result.json?.status) ? result.json.status : [])
    .filter((item) => item?.severity === 'error' && typeof item.message === 'string')
    .map((item) => item.message);
  return messages.length ? messages.join('; ') : result.stderr || result.stdout || `OpenSpec exited ${result.status}`;
}

const shortName = (name) => (name.length > 60 ? `${name.slice(0, 57)}...` : name);

function assertOpenSpec(root) {
  const detected = detectOpenSpec(root);
  if (!detected.cli.installed) throw new LifecycleError('OpenSpec CLI is not installed. Run truss doctor.', 1);
  if (!detected.compatibility.compatible)
    throw new LifecycleError(
      `OpenSpec ${detected.cli.version || 'unknown'} is not compatible (${detected.compatibility.range}).`,
      1,
    );
  if (!detected.project.initialized)
    throw new LifecycleError(`OpenSpec project is not initialized (${detected.project.state}). Run truss init.`, 1);
  return detected;
}

export function createChange(root, config, title, componentName = null) {
  const detected = assertOpenSpec(root);
  const component = resolveComponent(root, config, componentName);
  // v0.2 supports the workspace OpenSpec root through the OpenSpec CLI. A component-local
  // OpenSpec root is valid only when running the command from that component root.
  const workdir = component.openspec.scope === 'component' ? component.root : root;
  const name = slugifyChange(title);
  if (!name) throw new LifecycleError('Change name becomes empty after kebab-case normalization.', 2);
  const replaced = openChangeBeingReplaced(root, config, name);
  const result = runJson(detected.cli.path, ['new', 'change', name, '--goal', title, '--json'], workdir);
  if (result.status !== 0) {
    throw new LifecycleError(`OpenSpec could not create change "${shortName(name)}": ${openspecFailure(result)}`, 1);
  }
  const status = getOpenSpecStatus(root, config, name, componentName);
  const state = {
    change: name,
    title,
    component: componentName,
    phase: status.isPlanningComplete ? 'implementation' : 'spec',
    path: status.changeRootRelative,
    updatedAt: new Date().toISOString(),
  };
  writeLifecycleState(root, state);
  return { name, component, state, status, replaced, openSpecOutput: result.json };
}

export function getOpenSpecStatus(root, config, changeName, componentName = null) {
  const detected = assertOpenSpec(root);
  const component = resolveComponent(root, config, componentName);
  const workdir = component.openspec.scope === 'component' ? component.root : root;
  const result = runJson(detected.cli.path, ['status', '--change', changeName, '--json'], workdir);
  if (result.status !== 0 || !result.json) {
    const detail = result.stderr || result.stdout || `OpenSpec exited ${result.status}`;
    throw new LifecycleError(`Could not read OpenSpec status for "${changeName}": ${detail}`, 1, 'status_unreadable');
  }
  const data = result.json;
  const artifacts = Array.isArray(data.artifacts) ? data.artifacts : [];
  const completed = artifacts.filter((a) =>
    ['done', 'complete', 'completed'].includes(String(a.status).toLowerCase()),
  ).length;
  const ready = artifacts.filter((a) => String(a.status).toLowerCase() === 'ready');
  const blocked = artifacts.filter((a) => String(a.status).toLowerCase() === 'blocked');
  const changeRoot = data.changeRoot || path.join(component.openspec.root, 'changes', changeName);
  return {
    ...data,
    artifacts,
    completedArtifacts: completed,
    readyArtifacts: ready,
    blockedArtifacts: blocked,
    changeRoot,
    changeRootRelative: path.relative(root, changeRoot) || '.',
    isPlanningComplete: Boolean(data.isPlanningComplete),
    isComplete: Boolean(data.isComplete),
  };
}

// Task progress comes from `openspec instructions apply`, which reads the checkboxes of tasks.md.
// `openspec status` cannot be used for this: its isComplete only means "all artifacts exist".
export function getTaskProgress(root, config, changeName, componentName = null) {
  let detected;
  let workdir;
  try {
    detected = assertOpenSpec(root);
    const component = resolveComponent(root, config, componentName);
    workdir = component.openspec.scope === 'component' ? component.root : root;
  } catch (error) {
    return { available: false, reason: error.message };
  }
  const result = runJson(detected.cli.path, ['instructions', 'apply', '--change', changeName, '--json'], workdir);
  const progress = result.json?.progress;
  if (result.status !== 0 || !Number.isInteger(progress?.total)) {
    return { available: false, reason: result.stderr || 'OpenSpec did not report task progress' };
  }
  const tasks = (Array.isArray(result.json.tasks) ? result.json.tasks : []).map((task) => ({
    id: String(task.id),
    description: String(task.description ?? ''),
    done: Boolean(task.done),
  }));
  return {
    available: true,
    total: progress.total,
    complete: progress.complete,
    remaining: progress.remaining,
    tasks,
    state: result.json.state ?? null,
  };
}

// A change is complete only when it has tasks and none remain. Unknown progress is never reported as complete.
export function phaseFor(status, progress) {
  if (!status.isPlanningComplete) return 'spec';
  return progress?.available && progress.total > 0 && progress.remaining === 0 ? 'complete' : 'implementation';
}

// `openspec archive` moves a finished change to changes/archive/<date>-<name>. The newest such folder, if any.
function archivedFolder(changesDirectory, name) {
  const archive = path.join(changesDirectory, 'archive');
  return (fs.existsSync(archive) ? fs.readdirSync(archive) : [])
    .filter((entry) => /^\d{4}-\d{2}-\d{2}-(.+)$/.exec(entry)?.[1] === name)
    .sort()
    .pop();
}

// Where the active change is in OpenSpec's tree. `openspec archive` moves a finished change without telling TRUSS,
// so a pointer to a change OpenSpec no longer lists is normal, not a failure.
function locateChange(root, config, state) {
  const changes = path.join(resolveComponent(root, config, state.component || null).openspec.root, 'changes');
  if (fs.existsSync(path.join(changes, state.change)))
    return { where: 'open', path: path.relative(root, path.join(changes, state.change)) };
  const archived = archivedFolder(changes, state.change);
  return archived
    ? { where: 'archived', path: path.relative(root, path.join(changes, 'archive', archived)) }
    : { where: 'missing', path: path.relative(root, path.join(changes, state.change)) };
}

// The change `new` is about to stop following, when it is still open in OpenSpec: that one would be left behind without
// anyone saying so. Null when there is none, when it was archived or is gone, or when TRUSS cannot tell (an unreadable
// state file, a component that is no longer declared): `new` has always replaced those without a word.
function openChangeBeingReplaced(root, config, name) {
  try {
    const state = readLifecycleState(root);
    if (!state.change || state.change === name) return null;
    const located = locateChange(root, config, state);
    return located.where === 'open'
      ? { change: state.change, component: state.component || null, path: located.path }
      : null;
  } catch {
    return null;
  }
}

// For what reads only `.truss/state.json` and never asks OpenSpec (`handoff`, the tasks gate): where the active change
// went when `openspec archive` moved it, relative to the project. Null when it is still where the state says, when it
// is simply missing, or when the state does not say where it is.
export function findArchivedChange(root, state) {
  if (!state.change || !state.path) return null;
  const changeDirectory = path.resolve(root, state.path);
  if (fs.existsSync(changeDirectory)) return null;
  const changes = path.dirname(changeDirectory);
  const archived = archivedFolder(changes, state.change);
  return archived ? path.relative(root, path.join(changes, 'archive', archived)) : null;
}

// What OpenSpec accepts as a change folder name; `archive` is where it moves finished changes, never a change.
export const isChangeId = (name) => /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(name) && name !== 'archive';

function openChangeNames(changesDirectory) {
  if (!fs.existsSync(changesDirectory)) return [];
  return fs
    .readdirSync(changesDirectory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== 'archive' && !entry.name.startsWith('.'))
    .map((entry) => entry.name)
    .sort();
}

// Why `use` found nothing: what is open where it looked, and the component that has it when the name was right but
// the place was not (a change in a component's own openspec/ is only found through that component).
function changeNotFound(root, config, name, componentName) {
  const searched = resolveComponent(root, config, componentName || null).openspec.root;
  const relative = (directory) => path.relative(root, directory) || '.';
  const open = openChangeNames(path.join(searched, 'changes'));
  const holders = Object.keys(config.components ?? {}).filter((other) => {
    if (other === componentName) return false;
    const { openspec } = resolveComponent(root, config, other);
    return (
      openspec.scope === 'component' &&
      openspec.root !== searched &&
      fs.existsSync(path.join(openspec.root, 'changes', name))
    );
  });
  const where = `${relative(path.join(searched, 'changes'))}${componentName ? ` (component "${componentName}")` : ''}`;
  let message = `There is no open change "${name}" in ${where}. ${
    open.length ? `Open there: ${open.join(', ')}.` : 'Nothing is open there.'
  }`;
  if (holders.length)
    message += ` It exists in ${holders.length === 1 ? 'component' : 'components'} ${holders
      .map((holder) => `"${holder}"`)
      .join(', ')}: truss use ${name} --component ${holders[0]}`;
  return message;
}

// Makes a change that is already open in OpenSpec the active one. Nothing in OpenSpec is created or touched: the only
// thing that changes is the pointer in `.truss/state.json`, which is what `new` would otherwise have moved away.
export function useChange(root, config, name, componentName = null) {
  if (!isChangeId(name))
    throw new LifecycleError(
      `"${name}" is not a change id. Ids look like add-retry-policy; \`openspec list\` shows them.`,
      2,
    );
  const component = resolveComponent(root, config, componentName);
  const located = locateChange(root, config, { change: name, component: componentName });
  if (located.where === 'archived')
    throw new LifecycleError(
      `The change "${name}" was archived (${located.path}), so there is nothing to go back to. Start a new one with: truss new "Change name"`,
      1,
    );
  if (located.where === 'missing') throw new LifecycleError(changeNotFound(root, config, name, componentName), 1);
  const status = getOpenSpecStatus(root, config, name, componentName);
  const progress = status.isPlanningComplete ? getTaskProgress(root, config, name, componentName) : null;
  let previous = {};
  try {
    previous = readLifecycleState(root);
  } catch {
    /* an unreadable state file is simply replaced, as `new` does */
  }
  const state = {
    change: name,
    title: previous.change === name && previous.title ? previous.title : name,
    component: componentName,
    phase: phaseFor(status, progress),
    path: status.changeRootRelative,
    updatedAt: new Date().toISOString(),
  };
  writeLifecycleState(root, state);
  return { name, component, state, status, progress };
}

export function lifecycleStatus(root, config) {
  const state = readLifecycleState(root);
  if (!state.change) return { active: false, state };
  let status;
  try {
    status = getOpenSpecStatus(root, config, state.change, state.component || null);
  } catch (error) {
    if (error.code !== 'status_unreadable') throw error;
    const located = locateChange(root, config, state);
    if (located.where === 'archived')
      return { active: false, archived: { change: state.change, path: located.path }, state };
    if (located.where === 'missing')
      throw new LifecycleError(
        `The active change "${state.change}" is not in OpenSpec (${located.path} is missing). Start a new one with: truss new "Change name"`,
        1,
      );
    throw error;
  }
  const progress = status.isPlanningComplete
    ? getTaskProgress(root, config, state.change, state.component || null)
    : null;
  const phase = phaseFor(status, progress);
  if (state.phase !== phase || state.path !== status.changeRootRelative) {
    writeLifecycleState(root, {
      ...state,
      phase,
      path: status.changeRootRelative,
      updatedAt: new Date().toISOString(),
    });
  }
  return { active: true, state: { ...state, phase, path: status.changeRootRelative }, status, progress };
}

// The folder `openspec` has to be run from for this change, when it is not the project root: a component below it
// that has its own openspec/ directory. TRUSS itself runs the CLI from there, so a command it prints has to say so.
function openspecDirectory(root, config, state) {
  const component = resolveComponent(root, config, state.component || null);
  return component.openspec.scope === 'component' && component.rootRelative !== '.' ? component.rootRelative : null;
}

// What the spec settings ask of the agent while it implements. Both are agent policy in v0.2: TRUSS says so and does not
// check it. The default mode (`anchored`, no zone guard) adds nothing, so a project that never set them sees no change.
function specPolicyReminder(config) {
  const { mode, zone_guard: zoneGuard } = config.spec ?? {};
  const lines = [];
  if (mode === 'source')
    lines.push(
      'The spec is authoritative (spec.mode: source): treat it as read-only while you implement. If the behavior has to change, stop, go back to the spec (update its specs and tasks) and only then resume.',
    );
  if (zoneGuard)
    lines.push(
      'Zone guard is on (spec.zone_guard): keep spec work and code work in separate steps. TRUSS does not enforce it.',
    );
  return lines;
}

export function nextLifecycleAction(root, config) {
  const current = lifecycleStatus(root, config);
  if (!current.active)
    return {
      ...current,
      kind: 'new',
      instruction: current.archived
        ? `The change "${current.archived.change}" was archived. Create the next one with: truss new "Change name"`
        : 'Create a change with: truss new "Change name"',
    };
  const { status, state } = current;
  const directory = openspecDirectory(root, config, state);
  const from = directory ? ` (from ${directory})` : '';
  if (!status.isPlanningComplete) {
    const next = status.readyArtifacts[0];
    // `openspec instructions <artifact>` prints the artifact's format and path; it needs the artifact's id.
    const howTo = next?.id
      ? ` Run openspec instructions ${next.id} --change ${state.change}${from} for its format and path.`
      : '';
    return {
      ...current,
      kind: 'planning',
      instruction: next
        ? `Create/refine the OpenSpec artifact "${next.id || next.name || next.outputPath || 'next'}" for ${state.change}.${howTo} Use Grill first if material ambiguity remains.`
        : `Continue planning ${state.change} according to OpenSpec status until planning is complete.`,
    };
  }
  if (state.phase === 'complete')
    return {
      ...current,
      kind: 'complete',
      instruction: `Implementation tasks for ${state.change} are complete. Run truss verify, then perform code review, then openspec validate ${state.change} and, once it passes, openspec archive ${state.change}${from}.`,
    };
  const nextTask = current.progress?.available ? current.progress.tasks.find((task) => !task.done) : null;
  return {
    ...current,
    kind: 'implementation',
    instruction: `Implement ${state.change} using ${displayPath(harnessPath('workflows', 'execute-change.md'), root)}. Read the active OpenSpec, ${
      nextTask
        ? `start with the first incomplete task ("${nextTask.description}")`
        : 'choose the first incomplete ready task'
    }, follow configured BDD/TDD policies, then run truss verify.`,
    policy: specPolicyReminder(config),
  };
}
