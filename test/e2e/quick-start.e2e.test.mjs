import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { cleanupAll, fakeStatefulOpenSpec, installTruss, newProject, trussRunner as runner } from './helpers.mjs';

// The documented quick start: TRUSS is installed apart from the project (README: a clone inside the project's
// `.truss/`) and run on it. The install holds the schema, skills, policies and workflows; the project must not
// need a copy of any of them. This test copies the working tree, so it also covers uncommitted changes.

const layouts = {
  'cloned into the project as .truss (the documented layout)': (project) => path.join(project, '.truss'),
  'installed in a separate directory': (project) => path.join(project, '..', `${path.basename(project)}-truss-install`),
};

for (const [name, locate] of Object.entries(layouts)) {
  test(`quick start works with TRUSS ${name}`, () => {
    const project = newProject();
    const install = locate(project);
    installTruss(install);
    const bin = fakeStatefulOpenSpec(project, { initialized: false });
    const run = runner(project, install, bin);

    try {
      let r = run('init');
      assert.equal(r.status, 0, r.out);
      assert.match(r.out, /created/);
      assert.ok(fs.existsSync(path.join(project, '.truss', 'config.yaml')), 'init writes the project config');
      assert.equal(
        fs.existsSync(path.join(project, '.truss', 'schema')),
        false,
        'the project does not get a copy of the schema',
      );

      r = run('config');
      assert.equal(r.status, 0, r.out);

      r = run('doctor');
      assert.equal(r.status, 0, r.out);
      assert.match(r.out, /Config\s+\.truss\/config\.yaml valid/);

      r = run('skills');
      assert.equal(r.status, 0);
      assert.match(r.out, /● grill-me/);
      assert.match(r.out, /● code-review/);
      // The path next to each skill is the one a prompt refers to, so it has to open from the project in either layout.
      const listedSkills = [...r.out.matchAll(/^● (\S+) +(\S+\.SKILL\.md)$/gm)];
      assert.ok(listedSkills.length >= 9, r.out);
      for (const [, skill, file] of listedSkills)
        assert.ok(fs.existsSync(path.resolve(project, file)), `${skill}: ${file} does not exist from ${project}`);

      // `skills <name>` prints the skill whatever the layout, so a prompt can say "run truss skills grill-me".
      r = run('skills', 'grill-me');
      assert.equal(r.status, 0, r.out);
      assert.match(r.out, /# Skill: grill-me/);

      r = run('new', 'Add retry policy');
      assert.equal(r.status, 0, r.out);
      r = run('status');
      assert.equal(r.status, 0, r.out);

      // Fill in the planning artifacts so `continue` reaches the implementation instructions.
      const change = path.join(project, 'openspec', 'changes', 'add-retry-policy');
      fs.writeFileSync(path.join(change, 'proposal.md'), '# Proposal\n');
      fs.mkdirSync(path.join(change, 'specs'), { recursive: true });
      fs.writeFileSync(path.join(change, 'specs', 'retry.md'), 'spec\n');
      fs.writeFileSync(path.join(change, 'design.md'), '# Design\n');
      fs.writeFileSync(path.join(change, 'tasks.md'), '- [ ] implement retry\n');
      r = run('continue');
      assert.equal(r.status, 0, r.out);

      // Every path `continue` tells an agent to read must exist from the project's point of view.
      const listed = [...r.out.matchAll(/^- (\S+?)\/? ?(?:\(|$)/gm)].map((match) => match[1]);
      const harnessFiles = listed.filter((entry) => /workflows|policies/.test(entry));
      assert.deepEqual(
        harnessFiles.map((entry) => path.basename(entry)),
        ['execute-change.md', 'bdd.md', 'tdd.md', 'spec-anchored.md'],
        `expected the workflow and the policy files in:\n${r.out}`,
      );
      for (const entry of harnessFiles) {
        assert.ok(fs.existsSync(path.resolve(project, entry)), `${entry} does not exist from ${project}`);
      }
    } finally {
      cleanupAll(project, install);
    }
  });
}

test('a broken TRUSS installation fails clearly and init leaves no half-created config behind', () => {
  const project = newProject();
  const install = path.join(project, '.truss');
  installTruss(install);
  fs.rmSync(path.join(install, '.truss', 'schema'), { recursive: true });
  const bin = fakeStatefulOpenSpec(project, { initialized: false });
  try {
    const r = runner(project, install, bin)('init');
    assert.equal(r.status, 2, r.out);
    assert.match(r.out, /installation is incomplete: config schema not found/);
    assert.equal(fs.existsSync(path.join(project, '.truss', 'config.yaml')), false, 'no config is left behind');
  } finally {
    cleanupAll(project);
  }
});

test('truss handoff points to the skills that help fill the note, and says nothing of those it does not have', () => {
  const project = newProject();
  const install = path.join(project, '.truss');
  installTruss(install);
  const bin = fakeStatefulOpenSpec(project, { initialized: false });
  const run = runner(project, install, bin);
  try {
    assert.equal(run('init').status, 0);
    assert.equal(run('new', 'Add retry policy').status, 0);
    const first = run('handoff');
    assert.equal(first.status, 0, first.out);
    const guide = first.out.match(/Next: fill in the sections\. What a good note contains: (\S+handoff\.SKILL\.md)/);
    const brief = first.out.match(
      /\n {6}To keep it short, ask your agent to use (\S+caveman\.SKILL\.md) \(optional\)\./,
    );
    assert.ok(guide && brief, first.out);
    for (const file of [guide[1], brief[1]]) assert.ok(fs.existsSync(path.resolve(project, file)), `${file} opens`);

    const again = run('handoff');
    assert.match(again.out, /already exists and was not changed/);
    assert.doesNotMatch(again.out, /Next:/, 'a note that exists already says what to do');

    fs.rmSync(path.join(project, '.truss', 'handoffs'), { recursive: true });
    fs.rmSync(path.join(install, '.truss', 'skills', 'caveman.SKILL.md'));
    const noBrief = run('handoff');
    assert.match(noBrief.out, /Next: fill in the sections/);
    assert.doesNotMatch(noBrief.out, /caveman/);

    fs.rmSync(path.join(project, '.truss', 'handoffs'), { recursive: true });
    fs.rmSync(path.join(install, '.truss', 'skills'), { recursive: true });
    const none = run('handoff');
    assert.equal(none.status, 0);
    assert.doesNotMatch(none.out, /Next:/);
  } finally {
    cleanupAll(project);
  }
});
