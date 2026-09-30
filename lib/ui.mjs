import fs from 'node:fs';
import tty from 'node:tty';

// Terminal output helpers. Color is emitted only when it is wanted:
// NO_COLOR disables it, FORCE_COLOR enables it, otherwise it requires an interactive TTY.
const CODES = {
  blue: '38;2;59;130;246',
  purple: '38;2;139;92;246',
  green: '38;2;16;185;129',
  cyan: '38;2;6;182;212',
  red: '31'
};

export function colorEnabled({ env = process.env, stream = process.stdout } = {}) {
  if (env.NO_COLOR) return false;
  if (env.FORCE_COLOR && env.FORCE_COLOR !== '0') return true;
  return Boolean(stream.isTTY) && env.TERM !== 'dumb';
}

export function createUi(options = {}) {
  const enabled = colorEnabled(options);
  const paint = code => text => enabled ? `\x1b[${code}m${text}\x1b[0m` : String(text);
  const c = Object.fromEntries(Object.entries(CODES).map(([name, code]) => [name, paint(code)]));
  const p = (...parts) => console.log(...parts);
  const header = (label = '') => p(`${c.blue('△')} ${c.purple('TRUSS')}${label ? ` · ${label}` : ''}`);
  // Synchronous yes/no prompt. Anything but an explicit yes (including EOF or a read error) is a no.
  const confirm = question => {
    process.stdout.write(`${question} [y/N] `);
    const buffer = Buffer.alloc(1);
    let answer = '';
    for (;;) {
      let read;
      try { read = fs.readSync(0, buffer, 0, 1, null); }
      catch (error) {
        if (error.code !== 'EAGAIN') return false;
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 25); // stdin is non-blocking; wait and retry
        continue;
      }
      if (read !== 1 || buffer[0] === 10) break;
      answer += String.fromCharCode(buffer[0]);
    }
    return /^y(es)?$/i.test(answer.trim());
  };
  // Checked through the fd on purpose: touching process.stdin would put it in non-blocking mode.
  const interactive = () => tty.isatty(0) && tty.isatty(1);
  return { c, p, header, confirm, interactive, enabled };
}
