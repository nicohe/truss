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
    summary: 'set up TRUSS here (safe to run again)',
    group: 'Start',
    usage: 'truss init',
    description: [
      'Create .truss/config.yaml if it is missing (an existing one is validated and adopted, never',
      'overwritten) and initialize or adopt the OpenSpec project. Safe to run again. A new config lists no',
      "verification commands: put your project's checks under verification.commands.",
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
    summary: 'start a change and make it the active one',
    group: 'Work on a change',
    usage: 'truss new "Change name" [--component name]',
    description: [
      'Create an OpenSpec change from the title and record it as the active change.',
      'An open change it leaves behind is named, with the `truss use` command that goes back to it.',
    ],
    options: [['--component <name>', 'create the change in a component declared under `components`']],
    docs: 'docs/en/workflows/lifecycle-commands.md',
  },
  use: {
    list: 'use [change] [--component name]',
    summary: 'go back to an open change (no name: list them)',
    group: 'Work on a change',
    usage: 'truss use [change] [--component name]',
    description: [
      'Make a change that is already open in OpenSpec the active change, for when `truss new` left it behind.',
      'Nothing in OpenSpec is created or changed: only the record of which change is active.',
      'With no name it lists the open changes and the command that picks each one.',
    ],
    options: [['--component <name>', 'the component whose OpenSpec holds the change (leave it out for the workspace)']],
    exits: [
      ['0', 'the change is now the active one, or the open changes were listed'],
      ['1', 'there is no such open change, it was archived, or OpenSpec is missing or incompatible'],
      ['2', 'the name is empty or not a change id, the configuration is invalid, or the component is unknown'],
    ],
    docs: 'docs/en/workflows/lifecycle-commands.md',
  },
  status: {
    list: 'status',
    summary: 'see the active change and how far it is',
    group: 'Work on a change',
    usage: 'truss status',
    description: [
      'Show the active change: its phase, planning artifacts and task progress. With none, list the changes',
      'that are open in OpenSpec and point to truss use.',
    ],
    docs: 'docs/en/workflows/lifecycle-commands.md',
  },
  continue: {
    list: 'continue',
    summary: 'get the next step to give your agent',
    group: 'Work on a change',
    usage: 'truss continue',
    description: ['Print the next action for the coding agent and the files it should load. It never runs an agent.'],
    docs: 'docs/en/workflows/lifecycle-commands.md',
  },
  verify: {
    list: 'verify [--trust]',
    summary: 'run your checks and record the result',
    group: 'Check',
    usage: 'truss verify [--trust]',
    description: [
      'Run the commands in verification.commands in order and stop at the first failure. The opt-in',
      'tests_required and tasks_complete checks run first. A command list that is new or changed must',
      'be approved before it runs. With none listed it fails: TRUSS does not guess your toolchain.',
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
    summary: 'check Node, Git, OpenSpec and your settings',
    group: 'Start',
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
    summary: 'validate and show the resolved settings',
    group: 'Explore and other',
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
    summary: 'check the OpenSpec CLI and project',
    group: 'Explore and other',
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
    summary: 'inspect or refresh the optional code graph',
    group: 'Explore and other',
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
    summary: 'show the components you declared',
    group: 'Explore and other',
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
    summary: 'write a note so another session can take over',
    group: 'Hand off',
    usage: 'truss handoff',
    description: [
      'Write a short handoff note for the active change. Use it when work moves to another agent or session.',
      'With none, list the changes that are open in OpenSpec and point to truss use.',
      'The phase in the note is the one OpenSpec reports now.',
      'An existing note is left as it is, never overwritten: edit it, or delete it to start a new one.',
    ],
    docs: 'docs/en/reference/handoff.md',
  },
  skills: {
    list: 'skills [name]',
    summary: 'list the skills, or print the one you name',
    group: 'Explore and other',
    usage: 'truss skills [name]',
    description: [
      'List the portable skills that ship with the TRUSS installation, each with the path of its file:',
      'a skill is a file your agent reads, so that path is what a prompt refers to.',
      'With a name, print that skill: a prompt can say "run `truss skills grill-me` and follow it" and does not need the path.',
    ],
    exits: [
      ['0', 'the skills were listed, or the skill named was printed'],
      ['2', 'there is no skill with that name'],
    ],
    docs: 'docs/en/skills/overview.md',
  },
  version: {
    list: 'version',
    summary: 'print the installed TRUSS version',
    group: 'Explore and other',
    usage: 'truss version',
    description: ['Print the installed TRUSS version. `truss --version` and `truss -v` do the same.'],
    exits: [['0', 'always']],
    docs: 'docs/en/reference/cli.md',
  },
  help: {
    list: 'help [command|concepts]',
    summary: 'list the commands, or explain one',
    group: 'Explore and other',
    usage: 'truss help [command|concepts]',
    description: [
      'List the commands, or explain one. `truss <command> --help` does the same for that command.',
      '`truss help concepts` explains in a few lines what a change, the active change, a phase, the evidence and a handoff are.',
    ],
    exits: [
      ['0', 'help was shown'],
      ['2', 'the command is unknown'],
    ],
    docs: 'docs/en/reference/cli.md',
  },
};

