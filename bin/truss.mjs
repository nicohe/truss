#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ConfigError, formatConfigError, loadConfig } from '../lib/config.mjs';
import { detectOpenSpec, openSpecSummary, OPENSPEC_COMPATIBILITY } from '../lib/openspec.mjs';
import { detectGraphify, graphifySummary, updateGraphify } from '../lib/graphify.mjs';
import { ComponentError, componentSummary, resolveComponent, resolveComponents } from '../lib/components.mjs';
import { initializeProject } from '../lib/init.mjs';
import { runVerification } from '../lib/verification.mjs';
import { diagnoseProject } from '../lib/doctor.mjs';
import { LifecycleError, createChange, lifecycleStatus, nextLifecycleAction } from '../lib/lifecycle.mjs';

const cwd = process.cwd();
const args = process.argv.slice(2);
const cmd = args[0] || 'help';
const BLUE='\x1b[38;2;59;130;246m', PURPLE='\x1b[38;2;139;92;246m', GREEN='\x1b[38;2;16;185;129m', CYAN='\x1b[38;2;6;182;212m', RESET='\x1b[0m';
const mark = `${BLUE}△${RESET}`;
const p = (...x) => console.log(...x);
const exists = f => fs.existsSync(path.join(cwd,f));
const readConfig = ({ required = true } = {}) => loadConfig(cwd, { required })?.config ?? null;
const stateFile=path.join(cwd,'.truss','state.json');
const readState=()=>fs.existsSync(stateFile)?JSON.parse(fs.readFileSync(stateFile,'utf8')):{};
const writeState=s=>{fs.mkdirSync(path.dirname(stateFile),{recursive:true});fs.writeFileSync(stateFile,JSON.stringify(s,null,2)+'\n');};
const slugify=s=>s.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const option=name => { const i=args.indexOf(name); return i>=0 ? args[i+1] : undefined; };
const hasExe = name => spawnSync(process.platform==='win32'?'where':'which',[name],{stdio:'ignore'}).status===0;

