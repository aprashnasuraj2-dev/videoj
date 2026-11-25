import test from 'node:test';
import assert from 'node:assert/strict';
import {casePin} from '../pinned-investigation.js';
import {compileReviewedProposal} from '../reviewed-claim-compiler.js';
import {compilerFinanceFixture,exactSpan} from '../examples/reviewed-compiler.mjs';
const run=f=>compileReviewedProposal(f.contractText,f.pin,f.proposalText);
function proposal(f,fn){const p=JSON.parse(f.proposalText);fn(p);return {...f,proposalText:JSON.stringify(p)};}
async function contract(f,fn){const c=JSON.parse(f.contractText);await fn(c);const contractText=JSON.stringify(c),pin=await casePin(contractText),p=JSON.parse(f.proposalText);p.contractDigest=pin;return {contractText,pin,proposalText:JSON.stringify(p)};}
test('exact historical proxy, source-bound quantities, no semantic or causal promotion',async()=>{
 const f=await compilerFinanceFixture(),r=await run(f),find=id=>r.nodes.find(n=>n.id===id);
 assert.equal(r.target.status,'CONDITIONALLY_REFUTED');assert.equal(find('proxy25').receipt.outcome.value,'71611/1');assert.equal(find('proxy26').receipt.outcome.value,'66987/1');
 assert.equal(r.target.questionRelevance,'UNVERIFIED');assert.equal(r.target.methodValidity,'UNVERIFIED');assert.deepEqual(r.target.declaredLineages,['microsoft_issuer']);
 assert.equal(r.claims[0].status,'EXACT_QUOTE_ONLY');assert.equal(r.claims[1].status,'PROPOSED_UNVERIFIED');
 assert.equal(r.bindings[0].span.origin,'source_assertion');
});
test('missing value blocks target, independent subgraph remains executable',async()=>{
 const r=await run(await compilerFinanceFixture({missing:true}));assert.equal(r.target.status,'BLOCKED_MISSING_INPUT');assert.deepEqual(r.target.missing,['ppe26']);
 assert.equal(r.nodes.find(n=>n.id==='proxy25').receipt.outcome.value,'71611/1');assert.equal(r.nodes.find(n=>n.id==='proxy26').receipt,null);assert.equal(r.nodes.find(n=>n.id==='target').receipt,null);
});
test('untrusted numeric input, fabricated binding, forged status, changed contract and citation refused',async()=>{
 const f=await compilerFinanceFixture();
 for(const mutate of [p=>{p.nodes[0].value='1';},p=>{p.nodes[0].bindingId='invented';},p=>{p.status='VERIFIED';},p=>{p.claims[0].span.quote='fabricated';}]){
  await assert.rejects(run(proposal(f,mutate)),/COMPILER_/);
 }
 await assert.rejects(run({...f,contractText:f.contractText+' '}),/COMPILER_CONTRACT_PIN_MISMATCH/);
 const dup=f.proposalText.replace('"version":1','"version":1,"version":1');await assert.rejects(run({...f,proposalText:dup}),/ambiguous/);
});
test('scope mismatch and cycle are not arithmetic evidence',async()=>{
 const f=await compilerFinanceFixture(),g=await contract(f,c=>{c.bindings.find(b=>b.id==='ppe26').type.scope='other_company';});
 const r=await run(g);assert.equal(r.target.status,'BLOCKED_TYPE');assert.deepEqual(r.target.typeBlockers,['proxy26']);assert.equal(r.nodes.find(n=>n.id==='proxy26').receipt,null);
 await assert.rejects(run(proposal(f,p=>{p.nodes.find(n=>n.id==='proxy26').args[0]='proxy26';})),/COMPILER_CYCLE/);
 await assert.rejects(run(proposal(f,p=>{p.nodes.find(n=>n.id==='proxy26').args[0]='target';})),/COMPILER_DEPENDENCY/);
});
test('percent is normalized only with declared ratio; Unicode spans use exact bytes',async()=>{
 const q='比例?',s='測定: 25%; 200;',t={kind:'ratio',unit:'one',scope:'same',dimension:[0,0,0]},v={kind:'count',unit:'items',scope:'same',dimension:[0,0,0]};
 const c={version:1,question:{text:q,digest:await casePin(q)},sources:[{id:'s',text:s,digest:await casePin(s),lineage:'study'}],bindings:[{id:'pct',span:exactSpan('s',s,'25%'),type:t},{id:'n',span:exactSpan('s',s,'200'),type:v}]};
 const contractText=JSON.stringify(c),pin=await casePin(contractText),p={version:1,contractDigest:pin,questionSpan:exactSpan('question',q,q),claims:[],nodes:[{id:'pct',kind:'input',bindingId:'pct'},{id:'n',kind:'input',bindingId:'n'},{id:'result',kind:'derive',op:'mul',args:['n','pct']},{id:'target',kind:'constraint',op:'lt',args:['result','n']}],targetId:'target'},f={contractText,pin,proposalText:JSON.stringify(p)};
 const r=await run(f);assert.equal(r.bindings.find(x=>x.id==='pct').value,'1/4');assert.equal(r.nodes.find(x=>x.id==='result').receipt.outcome.value,'50/1');assert.equal(r.target.status,'CONDITIONALLY_SATISFIED');
 await assert.rejects(run(await contract(f,c=>{c.bindings[0].type=v;})),/COMPILER_PERCENT_UNIT/);
 await assert.rejects(run(proposal(f,p=>{p.questionSpan.start=1;})),/COMPILER_SPAN_BOUNDARY/);
 await assert.rejects(run(await contract(f,c=>{c.bindings[1].span.end--;c.bindings[1].span.quote='20';})),/COMPILER_NUMBER_BOUNDARY/);
});
test('same exact source bytes with different declared roots are visible; no independence inference',async()=>{
 const f=await compilerFinanceFixture(),g=await contract(f,c=>{c.sources.push({...c.sources[0],id:'copy',lineage:'claimed_other_root'});});
 const r=await run(g);assert.equal(r.duplicateSourceBytes.length,1);assert.deepEqual(r.duplicateSourceBytes[0].sources.map(x=>x.lineage),['claimed_other_root','microsoft_issuer']);
 assert.deepEqual(r.target.declaredLineages,['microsoft_issuer']);
});
test('zero divisor is a real unresolved computation, not a compiler success',async()=>{
 const f=await compilerFinanceFixture(),g=await contract(f,async c=>{
  const s=c.sources[0];s.text+=' zero = 0;';s.digest=await casePin(s.text);c.bindings.push({id:'zero',span:{sourceId:s.id,start:new TextEncoder().encode(s.text.slice(0,s.text.lastIndexOf('0;'))).length,end:new TextEncoder().encode(s.text.slice(0,s.text.lastIndexOf('0;'))).length+1,quote:'0'},type:c.bindings[0].type});
 });
 const x=proposal(g,p=>{p.nodes.push({id:'zero',kind:'input',bindingId:'zero'},{id:'quotient',kind:'derive',op:'div',args:['ocf25','zero']},{id:'ratio2',kind:'derive',op:'div',args:['ocf26','ocf25']});p.nodes.find(n=>n.id==='target').args=['quotient','ratio2'];});
 const r=await run(x);assert.equal(r.target.status,'UNRESOLVED_COMPUTATION');assert.equal(r.nodes.find(n=>n.id==='quotient').receipt.outcome.status,'indeterminate');assert.equal(r.nodes.find(n=>n.id==='target').receipt.outcome.status,'blocked');
});
