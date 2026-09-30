import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateOpenSpecCompatibility } from '../../lib/openspec.mjs';
const cli=v=>({installed:true,version:v,versionReadable:true});
test('OpenSpec missing is incompatible',()=>assert.equal(evaluateOpenSpecCompatibility({installed:false}).status,'missing'));
test('OpenSpec 0.x is too old',()=>assert.equal(evaluateOpenSpecCompatibility(cli('0.99.0')).status,'too_old'));
test('OpenSpec 1.x is compatible',()=>assert.equal(evaluateOpenSpecCompatibility(cli('1.13.2')).compatible,true));
test('OpenSpec prerelease is not guaranteed compatible',()=>assert.equal(evaluateOpenSpecCompatibility(cli('1.14.0-beta.1')).status,'unknown'));
test('OpenSpec 2.x is unsupported newer',()=>assert.equal(evaluateOpenSpecCompatibility(cli('2.0.0')).status,'unsupported_newer'));
test('Unreadable OpenSpec version is unknown',()=>assert.equal(evaluateOpenSpecCompatibility({installed:true,version:null,versionReadable:false}).status,'unknown'));
test('OpenSpec release candidates and build metadata are handled explicitly',()=>{
  assert.equal(evaluateOpenSpecCompatibility(cli('1.0.0-rc.1')).status,'unknown');
  assert.equal(evaluateOpenSpecCompatibility(cli('1.13.2+build.5')).compatible,true);
});
test('OpenSpec range boundaries: 1.0.0 is the minimum, 1.99.99 is the last supported',()=>{
  assert.equal(evaluateOpenSpecCompatibility(cli('1.0.0')).compatible,true);
  assert.equal(evaluateOpenSpecCompatibility(cli('1.99.99')).compatible,true);
  assert.equal(evaluateOpenSpecCompatibility(cli('0.99.99')).status,'too_old');
  assert.equal(evaluateOpenSpecCompatibility(cli('2.0.0-alpha.1')).status,'unknown');
});
test('OpenSpec version in an unsupported format is unknown, with the offending value in the reason',()=>{
  const r=evaluateOpenSpecCompatibility(cli('v1'));
  assert.equal(r.status,'unknown');
  assert.match(r.reason,/v1/);
});
test('OpenSpec compatibility reports the supported range',()=>{
  assert.equal(evaluateOpenSpecCompatibility(cli('1.13.2')).range,'>=1.0.0 <2.0.0');
});