function header(label='') { p(`${mark} ${PURPLE}TRUSS${RESET}${label?` · ${label}`:''}`); }
function help(){
  header('engineering harness');
  p(`\nUsage: truss <command>\n\n  init                         initialize .truss\n  new "Change name" [--component name]\n  status                       show active change\n  continue                     show next action\n  verify                       run configured verification\n  doctor                       check local setup
  config                       validate and show resolved config\n  openspec                     inspect OpenSpec CLI/project compatibility\n  graphify [status|update|bootstrap]\n                               inspect or refresh code graph\n  components [name]            resolve configured project components\n  handoff                      write a concise handoff\n  skills                       list portable TRUSS skills\n\nDocs: docs/en/getting-started.md`);
}
function init(){
  header('init');
  try {
    const result=initializeProject(cwd);
    const configMark=result.config.state==='created' ? GREEN+'● created'+RESET : GREEN+'● adopted'+RESET;
    p(`\nConfig          ${configMark} ${result.config.path}`);

    const os=result.openspec;
    if(os.state==='adopted') p(`OpenSpec       ${GREEN}● adopted${RESET} existing project`);
    else if(os.state==='created') p(`OpenSpec       ${GREEN}● initialized${RESET} with --tools none`);
    else if(os.state==='missing_cli') {
      p(`OpenSpec       \x1b[31m× CLI missing\x1b[0m`);
      p(`\nInstall a compatible OpenSpec CLI (${OPENSPEC_COMPATIBILITY.range}) and run truss init again.`);
      process.exitCode=1;
    } else if(os.state==='incompatible_cli') {
      p(`OpenSpec       \x1b[31m× incompatible\x1b[0m ${os.detected.cli.version||'unknown'} (${OPENSPEC_COMPATIBILITY.range} required)`);
      p(`\nTRUSS does not upgrade or downgrade OpenSpec automatically.`);
      process.exitCode=1;
    } else if(os.state==='partial_requires_attention') {
      p(`OpenSpec       \x1b[31m× ${os.detected.project.state.replaceAll('_',' ')}\x1b[0m`);
      p(`\nExisting openspec/ data was preserved. Resolve or migrate it explicitly, then run truss init again.`);
      process.exitCode=1;
    } else if(os.state==='init_failed' || os.state==='init_unverified') {
      p(`OpenSpec       \x1b[31m× initialization failed\x1b[0m`);
      if(os.init?.stderr) p(os.init.stderr);
      process.exitCode=1;
    }

    if(result.gitignore.state==='not_ignored') p(`Git ignore      ${CYAN}○ .truss/ is not ignored${RESET}`);
    else if(result.gitignore.state==='missing') p(`Git ignore      ${CYAN}○ no .gitignore detected${RESET}`);
    else p(`Git ignore      ${GREEN}● .truss/ ignored${RESET}`);

    if(!process.exitCode) p(`\n${GREEN}TRUSS initialization verified.${RESET}\nRun again safely at any time: truss init\nNext: truss doctor`);
  } catch(error) {
    const message=error instanceof ConfigError?formatConfigError(error):error.message;
    p(`\n\x1b[31m× initialization stopped\x1b[0m\n${message}\n\nExisting configuration and OpenSpec data were not overwritten.`);
    process.exitCode=2;
  }
}
function newChange(){
  const title=args[1]; if(!title){p('Usage: truss new "Change name" [--component name]');process.exitCode=2;return;}
  const component=option('--component');
  header('new');
  try {
    const result=createChange(cwd,readConfig(),title,component||null);
    p(`\n${GREEN}●${RESET} OpenSpec change created`);
    p(`Change          ${result.name}`);
    p(`Component       ${component||'workspace'}`);
    p(`OpenSpec        ${result.status.changeRootRelative}`);
    p(`Planning        ${result.status.completedArtifacts}/${result.status.artifacts.length} artifacts complete`);
    p(`\nNext: truss continue`);
  } catch(error) {
    p(`\n\x1b[31m× ${error.message}\x1b[0m`);
    process.exitCode=error instanceof LifecycleError?error.exitCode:1;
  }
}
function status(){
  header('status');
  try {
    const current=lifecycleStatus(cwd,readConfig());
    if(!current.active){p('\nNo active change.\nNext: truss new "Change name"');return;}
    const {state,status}=current;
    p(`\nChange          ${state.change}`);
    p(`Component       ${state.component||'workspace'}`);
    p(`Phase           ${state.phase}`);
    p(`OpenSpec        ${status.changeRootRelative}`);
    p(`Planning        ${status.completedArtifacts}/${status.artifacts.length} artifacts complete`);
    for(const artifact of status.artifacts){
      const st=String(artifact.status||'unknown').toLowerCase();
      const icon=['done','complete','completed'].includes(st)?GREEN+'●'+RESET:st==='ready'?CYAN+'◐'+RESET:'○';
      p(`  ${icon} ${(artifact.id||artifact.name||artifact.outputPath||'artifact').padEnd(18)} ${st}`);
    }
    if(status.applyRequires?.length) p(`Tasks required   ${status.applyRequires.join(', ')}`);
    p(`\nNext: truss continue`);
  } catch(error) {
    p(`\n\x1b[31m× ${error.message}\x1b[0m`);
    process.exitCode=error instanceof LifecycleError?error.exitCode:1;
  }
}
function cont(){
  header('continue');
  try {
    const next=nextLifecycleAction(cwd,readConfig());
    if(!next.active){p(`\n${next.instruction}`);return;}
    p(`\nChange          ${next.state.change}`);
    p(`Phase           ${next.state.phase}`);
    p(`OpenSpec        ${next.status.changeRootRelative}`);
    p(`Mode            agent-driven (TRUSS v0.1)`);
    p(`\nNext action\n${next.instruction}`);
    if(next.kind==='implementation') {
      p(`\nContext to load\n- AGENTS.md (effective component/workspace guidance)\n- ${next.status.changeRootRelative}\n- .truss/workflows/execute-change.md\n- configured BDD/TDD/spec policies`);
    }
  } catch(error) {
    p(`\n\x1b[31m× ${error.message}\x1b[0m`);
    process.exitCode=error instanceof LifecycleError?error.exitCode:1;
  }
}
function verify(){
  let c;
  try { c=readConfig(); }
  catch (error) {
    header('verification');
    p(`\n\x1b[31m× invalid config\x1b[0m\n${formatConfigError(error)}`);
    process.exitCode=2;
    return;
  }

  header('verification');
  const cmds=c?.verification?.commands||[];
  if(!cmds.length){
    p(`\n\x1b[31m× no verification commands configured\x1b[0m\nConfigure verification.commands in .truss/config.yaml.`);
    const result=runVerification(cwd,[]);
    p(`Evidence        ${result.evidencePath}`);
    process.exitCode=1;
    return;
  }

  p(`\nCommands        ${cmds.length}\nMode            sequential / fail-fast`);
  let result;
  // The runner owns execution order and evidence. Progress is printed here before execution.
  // Commands themselves inherit stdio, so their output remains visible to the caller.
  for(let i=0;i<cmds.length;i+=1) p(`${CYAN}${i+1}.${RESET} ${cmds[i]}`);
  p('');
  result=runVerification(cwd,cmds);

  for(const item of result.evidence.commands){
    const mark=item.status==='passed'?`${GREEN}● passed${RESET}`:'\x1b[31m× failed\x1b[0m';
    const exit=item.exitCode===null?'n/a':item.exitCode;
    p(`${mark}  [${item.index}/${cmds.length}] ${item.command} (exit ${exit}, ${item.durationMs}ms)`);
  }
  p(`Evidence        ${result.evidencePath}`);

  if(!result.ok){
    p(`\n\x1b[31mVerification failed. Remaining commands were not executed.\x1b[0m`);
    process.exitCode=1;
    return;
  }
  p(`\n${GREEN}Verification passed.${RESET}`);
}
function config(){
  header('config');
  try {
    const loaded=loadConfig(cwd);
    p(`
${GREEN}●${RESET} valid .truss/config.yaml
`);
    p(JSON.stringify(loaded.config,null,2));
  } catch (error) {
    const message=error instanceof ConfigError?formatConfigError(error):error.message;
    p(`
\x1b[31m× invalid config\x1b[0m
${message}`);
    process.exitCode=2;
  }
}

