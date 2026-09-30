import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { detectOpenSpec } from './openspec.mjs';
import { resolveComponent } from './components.mjs';

export class LifecycleError extends Error {
  constructor(message, exitCode = 1) { super(message); this.name = 'LifecycleError'; this.exitCode = exitCode; }
}

const statePath = root => path.join(root, '.truss', 'state.json');
export function readLifecycleState(root) {
  const file = statePath(root);
  if (!fs.existsSync(file)) return {};
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { throw new LifecycleError(`Invalid TRUSS state file: ${path.relative(root, file)}`, 2); }
}
export function writeLifecycleState(root, state) {
  const file = statePath(root); fs.mkdirSync(path.dirname(file), { recursive: true });
  // Write to a temp file and rename so an interrupted process never leaves a truncated state file.
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2) + '\n');
  fs.renameSync(tmp, file);
}

export function slugifyChange(value) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').replace(/-{2,}/g, '-');
}

function runJson(executable, args, cwd) {
  const result = spawnSync(executable, args, { cwd, encoding: 'utf8' });
  let json = null;
  if (result.stdout?.trim()) { try { json = JSON.parse(result.stdout); } catch {} }
  return { status: result.status, stdout: result.stdout?.trim() || '', stderr: result.stderr?.trim() || '', json };
}

function assertOpenSpec(root) {
  const detected = detectOpenSpec(root);
  if (!detected.cli.installed) throw new LifecycleError('OpenSpec CLI is not installed. Run truss doctor.', 1);
  if (!detected.compatibility.compatible) throw new LifecycleError(`OpenSpec ${detected.cli.version || 'unknown'} is not compatible (${detected.compatibility.range}).`, 1);
  if (!detected.project.initialized) throw new LifecycleError(`OpenSpec project is not initialized (${detected.project.state}). Run truss init.`, 1);
  return detected;
}

export function createChange(root, config, title, componentName = null) {
  const detected = assertOpenSpec(root);
  const component = resolveComponent(root, config, componentName);
  // v0.1 supports the workspace OpenSpec root through the OpenSpec CLI. A component-local
  // OpenSpec root is valid only when running the command from that component root.
  const workdir = component.openspec.scope === 'component' ? component.root : root;
  const name = slugifyChange(title);
  if (!name) throw new LifecycleError('Change name becomes empty after kebab-case normalization.', 2);
  const result = runJson(detected.cli.path, ['new', 'change', name, '--goal', title, '--json'], workdir);
  if (result.status !== 0) {
    const detail = result.stderr || result.stdout || `OpenSpec exited ${result.status}`;
    throw new LifecycleError(`OpenSpec could not create change "${name}": ${detail}`, 1);
  }
  const status = getOpenSpecStatus(root, config, name, componentName);
  const state = {
    change: name,
    title,
    component: componentName,
    phase: status.isPlanningComplete ? 'implementation' : 'spec',
    path: status.changeRootRelative,
    updatedAt: new Date().toISOString()
  };
  writeLifecycleState(root, state);
  return { name, component, state, status, openSpecOutput: result.json };
}

export function getOpenSpecStatus(root, config, changeName, componentName = null) {
  const detected = assertOpenSpec(root);
  const component = resolveComponent(root, config, componentName);
  const workdir = component.openspec.scope === 'component' ? component.root : root;
  const result = runJson(detected.cli.path, ['status', '--change', changeName, '--json'], workdir);
  if (result.status !== 0 || !result.json) {
    const detail = result.stderr || result.stdout || `OpenSpec exited ${result.status}`;
    throw new LifecycleError(`Could not read OpenSpec status for "${changeName}": ${detail}`, 1);
  }
  const data = result.json;
  const artifacts = Array.isArray(data.artifacts) ? data.artifacts : [];
  const completed = artifacts.filter(a => ['done','complete','completed'].includes(String(a.status).toLowerCase())).length;
  const ready = artifacts.filter(a => String(a.status).toLowerCase() === 'ready');
  const blocked = artifacts.filter(a => String(a.status).toLowerCase() === 'blocked');
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
    isComplete: Boolean(data.isComplete)
  };
}

export function lifecycleStatus(root, config) {
  const state = readLifecycleState(root);
  if (!state.change) return { active: false, state };
  const status = getOpenSpecStatus(root, config, state.change, state.component || null);
  const phase = status.isPlanningComplete ? (status.isComplete ? 'complete' : 'implementation') : 'spec';
  if (state.phase !== phase || state.path !== status.changeRootRelative) {
    writeLifecycleState(root, { ...state, phase, path: status.changeRootRelative, updatedAt: new Date().toISOString() });
  }
  return { active: true, state: { ...state, phase, path: status.changeRootRelative }, status };
}

export function nextLifecycleAction(root, config) {
  const current = lifecycleStatus(root, config);
  if (!current.active) return { ...current, kind: 'new', instruction: 'Create a change with: truss new "Change name"' };
  const { status, state } = current;
  if (!status.isPlanningComplete) {
    const next = status.readyArtifacts[0];
    return {
      ...current,
      kind: 'planning',
      instruction: next
        ? `Create/refine the OpenSpec artifact "${next.id || next.name || next.outputPath || 'next'}" for ${state.change}. Use Grill first if material ambiguity remains.`
        : `Continue planning ${state.change} according to OpenSpec status until planning is complete.`
    };
  }
  if (status.isComplete) return { ...current, kind: 'complete', instruction: `Implementation tasks for ${state.change} are complete. Run truss verify, then perform code review and OpenSpec verification/archive.` };
  return {
    ...current,
    kind: 'implementation',
    instruction: `Implement ${state.change} using .truss/workflows/execute-change.md. Read the active OpenSpec, choose the first incomplete ready task, follow configured BDD/TDD policies, then run truss verify.`
  };
}
