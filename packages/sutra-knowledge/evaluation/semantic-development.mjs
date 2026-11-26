// Frozen semantic development cases; no semantic intent is inferred by the engine.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {casePin} from '../pinned-investigation.js';
import {sealReviewedDraft} from '../reviewed-draft.js';
import {compileReviewedExpression} from '../reviewed-expression.js';
import {FACETS} from '../semantic-investigation.js';
import {challengeSemanticInterpretations} from '../semantic-counterfactual.js';
const bytes=readFileSync(new URL('./semantic-development-v1.json',import.meta.url)),frozenBlob=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
assert.equal(frozenBlob,'609ad48d3d18c2ff620abeae7a3b52747aae78c1');
const spec=JSON.parse(bytes);assert.equal(spec.cases.length,40);
const rows=[],type={kind:'ratio',unit:'one',scope:'synthetic_same_scale',dimension:[0,0,0]};
function majority(candidates,deduplicate){
 const voters=deduplicate?[...new Map(candidates.map(c=>[c.programDigest,c])).values()]:candidates,counts=new Map();
 for(const c of voters){const k=JSON.stringify(c.signature);counts.set(k,(counts.get(k)??0)+1);}
 const winner=[...counts].find(([,n])=>n*2>voters.length);
 return winner?candidates.filter(c=>JSON.stringify(c.signature)===winner[0]).map(c=>c.id):[];
}
for(const c of spec.cases){
 let source='';const bindings=[];
 for(const [id,value] of Object.entries(c.inputs)){source+=id+': ';const start=source.length;source+=value;bindings.push({id,sourceId:'record',start,end:source.length,type});source+='; ';}
 const {contractText,pin}=await sealReviewedDraft(JSON.stringify({version:1,question:c.question,sources:[{id:'record',lineage:'synthetic',text:source}],bindings}));
 const proposals=[],metadata=[];
 for(const p of c.programs){const compiled=await compileReviewedExpression(contractText,pin,p.formula);for(let i=0;i<p.copies;i++){const id=p.id+'_'+i;proposals.push({id,proposalText:compiled.proposalText});metadata.push({id,programDigest:compiled.proposalDigest,semanticLabel:p.semanticLabel,expected:p.expected});}}
 const batchText=JSON.stringify({version:1,contractDigest:pin,proposals}),batchDigest=await casePin(batchText);
 const annotationText=JSON.stringify({version:1,contractDigest:pin,batchDigest,candidates:metadata.map(m=>({id:m.id,meaning:m.id,facets:Object.fromEntries(FACETS.map(k=>[k,null]))}))});
 const planText=JSON.stringify({version:1,contractDigest:pin,batchDigest,scenarios:c.scenarios.map(s=>({id:s.id,replacements:Object.entries(s.replacements).map(([bindingId,value])=>({bindingId,value}))}))});
 const result=await challengeSemanticInterpretations(contractText,pin,batchText,annotationText,await casePin(annotationText),planText,await casePin(planText));
 assert.equal(result.decisionAuthority,'NONE',c.id);
 const observed=metadata.map(({id,programDigest,semanticLabel,expected})=>{const signature=[result.baseline.find(r=>r.id===id).conditionalState,...result.scenarios.map(s=>s.rows.find(r=>r.id===id).conditionalState)];assert.deepEqual(signature,expected,c.id+'/'+id);return {id,programDigest,semanticLabel,signature};});
 const distinct=new Set(observed.map(r=>JSON.stringify(r.signature))).size>1;assert.equal(distinct,c.expectedDistinctSignature,c.id);
 const expectedPairs=new Set();for(let i=0;i<observed.length;i++)for(let j=i+1;j<observed.length;j++){const a=observed[i],b=observed[j];if(a.signature[0]===b.signature[0]&&a.signature[1]!==b.signature[1])expectedPairs.add([a.id,b.id].sort().join('|'));}
 const pairs=result.scenarios[0].witnesses.map(w=>[w.left,w.right].sort().join('|')).sort();
 assert.deepEqual(pairs,[...expectedPairs].sort(),c.id);
 rows.push({id:c.id,observed,distinct,pairs,selections:{first:[observed[0].id],rawMajority:majority(observed,false),deduplicatedMajority:majority(observed,true),retainAll:observed.map(r=>r.id)}});
}
console.log(JSON.stringify({profile:'sutra-semantic-development-results/v1',frozenBlob,rows}));
