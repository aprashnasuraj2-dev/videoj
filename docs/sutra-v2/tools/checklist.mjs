import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export function auditChecklist(checklist, progress, roadmap, legacy) {
  const errors=[], tasks=new Map();
  const states={' ':'remainingTasks','~':'activeTasks','x':'completedSinceReset','!':'externalBlockers'};
  const counts={remainingTasks:0,activeTasks:0,completedSinceReset:0,externalBlockers:0};
  for(const line of checklist.split(/\r?\n/)){
    if(!line.startsWith('- [')) continue;
    const m=line.match(/^- \[([ ~x!])\] `(V2-[A-Z0-9]+(?:-[A-Z0-9]+)*[a-z]?)` (.+)$/);
    if(!m){errors.push('Malformed active checklist item: '+line);continue;}
    const [,marker,id]=m;
    if(tasks.has(id))errors.push('Duplicate task: '+id);
    tasks.set(id,marker);counts[states[marker]]++;
  }
  const active=progress.activeChecklist??{};
  const ids=[...tasks].filter(([,m])=>m==='~').map(([id])=>id);
  for(const [key,n] of Object.entries(counts))if(active[key]!==n)errors.push('Count mismatch: '+key);
  if(active.remainingIncludingActive!==counts.remainingTasks+counts.activeTasks)errors.push('Remaining total mismatch');
  if(ids.length>1||(ids[0]??null)!==(active.activeTask??null))errors.push('Invalid active cursor');
  const queue=progress.next;
  if(!Array.isArray(queue)||new Set(queue).size!==queue.length)errors.push('Invalid next queue');
  else {
    if(ids.length&&queue[0]!==ids[0])errors.push('Next must start with active task');
    for(const id of queue)if(![' ','~'].includes(tasks.get(id)))errors.push('Next task is not open: '+id);
  }
  for(const [id,m] of tasks)if(m==='x'&&!(progress.verified??[]).some(v=>v.id===id&&/^[a-f0-9]{40}$/.test(v.sourceRevision)&&typeof v.artifact==='string'&&v.artifact.length>0))errors.push('Closed item lacks source-bound evidence reference: '+id);
  for(const v of [active.path,progress.continuationPolicy?.activeChecklist,roadmap.activeChecklist,legacy.retirement?.active_checklist])if(v!=='docs/sutra-v2/CHECKLIST.md')errors.push('Active checklist reference mismatch');
  if(progress.session!==roadmap.session)errors.push('Current session mismatch');
  if(active.legacyV1PendingRetired!==379||active.legacyV1ActiveQueue!==false||legacy.retirement?.removed_pending_tasks!==379||legacy.retirement?.retired_by_user_direction!==true||legacy.retirement?.active_execution_queue!==false||legacy.current_task!==null||legacy.next_task!==null||!Array.isArray(legacy.ready_engineering_queue)||legacy.ready_engineering_queue.length!==0)errors.push('Legacy retirement/queue invariant violated');
  if(Object.keys(legacy.task_records??{}).length!==721)errors.push('Historical record count changed; reconcile retention explicitly');
  if(active.validationMergeAllowed!==false)errors.push('Validation branch cannot be a merge vehicle');
  const webIds=['V2-WEB-001','V2-WEB-002','V2-WEB-003','V2-WEB-004'];
  for(const id of webIds)if(!tasks.has(id))errors.push('Missing optional web task: '+id);
  const webOpen=webIds.filter(id=>[' ','~'].includes(tasks.get(id))).length;
  if(active.optionalRemainingTasks!==webOpen||active.foundationRemainingIncludingActive!==counts.remainingTasks+counts.activeTasks-webOpen)errors.push('Optional/foundation count mismatch');
  const webPolicy=progress.webAccess,roadWeb=roadmap.webAccess;
  for(const policy of [webPolicy,roadWeb]){
    if(!policy||policy.coreGateDependency!==false||policy.defaultEnabled!==false||policy.defaultRegistered!==false||policy.broadGateCredit!==false)errors.push('Optional web isolation violated');
    const ts=policy?.tasks;
    if(!Array.isArray(ts)||ts.length!==webIds.length||ts.some((t,i)=>t.id!==webIds[i]||!Array.isArray(t.dependencies)||t.dependencies.length!==(i?1:0)||(i>0&&t.dependencies[0]!==webIds[i-1])))errors.push('Optional web dependency contract violated');
  }
  if(JSON.stringify(webPolicy)!==JSON.stringify(roadWeb))errors.push('Web policy registers disagree');
  const core=[...(roadmap.phases??[]).flatMap(phase=>phase.requirements??[]),...(roadmap.productGates??[])];
  if(core.some(t=>Array.isArray(t.dependencies)&&t.dependencies.some(id=>webIds.includes(id))))errors.push('Core gate depends on optional web access');

  return {counts,activeTask:active.activeTask,errors};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
  const read=n=>fs.readFileSync(path.join(root,n),'utf8');
  const report=auditChecklist(read('docs/sutra-v2/CHECKLIST.md'),JSON.parse(read('docs/sutra-v2/progress.json')),JSON.parse(read('docs/sutra-v2/roadmap.json')),JSON.parse(read('docs/sutra/progress.json')));
  console.log(JSON.stringify(report,null,2));process.exitCode=report.errors.length?1:0;
}
