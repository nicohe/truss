import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { workspace, fakeOpenSpec, fakeGraphify, run, validConfig } from './helpers.mjs';

const plain=s=>s.replace(/\x1b\[[0-9;]*m/g,'');

test('config: valid workspace exits 0 and prints resolved config',()=>{
  const root=workspace({config:validConfig});
  const result=run(root,['config']);
  assert.equal(result.status,0,result.stderr||result.stdout);
  assert.match(result.stdout,/valid \.truss\/config\.yaml/);
  assert.match(result.stdout,/"mode": "anchored"/);
});

test('config: invalid workspace exits 2',()=>{
  const root=workspace({config:'version: 1\nunknown: true\n'});
  const result=run(root,['config']);
  assert.equal(result.status,2);
  assert.match(result.stdout,/invalid config/);
  assert.match(result.stdout,/unknown property/);
});

test('verify: successful configured command exits 0 and writes evidence',()=>{
  const root=workspace({config:validConfig});
  const result=run(root,['verify']);
  assert.equal(result.status,0,result.stderr||result.stdout);
  assert.match(result.stdout,/Verification passed/);
  const evidence=JSON.parse(fs.readFileSync(path.join(root,'.truss','verification','latest.json'),'utf8'));
  assert.equal(evidence.status,'passed');
  assert.equal(evidence.commands.length,1);
});

test('verify: failing command exits 1 and does not run later command',()=>{
  const config=validConfig.replace('    - node -e "process.exit(0)"','    - node -e "process.exit(7)"\n    - node -e "require(\'fs\').writeFileSync(\'should-not-exist\',\'x\')"');
  const root=workspace({config});
  const result=run(root,['verify']);
  assert.equal(result.status,1);
  assert.equal(fs.existsSync(path.join(root,'should-not-exist')),false);
  assert.match(result.stdout,/Remaining commands were not executed/);
});

test('doctor: healthy required setup exits 0 with optional Graphify fallback',()=>{
  const root=workspace({config:validConfig});
  const osBin=fakeOpenSpec(root);
  const result=run(root,['doctor'],{binDirs:[osBin]});
  assert.equal(result.status,0,result.stderr||result.stdout);
  assert.match(result.stdout,/TRUSS doctor passed/);
  assert.match(result.stdout,/Graphify/);
  assert.match(result.stdout,/optional/);
});

test('doctor: incompatible OpenSpec exits 1',()=>{
  const root=workspace({config:validConfig});
  const osBin=fakeOpenSpec(root,{version:'2.0.0'});
  const result=run(root,['doctor'],{binDirs:[osBin]});
  assert.equal(result.status,1);
  assert.match(result.stdout,/unsupported_newer|unsupported newer/);
});

test('doctor: required Graphify missing exits 1',()=>{
  const config=validConfig.replace('required: false','required: true');
  const root=workspace({config});
  const osBin=fakeOpenSpec(root);
  const result=run(root,['doctor'],{binDirs:[osBin]});
  assert.equal(result.status,1);
  assert.match(result.stdout,/missing \(required; blocks\)/);
});

test('doctor: required Graphify with fresh index exits 0',()=>{
  const config=validConfig.replace('required: false','required: true');
  const root=workspace({config});
  const osBin=fakeOpenSpec(root);
  const graphBin=fakeGraphify(root,{withIndex:true});
  const result=run(root,['doctor'],{binDirs:[osBin,graphBin]});
  assert.equal(result.status,0,result.stderr||result.stdout);
  assert.match(result.stdout,/ready v0\.1\.0/);
});

test('init: adopts existing config and OpenSpec without changing either',()=>{
  const root=workspace({config:validConfig});
  const osBin=fakeOpenSpec(root);
  const configBefore=fs.readFileSync(path.join(root,'.truss','config.yaml'),'utf8');
  const specBefore=fs.readFileSync(path.join(root,'openspec','config.yaml'),'utf8');
  const result=run(root,['init'],{binDirs:[osBin]});
  assert.equal(result.status,0,result.stderr||result.stdout);
  assert.match(result.stdout,/adopted/);
  assert.equal(fs.readFileSync(path.join(root,'.truss','config.yaml'),'utf8'),configBefore);
  assert.equal(fs.readFileSync(path.join(root,'openspec','config.yaml'),'utf8'),specBefore);
});

test('init: initializes missing OpenSpec once and second run is idempotent',()=>{
  const root=workspace({config:validConfig});
  const osBin=fakeOpenSpec(root,{initialized:false});
  const first=run(root,['init'],{binDirs:[osBin]});
  assert.equal(first.status,0,first.stderr||first.stdout);
  assert.match(plain(first.stdout),/initialized\s+with --tools none/);
  const configAfterFirst=fs.readFileSync(path.join(root,'.truss','config.yaml'),'utf8');
  const specAfterFirst=fs.readFileSync(path.join(root,'openspec','config.yaml'),'utf8');
  const second=run(root,['init'],{binDirs:[osBin]});
  assert.equal(second.status,0,second.stderr||second.stdout);
  assert.match(plain(second.stdout),/OpenSpec\s+.*adopted/);
  assert.equal(fs.readFileSync(path.join(root,'.truss','config.yaml'),'utf8'),configAfterFirst);
  assert.equal(fs.readFileSync(path.join(root,'openspec','config.yaml'),'utf8'),specAfterFirst);
});
