import test from 'node:test';
import assert from 'node:assert/strict';
import {guidedLivingCase} from '../examples/guided-living-case.js';
import {casePin} from '../pinned-investigation.js';
import {FACETS} from '../semantic-investigation.js';
import {sealInvestigationVersion,compareInvestigationVersions} from '../investigation-revision.js';
async function version(domain,corrected,previousDigest=null){
 const c=await guidedLivingCase(domain,corrected),batchText=JSON.stringify({version:1,contractDigest:c.pin,proposals:c.proposals});
 const candidates=c.candidates.map(a=>({id:a.id,meaning:a.meaning,facets:{...Object.fromEntries(FACETS.map(k=>[k,null])),definition:{statement:a.meaning,references:[{kind:'binding',id:a.binding}]}}}));
 const annotationText=JSON.stringify({version:1,contractDigest:c.pin,batchDigest:await casePin(batchText),candidates});
 return sealInvestigationVersion({previousDigest,contractText:c.contractText,contractPin:c.pin,batchText,annotationText,annotationPin:await casePin(annotationText)});
}
for(const domain of ['finance','engineering'])test(domain+' guided case: baseline agreement and corrected divergence',async()=>{
 const a=await version(domain,false),b=await version(domain,true,a.digest);
 assert.equal(a.report.investigation.triage.state,'AGREEMENT_ON_SUPPLIED_CONDITIONAL_OUTCOMES');
 assert.equal(b.report.investigation.triage.state,'DIVERGENT_CONDITIONAL_OUTCOMES');
 const r=await compareInvestigationVersions(a.versionText,a.digest,b.versionText,b.digest);
 assert.equal(r.candidates.filter(c=>c.outcome==='CONDITIONAL_RESULT_REVERSED').length,1);
 assert.equal(r.candidates.filter(c=>c.outcome==='CONDITIONAL_RESULT_SURVIVES').length,1);
 assert.equal(r.sourceChanges.length,1);assert.equal(r.decisionAuthority,'NONE');
});
