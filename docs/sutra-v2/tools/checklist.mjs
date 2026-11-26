import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export function auditChecklist(checklist, progress, roadmap, legacy) {
  const errors=[], tasks=new Map();
  const states={' ':'remainingTasks','~':'activeTasks','x':'completedSinceReset','!':'externalBlockers'};
  const counts={remainingTasks:0,activeTasks:0,completedSinceReset:0,externalBlockers:0};
  for(const line of checklist.split(/\r?\n/)){
    if(!line.startsWith('- [')) continue;
    const m=line.match(/^- \[([ ~x!])\] `(V2-[A-Z0-9-]+)` (.+)$/);
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
  return {counts,activeTask:active.activeTask,errors};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
  const read=n=>fs.readFileSync(path.join(root,n),'utf8');
  const report=auditChecklist(read('docs/sutra-v2/CHECKLIST.md'),JSON.parse(read('docs/sutra-v2/progress.json')),JSON.parse(read('docs/sutra-v2/roadmap.json')),JSON.parse(read('docs/sutra/progress.json')));
  console.log(JSON.stringify(report,null,2));process.exitCode=report.errors.length?1:0;
}
