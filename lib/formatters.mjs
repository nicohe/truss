import fs from 'node:fs';
import path from 'node:path';

const read = (file) => {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return null;
  }
};
const readJson = (file) => {
  try {
    return JSON.parse(read(file));
  } catch {
    return null;
  }
};
const exists = (projectRoot, ...names) => names.some((name) => fs.existsSync(path.join(projectRoot, name)));
const mentionsTruss = (text) => /(^|[^\w])\.truss\b/.test(text ?? '');

// The major version Prettier has here, from what is installed or else from the range the project declares.
function prettierMajor(projectRoot, pkg) {
  const installed = readJson(path.join(projectRoot, 'node_modules', 'prettier', 'package.json'))?.version;
  const declared = { ...pkg?.dependencies, ...pkg?.devDependencies }.prettier;
  const major = Number(String(installed ?? declared ?? '').match(/\d+/)?.[0]);
  return Number.isFinite(major) ? major : null;
}

// Formatters that will walk into `.truss/` because nothing tells them not to. `.truss/` holds TRUSS's own files (and,
// with a clone install, a whole second project), so a project-wide `format:check` fails on files nobody owns.
// Prettier 3 skips what `.gitignore` ignores; Prettier 2 and Biome need to be told. Each entry says what to add.
export function formattersScanningTruss(projectRoot, { gitIgnored }) {
  const found = [];
  const pkg = readJson(path.join(projectRoot, 'package.json'));

  const usesPrettier =
    exists(projectRoot, '.prettierrc', '.prettierrc.json', '.prettierrc.yaml', '.prettierrc.yml', '.prettierrc.js') ||
    exists(projectRoot, '.prettierrc.cjs', '.prettierrc.mjs', 'prettier.config.js', 'prettier.config.cjs') ||
    exists(projectRoot, 'prettier.config.mjs', '.prettierrc.toml') ||
    Boolean(pkg?.prettier) ||
    Boolean({ ...pkg?.dependencies, ...pkg?.devDependencies }.prettier);
  if (usesPrettier) {
    const ignoreFile = read(path.join(projectRoot, '.prettierignore'));
    const major = prettierMajor(projectRoot, pkg);
    const covered = mentionsTruss(ignoreFile) || (ignoreFile === null && gitIgnored && major !== null && major >= 3);
    if (!covered) found.push({ tool: 'Prettier', fix: 'add `.truss/` to .prettierignore' });
  }

  const biome = ['biome.json', 'biome.jsonc'].map((name) => read(path.join(projectRoot, name))).find((t) => t !== null);
  if (biome !== undefined && !mentionsTruss(biome) && !(gitIgnored && /"useIgnoreFile"\s*:\s*true/.test(biome)))
    found.push({ tool: 'Biome', fix: 'exclude `.truss` in biome.json (files.includes or files.ignore, by version)' });

  return found;
}

export const formatterWarning = (found) =>
  `${found.map((f) => f.tool).join(' and ')} will scan .truss/ and fail on files that are not yours; ${found.map((f) => f.fix).join('; ')}`;
