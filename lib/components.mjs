import fs from 'node:fs';
import path from 'node:path';

export class ComponentError extends Error {
  constructor(message) { super(message); this.name = 'ComponentError'; }
}

const rel = (root, value) => path.relative(root, value) || '.';
const existing = values => values.filter(value => fs.existsSync(value));

function safeRoot(projectRoot, configuredPath) {
  const root = path.resolve(projectRoot);
  const absolute = path.resolve(root, configuredPath);
  const relative = path.relative(root, absolute);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new ComponentError(`Component path escapes the project root: ${configuredPath}`);
  }
  return absolute;
}

function discoverDirs(root, names) {
  return existing(names.map(name => path.join(root, name))).map(value => value);
}

export function resolveComponent(projectRoot, config, name) {
  const components = config?.components || {};
  if (!name) {
    return buildResolution(projectRoot, 'workspace', projectRoot, null, projectRoot);
  }
  if (!Object.hasOwn(components, name)) {
    const available = Object.keys(components);
    throw new ComponentError(`Unknown component "${name}".${available.length ? ` Available: ${available.join(', ')}` : ' No components are configured.'}`);
  }
  const configuredPath = components[name].path;
  const root = safeRoot(projectRoot, configuredPath);
  if (!fs.existsSync(root)) throw new ComponentError(`Component "${name}" path does not exist: ${configuredPath}`);
  if (!fs.statSync(root).isDirectory()) throw new ComponentError(`Component "${name}" path is not a directory: ${configuredPath}`);
  return buildResolution(projectRoot, name, root, configuredPath, projectRoot);
}

function buildResolution(projectRoot, name, root, configuredPath, workspaceRoot) {
  const localAgents = path.join(root, 'AGENTS.md');
  const workspaceAgents = path.join(workspaceRoot, 'AGENTS.md');
  const localOpenSpec = path.join(root, 'openspec');
  const workspaceOpenSpec = path.join(workspaceRoot, 'openspec');
  const openSpecRoot = fs.existsSync(localOpenSpec) ? localOpenSpec : (fs.existsSync(workspaceOpenSpec) ? workspaceOpenSpec : localOpenSpec);
  const sourceDirs = discoverDirs(root, ['src', 'app', 'apps', 'lib', 'packages']);
  const testDirs = discoverDirs(root, ['test', 'tests', '__tests__', 'spec']);
  return {
    name,
    configuredPath,
    root,
    rootRelative: rel(projectRoot, root),
    agents: {
      local: fs.existsSync(localAgents) ? localAgents : null,
      workspace: fs.existsSync(workspaceAgents) ? workspaceAgents : null,
      effective: fs.existsSync(localAgents) ? localAgents : (fs.existsSync(workspaceAgents) ? workspaceAgents : null)
    },
    openspec: {
      root: openSpecRoot,
      relative: rel(projectRoot, openSpecRoot),
      scope: fs.existsSync(localOpenSpec) ? 'component' : (fs.existsSync(workspaceOpenSpec) ? 'workspace' : 'missing'),
      exists: fs.existsSync(openSpecRoot)
    },
    sourceDirs: sourceDirs.map(value => rel(projectRoot, value)),
    testDirs: testDirs.map(value => rel(projectRoot, value))
  };
}

export function resolveComponents(projectRoot, config) {
  const entries = Object.keys(config?.components || {});
  if (!entries.length) return [resolveComponent(projectRoot, config, null)];
  const seen = new Map();
  return entries.map(name => {
    const result = resolveComponent(projectRoot, config, name);
    const canonical = fs.realpathSync(result.root);
    if (seen.has(canonical)) throw new ComponentError(`Components "${seen.get(canonical)}" and "${name}" resolve to the same path: ${result.rootRelative}`);
    seen.set(canonical, name);
    return result;
  });
}

export function componentSummary(component) {
  const source = component.sourceDirs.length ? component.sourceDirs.join(', ') : 'not detected';
  const tests = component.testDirs.length ? component.testDirs.join(', ') : 'not detected';
  return `${component.rootRelative} | OpenSpec: ${component.openspec.scope} | source: ${source} | tests: ${tests}`;
}
