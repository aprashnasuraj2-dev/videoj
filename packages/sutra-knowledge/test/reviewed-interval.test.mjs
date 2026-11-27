import test from 'node:test';
import assert from 'node:assert/strict';
import {casePin} from '../pinned-investigation.js';
import {sealReviewedDraft} from '../reviewed-draft.js';
import {compileReviewedExpression} from '../reviewed-expression.js';
import {sealInvestigationVersion} from '../investigation-revision.js';
import {FACETS} from '../semantic-investigation.js';
import {evaluateReviewedIntervals} from '../reviewed-interval.js';
async function fixture(expressions=['[x]>[limit]','[x]>=[limit]']){
 const question='Does the synthetic expression satisfy the limit?',source='X: 4; Y: 2; Limit: 3; Zero: 0;',type={kind:'ratio',unit:'one',scope:'synthetic',dimension:[0,0,0]};
 const {contractText,pin}=await sealReviewedDraft(JSON.stringify({version:1,question,sources:[{id:'source',lineage:'synthetic',text:source}],bindings:[['x','4'],['y','2'],['limit','3'],['zero','0']].map(([id,value])=>({id,sourceId:'source',start:source.indexOf(value),end:source.indexOf(value)+1,type}))}));
 const candidates=expressions.map((e,i)=>({id:'candidate_'+i,meaning:e,facets:Object.fromEntries(FACETS.map(k=>[k,null]))}));
 const proposals=[];for(let i=0;i<expressions.length;i++)proposals.push({id:candidates[i].id,proposalText:(await compileReviewedExpression(contractText,pin,expressions[i])).proposalText});
 const batchText=JSON.stringify({version:1,contractDigest:pin,proposals}),annotationText=JSON.stringify({version:1,contractDigest:pin,batchDigest:await casePin(batchText),candidates});
 return sealInvestigationVersion({contractText,contractPin:pin,batchText,annotationText,annotationPin:await casePin(annotationText)});
}
const spec=(v,ranges)=>({version:1,versionDigest:v.digest,ranges:ranges.map(([bindingId,lower,upper])=>({bindingId,lower,upper}))});
async function run(v,ranges){const t=JSON.stringify(spec(v,ranges));return evaluateReviewedIntervals(v.versionText,v.digest,t,await casePin(t));}
test('strict and inclusive bounds differ at exact equality; all proved bounds agree with point sampling',async()=>{
 const v=await fixture();
 const a=await run(v,[['x','3/1','5/1']]);assert.equal(a.candidates[0].status,'NOT_RESOLVED_BY_INTERVAL_ENCLOSURE');assert.equal(a.candidates[1].status,'HOLDS_FOR_ALL_DECLARED_VALUES');
 const b=await run(v,[['x','7/2','5/1']]);assert.ok(b.candidates.every(c=>c.status==='HOLDS_FOR_ALL_DECLARED_VALUES'));
 for(let i=7;i<=10;i++)assert.ok(i/2>3);
 assert.equal(b.decisionAuthority,'NONE');
});
test('same-node square and subtraction refinements; dependent different expressions remain conservative',async()=>{
 const v=await fixture(['[x]-[x]==[zero]','[x]*[x]>=[zero]','([x]+[y])-[x]==[y]']);
 const r=await run(v,[['x','-4/1','4/1']]);
 assert.equal(r.candidates[0].status,'HOLDS_FOR_ALL_DECLARED_VALUES');assert.equal(r.candidates[1].status,'HOLDS_FOR_ALL_DECLARED_VALUES');
 const square=r.candidates[1].nodes.find(n=>n.operator==='mul');assert.deepEqual(square.bounds,{lower:'0/1',upper:'16/1'});
 assert.equal(r.candidates[2].status,'NOT_RESOLVED_BY_INTERVAL_ENCLOSURE');
});
test('possible zero denominator cannot be hidden by same-node simplification',async()=>{
 const v=await fixture(['[x]/[y]>[zero]','[y]/[y]>[zero]']);
 const r=await run(v,[['y','-1/1','2/1']]);assert.ok(r.candidates.every(c=>c.status==='UNRESOLVED_INTERVAL'));assert.ok(r.candidates.every(c=>c.nodes.some(n=>n.reason==='INTERVAL_ZERO_POSSIBLE')));
});
test('independent corner and sample oracle for mixed-sign product and subtraction',async()=>{
 const v=await fixture(['[x]*[y]>[limit]','[x]-[y]>[limit]']);
 const r=await run(v,[['x','-1/1','5/1'],['y','-2/1','3/1']]);
 const values=[];for(let x=-1;x<=5;x++)for(let y=-2;y<=3;y++)values.push([x*y,x-y]);
 for(const [i,op] of [[0,'mul'],[1,'sub']]){const b=r.candidates[i].nodes.find(n=>n.operator===op).bounds;assert.equal(b.lower,Math.min(...values.map(v=>v[i]))+'/1');assert.equal(b.upper,Math.max(...values.map(v=>v[i]))+'/1');}
});
test('invalid or stale range cannot change reviewed point evidence',async()=>{
 const v=await fixture(),p=spec(v,[['x','3/1','5/1']]),t=JSON.stringify(p);
 await assert.rejects(evaluateReviewedIntervals(v.versionText,v.digest,t,'sha256:'+'0'.repeat(64)),/INTERVAL_PIN/);
 for(const ranges of [[['x','5/1','6/1']],[['x','5/1','3/1']],[['x','1/0','5/1']],[['missing','1/1','2/1']],[['x','3/1','5/1'],['x','3/1','5/1']]])await assert.rejects(run(v,ranges),/INTERVAL_/);
});