function openspec(){
  header('OpenSpec');
  const result=detectOpenSpec(cwd);
  p(`\nCLI             ${result.cli.installed ? GREEN+'● installed'+RESET : '\x1b[31m× not installed\x1b[0m'}`);
  if(result.cli.path) p(`Path            ${result.cli.path}`);
  if(result.cli.installed) p(`Version         ${result.cli.version || 'unknown'}`);
  const compat=result.compatibility;
  const compatMark=compat.compatible ? GREEN+'●' : '\x1b[31m×';
  p(`Compatibility   ${compatMark}${RESET} ${compat.status} (${compat.range})`);
  if(!compat.compatible) p(`Reason          ${compat.reason}`);
  p(`Project         ${result.project.initialized ? GREEN+'● initialized'+RESET : CYAN+'○ '+result.project.state.replaceAll('_',' ')+RESET}`);
  p(`Directory       ${result.project.directory}`);
  if(result.project.configPath) p(`Config          ${result.project.configPath}`);
  p(`Specs dir       ${result.project.specsDir ? 'present' : 'absent'}`);
  p(`Changes dir     ${result.project.changesDir ? 'present' : 'absent'}`);
  if(!result.cli.installed || !result.compatibility.compatible || !result.project.initialized) process.exitCode=1;
}

function graphify(){
  header('Graphify');
  let c;
  try { c=readConfig(); } catch(error) { p(`\n\x1b[31m× invalid config\x1b[0m\n${formatConfigError(error)}`); process.exitCode=2; return; }
  const cfg=c.integrations.graphify;
  const action=args[1]||'status';
  if(action==='update' || action==='bootstrap') {
    if(!cfg.enabled){p(`\n${CYAN}○${RESET} Graphify is disabled in config.`);return;}
    const result=updateGraphify(cwd,{bootstrap:action==='bootstrap'});
    if(!result.ok){p(`\n\x1b[31m× Graphify update failed\x1b[0m\n${result.reason}`);process.exitCode=cfg.required?1:0;return;}
    p(`\n${GREEN}●${RESET} graph updated\nCommand         ${result.command}\nStatus          ${graphifySummary(result.state)}`); return;
  }
  if(action!=='status'){p('Usage: truss graphify [status|update|bootstrap]');process.exitCode=2;return;}
  const s=detectGraphify(cwd,cfg);
  p(`\nConfigured      ${cfg.enabled?'enabled':'disabled'}${cfg.required?' / required':' / optional'}`);
  p(`Status          ${s.ready?GREEN+'●':s.blocking?'\x1b[31m×':CYAN+'○'}${RESET} ${graphifySummary(s)}`);
  if(s.cli?.path) p(`CLI             ${s.cli.path}${s.cli.version?` (${s.cli.version})`:''}`);
  if(s.index?.path) p(`Index           ${s.index.path}`);
  if(s.index?.exists) p(`Freshness       ${s.index.freshness}`);
  if(s.fallback) p(`Fallback        native search / grep / LSP`);
  if(s.blocking) process.exitCode=1;
}

