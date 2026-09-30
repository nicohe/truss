import fs from 'node:fs';
import path from 'node:path';

export class ConfigError extends Error {
  constructor(message, details = []) {
    super(message);
    this.name = 'ConfigError';
    this.details = details;
  }
}

const DEFAULT_CONFIG = Object.freeze({
  version: 1,
  spec: { mode: 'anchored', gherkin: true, zone_guard: false },
  development: { bdd: true, tdd: true },
  verification: {
    commands: [
      'npm test --if-present',
      'npm run lint --if-present',
      'npm run typecheck --if-present',
      'npm run build --if-present',
    ],
    tests_required: 'off',
  },
  integrations: { graphify: { enabled: true, required: false } },
  components: {},
});

const clone = (value) => JSON.parse(JSON.stringify(value));
const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

function stripComment(line) {
  let quote = null;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if ((ch === '"' || ch === "'") && line[i - 1] !== '\\') quote = quote === ch ? null : quote || ch;
    if (ch === '#' && !quote && (i === 0 || /\s/.test(line[i - 1]))) return line.slice(0, i);
  }
  return line;
}

function scalar(raw, lineNo) {
  const value = raw.trim();
  if (value === '{}') return {};
  if (value === '[]') return [];
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === 'null' || value === '~') return null;
  if (/^-?\d+$/.test(value)) return Number(value);
  if (!value) throw new ConfigError(`Invalid empty value at line ${lineNo}.`);
  const first = value[0];
  if (first === '"' || first === "'") {
    if (value.length < 2 || !value.endsWith(first)) throw new ConfigError(`Unterminated quote at line ${lineNo}.`);
    return value.slice(1, -1);
  }
  // Indicators that start anchors, aliases, tags, block scalars or flow collections. They are outside the
  // supported subset and would otherwise be silently kept as plain strings.
  if ('&*!|>[{'.includes(first))
    throw new ConfigError(
      `Unsupported YAML syntax "${first}" at line ${lineNo}; quote the value if it is meant as text.`,
    );
  return value;
}