import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
test('independent Fraction replay spans interval boundary, dependency, sign and zero-divisor profiles',async()=>{
 const profiles=[
  {id:'strict-inclusive',expressions:['[x]>[limit]','[x]>=[limit]'],ranges:[['x','3/1','5/1']]},
  {id:'point',expressions:['[x]>[limit]','[x]==[limit]'],ranges:[['x','4/1','4/1']]},
  {id:'mixed-sign',expressions:['[x]*[y]>[limit]','[x]-[y]>[limit]'],ranges:[['x','-1/1','5/1'],['y','-2/1','3/1']]},
  {id:'identity',expressions:['[x]-[x]==[zero]','[x]*[x]>=[zero]','([x]+[y])-[x]==[y]'],ranges:[['x','-4/1','4/1']]},
  {id:'zero-divisor',expressions:['[x]/[y]>[zero]','[y]/[y]>[zero]'],ranges:[['y','-1/1','2/1']]},
  {id:'positive-divisor',expressions:['[x]/[y]>[zero]','[y]/[y]>[zero]'],ranges:[['x','3/2','9/2'],['y','1/2','5/2']]},
  {id:'unused-range',expressions:['[x]>[limit]','[x]>=[limit]'],ranges:[['y','-2/1','3/1']]},
  {id:'rational-boundary',expressions:['[x]>[limit]','[x]>=[limit]'],ranges:[['x','7/2','9/2']]}
 ];
 const cases=[];
 for(const p of profiles){
  const v=await fixture(p.expressions),planText=JSON.stringify(spec(v,p.ranges)),planDigest=await casePin(planText);
  const result=await evaluateReviewedIntervals(v.versionText,v.digest,planText,planDigest);
  const bundle={versionText:v.versionText,versionDigest:v.digest,planText,planDigest,result};
  const text=JSON.stringify(bundle),pin=await casePin(text);
  cases.push({id:p.id,text,pin,versionPin:v.digest,planPin:planDigest,expected:'VERIFIED'});
  const mutant=JSON.parse(text);
  mutant.result.decisionAuthority='APPROVED';
  const altered=JSON.stringify(mutant);
  cases.push({id:p.id+'-repinned-authority',text:altered,pin:await casePin(altered),versionPin:v.digest,planPin:planDigest,expected:'REFUSED'});
 }
 const valid=cases[0],changed=JSON.parse(valid.text);changed.result.candidates[0].nodes[0].bounds={lower:'999/1',upper:'999/1'};
 const wrongBounds=JSON.stringify(changed);
 cases.push({...valid,id:'repinned-bounds',text:wrongBounds,pin:await casePin(wrongBounds),expected:'REFUSED'});
 cases.push({...valid,id:'wrong-plan-pin',planPin:'sha256:'+'0'.repeat(64),expected:'REFUSED'});
 const code=[
 'import json, sys',
 'from verify_reviewed_interval import verify',
 'cases=json.load(sys.stdin)',
 'out=[]',
 'for c in cases:',
 '    r=verify(c["text"].encode("utf-8"),c["pin"],c["versionPin"],c["planPin"])',
 '    out.append({"id":c["id"],"actual":r["status"],"expected":c["expected"]})',
 'print(json.dumps(out))',
 'sys.exit(0 if all(x["actual"]==x["expected"] for x in out) else 1)'
 ].join('\n');
 const p=spawnSync('python3',['-c',code],{cwd:fileURLToPath(new URL('../reference/',import.meta.url)),input:JSON.stringify(cases),encoding:'utf8',timeout:30000,maxBuffer:1048576});
 assert.equal(p.status,0,p.stderr||p.stdout||String(p.error));
 const rows=JSON.parse(p.stdout);assert.equal(rows.length,18);assert.equal(rows.filter(x=>x.actual==='VERIFIED').length,8);assert.equal(rows.filter(x=>x.actual==='REFUSED').length,10);
});
