import { getTaskProgress, readLifecycleState } from './lifecycle.mjs';

// "Tasks complete" gate: are all the tasks of the active OpenSpec change checked off?
//
// It reads the progress OpenSpec itself reports (the checkboxes of tasks.md). It does NOT judge whether the
// checked tasks were really done; it only refuses to call a change finished while tasks remain open.
export function evaluateTasksGate(projectRoot, config) {
  const mode = config?.verification?.tasks_complete ?? 'off';
  const result = { mode, status: 'skipped', blocking: false };
  if (mode === 'off') return result;

  const unknown = (reason, change) => ({ ...result, status: 'unknown', reason, ...(change ? { change } : {}) });
  let state;
  try {
    state = readLifecycleState(projectRoot);
  } catch (error) {
    return unknown(error.message);
  }
  if (!state.change) return { ...result, status: 'no_active_change' };

  const progress = getTaskProgress(projectRoot, config, state.change, state.component || null);
  if (!progress.available) return unknown(progress.reason, state.change);
  if (progress.total === 0) return unknown('tasks.md has no tasks', state.change);

  const remaining = progress.tasks.filter((task) => !task.done).map(({ id, description }) => ({ id, description }));
  const violation = progress.remaining > 0;
  return {
    ...result,
    status: violation ? 'violation' : 'passed',
    blocking: violation && mode === 'block',
    change: state.change,
    total: progress.total,
    complete: progress.complete,
    remaining,
  };
}
