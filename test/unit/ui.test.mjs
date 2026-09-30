import test from 'node:test';
import assert from 'node:assert/strict';
import { colorEnabled, createUi } from '../../lib/ui.mjs';
import { ESC } from '../integration/helpers.mjs';

const tty = { isTTY: true };
const pipe = { isTTY: false };

test('color is off when output is not a TTY',()=>{assert.equal(colorEnabled({env:{},stream:pipe}),false);});
test('color is on for an interactive TTY',()=>{assert.equal(colorEnabled({env:{TERM:'xterm-256color'},stream:tty}),true);});
test('color is off for TERM=dumb',()=>{assert.equal(colorEnabled({env:{TERM:'dumb'},stream:tty}),false);});
test('NO_COLOR wins over TTY and FORCE_COLOR',()=>{assert.equal(colorEnabled({env:{NO_COLOR:'1',FORCE_COLOR:'1'},stream:tty}),false);});
test('FORCE_COLOR enables color without a TTY, but 0 does not',()=>{assert.equal(colorEnabled({env:{FORCE_COLOR:'1'},stream:pipe}),true);assert.equal(colorEnabled({env:{FORCE_COLOR:'0'},stream:pipe}),false);});
test('painters emit ANSI only when enabled',()=>{
  assert.equal(createUi({env:{},stream:pipe}).c.green('ok'),'ok');
  const on=createUi({env:{FORCE_COLOR:'1'},stream:pipe}).c.green('ok');
  assert.match(on,new RegExp(`^${ESC}\\[[0-9;]+mok${ESC}\\[0m$`));
});
