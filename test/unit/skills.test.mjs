import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { trussRoot } from '../integration/helpers.mjs';

const skill = (name) => fs.readFileSync(path.join(trussRoot, '.truss', 'skills', `${name}.SKILL.md`), 'utf8');

test('the pr skill keeps its three sections, the table of forms and the rule about how to start', () => {
  const text = skill('pr');
  for (const section of ['**Summary.**', '**Evidence.**', '**Merge risk.**'])
    assert.ok(text.includes(section), `${section} is part of the output contract`);
  for (const form of [
    'pseudocode',
    'call tree',
    'Mermaid diagram',
    'before and after table',
    'file tree',
    'smallest fragment of the diff',
  ])
    assert.ok(text.includes(form), `the table names the form "${form}"`);
  assert.match(text, /Start the Summary with the change itself/);
  assert.match(text, /one form, two at most/i);
});

test('every skill file has a purpose and says when to use it or what it takes', () => {
  const dir = path.join(trussRoot, '.truss', 'skills');
  for (const file of fs.readdirSync(dir).filter((name) => name.endsWith('.SKILL.md'))) {
    const text = fs.readFileSync(path.join(dir, file), 'utf8');
    assert.match(text, /^# Skill: /m, `${file} has a title`);
    assert.match(text, /^## Purpose$/m, `${file} has a purpose`);
  }
});

test('the credits in THIRD_PARTY.md name each source and its license', () => {
  const text = fs.readFileSync(path.join(trussRoot, 'THIRD_PARTY.md'), 'utf8');
  assert.match(text, /## Ideas that came from elsewhere/);
  for (const source of ['mattpocock/skills', 'Matt Pocock', 'Dex Horthy', 'intent-driven-template'])
    assert.ok(text.includes(source), `${source} is credited`);
  assert.match(text, /nothing was copied/i);
});
