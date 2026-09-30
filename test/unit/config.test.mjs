import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parseConfigYaml, validateConfig, loadConfig, ConfigError } from '../../lib/config.mjs';
import { tempDir, cleanup, write } from './helpers.mjs';
const schema=JSON.parse(fs.readFileSync(new URL('../../.truss/schema/config.schema.json', import.meta.url),'utf8'));

test('parseConfigYaml parses nested mappings and scalar lists',()=>{
 const c=parseConfigYaml('version: 1\nspec:\n  mode: anchored\nverification:\n  commands:\n    - npm test\ncomponents: {}\n');
 assert.equal(c.spec.mode,'anchored'); assert.deepEqual(c.verification.commands,['npm test']); assert.deepEqual(c.components,{});
});
test('parseConfigYaml rejects tabs',()=>assert.throws(()=>parseConfigYaml('version:\t1'),ConfigError));
test('parseConfigYaml rejects duplicate keys',()=>assert.throws(()=>parseConfigYaml('version: 1\nversion: 1\n'),/Duplicate key/));
test('validateConfig rejects unknown properties',()=>assert.throws(()=>validateConfig({version:1,wat:true},schema),/Invalid TRUSS/));
test('validateConfig rejects invalid spec mode',()=>assert.throws(()=>validateConfig({version:1,spec:{mode:'loose'}},schema),/Invalid TRUSS/));
test('validateConfig rejects required Graphify when disabled',()=>assert.throws(()=>validateConfig({version:1,integrations:{graphify:{enabled:false,required:true}}},schema),/Invalid TRUSS/));
test('loadConfig applies defaults',()=>{ const d=tempDir(); try { write(d,'.truss/config.yaml','version: 1\n'); write(d,'.truss/schema/config.schema.json',JSON.stringify(schema)); const x=loadConfig(d); assert.equal(x.config.spec.mode,'anchored'); assert.equal(x.config.development.tdd,true); assert.equal(x.config.verification.commands.length,4); } finally {cleanup(d);} });
test('loadConfig rejects missing schema',()=>{ const d=tempDir(); try {write(d,'.truss/config.yaml','version: 1\n'); assert.throws(()=>loadConfig(d),/schema not found/);} finally {cleanup(d);} });
