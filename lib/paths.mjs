import path from 'node:path';
import { fileURLToPath } from 'node:url';

// TRUSS is installed once (typically a clone inside the project's `.truss/`, or anywhere else on disk) and then used
// on a project. Two locations must not be confused:
//   harness   the TRUSS installation. Its own `.truss/` directory holds the harness content that ships with the
//             version of the code: the config schema, skills, policies and workflows.
//   project   the directory TRUSS runs in. `<project>/.truss/` holds only the project's own files: config.yaml,
//             state.json, verification/, handoffs/.
// When TRUSS is used on its own repository (or a checkout of it) both are the same directory.
export const harnessRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const harnessPath = (...segments) => path.join(harnessRoot, '.truss', ...segments);

// How to name a harness file to a person or an agent working in `projectRoot`: relative when it lives inside the
// project, absolute otherwise.
export function displayPath(file, projectRoot) {
  const relative = path.relative(projectRoot, file);
  return relative.startsWith('..') || path.isAbsolute(relative) ? file : relative.split(path.sep).join('/');
}
