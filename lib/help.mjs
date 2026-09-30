// What `truss help`, `truss <command> --help` and the unknown-command message say. Plain strings, no terminal
// handling: the callers decide how to print them. The full reference is docs/en/reference/cli.md; this is the part
// worth having at hand when you are already in the terminal.

const USAGE_ERROR = 'invalid configuration, or the command was used wrongly';
const GENERIC_EXITS = [
  ['0', 'the command did what it was asked'],
  ['1', 'a check or precondition failed'],
  ['2', USAGE_ERROR],
];

// `list` is how the command appears in the command list; `usage` is the full synopsis. `exits` replaces the generic
// exit codes when the command has documented specifics (see the CLI reference).
export const COMMAND_HELP = {
  init: {
    list: 'init',
    summary: 'initialize .truss',
    usage: 'truss init',
    description: [
      'Create .truss/config.yaml if it is missing (an existing one is validated and adopted, never',
      'overwritten) and initialize or adopt the OpenSpec project. Safe to run again.',
    ],
    exits: [
      ['0', 'the project is initialized (created or adopted)'],
      ['1', 'OpenSpec is missing, incompatible, partial or failed to initialize'],
      ['2', 'the configuration is invalid, or the TRUSS installation is incomplete'],
    ],
    docs: 'docs/en/reference/init.md',
  },
  new: {
    list: 'new "Change name" [--component name]',
    summary: 'create an OpenSpec change and make it active',
    usage: 'truss new "Change name" [--component name]',
    description: ['Create an OpenSpec change from the title and record it as the active change.'],
    options: [['--component <name>', 'create the change in a component declared under `components`']],
    docs: 'docs/en/workflows/lifecycle-commands.md',
  },
  use: {
    list: 'use <change> [--component name]',
    summary: 'make an open change the active one',
    usage: 'truss use <change> [--component name]',
    description: [
      'Make a change that is already open in OpenSpec the active change, for when `truss new` left it behind.',
      'Nothing in OpenSpec is created or changed: only the record of which change is active.',
    ],
    options: [['--component <name>', 'the component whose OpenSpec holds the change (leave it out for the workspace)']],
    exits: [
      ['0', 'the change is now the active one'],
      ['1', 'there is no such open change, it was archived, or OpenSpec is missing or incompatible'],
      ['2', 'no change was named or it is not a change id, the configuration is invalid, or the component is unknown'],
    ],
    docs: 'docs/en/workflows/lifecycle-commands.md',
  },
  status: {
    list: 'status',
    summary: 'show active change',
    usage: 'truss status',
    description: ['Show the active change: its phase, planning artifacts and task progress.'],
    docs: 'docs/en/workflows/lifecycle-commands.md',
  },
  continue: {
    list: 'continue',
    summary: 'show next action',
    usage: 'truss continue',
    description: ['Print the next action for the coding agent and the files it should load. It never runs an agent.'],
    docs: 'docs/en/workflows/lifecycle-commands.md',
  },
  verify: {
    list: 'verify [--trust]',
    summary: 'run configured verification',
    usage: 'truss verify [--trust]',
    description: [
      'Run the commands in verification.commands in order and stop at the first failure. The opt-in',
      'tests_required and tasks_complete checks run first. A command list that is new or changed must',
      'be approved before it runs.',
    ],
    options: [['--trust', 'approve the current command list without asking (or set TRUSS_TRUST=1)']],
    exits: [
      ['0', 'every command passed'],
      ['1', 'a command failed, none is configured, the list was not approved, or a gate set to block refused'],
      ['2', 'the configuration is invalid'],
    ],
    docs: 'docs/en/reference/verify.md',
  },
  doctor: {
    list: 'doctor',
    summary: 'check local setup',
    usage: 'truss doctor',
    description: ['Read-only health check of the environment, configuration, OpenSpec and optional Graphify.'],
    exits: [
      ['0', 'every required check passed (optional warnings may remain)'],
      ['1', 'a required setup check failed'],
      ['2', 'the configuration is invalid'],
    ],
    docs: 'docs/en/reference/doctor.md',
  },
  config: {
    list: 'config',
    summary: 'validate and show resolved config',
    usage: 'truss config',
    description: ['Validate .truss/config.yaml and print the resolved configuration, defaults applied.'],
    exits: [
      ['0', 'the configuration is valid'],
      ['2', 'the configuration is invalid'],
    ],
    docs: 'docs/en/configuration/validation.md',
  },
  openspec: {
    list: 'openspec',
    summary: 'inspect OpenSpec CLI/project compatibility',
    usage: 'truss openspec',
    description: ['Inspect the OpenSpec CLI (found, version, compatible) and whether the project is initialized.'],
    exits: [
      ['0', 'a compatible CLI is installed and the project is initialized'],
      ['1', 'the CLI is missing or incompatible, or the project is not initialized'],
    ],
    docs: 'docs/en/integrations/openspec-detection.md',
  },
  graphify: {
    list: 'graphify [status|update|bootstrap]',
    summary: 'inspect or refresh code graph',
    usage: 'truss graphify [status|update|bootstrap]',
    description: ['Inspect the optional Graphify code graph, or build (bootstrap) or refresh (update) it.'],
    exits: [
      ['0', 'done, or Graphify is optional and unavailable'],
      ['1', 'Graphify is required (`required: true`) and is unavailable or not ready'],
      ['2', 'the configuration is invalid, or the action is unknown'],
    ],
    docs: 'docs/en/integrations/graphify-lifecycle.md',
  },
  components: {
    list: 'components [name]',
    summary: 'resolve configured project components',
    usage: 'truss components [name]',
    description: ['Resolve the components declared in the configuration, or just the one named.'],
    exits: [
      ['0', 'every requested component resolved'],
      ['2', 'the configuration is invalid, or a component is unknown or does not resolve'],
    ],
    docs: 'docs/en/reference/components.md',
  },
  handoff: {
    list: 'handoff',
    summary: 'write a concise handoff',
    usage: 'truss handoff',
    description: [
      'Write a short handoff note for the active change. Use it when work moves to another agent or session.',
      'An existing note is left as it is, never overwritten: edit it, or delete it to start a new one.',
    ],
    docs: 'docs/en/reference/handoff.md',
  },
  skills: {
    list: 'skills',
    summary: 'list portable TRUSS skills',
    usage: 'truss skills',
    description: ['List the portable skills that ship with the TRUSS installation.'],
    docs: 'docs/en/skills/overview.md',
  },
  version: {
    list: 'version',
    summary: 'print the installed TRUSS version',
    usage: 'truss version',
    description: ['Print the installed TRUSS version. `truss --version` and `truss -v` do the same.'],
    exits: [['0', 'always']],
    docs: 'docs/en/reference/cli.md',
  },
  help: {
    list: 'help [command]',
    summary: 'list commands, or explain one',
    usage: 'truss help [command]',
    description: ['List the commands, or explain one. `truss <command> --help` does the same for that command.'],
    exits: [
      ['0', 'help was shown'],
      ['2', 'the command is unknown'],
    ],
    docs: 'docs/en/reference/cli.md',
  },
};

