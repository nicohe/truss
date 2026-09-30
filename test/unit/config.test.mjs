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

// Malformed YAML. The parser advertises a deliberately small subset, so anything outside it must
// be rejected rather than silently turned into a string or a mis-nested mapping.
const rejects=(name,text,pattern=/./)=>test(`parseConfigYaml rejects ${name}`,()=>assert.throws(()=>parseConfigYaml(text),e=>e instanceof ConfigError&&pattern.test(e.message)));
rejects('odd indentation','version: 1\nspec:\n   mode: x\n',/multiples of 2/);
rejects('a line without a colon','version 1\n',/key: value/);
rejects('a list item without a list key','- a\n',/List item/);
rejects('an empty key',': 1\n',/key: value/);
rejects('block scalars','a: |\n  text\n',/Unsupported/);
rejects('anchors','a: &x 1\n',/anchors|Unsupported/i);
rejects('aliases','a: 1\nb: *a\n',/aliases|Unsupported/i);
rejects('tags','a: !!str 1\n',/Unsupported/);
rejects('flow sequences with values','a: [1, 2]\n',/Unsupported|flow/i);
rejects('flow mappings with values','a: {b: 1}\n',/Unsupported|flow/i);
rejects('lists of objects','a:\n  - b: 1\n',/scalar/i);
rejects('an unterminated double quote','a: "abc\n',/quote/i);
rejects('an unterminated single quote',"a: 'abc\n",/quote/i);
rejects('a nested key under a scalar value','a: 1\n  b: 2\n',/indent/i);
rejects('a nested item under a scalar list item','a:\n  - x\n    - y\n',/indent/i);
test('parseConfigYaml accepts empty input, comments and CRLF',()=>{
  assert.deepEqual(parseConfigYaml(''),{});
  assert.deepEqual(parseConfigYaml('# only a comment\n\n'),{});
  assert.deepEqual(parseConfigYaml('version: 1\r\nspec:\r\n  mode: anchored\r\n'),{version:1,spec:{mode:'anchored'}});
});
test('parseConfigYaml keeps # inside quotes and URLs, and strips trailing comments',()=>{
  assert.deepEqual(parseConfigYaml('a: "x # y"\nb: http://x.y/z # note\n'),{a:'x # y',b:'http://x.y/z'});
});
test('parseConfigYaml still accepts quoted flow-looking and shell-special commands',()=>{
  const c=parseConfigYaml('verification:\n  commands:\n    - "[ -d dist ] || npm run build"\n    - \'echo *.js\'\n    - npm run lint -- --max-warnings=0\n');
  assert.deepEqual(c.verification.commands,['[ -d dist ] || npm run build','echo *.js','npm run lint -- --max-warnings=0']);
});
test('loadConfig reports a missing schema and unparseable YAML as ConfigError',()=>{
  const d=tempDir();
  try{
    write(d,'.truss/config.yaml','version: 1\n');
    assert.throws(()=>loadConfig(d),/schema not found/);
    write(d,'.truss/schema/config.schema.json','{not json');
    assert.throws(()=>loadConfig(d),/Could not parse config schema/);
    fs.copyFileSync(new URL('../../.truss/schema/config.schema.json',import.meta.url),path.join(d,'.truss/schema/config.schema.json'));
    write(d,'.truss/config.yaml','version 1\n');
    assert.throws(()=>loadConfig(d),ConfigError);
    assert.equal(loadConfig(tempDir(),{required:false}),null);
  }finally{cleanup(d);}
});
