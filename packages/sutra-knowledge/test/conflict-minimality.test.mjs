import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateEvidenceSession,sourceDigest} from '../evidence-session.js';

// Frozen synthetic truth tables. The oracle enumerates all subsets and tests
// world membership directly (not producer bitmask/cardinality-first search).
async function fixture(rows, worldCount){
 const scope='minimality_controls',worlds=[],sources=[],offers=[],events=[];
 for(let j=0;j<rows.length;j++){
  const id='r'+j,node='q'+j,source='s'+j;
  const sourceText=JSON.stringify({version:1,sourceId:source,sourceVersion:'v1',scope,values:{[node]:{value:'1/1',dimension:[0,0,0]}}});
  sources.push({id:source,version:'v1',digest:await sourceDigest(sourceText),lineage:'l'+j});
  offers.push({id,nodeId:node,sourceId:source,cost:1,dimension:[0,0,0]});
  events.push({type:'read',observationId:id,sourceText});
 }
 const input=(id,value)=>({id,kind:'input',value:String(value),dimension:[0,0,0],basis:'Frozen synthetic control'});
 for(let w=0;w<worldCount;w++){
  const nodes=rows.map((row,j)=>input('q'+j,Number(row.includes(w))));
  nodes.push(input('world',w),input('zero',0),{id:'target',kind:'constraint',op:'eq',args:['world','zero']});
  worlds.push({id:'w'+w,graphText:JSON.stringify({schemaVersion:1,nodes}),constraintId:'target'});
 }
 return {caseText:JSON.stringify({version:1,decisionId:'controls',scope,costUnit:'effort',worlds,sources,offers}),events};
}
function oracle(rows,n){
 const all=Array.from({length:n},(_,i)=>i);
 const conflict=[];
 function enumerate(j,subset){
  if(j===rows.length){
   if(subset.length&&!all.some(w=>subset.every(i=>rows[i].includes(w))))conflict.push(subset.map(i=>'r'+i));
   return;
  }
  enumerate(j+1,subset);enumerate(j+1,[...subset,j]);
 }
 enumerate(0,[]);
 conflict.sort((a,b)=>a.length-b.length||(a.join(',')<b.join(',')?-1:a.join(',')>b.join(',')?1:0));
 return {witness:conflict[0]??null,survivors:all.filter(w=>rows.every(r=>r.includes(w))).map(w=>'w'+w)};
}
async function check(rows,n){
 const {caseText,events}=await fixture(rows,n);
 const expected=oracle(rows,n);
 const report=await evaluateEvidenceSession(caseText,JSON.stringify(events));
 assert.deepEqual(report.survivingWorlds,expected.survivors);
 assert.deepEqual(report.conflict??null,expected.witness);
 assert.equal(report.status==='inconsistent_observations',expected.witness!==null);
 const reversed=await evaluateEvidenceSession(caseText,JSON.stringify([...events].reverse()));
 assert.deepEqual(reversed.conflict??null,expected.witness);
 assert.deepEqual(reversed.survivingWorlds,expected.survivors);
 return expected.witness;
}
test('minimum cardinality differs from inclusion minimality; triple, singleton, tie and consistency controls',async()=>{
 assert.deepEqual(await check([[0,1],[1,2],[0,2]],3),['r0','r1','r2']);
 // The first three reads form an inclusion-minimal triple, but r1+r3
 // form a smaller pair. Returning the first minimal set is incorrect.
 assert.deepEqual(await check([[0,1],[1,2],[0,2],[0]],3),['r1','r3']);
 assert.deepEqual(await check([[0],[1],[2]],3),['r0','r1']);
 assert.deepEqual(await check([[0,1],[],[1]],3),['r1']);
 assert.equal(await check([[0,1],[1,2]],3),null);
});
test('32 deterministic varied finite conflict tables against exhaustive direct-membership oracle and reversed event order',async()=>{
 let state=0x5a17c0de;
 function next(){state=(Math.imul(state,1664525)+1013904223)>>>0;return state;}
 for(let k=0;k<32;k++){
  const n=3+(next()%4),m=3+(next()%5);
  const rows=Array.from({length:m},()=>Array.from({length:n},(_,i)=>i).filter(()=>((next()>>>24)&3)!==0));
  await check(rows,n);
 }
});
