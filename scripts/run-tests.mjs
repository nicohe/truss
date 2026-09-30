// Cross-platform test runner. Shells differ on glob expansion (cmd.exe does none, and Node 20's
// test runner does not either), so the test files are listed here instead of in package.json.
//   node scripts/run-tests.mjs <unit|integration|e2e|all> [extra node --test flags]
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

const suites = ['unit', 'integration', 'e2e'];
const [selected = 'all', ...flags] = process.argv.slice(2);
if (selected !== 'all' && !suites.includes(selected)) {
  console.error(`Unknown suite "${selected}". Use one of: ${[...suites, 'all'].join(', ')}.`);
  process.exit(2);
}

const files = (selected === 'all' ? suites : [selected]).flatMap((suite) =>
  readdirSync(join('test', suite))
    .filter((name) => name.endsWith('.test.mjs'))
    .sort()
    .map((name) => join('test', suite, name)),
);

const result = spawnSync(process.execPath, ['--test', '--test-concurrency=1', ...flags, ...files], {
  stdio: 'inherit',
});
process.exit(result.status ?? 1);
