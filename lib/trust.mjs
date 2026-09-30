import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Trust store for `verification.commands`. `truss verify` runs those commands through the
// shell, so the approved list is remembered per project in a user-level file. It deliberately
// lives outside the repository: a cloned project must not be able to ship its own approval.

export function trustHome(env = process.env) {
  return env.TRUSS_HOME || path.join(env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'), 'truss');
}

const storeFile = (env) => path.join(trustHome(env), 'trusted.json');
const projectKey = (root) => {
  try {
    return fs.realpathSync(root);
  } catch {
    return path.resolve(root);
  }
};

export function commandsDigest(commands) {
  return crypto.createHash('sha256').update(JSON.stringify(commands)).digest('hex');
}

function readStore(env) {
  try {
    const data = JSON.parse(fs.readFileSync(storeFile(env), 'utf8'));
    return data && typeof data === 'object' && !Array.isArray(data) ? data : {};
  } catch {
    return {};
  }
}

export function isTrusted(root, commands, env = process.env) {
  return readStore(env)[projectKey(root)]?.commandsSha256 === commandsDigest(commands);
}

export function trustCommands(root, commands, env = process.env) {
  const store = readStore(env);
  store[projectKey(root)] = { commandsSha256: commandsDigest(commands), trustedAt: new Date().toISOString() };
  const file = storeFile(env);
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(store, null, 2)}\n`, { mode: 0o600 });
  fs.renameSync(tmp, file);
}

export const trustRequestedByEnv = (env = process.env) =>
  ['1', 'true'].includes(String(env.TRUSS_TRUST || '').toLowerCase());
