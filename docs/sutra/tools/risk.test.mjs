import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const data=JSON.parse(fs.readFileSync(path.join(root,'docs/sutra/risk-register.json'),'utf8'));
const sha=/^[a-f0-9]{40}$/;
test('risk register is explicit, unique and mechanically honest',()=>{
 assert.equal(data.schema,1);assert.ok(Number.isFinite(Date.parse(data.updatedAt)));assert.ok(data.risks.length>=10);
 const ids=new Set();
 for(const risk of data.risks){
  assert.match(risk.id,/^R-\d{3}$/);assert.ok(!ids.has(risk.id));ids.add(risk.id);
  assert.ok(['blocker','high','medium','low'].includes(risk.severity));assert.ok(['open','resolved','mitigated_pending_revalidation'].includes(risk.state));
  for(const key of ['title','mechanism','userEffect','mitigation'])assert.ok(typeof risk[key]==='string'&&risk[key].trim().length>=12,risk.id+' '+key);
  assert.ok(Array.isArray(risk.affectedTasks)&&risk.affectedTasks.length);assert.ok(risk.affectedTasks.every(id=>/^SUTRA-(?:P|X)\d{3}-\d{2}$/.test(id)));
  assert.ok(Array.isArray(risk.evidence));
  for(const evidence of risk.evidence){assert.ok(typeof evidence.artifact==='string'&&evidence.artifact);assert.match(evidence.sourceRevision,sha);const p=path.join(root,evidence.artifact);assert.ok(fs.existsSync(p),evidence.artifact);}
  if(risk.state==='resolved'){assert.ok(risk.evidence.length,risk.id+' resolved without evidence');assert.equal(risk.unblockCondition,null);}
  else assert.ok(typeof risk.unblockCondition==='string'&&risk.unblockCondition.length>=20,risk.id+' missing unblock condition');
  if(risk.releaseBlocking)assert.notEqual(risk.state,'resolved',risk.id+' resolved risk should no longer block release');
 }
});
test('open release blockers remain visible rather than hidden by checklist percentage',()=>{
 const open=data.risks.filter(r=>r.releaseBlocking&&r.state!=='resolved');
 assert.ok(open.length>=6);assert.ok(open.some(r=>r.id==='R-005'));assert.ok(open.some(r=>r.id==='R-006'));assert.ok(open.some(r=>r.id==='R-007'));
});
