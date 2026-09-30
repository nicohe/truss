#!/usr/bin/env node
import { createCommands } from '../lib/commands.mjs';
import { createUi } from '../lib/ui.mjs';

const args = process.argv.slice(2);
const name = args[0] || 'help';
const commands = createCommands({ cwd: process.cwd(), args, ui: createUi() });

(Object.hasOwn(commands, name) ? commands[name] : commands.help)();
