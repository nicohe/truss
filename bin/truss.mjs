#!/usr/bin/env node
import { dispatch } from '../lib/cli.mjs';
import { createUi } from '../lib/ui.mjs';

dispatch({ cwd: process.cwd(), args: process.argv.slice(2), ui: createUi() });
