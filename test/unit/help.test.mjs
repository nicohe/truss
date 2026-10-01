import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { createCommands } from '../../lib/commands.mjs';
import {
  COMMAND_HELP,
  optionProblem,
  renderCommandHelp,
  renderHelp,
  suggestCommand,
  unknownCommandMessage,
} from '../../lib/help.mjs';
import { createUi } from '../../lib/ui.mjs';
import { trussRoot } from '../integration/helpers.mjs';

const implemented = () => Object.keys(createCommands({ cwd: trussRoot, args: [], ui: createUi() }));

test('every command has help, and help describes only commands that exist', () => {
  assert.deepEqual(Object.keys(COMMAND_HELP).sort(), implemented().sort());
});

test('the command list mentions every command and how to get more help', () => {
  const list = renderHelp();
  for (const { list: entry, summary } of Object.values(COMMAND_HELP)) {
    assert.ok(list.includes(entry), `missing ${entry}`);
    assert.ok(list.includes(summary), `missing summary of ${entry}`);
  }
  assert.match(list, /truss <command> --help/);
  assert.doesNotMatch(list, /undefined/);
});

test('each command help has a synopsis, exit codes and a docs page that exists', () => {
  for (const [name, entry] of Object.entries(COMMAND_HELP)) {
    const text = renderCommandHelp(name);
    assert.ok(text.includes(`Usage: ${entry.usage}`), `usage of ${name}`);
    assert.match(text, /Exit codes:\n {2}\d {2}\S/, `exit codes of ${name}`);
    assert.ok(fs.existsSync(path.join(trussRoot, entry.docs)), `${name}: ${entry.docs} does not exist`);
    assert.ok(text.includes(`Docs: ${entry.docs}`), `docs line of ${name}`);
    assert.doesNotMatch(text, /undefined/);
  }
});

test('options are only shown for the commands that have them', () => {
  assert.match(renderCommandHelp('verify'), /Options:\n {2}--trust {2}approve/);
  assert.match(renderCommandHelp('new'), /--component <name>/);
  assert.doesNotMatch(renderCommandHelp('doctor'), /Options:/);
});

test('commands without specific exit codes get the general ones', () => {
  assert.match(renderCommandHelp('status'), /1 {2}a check or precondition failed/);
  assert.match(renderCommandHelp('verify'), /1 {2}a command failed/);
});

test('suggestCommand finds the command a typo was meant to be', () => {
  const cases = {
    verfy: 'verify',
    stauts: 'status',
    dcotor: 'doctor',
    ini: 'init',
    ne: 'new',
    VERIFY: 'verify', // upper case is not a typo worth failing on
    com: 'components', // the start of exactly one command
    conf: 'config',
  };
  for (const [input, expected] of Object.entries(cases)) assert.equal(suggestCommand(input), expected, input);
});

test('suggestCommand stays quiet when nothing is close, or the guess would be a coin flip', () => {
  for (const input of ['xyz', 'deploy', 'x', '', 'con']) assert.equal(suggestCommand(input), null, `"${input}"`);
});

test('unknownCommandMessage names the input and the way out, with a suggestion only when there is one', () => {
  assert.deepEqual(unknownCommandMessage('verfy'), {
    problem: 'Unknown command "verfy".',
    hint: 'Did you mean "verify"? Run "truss help" to list the commands.',
  });
  assert.deepEqual(unknownCommandMessage('deploy'), {
    problem: 'Unknown command "deploy".',
    hint: 'Run "truss help" to list the commands.',
  });
  assert.equal(unknownCommandMessage('stat', ['status', 'skills']).hint.startsWith('Did you mean "status"?'), true);
});

test('optionProblem accepts the options a command has, with their value, and nothing else', () => {
  assert.equal(optionProblem('new', ['Add retry']), null);
  assert.equal(optionProblem('new', ['Add retry', '--component', 'api']), null);
  assert.equal(optionProblem('new', ['--component', 'api', 'Add retry']), null);
  assert.equal(optionProblem('verify', ['--trust']), null);
  assert.equal(optionProblem('status', []), null);
  assert.equal(optionProblem('use', ['-hotfix']), null, 'only long options are options');
});

test('optionProblem names an unknown option, the closest one the command has, and says when there are none', () => {
  assert.deepEqual(optionProblem('new', ['x', '--componnet', 'api']), {
    problem: 'Unknown option "--componnet" for "truss new".',
    hint: 'Did you mean "--component"? Run "truss new --help" for its options.',
  });
  assert.match(optionProblem('verify', ['--trsut']).hint, /Did you mean "--trust"\?/);
  assert.match(optionProblem('new', ['x', '--zzzzzzzz']).hint, /^Run "truss new --help"/, 'nothing close: no guess');
  assert.deepEqual(optionProblem('status', ['--bogus']), {
    problem: 'Unknown option "--bogus" for "truss status".',
    hint: 'It takes no options. Run "truss status --help" for its options.',
  });
});

test('optionProblem rejects an option without its value, and the --name=value form', () => {
  for (const rest of [['x', '--component'], ['--component'], ['x', '--component', '--trust']])
    assert.match(optionProblem('new', rest).problem, /The option "--component" needs a value\./, rest.join(' '));
  assert.match(optionProblem('new', ['x', '--component=api']).problem, /after a space, not after "="/);
});