function doctor(){
  header('doctor');
  const result=diagnoseProject(cwd);
  const sectionOrder=['Core','Project','OpenSpec','Capabilities','Verification'];
  const icon=status=>status==='pass'?GREEN+'●'+RESET:status==='warn'?CYAN+'○'+RESET:status==='skip'?CYAN+'○'+RESET:'\x1b[31m×\x1b[0m';
  p('');
  for(const section of sectionOrder){
    const items=result.checks.filter(check=>check.section===section);
    if(!items.length) continue;
    p(`${section}`);
    for(const check of items) p(`  ${icon(check.status)} ${check.name.padEnd(22)} ${check.detail}`);
    p('');
  }
  if(result.healthy) p(`${GREEN}TRUSS doctor passed.${RESET}${result.warnings?` ${result.warnings} optional warning(s).`:''}`);
  else p(`\x1b[31mTRUSS doctor found required setup problems.\x1b[0m`);
  process.exitCode=result.exitCode;
}
function components(){
  header('components');
  let c;
  try { c=readConfig(); } catch(error) { p(`\n\x1b[31m× invalid config\x1b[0m\n${formatConfigError(error)}`); process.exitCode=2; return; }
  try {
    const requested=args[1];
    const list=requested ? [resolveComponent(cwd,c,requested)] : resolveComponents(cwd,c);
    p('');
    for(const item of list){
      p(`${GREEN}●${RESET} ${item.name.padEnd(16)} ${componentSummary(item)}`);
      p(`  AGENTS          ${item.agents.effective ? path.relative(cwd,item.agents.effective) : 'not detected'}`);
      p(`  OpenSpec        ${item.openspec.relative} (${item.openspec.scope})`);
      p(`  Source          ${item.sourceDirs.length ? item.sourceDirs.join(', ') : 'not detected'}`);
      p(`  Tests           ${item.testDirs.length ? item.testDirs.join(', ') : 'not detected'}`);
    }
  } catch(error) {
    p(`\n\x1b[31m× ${error.message}\x1b[0m`); process.exitCode=2;
  }
}

function skills(){
  header('skills');
  const dir=path.join(cwd,'.truss','skills');
  if(!fs.existsSync(dir)){p('\nNo TRUSS skills installed.');return;}
  const files=fs.readdirSync(dir).filter(f=>f.endsWith('.SKILL.md')).sort();
  p(''); for(const f of files)p(`${GREEN}●${RESET} ${f.replace('.SKILL.md','')}`);
  p('\nDocs: docs/en/skills/overview.md');
}
function handoff(){
  const s=readState(); if(!s.change){p('No active change.');return;}
  const dir=path.join(cwd,'.truss','handoffs');fs.mkdirSync(dir,{recursive:true}); const f=path.join(dir,`${s.change}.md`);
  fs.writeFileSync(f,`# Handoff: ${s.change}\n\n- Component: ${s.component||'workspace'}\n- Phase: ${s.phase}\n- OpenSpec: ${s.path}\n- Branch: ${spawnSync('git',['branch','--show-current'],{encoding:'utf8'}).stdout?.trim()||'unknown'}\n\n## Completed\n\n## Discoveries\n\n## Verification\n\n## Blockers\n\n## Next action\n\n`);
  header('handoff');p(`\n${GREEN}●${RESET} ${path.relative(cwd,f)}`);
}
({help,init,new:newChange,status,continue:cont,verify,doctor,openspec,config,graphify,components,handoff,skills}[cmd]||help)();
