import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

// External CLIs (OpenSpec, Graphify) are launched without a shell. That is straightforward on POSIX, but on
// Windows an npm-installed CLI is a `.cmd` shim, and Node cannot spawn `.cmd`/`.bat` files directly. Going through
// `cmd.exe` would pass arguments (a change title, for example) through a second, error-prone layer of quoting, so
// TRUSS reads the shim and launches the Node script it points to instead.

const WINDOWS_EXECUTABLE = /\.(exe|com|cmd|bat)$/i;
const WINDOWS_SHIM = /\.(cmd|bat)$/i;

// `where` on Windows also lists the extensionless sh shim npm installs next to the .cmd one. Windows cannot run it.
export function pickWindowsExecutable(lines) {
  return lines.find((line) => WINDOWS_EXECUTABLE.test(line)) ?? null;
}

export function findExecutable(name, { platform = process.platform } = {}) {
  const lookup = spawnSync(platform === 'win32' ? 'where' : 'which', [name], { encoding: 'utf8' });
  if (lookup.status !== 0) return null;
  const lines = lookup.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  return platform === 'win32' ? pickWindowsExecutable(lines) : (lines[0] ?? null);
}

// npm's cmd-shim ends with:  "%_prog%"  "%dp0%\node_modules\<pkg>\bin\<cli>.js" %*
// pnpm and Yarn generate the same shape, sometimes with `..` segments.
export function parseNpmCmdShim(text) {
  const match = text.match(/"%_prog%"\s+"%dp0%\\([^"\r\n]+\.[cm]?js)"\s+%\*/i);
  return match ? match[1].split('\\').filter(Boolean) : null;
}

export function resolveLaunch(file, args, { platform = process.platform } = {}) {
  if (platform !== 'win32' || !WINDOWS_SHIM.test(file)) return { command: file, args };
  try {
    const segments = parseNpmCmdShim(fs.readFileSync(file, 'utf8'));
    if (segments) {
      const script = path.join(path.dirname(file), ...segments);
      if (fs.existsSync(script)) return { command: process.execPath, args: [script, ...args] };
    }
  } catch {}
  return null;
}

export function spawnCli(file, args, options = {}) {
  const launch = resolveLaunch(file, args);
  if (!launch) {
    return {
      status: null,
      signal: null,
      stdout: '',
      stderr: '',
      error: new Error(
        `Cannot launch ${file}: TRUSS runs CLIs without a shell, and only npm-style .cmd shims are understood. Point TRUSS_OPENSPEC_PATH at an .exe or at the npm shim.`,
      ),
    };
  }
  return spawnSync(launch.command, launch.args, { encoding: 'utf8', ...options });
}
