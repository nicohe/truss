import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { runVerification } from '../../lib/verification.mjs';
import { tempDir, cleanup } from './helpers.mjs';
test('verification passes sequential successful commands and writes evidence',()=>{const d=tempDir();try{const r=runVerification(d,[`${process.execPath} -e "process.exit(0)"`,`${process.execPath} -e "process.exit(0)"`],{stdio:'ignore'});assert.equal(r.ok,true);assert.equal(r.evidence.commands.length,2);assert.ok(fs.existsSync(path.join(d,r.evidencePath)));}finally{cleanup(d);}});
test('verification is fail-fast',()=>{const d=tempDir();try{const marker=path.join(d,'should-not-exist');const r=runVerification(d,[`${process.execPath} -e "process.exit(7)"`,`${process.execPath} -e "require('fs').writeFileSync('${marker.replaceAll('\\','\\\\')}','x')"`],{stdio:'ignore'});assert.equal(r.ok,false);assert.equal(r.failed.exitCode,7);assert.equal(r.evidence.commands.length,1);assert.equal(fs.existsSync(marker),false);}finally{cleanup(d);}});
test('verification with no commands fails safely',()=>{const d=tempDir();try{const r=runVerification(d,[],{stdio:'ignore'});assert.equal(r.ok,false);assert.equal(r.reason,'no_commands');assert.equal(r.evidence.status,'not_configured');}finally{cleanup(d);}});
