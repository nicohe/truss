import fs from 'node:fs';
import path from 'node:path';
import { resolveComponent } from './components.mjs';
import { currentBranch, localBranches } from './git.mjs';
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

// ---- The active change, remembered for each branch (ADR 0004) --------------------------------------------------------
//
// `state.json` keeps its top-level fields as "the change last made active" (what an older TRUSS reads) and gains a
// `branches` map: the record of each branch where a change was made active. Reading prefers the entry of the current
// branch and falls back to the top level, so a project that never changes branch sees no difference.

const RECORD_FIELDS = ['change', 'title', 'component', 'phase', 'path', 'updatedAt'];
const isRecord = (value) =>
  value && typeof value === 'object' && !Array.isArray(value) && typeof value.change === 'string';
const plain = (value) =>
  Object.fromEntries(RECORD_FIELDS.filter((key) => key in value).map((key) => [key, value[key]]));

// The entries of `branches` that are usable, as [branch, record] pairs. A branch can be called `__proto__`, so they are
// read as own properties and never assigned by name.
function branchEntries(raw) {
  const map = raw?.branches;
  if (!map || typeof map !== 'object' || Array.isArray(map)) return [];
  return Object.keys(map)
    .filter((branch) => Object.hasOwn(map, branch) && isRecord(map[branch]))
    .map((branch) => [branch, plain(map[branch])]);
}

/**
 * Which change is active here: `{ state, branch, source }`. `source` is `branch` (the entry of the current branch),
 * `last` (the top-level fields, used when the branch has no entry, in a detached HEAD, or without Git) or `none`.
 * Throws as `readLifecycleState` does when the file is not valid JSON.
 */
export function readActiveChange(root) {
  const raw = readLifecycleState(root);
  const branch = currentBranch(root);
  const entry = branch ? branchEntries(raw).find(([name]) => name === branch) : null;
  if (entry) return { state: entry[1], branch, source: 'branch' };
  const { branches: _branches, ...top } = raw ?? {};
  return { state: top, branch, source: top.change ? 'last' : 'none' };
}

// Writes the top-level fields and the entries together. Entries of branches that no longer exist are dropped, but never
// the current one, and nothing is dropped when Git cannot list the branches (a branch with no commit yet is not listed,
// so an empty list is treated the same).
function persist(root, top, entries, branch) {
  const live = localBranches(root);
  const kept = live && live.size > 0 ? entries.filter(([name]) => live.has(name) || name === branch) : entries;
  writeLifecycleState(root, {
    ...top,
    ...(kept.length ? { branches: Object.fromEntries(kept) } : {}),
  });
}

/**
 * Makes `record` the active change: it becomes the top-level "last made active" and the entry of the current branch
 * (none in a detached HEAD or without Git). Entries of other branches are kept. An unreadable file is replaced.
 */
export function saveActiveChange(root, record) {
  let raw = {};
  try {
    raw = readLifecycleState(root);
  } catch {
    /* an unreadable state file is simply replaced, as `new` has always done */
  }
  const branch = currentBranch(root);
  const others = branchEntries(raw).filter(([name]) => name !== branch);
  persist(root, record, branch ? [...others, [branch, plain(record)]] : branchEntries(raw), branch);
}

/**
 * Records that the phase (or the path) of the active change moved. Only the record that was read is updated: the entry
 * of the branch when it came from there (and the top level only if it is the same change), the top level otherwise.
 * That keeps "last made active" from turning into "last looked at".
 */