const LIST_COLUMN = 29;

export function renderHelp() {
  const rows = Object.values(COMMAND_HELP).map(({ list, summary }) =>
    list.length < LIST_COLUMN
      ? `  ${list.padEnd(LIST_COLUMN)}${summary}`
      : `  ${list}\n${' '.repeat(LIST_COLUMN + 2)}${summary}`,
  );
  return [
    '',
    'Usage: truss <command>',
    '',
    ...rows,
    '',
    'Run "truss <command> --help" for the options and exit codes of a command.',
    'Docs: docs/en/getting-started.md',
  ].join('\n');
}

export function renderCommandHelp(name) {
  const { usage, description, options = [], exits = GENERIC_EXITS, docs } = COMMAND_HELP[name];
  const table = (rows) => {
    const width = Math.max(...rows.map(([key]) => key.length));
    return rows.map(([key, text]) => `  ${key.padEnd(width)}  ${text}`);
  };
  return [
    '',
    `Usage: ${usage}`,
    '',
    ...description,
    ...(options.length ? ['', 'Options:', ...table(options)] : []),
    '',
    'Exit codes:',
    ...table(exits),
    '',
    `Docs: ${docs}`,
  ].join('\n');
}

// Edit distance between two short words.
function distance(a, b) {
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    previous = current;
  }
  return previous[b.length];
}

// The command a mistyped name was probably meant to be, or null when nothing is close enough: a unique command the
// input is the start of (`comp`), otherwise the nearest name within two edits (fewer for very short inputs).
export function suggestCommand(input, names = Object.keys(COMMAND_HELP)) {
  const word = String(input).toLowerCase();
  if (!word) return null;
  const prefixed = word.length >= 3 ? names.filter((name) => name.startsWith(word)) : [];
  if (prefixed.length === 1) return prefixed[0];
  let best = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const name of names) {
    const current = distance(word, name);
    if (current < bestDistance) [best, bestDistance] = [name, current];
  }
  return bestDistance <= Math.min(2, Math.floor(word.length / 2)) ? best : null;
}

// Two lines for the caller to print: what went wrong, and what to do about it.
export function unknownCommandMessage(input, names = Object.keys(COMMAND_HELP)) {
  const suggestion = suggestCommand(input, names);
  return {
    problem: `Unknown command "${input}".`,
    hint: `${suggestion ? `Did you mean "${suggestion}"? ` : ''}Run "truss help" to list the commands.`,
  };
}
