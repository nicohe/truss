import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveComponent, resolveComponents } from '../../lib/components.mjs';
import { tempDir, cleanup, write, mkdir } from './helpers.mjs';
test('workspace resolution detects source and tests',()=>{const d=tempDir();try{mkdir(d,'src');mkdir(d,'tests');write(d,'AGENTS.md','# x');const c=resolveComponent(d,{components:{}},null);assert.equal(c.name,'workspace');assert.deepEqual(c.sourceDirs,['src']);assert.deepEqual(c.testDirs,['tests']);assert.ok(c.agents.effective);}finally{cleanup(d);}});
test('component uses local AGENTS and workspace OpenSpec fallback',()=>{const d=tempDir();try{mkdir(d,'apps/api/src');write(d,'apps/api/AGENTS.md','# api');mkdir(d,'openspec');const c=resolveComponent(d,{components:{api:{path:'./apps/api'}}},'api');assert.equal(c.agents.local.endsWith('apps/api/AGENTS.md'),true);assert.equal(c.openspec.scope,'workspace');}finally{cleanup(d);}});
test('unknown component fails',()=>{const d=tempDir();try{assert.throws(()=>resolveComponent(d,{components:{}},'api'),/Unknown component/);}finally{cleanup(d);}});
test('component path cannot escape project root',()=>{const d=tempDir();try{assert.throws(()=>resolveComponent(d,{components:{bad:{path:'../outside'}}},'bad'),/escapes/);}finally{cleanup(d);}});
test('duplicate component real paths fail',()=>{const d=tempDir();try{mkdir(d,'apps/api');assert.throws(()=>resolveComponents(d,{components:{a:{path:'apps/api'},b:{path:'apps/api'}}}),/same path/);}finally{cleanup(d);}});
