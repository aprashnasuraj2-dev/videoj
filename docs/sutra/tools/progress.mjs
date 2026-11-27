#!/usr/bin/env node
// Read-only SUTRA tracker audit. No network, third-party packages, writes or product-test claims.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const dir = path.join(root, 'docs/sutra');
const arguments_ = process.argv.slice(2);
const command = arguments_.find(x => !x.startsWith('--')) ?? 'status';
const asJson = arguments_.includes('--json');
const allowed = ['check', 'status', 'next', 'phase'];
if (!allowed.includes(command)) {
  console.error('Usage: node docs/sutra/tools/progress.mjs [check|status|next|phase NNN] [--json]');
  process.exit(2);
}
const errors = [];
const read = name => fs.readFileSync(path.join(dir, name), 'utf8');
let state;
try { state = JSON.parse(read('progress.json')); }
catch (error) { console.error(`Cannot read SUTRA handoff: ${error.message}`); process.exit(1); }
const checklistDir = path.join(dir, 'checklists');
let files;
try { files = fs.readdirSync(checklistDir).filter(x => x.endsWith('.md')).sort(); }
catch (error) { console.error(`Cannot read SUTRA checklists: ${error.message}`); process.exit(1); }
const statuses = { ' ': 'pending', '~': 'active', '!': 'blocked', x: 'verified', '-': 'omitted' };
const tasks = new Map();
for (const file of files) {
  const lines = fs.readFileSync(path.join(checklistDir, file), 'utf8').split(/\r?\n/);
  for (const [index, line] of lines.entries()) {
    if (!/^- \[/.test(line)) continue;
    const match = line.match(/^- \[([ x~!\-])\] `(SUTRA-(P\d{3}|X\d{3})-\d{2})` (.+)$/);
    if (!match) { errors.push(`${file}:${index + 1}: malformed checklist item`); continue; }
    const [, marker, id, group, title] = match;
    if (tasks.has(id)) errors.push(`Duplicate task ID: ${id}`);
    tasks.set(id, { id, phase: group, state: statuses[marker], title, file: `docs/sutra/checklists/${file}`, line: index + 1 });
  }
}
const retired = state.retirement?.retired_by_user_direction === true && state.retirement?.active_execution_queue === false;
if (retired && (state.retirement.removed_pending_tasks !== 379 || state.retirement.active_checklist !== 'docs/sutra-v2/CHECKLIST.md' || state.current_task !== null || state.next_task !== null || !Array.isArray(state.ready_engineering_queue) || state.ready_engineering_queue.length || tasks.size !== 721 || [...tasks.values()].some(t=>t.state==='pending'||t.state==='active'))) errors.push('Invalid V1 retirement or historical retention');
const expected = new Set();
for (let phase = 1; phase <= 100; phase++) for (let item = 1; item <= 10; item++) {
  const id = `SUTRA-P${String(phase).padStart(3, '0')}-${String(item).padStart(2, '0')}`;
  expected.add(id);
  if (!retired && !tasks.has(id)) errors.push(`Missing original task: ${id}`);
}
for (const task of tasks.values()) if (task.phase.startsWith('P') && !expected.has(task.id)) errors.push(`Unexpected original task: ${task.id}; append discoveries using Xnnn IDs`);
if (state.schema_version !== 1 || state.project !== 'SUTRA') errors.push('Unsupported handoff schema/project');
const validTime = value => typeof value === 'string' && /T.*(?:Z|[+-]\d\d:\d\d)$/.test(value) && Number.isFinite(Date.parse(value));
const validSha = value => typeof value === 'string' && /^[a-f0-9]{40}$/i.test(value);
if (!validTime(state.updated_at)) errors.push('updated_at needs an actual timestamp with offset');
if (!validSha(state.last_observed_code_sha)) errors.push('last_observed_code_sha needs an immutable 40-character SHA');
if (typeof state.work_branch !== 'string' || !state.work_branch) errors.push('Missing work_branch');
if (!state.last_session_id || !read('SESSIONS.md').includes(state.last_session_id)) errors.push('last_session_id not found in SESSIONS.md');
const active = [...tasks.values()].filter(t => t.state === 'active');
if (active.length > 1) errors.push('Multiple active tasks; this workflow uses one active cursor');
if ((active[0]?.id ?? null) !== (state.current_task ?? null)) errors.push('current_task does not match the active checkbox');
const queue = [state.next_task, ...(state.ready_engineering_queue ?? [])].filter(Boolean);
for (const id of queue) {
  const task = tasks.get(id);
  if (!task) errors.push(`Unknown next/queue task: ${id}`);
  else if (['verified', 'omitted'].includes(task.state)) errors.push(`Resume queue contains closed task: ${id}`);
}
if (typeof state.next_action !== 'string' || !state.next_action.trim()) errors.push('Missing concrete next_action');
const records = state.task_records ?? {};
if (Array.isArray(records) || typeof records !== 'object' || records === null) errors.push('task_records must be an object');
const blockers = new Map();
for (const blocker of state.blockers ?? []) {
  if (!blocker.id || blockers.has(blocker.id)) errors.push('Missing or duplicate blocker ID');
  blockers.set(blocker.id, blocker);
  for (const key of ['reason', 'unblock_condition', 'independent_work']) if (!blocker[key]) errors.push(`${blocker.id}: missing ${key}`);
  for (const id of blocker.task_ids ?? []) if (!tasks.has(id)) errors.push(`${blocker.id}: unknown task ${id}`);
}
const decisions = read('DECISIONS.md');
function artifactExists(artifact) {
  if (typeof artifact !== 'string' || !artifact.trim()) return false;
  if (/^https:\/\/[^\s]+$/.test(artifact)) return true; // Existence/truth of external evidence still needs observation.
  const absolute = path.resolve(root, artifact.split('#')[0]);
  return absolute.startsWith(`${root}${path.sep}`) && fs.existsSync(absolute) && fs.statSync(absolute).isFile();
}
// These are non-optional minimum boundary checks, not an exhaustive machine interpretation of the specification.
const mandatory = new Set(['SUTRA-P021-03','SUTRA-P023-02','SUTRA-P024-01','SUTRA-P025-03','SUTRA-P025-08','SUTRA-P028-01','SUTRA-P033-01','SUTRA-P033-04','SUTRA-P035-01','SUTRA-P036-02','SUTRA-P052-06','SUTRA-P062-04','SUTRA-P082-04','SUTRA-P094-01','SUTRA-P095-01','SUTRA-P095-06','SUTRA-P100-08']);
for (const task of tasks.values()) {
  const record = records[task.id];
  if (task.state !== 'pending' && !record) { errors.push(`${task.id}: no task record for ${task.state}`); continue; }
  if (!record) continue;
  if (record.state !== task.state) errors.push(`${task.id}: checkbox and record state disagree`);
  if (task.state === 'verified') {
    if (!validTime(record.verified_at)) errors.push(`${task.id}: missing verified_at`);
    if (!Array.isArray(record.evidence) || record.evidence.length === 0) errors.push(`${task.id}: no verification evidence`);
    for (const evidence of record.evidence ?? []) {
      if (!artifactExists(evidence.artifact)) errors.push(`${task.id}: missing/invalid evidence artifact`);
      if (!evidence.description || evidence.result !== 'pass' || !validSha(evidence.source_revision) || !validTime(evidence.observed_at)) errors.push(`${task.id}: incomplete passing evidence record`);
    }
  }
  if (task.state === 'active' && !record.next_action) errors.push(`${task.id}: active task needs next_action`);
  if (task.state === 'blocked') {
    const blocker = blockers.get(record.blocker_id);
    if (!blocker || !(blocker.task_ids ?? []).includes(task.id)) errors.push(`${task.id}: missing matching blocker/task association`);
    if (!record.next_action) errors.push(`${task.id}: blocked task needs next_action/unblock step`);
  }
  if (task.state === 'omitted') {
    if (mandatory.has(task.id)) errors.push(`${task.id}: mandatory gate cannot be omitted`);
    if (!record.reason || !record.scope_basis || !record.decision_id || !decisions.includes(record.decision_id)) errors.push(`${task.id}: omission lacks reason, scope basis or recorded decision`);
  }
}
for (const id of Object.keys(records)) if (!tasks.has(id)) errors.push(`Record for unknown task: ${id}`);
const phases = [];
for (let i = 1; i <= 100; i++) {
  const phase = `P${String(i).padStart(3, '0')}`;
  const members = [...tasks.values()].filter(t => t.phase === phase);
  const counts = Object.fromEntries(Object.values(statuses).map(s => [s, members.filter(t => t.state === s).length]));
  const closed = members.length === 10 && members.every(t => ['verified','omitted'].includes(t.state));
  const exit = tasks.get(`SUTRA-${phase}-10`);
  if (!retired && exit?.state === 'verified' && !closed) errors.push(`${phase}: exit checked before all applicable phase items close`);
  phases.push({ phase, ...counts, completion: retired ? 'historical_only' : closed ? (counts.omitted ? 'complete_with_omissions' : 'verified_complete') : 'incomplete' });
}
if (!['not_started','building','delivered'].includes(state.submission?.package_state)) errors.push('Invalid package_state');
if (!['not_started','draft','submitted'].includes(state.submission?.devpost_state)) errors.push('Invalid devpost_state');
if (state.submission?.package_state === 'delivered' && !artifactExists(state.submission.package_artifact)) errors.push('Delivered package needs an actual artifact/link');
if (state.submission?.devpost_state === 'submitted' && !(state.submission.confirmation_evidence?.length)) errors.push('Submitted state needs actual confirmation evidence');
// Check relative Markdown links in tracker documents. Ignore code blocks (which contain templates).
const markdownFiles = [
 ...fs.readdirSync(dir).filter(f => f.endsWith('.md')).map(f => path.join(dir,f)),
 ...files.map(f => path.join(checklistDir,f)), path.join(dir,'evidence/README.md')
];
for (const file of markdownFiles) {
  const markdown = fs.readFileSync(file,'utf8').replace(/```[\s\S]*?```/g,'');
  for (const match of markdown.matchAll(/(?<!!)\[[^\]\n]+\]\(([^)\s]+)\)/g)) {
    const link = match[1];
    if (/^(?:https?:|mailto:|#)/.test(link)) continue;
    if (!fs.existsSync(path.resolve(path.dirname(file),link.split('#')[0]))) errors.push(`Broken internal link: ${path.relative(root,file)} -> ${link}`);
  }
}
const allTasks = [...tasks.values()];
const counts = Object.fromEntries(Object.values(statuses).map(s => [s,allTasks.filter(t => t.state === s).length]));
const report = { project:'SUTRA', total_tasks:tasks.size, original_phases:100, ...counts, verified_phases:phases.filter(p => p.completion === 'verified_complete').length, phases_with_omissions:phases.filter(p => p.completion === 'complete_with_omissions').length, current_task:state.current_task, next_task:state.next_task, ready_engineering_queue:state.ready_engineering_queue, next_action:state.next_action, blockers:state.blockers, last_observed_code_sha:state.last_observed_code_sha, errors };
if (command === 'phase') {
  const index = arguments_.indexOf('phase');
  const phase = `P${String(arguments_[index+1] ?? '').padStart(3,'0')}`;
  const selected = allTasks.filter(t => t.phase === phase);
  if (!selected.length) { console.error('phase requires a number from 001 through 100'); process.exit(2); }
  if (asJson) console.log(JSON.stringify({ ...report, phase, tasks:selected },null,2));
  else for (const task of selected) console.log(`${task.id} [${task.state}] ${task.title}\n  ${task.file}:${task.line}`);
} else if (asJson) console.log(JSON.stringify(report,null,2));
else if (command === 'next' && retired) {
  console.log('V1 retired. Use docs/sutra-v2/CHECKLIST.md and docs/sutra-v2/CONTINUE.md; no V1 task may be resumed.');
} else if (command === 'next') {
  console.log(`Current: ${state.current_task ?? 'none'}\nNext original task: ${state.next_task ?? 'none'}\nIndependent engineering queue: ${(state.ready_engineering_queue ?? []).join(', ') || 'none'}\nAction: ${state.next_action}\nVerify dependencies and current source before execution.`);
} else {
  console.log(`SUTRA: ${tasks.size} tasks; ${counts.verified} verified, ${counts.active} active, ${counts.blocked} blocked, ${counts.omitted} omitted, ${counts.pending} pending.`);
  console.log(`Phases: ${report.verified_phases}/100 fully verified; ${report.phases_with_omissions} complete with omissions.`);
  console.log(`Source inspected: ${state.last_observed_code_sha}\nNext: ${state.next_task ?? 'none'}`);
  console.log(errors.length ? `Register audit FAILED (${errors.length} issue(s)).` : 'Register audit passed. This does not verify product behavior or external facts.');
}
for (const error of errors) console.error(`- ${error}`);
process.exitCode = errors.length ? 1 : 0;