// Dependency-free parser for the deliberately small TRUSS config YAML subset:
// mappings, scalar values, {}, [], and scalar lists. Tabs, anchors, aliases,
// multiline scalars, flow collections with values, and list-of-object syntax are rejected.
export function parseConfigYaml(text) {
  const root = {};
  const stack = [{ indent: -1, value: root, path: '$' }];
  const lines = text.split(/\r?\n/);
  let scalarIndent = null;

  for (let index = 0; index < lines.length; index += 1) {
    const original = lines[index];
    if (/\t/.test(original)) throw new ConfigError(`Tabs are not allowed in config.yaml (line ${index + 1}).`);
    const withoutComment = stripComment(original).replace(/\s+$/, '');
    if (!withoutComment.trim()) continue;
    const indent = withoutComment.match(/^ */)[0].length;
    if (indent % 2 !== 0) throw new ConfigError(`Indentation must use multiples of 2 spaces (line ${index + 1}).`);
    const content = withoutComment.trim();

    // A scalar entry has no children: deeper indentation after it is a multiline scalar or a mis-nested key.
    if (scalarIndent !== null && indent > scalarIndent)
      throw new ConfigError(`Unexpected indentation at line ${index + 1}.`);
    scalarIndent = null;

    while (stack.length > 1 && indent <= stack.at(-1).indent) stack.pop();
    const parent = stack.at(-1);

    if (content.startsWith('- ')) {
      if (!Array.isArray(parent.value)) throw new ConfigError(`List item without a list key at line ${index + 1}.`);
      const item = content.slice(2);
      if (/^[^'"\s][^:]*:(\s|$)/.test(item))
        throw new ConfigError(`List items must be scalars, not mappings (line ${index + 1}).`);
      parent.value.push(scalar(item, index + 1));
      scalarIndent = indent;
      continue;
    }

    const match = content.match(/^([^:]+):(.*)$/);
    if (!match) throw new ConfigError(`Expected "key: value" at line ${index + 1}.`);
    const key = match[1].trim();
    const rawValue = match[2].trim();
    if (!key) throw new ConfigError(`Empty key at line ${index + 1}.`);
    if (!isObject(parent.value)) throw new ConfigError(`Mapping entry in a non-object at line ${index + 1}.`);
    if (Object.hasOwn(parent.value, key)) throw new ConfigError(`Duplicate key "${key}" at line ${index + 1}.`);

    if (rawValue) {
      parent.value[key] = scalar(rawValue, index + 1);
      scalarIndent = indent;
      continue;
    }

    // Look ahead to decide whether an empty key starts an object or scalar list.
    let next = index + 1;
    while (next < lines.length && !stripComment(lines[next]).trim()) next += 1;
    const nextLine = next < lines.length ? stripComment(lines[next]).replace(/\s+$/, '') : '';
    const nextIndent = nextLine ? nextLine.match(/^ */)[0].length : -1;
    const nextContent = nextLine.trim();
    const child = nextIndent > indent && nextContent.startsWith('- ') ? [] : {};
    parent.value[key] = child;
    stack.push({ indent, value: child, path: `${parent.path}.${key}` });
  }
  return root;
}

function mergeDefaults(value, defaults) {
  if (!isObject(defaults)) return value === undefined ? clone(defaults) : value;
  const result = isObject(value) ? { ...value } : {};
  for (const [key, defaultValue] of Object.entries(defaults)) {
    if (result[key] === undefined) result[key] = clone(defaultValue);
    else if (isObject(defaultValue) && isObject(result[key])) result[key] = mergeDefaults(result[key], defaultValue);
  }
  return result;
}

function validateSchema(value, schema, at = '$', errors = []) {
  if (schema.type === 'object') {
    if (!isObject(value)) {
      errors.push(`${at}: expected object.`);
      return errors;
    }
    for (const required of schema.required || [])
      if (!Object.hasOwn(value, required)) errors.push(`${at}.${required}: required property is missing.`);
    if (schema.additionalProperties === false) {
      for (const key of Object.keys(value))
        if (!Object.hasOwn(schema.properties || {}, key)) errors.push(`${at}.${key}: unknown property.`);
    }
    for (const [key, child] of Object.entries(value)) {
      const childSchema =
        schema.properties?.[key] || (isObject(schema.additionalProperties) ? schema.additionalProperties : null);
      if (childSchema) validateSchema(child, childSchema, `${at}.${key}`, errors);
    }
  } else if (schema.type === 'array') {
    if (!Array.isArray(value)) errors.push(`${at}: expected array.`);
    else for (let i = 0; i < value.length; i += 1) validateSchema(value[i], schema.items || {}, `${at}[${i}]`, errors);
  } else if (schema.type === 'string') {
    if (typeof value !== 'string') errors.push(`${at}: expected string.`);
    else if (schema.minLength && value.length < schema.minLength) errors.push(`${at}: must not be empty.`);
  } else if (schema.type === 'boolean' && typeof value !== 'boolean') errors.push(`${at}: expected boolean.`);
  else if (schema.type === 'integer' && !Number.isInteger(value)) errors.push(`${at}: expected integer.`);

  if (schema.const !== undefined && value !== schema.const)
    errors.push(`${at}: must equal ${JSON.stringify(schema.const)}.`);
  if (schema.enum && !schema.enum.includes(value))
    errors.push(`${at}: must be one of ${schema.enum.map((v) => JSON.stringify(v)).join(', ')}.`);
  return errors;
}

export function validateConfig(config, schema) {
  const errors = validateSchema(config, schema);
  if (config?.integrations?.graphify?.required === true && config?.integrations?.graphify?.enabled !== true) {
    errors.push('$.integrations.graphify: required=true requires enabled=true.');
  }
  if (errors.length) throw new ConfigError('Invalid TRUSS configuration.', errors);
  return config;
}

export function loadConfig(projectRoot, { required = true } = {}) {
  const configPath = path.join(projectRoot, '.truss', 'config.yaml');
  const schemaPath = path.join(projectRoot, '.truss', 'schema', 'config.schema.json');
  if (!fs.existsSync(configPath)) {
    if (!required) return null;
    throw new ConfigError(`TRUSS config not found: ${path.relative(projectRoot, configPath)}`);
  }
  if (!fs.existsSync(schemaPath))
    throw new ConfigError(`TRUSS config schema not found: ${path.relative(projectRoot, schemaPath)}`);

  let parsed;
  let schema;
  try {
    parsed = parseConfigYaml(fs.readFileSync(configPath, 'utf8'));
  } catch (error) {
    if (error instanceof ConfigError) throw error;
    throw new ConfigError(`Could not parse ${configPath}: ${error.message}`);
  }
  try {
    schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
  } catch (error) {
    throw new ConfigError(`Could not parse config schema: ${error.message}`);
  }

  validateConfig(parsed, schema);
  const resolved = mergeDefaults(parsed, DEFAULT_CONFIG);
  validateConfig(resolved, schema);
  return { raw: parsed, config: resolved, configPath, schemaPath };
}

export function formatConfigError(error) {
  const details = error?.details?.length ? `\n${error.details.map((item) => `  - ${item}`).join('\n')}` : '';
  return `${error.message}${details}`;
}
