import { spawnSync } from 'node:child_process';

// Whether the work tree has uncommitted changes in the spec zone and in the code zone at once (ADR 0003).
//
// It only reads: `git status` lists what is staged, modified and untracked, and what Git ignores is not there.
// Renames are listed as a removal and an addition, so both paths count.
//
// The spec zone is any path under an `openspec/` folder. Not in either zone: `tasks.md` under it (ticking a task is
// done from either zone), `openspec/changes/archive/` (what `openspec archive` writes) and `.truss/`.

const SPECS = /(^|\/)openspec\//;
const ARCHIVE = /(^|\/)openspec\/changes\/archive\//;

function zoneOf(file) {
  if (file.startsWith('.truss/')) return null;
  if (!SPECS.test(file)) return 'code';
  if (file.split('/').pop() === 'tasks.md' || ARCHIVE.test(file)) return null;
  return 'specs';
}

/** `{ specs, code }` (sorted paths of each) when both zones have uncommitted changes, otherwise `null`. */
export function zoneMix(projectRoot) {
  const result = spawnSync(
    'git',
    ['status', '--porcelain=v1', '-z', '--untracked-files=all', '--no-renames', '--', '.'],
    { cwd: projectRoot, encoding: 'utf8', maxBuffer: 1 << 28 },
  );
  if (result.status !== 0) return null;

  const zones = { specs: new Set(), code: new Set() };
  for (const entry of result.stdout.split('\0').filter(Boolean)) {
    const file = entry.slice(3); // "XY path"
    const zone = zoneOf(file);
    if (zone) zones[zone].add(file);
  }
  if (!zones.specs.size || !zones.code.size) return null;
  return { specs: [...zones.specs].sort(), code: [...zones.code].sort() };
}
