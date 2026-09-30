import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { cleanupAll, fakeStatefulOpenSpec, installTruss, newProject, trussRoot, trussRunner } from './helpers.mjs';

// The getting started guide quotes what TRUSS prints. This test runs the same steps in the documented layout and
// checks that every quoted line is real and in the order TRUSS prints it, so a change of wording or format fails here
// instead of leaving the guide wrong. A line that is only `...` stands for lines left out. The `doctor` sample is not
// compared: it depends on the machine (Node version, Graphify), and `truss doctor` has its own tests.

const guide = (language) => fs.readFileSync(path.join(trussRoot, 'docs', language, 'getting-started.md'), 'utf8');
const samplesOf = (text) => [...text.matchAll(/```text\n(.*?)```/gs)].map((match) => match[1].replace(/\n$/, ''));

function kindOf(sample) {
  const [first] = sample.split('\n');
  if (first.includes('· init')) return 'init';
  if (first.includes('· new')) return 'new';
  if (first.includes('· continue')) return /^Phase\s+spec$/m.test(sample) ? 'continue-spec' : 'continue-implementation';
  if (first.startsWith('○ These verification commands')) return 'verify-untrusted';
  if (first === 'Core') return 'doctor';
  return null;
}

function assertQuoted(sample, output, label) {
  const real = output.split('\n').map((line) => line.trimEnd());
  let from = 0;
  for (const line of sample.split('\n')) {
    const wanted = line.trimEnd();
    if (!wanted.trim() || wanted.trim() === '...') continue;
    const at = real.indexOf(wanted, from);
    assert.notEqual(
      at,
      -1,
      `${label}: the guide quotes a line TRUSS does not print here:\n  ${wanted}\n\nreal output:\n${output}`,
    );
    from = at + 1;
  }
}

function runGuide() {
  const project = newProject();
  const install = path.join(project, '.truss');
  installTruss(install);
  const run = trussRunner(project, install, fakeStatefulOpenSpec(project, { initialized: false }));
  try {
    const outputs = {};
    outputs.init = run('init').out;
    outputs.new = run('new', 'Add retry policy').out;
    outputs['continue-spec'] = run('continue').out;

    const change = path.join(project, 'openspec', 'changes', 'add-retry-policy');
    fs.writeFileSync(path.join(change, 'proposal.md'), '# Proposal\n');
    fs.mkdirSync(path.join(change, 'specs'), { recursive: true });
    fs.writeFileSync(path.join(change, 'specs', 'retry.md'), 'spec\n');
    fs.writeFileSync(path.join(change, 'design.md'), '# Design\n');
    fs.writeFileSync(path.join(change, 'tasks.md'), '- [x] 1.1 Implement retry\n- [ ] 1.2 Add tests\n');
    outputs['continue-implementation'] = run('continue').out;

    // Editing the command list makes `verify` ask for approval again.
    const config = path.join(project, '.truss', 'config.yaml');
    const edited = fs
      .readFileSync(config, 'utf8')
      .replace('    - npm test --if-present\n', '    - npm test --if-present\n    - echo extra\n');
    fs.writeFileSync(config, edited);
    outputs['verify-untrusted'] = run('verify').out;
    return outputs;
  } finally {
    cleanupAll(project);
  }
}

test('the outputs quoted in getting started are what TRUSS prints', () => {
  const outputs = runGuide();
  const expected = ['init', 'doctor', 'new', 'continue-spec', 'continue-implementation', 'verify-untrusted'];
  for (const language of ['en', 'es']) {
    const samples = samplesOf(guide(language));
    assert.deepEqual(
      samples.map(kindOf),
      expected,
      `${language}: the guide's output samples changed shape; update this test`,
    );
    for (const sample of samples) {
      const kind = kindOf(sample);
      if (kind !== 'doctor') assertQuoted(sample, outputs[kind], `${language} / ${kind}`);
    }
  }
});

test('the Spanish guide quotes the same output as the English one', () => {
  assert.deepEqual(samplesOf(guide('es')), samplesOf(guide('en')));
});