const LIST_COLUMN = 29;

// The stages a person goes through, in the order the list shows them. Each command names its stage in `group`; inside a
// stage the commands keep the order of `COMMAND_HELP`.
export const HELP_GROUPS = ['Start', 'Work on a change', 'Check', 'Hand off', 'Explore and other'];

export function renderHelp() {
  const row = ({ list, summary }) =>
    list.length < LIST_COLUMN
      ? `  ${list.padEnd(LIST_COLUMN)}${summary}`
      : `  ${list}\n${' '.repeat(LIST_COLUMN + 2)}${summary}`;
  const groups = HELP_GROUPS.flatMap((group) => [
    group,
    ...Object.values(COMMAND_HELP)
      .filter((entry) => entry.group === group)
      .map(row),
  ]);
  return [
    '',
    'Usage: truss <command>',
    '',
    ...groups,
    '',
    'New here? Run "truss help concepts".',
    'Run "truss <command> --help" for the options and exit codes of a command.',
    'Docs: docs/en/getting-started.md',
  ].join('\n');
}

// `truss help concepts`: the few words TRUSS uses without explaining, in the order a person meets them. It is a topic of
// `help`, not a command, so it is not in `COMMAND_HELP`. Every term is also in the glossary (docs/en/reference/glossary.md).
export const CONCEPTS = [
  [
    'Change',
    [
      'One unit of work: a proposal, specs, a design and tasks, kept by OpenSpec.',
      '"truss new" creates one; its id (add-retry-policy) is the name of its folder.',
    ],
  ],
  [
    'Active change',
    [
      'The change TRUSS follows right now. It is remembered for each Git branch in',
      '.truss/state.json, which Git ignores. "truss use" switches it.',
    ],
  ],
  [
    'Phase',
    [
      'Where a change is: spec (planning is missing), implementation (tasks are open)',
      'or complete (every task is checked off).',
    ],
  ],
  [
    'Evidence',
    [
      'The record of your last "truss verify": whether your checks passed, and the files',
      'they saw. It is current while the files are the ones that passed.',
    ],
  ],
  [
    'Handoff',
    [
      'A short note for whoever takes over, another agent or session. It is written once,',
      'never overwritten, and records the branch and the commit.',
    ],
  ],
];

export function renderConcepts() {
  return [
    '',
    'The words TRUSS uses. It never runs an agent and never blocks your Git work.',
    ...CONCEPTS.flatMap(([term, lines]) => ['', term, ...lines.map((line) => `  ${line}`)]),
    '',
    'Docs: docs/en/reference/glossary.md',
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

// What a command's help says it accepts: `{ '--component': { takesValue: true } }`. Only long options exist.
function commandOptions(command) {
  const entries = (COMMAND_HELP[command]?.options ?? []).map(([flag]) => [flag.split(' ')[0], flag.includes('<')]);
  return new Map(entries);
}

// What is wrong with the options given to a command, or null when they are fine: one that the command does not have
// (a typo would otherwise be ignored, and the command would do something other than what was asked), or one that needs
// a value and has none. `rest` is what follows the command name. Two lines, as `unknownCommandMessage` gives.
export function optionProblem(command, rest) {
  const known = commandOptions(command);
  const help = `Run "truss ${command} --help" for its options.`;
  for (let i = 0; i < rest.length; i += 1) {
    const arg = rest[i];
    if (!arg.startsWith('--')) continue;
    const name = arg.split('=')[0];
    if (!known.has(name)) {
      const near = suggestCommand(
        name.slice(2),
        [...known.keys()].map((option) => option.slice(2)),
      );
      return {
        problem: `Unknown option "${arg}" for "truss ${command}".`,
        hint: known.size ? `${near ? `Did you mean "--${near}"? ` : ''}${help}` : `It takes no options. ${help}`,
      };
    }
    if (arg.includes('=')) return { problem: `Write the value of "${name}" after a space, not after "=".`, hint: help };
    if (known.get(name)) {
      const value = rest[i + 1];
      if (value === undefined || value.startsWith('--'))
        return { problem: `The option "${name}" needs a value.`, hint: help };
      i += 1;
    }
  }
  return null;
}

// Two lines for the caller to print: what went wrong, and what to do about it.
export function unknownCommandMessage(input, names = Object.keys(COMMAND_HELP)) {
  const suggestion = suggestCommand(input, names);
  return {
    problem: `Unknown command "${input}".`,
    hint: `${suggestion ? `Did you mean "${suggestion}"? ` : ''}Run "truss help" to list the commands.`,
  };
}