export function refreshActiveChange(root, record, { source, branch }) {
  const raw = readLifecycleState(root);
  const { branches: _branches, ...top } = raw ?? {};
  const entries = branchEntries(raw);
  if (source === 'branch' && branch) {
    const sameChange = top.change === record.change && (top.component ?? null) === (record.component ?? null);
    persist(
      root,
      sameChange ? record : top,
      entries.map(([name, value]) => (name === branch ? [name, plain(record)] : [name, value])),
      branch,
    );
    return;
  }
  persist(root, record, entries, branch);
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

// The longest id `new` makes from a title. The id is the name of the folder of the change and it is typed in every
// `openspec ... --change <id>` and `truss use <id>`; the full title is kept as the goal and in `state.json`.
export const CHANGE_ID_LIMIT = 40;

/**
 * The id for a title: its slug when that fits in `limit` characters, otherwise cut where a word ends (the last `-`
 * within the limit), or hard if the first word alone is longer.
 */
export function changeIdFor(title, limit = CHANGE_ID_LIMIT) {
  const slug = slugifyChange(title);
  if (slug.length <= limit) return slug;
  const upToNext = slug.slice(0, limit + 1);
  const at = upToNext.lastIndexOf('-');
  return (at > 0 ? upToNext.slice(0, at) : slug.slice(0, limit)).replace(/-+$/, '');
}

// A shortened id that is already open in the same OpenSpec gets `-2`, `-3`, ...: two long titles can now start the same.
function freeShortId(root, config, component, componentName, name) {
  const owner = component.openspec.scope === 'component' ? componentName : null;
  const open = new Set(
    openChanges(root, config)
      .filter((entry) => entry.component === owner)
      .map((entry) => entry.change),
  );
  if (!open.has(name)) return name;
  for (let n = 2; n < 100; n += 1) {
    // The suffix goes on whole: a few characters past the limit are better than a word cut in half.
    const candidate = `${name}-${n}`;
    if (!open.has(candidate)) return candidate;
  }
  throw new LifecycleError(
    `Too many open changes start like "${name}". Choose an id with: truss new "..." --id <name>`,
    1,
  );
}

export function createChange(root, config, title, componentName = null, { id } = {}) {
  const detected = assertOpenSpec(root);
  const component = resolveComponent(root, config, componentName);
  // v0.2 supports the workspace OpenSpec root through the OpenSpec CLI. A component-local
  // OpenSpec root is valid only when running the command from that component root.
  const workdir = component.openspec.scope === 'component' ? component.root : root;
  let name;
  // `chosen`: the person gave the id; `shortened`: it was cut from a long title. Said once by the caller.
  let idNote = null;
  if (id !== undefined) {
    if (!isChangeId(id))
      throw new LifecycleError(
        `"${id}" is not a change id. Ids look like add-retry-policy; \`openspec list\` shows them.`,
        2,
      );
    name = id;
    idNote = 'chosen';
  } else {
    name = changeIdFor(title);
    if (!name) throw new LifecycleError('Change name becomes empty after kebab-case normalization.', 2);
    if (name !== slugifyChange(title)) {
      idNote = 'shortened';
      name = freeShortId(root, config, component, componentName, name);
    }
  }
  const replaced = openChangeBeingReplaced(root, config, name);
  // With no open change to replace nothing was active, and whatever else is open is what `new` walks past: listed
  // before the new change exists, so it is never named among the others.
  const alsoOpen = replaced ? [] : openChanges(root, config);
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
  saveActiveChange(root, state);
  return { name, component, state, status, replaced, alsoOpen, idNote, openSpecOutput: result.json };
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
    const { state } = readActiveChange(root);
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

// What is open in OpenSpec, wherever `use` would look for it: the project's own openspec/ and the openspec/ of each
// component that has one. It reads folders, as `use` does, so it needs no OpenSpec CLI. It never fails: a component that
// does not resolve or a folder that cannot be read lists nothing (`doctor` reports those), because it only adds a hint
// to a `status` that has nothing else to say.
export function openChanges(root, config) {
  const found = [];
  const seen = new Set();
  const collect = (directory, component) => {
    const changes = path.join(directory, 'changes');
    if (seen.has(changes)) return;
    seen.add(changes);
    try {
      for (const change of openChangeNames(changes)) found.push({ change, component });
    } catch {
      /* a folder that cannot be read lists nothing */
    }
  };
  collect(resolveComponent(root, config, null).openspec.root, null);
  for (const name of Object.keys(config.components ?? {})) {
    try {
      const { openspec } = resolveComponent(root, config, name);
      if (openspec.scope === 'component') collect(openspec.root, name);
    } catch {
      /* a component that does not resolve has nothing to list */
    }
  }
  return found;
}

// The command that makes a change the active one again: a change in a component's own openspec/ needs its component.
export const useCommand = (change, component = null) =>
  `truss use ${change}${component ? ` --component ${component}` : ''}`;

// How a change is named where a person or an agent picks one of several: `add-retry`, or `add-retry (component api)`.
export const describeOpenChange = ({ change, component }) =>
  component ? `${change} (component ${component})` : change;

// What to run when no change is active and some are open: the only one, or any of them.
export const pickUpCommand = (open) =>
  open.length === 1 ? useCommand(open[0].change, open[0].component) : 'truss use <change>';

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
      .join(', ')}: ${useCommand(name, holders[0])}`;
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
    previous = readActiveChange(root).state;
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
  saveActiveChange(root, state);
  return { name, component, state, status, progress };
}

// What to do when the recorded active change is not in OpenSpec on this branch. `.truss/state.json` is local and the
// change a person was working on may simply belong to another branch, so this does not stop the work:
// - exactly one change is open here: it becomes the active one, and `adopted` says so (one line for the person);
// - several are open: they are listed (`absent`), as for a fresh clone with no active change;
// - none is open: there is nothing to go on with, and it fails as it always did.
function whenRecordedChangeIsMissing(root, config, state, changePath, adopt) {
  let open = [];
  try {
    open = openChanges(root, config);
  } catch {
    /* without the list, the start-a-new-one advice below is all there is */
  }
  if (!open.length)
    throw new LifecycleError(
      `The active change "${state.change}" is not in OpenSpec (${changePath} is missing). Start a new one with: truss new "Change name"`,
      1,
    );
  if (open.length === 1 && adopt) {
    const [only] = open;
    try {
      const status = getOpenSpecStatus(root, config, only.change, only.component);
      const progress = status.isPlanningComplete ? getTaskProgress(root, config, only.change, only.component) : null;
      const record = {
        change: only.change,
        title: only.change,
        component: only.component,
        phase: phaseFor(status, progress),
        path: status.changeRootRelative,
        updatedAt: new Date().toISOString(),
      };
      saveActiveChange(root, record);
      return {
        active: true,
        state: record,
        status,
        progress,
        adopted: { from: state.change, to: only.change, component: only.component },
      };
    } catch {
      /* the only open change cannot be read: list it instead of choosing it */
    }
  }
  return { active: false, state, absent: { change: state.change, path: changePath }, open };
}

// `adopt: false` is for what only needs to know the state of the active change and must not move it: `handoff` asks for
// the phase, and a note about one change must not turn into a choice of another.
export function lifecycleStatus(root, config, { adopt = true } = {}) {
  const { state, branch, source } = readActiveChange(root);
  if (!state.change) return { active: false, state, open: openChanges(root, config) };
  let status;
  try {
    status = getOpenSpecStatus(root, config, state.change, state.component || null);
  } catch (error) {
    if (error.code !== 'status_unreadable') throw error;
    const located = locateChange(root, config, state);
    if (located.where === 'archived')
      return {
        active: false,
        archived: { change: state.change, path: located.path },
        state,
        open: openChanges(root, config),
      };
    if (located.where === 'missing') return whenRecordedChangeIsMissing(root, config, state, located.path, adopt);
    throw error;
  }
  const progress = status.isPlanningComplete
    ? getTaskProgress(root, config, state.change, state.component || null)
    : null;
  const phase = phaseFor(status, progress);
  if (state.phase !== phase || state.path !== status.changeRootRelative) {
    refreshActiveChange(
      root,
      { ...state, phase, path: status.changeRootRelative, updatedAt: new Date().toISOString() },
      { source, branch },
    );
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
      'Zone guard is on (spec.zone_guard): keep spec work and code work in separate steps. TRUSS only warns (Zones) when both have uncommitted changes.',
    );
  return lines;
}

// With no active change there is nothing to implement: go back to one that is still open in OpenSpec, or start another.
// Without the list of what is open, an agent told to create a change would duplicate the one a clone or CI checkout
// has lost track of, because `.truss/state.json` is local.
function noActiveChange({ archived, absent, open }) {
  if (!open.length)
    return {
      kind: 'new',
      instruction: archived
        ? `The change "${archived.change}" was archived. Create the next one with: truss new "Change name"`
        : 'Create a change with: truss new "Change name"',
    };
  const lead = archived
    ? `The change "${archived.change}" was archived.`
    : absent
      ? absentLead(absent)
      : 'No active change.';
  const names = open.map(describeOpenChange).join(', ');
  const pick = open.length === 1 ? 'Make it' : 'Make one of them';
  const create = archived ? 'the next one' : 'a new one';
  return {
    kind: 'use',
    instruction: `${lead} Open in OpenSpec: ${names}.\n${pick} the active change with: ${pickUpCommand(open)}, or create ${create} with: truss new "Change name"`,
  };
}

/** The sentence that says the recorded change is not on this branch. */
export const absentLead = ({ change, path: changePath }) =>
  `The recorded change "${change}" is not on this branch (${changePath} is missing).`;

/** The line that says which change was chosen because the recorded one is not on this branch. */
export const adoptedLine = ({ from, to, component }) =>
  `Using "${to}"${component ? ` (component ${component})` : ''}, the only change open here: the recorded "${from}" is not on this branch.`;

// The same for the two development loops: only an `off` is worth saying, since the default (both on) is what the
// `execute-change` workflow already asks for. `continue` is the only thing an agent is sure to read, and the workflow only
// says "if BDD is enabled" without saying where that is set.
function developmentPolicyReminder(config) {
  const lines = [];
  if (config.development?.bdd === false)
    lines.push('BDD is off (development.bdd: false): the acceptance RED → GREEN macro-loop is not mandatory.');
  if (config.development?.tdd === false)
    lines.push('TDD is off (development.tdd: false): the RED → minimal GREEN → refactor micro-loop is not mandatory.');
  return lines;
}

/**
 * The policy files (names under the installation's `.truss/policies/`) that this project's settings ask the agent to
 * follow while it implements: the BDD and TDD ones unless that loop is off, and the one for the spec mode.
 */
export function configuredPolicies(config) {
  const files = [];
  if (config.development?.bdd !== false) files.push('bdd.md');
  if (config.development?.tdd !== false) files.push('tdd.md');
  files.push(config.spec?.mode === 'source' ? 'spec-as-source.md' : 'spec-anchored.md');
  return files;
}

const TASK_TITLE_LIMIT = 80;

/** A task line cut to a title that fits one line; `tasks.md` keeps the whole text. */
export function shortTaskTitle(description, limit = TASK_TITLE_LIMIT) {
  const text = String(description ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= limit) return { text, cut: false };
  return { text: `${text.slice(0, limit - 1).trimEnd()}…`, cut: true };
}

export function nextLifecycleAction(root, config) {
  const current = lifecycleStatus(root, config);
  if (!current.active) return { ...current, ...noActiveChange(current) };
  const { status, state } = current;
  const directory = openspecDirectory(root, config, state);
  const from = directory ? ` (from ${directory})` : '';
  if (!status.isPlanningComplete) {
    const next = status.readyArtifacts[0];
    // `openspec instructions <artifact>` prints the artifact's format and path; it needs the artifact's id.
    const howTo = next?.id
      ? ` Run openspec instructions ${next.id} --change ${state.change}${from} for its format and path.`
      : '';
    // The proposal holds the decisions. What the later artifacts add has to trace back to one of them.
    const traceability =
      next?.id && next.id !== 'proposal'
        ? ' Keep every requirement traceable to a decision in the proposal, and ask before adding behavior it does not cover.'
        : '';
    return {
      ...current,
      kind: 'planning',
      instruction: next
        ? `Create/refine the OpenSpec artifact "${next.id || next.name || next.outputPath || 'next'}" for ${state.change}.${howTo} Use Grill first if material ambiguity remains.${traceability}`
        : `Continue planning ${state.change} according to OpenSpec status until planning is complete.`,
    };
  }
  if (state.phase === 'complete')
    return {
      ...current,
      kind: 'complete',
      // The review is a recommendation: nothing in TRUSS checks that it happened, so the text says when, with what, and
      // where its report can go (a suggested path that TRUSS neither creates nor reads).
      instruction: [
        `Implementation tasks for ${state.change} are complete.`,
        '1. Run truss verify.',
        `2. Code review, recommended and not required. In a new session, ideally with another agent, follow \`truss skills code-review\`: it only reads. Have it write its report to .truss/reviews/${state.change}.md (TRUSS does not create or read that file) and give the report to the implementer in full. A finding that changes behavior goes to the spec, the design or a new task group in tasks.md.`,
        `3. Run openspec validate ${state.change}${from}.`,
        `4. Once it passes, run openspec archive ${state.change}${from}.`,
      ].join('\n'),
    };
  const nextTask = current.progress?.available ? current.progress.tasks.find((task) => !task.done) : null;
  const title = nextTask ? shortTaskTitle(nextTask.description) : null;
  return {
    ...current,
    kind: 'implementation',
    instruction: `Implement ${state.change} using ${displayPath(harnessPath('workflows', 'execute-change.md'), root)}. Read the active OpenSpec, ${
      title
        ? `start with the first incomplete task ("${title.text}"${title.cut ? '; the full text is in tasks.md' : ''})`
        : 'choose the first incomplete ready task'
    }, follow configured BDD/TDD policies, then run truss verify.`,
    policy: [...specPolicyReminder(config), ...developmentPolicyReminder(config)],
  };
}
