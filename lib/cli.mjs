import { createCommands } from './commands.mjs';
import { unknownCommandMessage } from './help.mjs';

const HELP_FLAGS = new Set(['--help', '-h']);
const VERSION_FLAGS = new Set(['--version', '-v']);

// Turns the command line into a command. Kept apart from `bin/truss.mjs` so it can be tested without a process.
//   truss                      the command list
//   truss --help | -h          the command list
//   truss --version | -v       the installed version
//   truss <command> --help     help for that command; the command itself is not run
//   truss <unknown>            an error with the closest command name, exit code 2
export function dispatch({ cwd, args, ui }) {
  const commandsFor = (commandArgs) => createCommands({ cwd, args: commandArgs, ui });
  const [name, ...rest] = args;

  if (name === undefined || HELP_FLAGS.has(name)) return commandsFor(['help']).help();
  if (VERSION_FLAGS.has(name)) return commandsFor(['version']).version();

  const commands = commandsFor(args);
  if (!Object.hasOwn(commands, name)) {
    const { problem, hint } = unknownCommandMessage(name, Object.keys(commands));
    ui.p(`${ui.c.red(`× ${problem}`)}\n${hint}`);
    process.exitCode = 2;
    return undefined;
  }
  if (name !== 'help' && rest.some((arg) => HELP_FLAGS.has(arg))) return commandsFor(['help', name]).help();
  return commands[name]();
}
