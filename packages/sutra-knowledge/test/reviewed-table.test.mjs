import test from 'node:test';
import assert from 'node:assert/strict';
import {casePin} from '../pinned-investigation.js';
import {sealReviewedDraft} from '../reviewed-draft.js';
import {compileReviewedExpression} from '../reviewed-expression.js';
import {inspectReviewedTable,addReviewedTable} from '../reviewed-table.js';
const source='項目 🧪\tbefore\tafter\nRevenue\t100\t120\nExpense\t50\t70\n';
const type={kind:'currency_amount',unit:'USD',scope:'same_company',dimension:[0,0,0]};
const draft={version:1,question:'Did operating surplus increase?',sources:[],bindings:[]};
async function spec(){return {version:1,sourceDigest:await casePin(source),sourceId:'ledger',lineage:'report',cells:[{id:'old_rev',row:1,column:1,type},{id:'new_rev',row:1,column:2,type},{id:'old_exp',row:2,column:1,type},{id:'new_exp',row:2,column:2,type}]};}
async function run(s=undefined,raw=source){s??=await spec();const t=JSON.stringify(s);return addReviewedTable(JSON.stringify(draft),raw,t,await casePin(t));}
test('TSV coordinates and manual selections yield identical contract and exact expression',async()=>{
 const t=inspectReviewedTable(source),r=await run();
 assert.deepEqual(t.headers,['項目 🧪','before','after']);assert.equal(t.rowCount,2);
 const s=await spec(),manual={...draft,sources:[{id:'ledger',text:source,lineage:'report'}],bindings:s.cells.map(c=>{const token=t.rows[c.row-1][c.column];return {id:c.id,sourceId:'ledger',start:token.start,end:token.end,type};})};
 const sealed=await sealReviewedDraft(JSON.stringify(manual));
 assert.equal(r.contractText,sealed.contractText);assert.equal(r.contractPin,sealed.pin);
 const result=await compileReviewedExpression(r.contractText,r.contractPin,'[new_rev]-[new_exp]>[old_rev]-[old_exp]');
 assert.equal(result.target.status,'CONDITIONALLY_REFUTED');assert.equal(r.decisionAuthority,'NONE');
 assert.equal(r.selectedCells[1].token,'120');assert.equal(r.selectedCells[3].header,'after');
});
test('stale text, headers, duplicates, wrong coordinates and hostile tokens fail closed',async()=>{
 const s=await spec();await assert.rejects(run(s,source.replace('120','130')),/TABLE_SELECTION/);
 for(const change of [s=>s.cells[0].row=0,s=>s.cells[0].column=9,s=>s.cells[1].id=s.cells[0].id,s=>s.cells[1].column=1,s=>s.cells[0].verified=true]){
  const v=await spec();change(v);await assert.rejects(run(v),/TABLE_/);
 }
 for(const bad of ['A\tB\n1','A\tA\n1\t2','A\tB\r\n1\t2','A\tB\n1\t2\n\n'])assert.throws(()=>inspectReviewedTable(bad),/TABLE_/);
 for(const token of ['=1+2','1,000',' 100','']){const raw=source.replace('100',token),v=await spec();v.sourceDigest=await casePin(raw);await assert.rejects(run(v,raw),/TABLE_|COMPILER_/);}
 const text=JSON.stringify(s);await assert.rejects(addReviewedTable(JSON.stringify(draft),source,text,'sha256:'+'0'.repeat(64)),/TABLE_SELECTION_PIN/);
});
