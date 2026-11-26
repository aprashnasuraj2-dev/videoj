import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {livingFixture} from '../examples/living-investigation.mjs';
import {casePin} from '../pinned-investigation.js';
import {selectedSpan} from '../reviewed-draft.js';
import {exportEvidenceRevision,openEvidenceRevision} from '../evidence-revision-transaction.js';
import {exportEvidenceRecovery,openEvidenceRecovery} from '../evidence-recovery.js';
const bytes=readFileSync(new URL('./replay-development-cases.json',import.meta.url));
const frozenBlob=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
assert.equal(frozenBlob,'e27ca033a7d7bc7d248ffb1e2b509465adb87e5d');
const manifest=JSON.parse(bytes);
assert.equal(manifest.cases.length,20);
const a=await livingFixture(),s=JSON.parse(JSON.parse(a.versionText).contractText).sources.find(s=>s.id==='secondary');
const rp=JSON.stringify({version:1,parentDigest:a.digest,operations:[{kind:'withdraw',sourceId:s.id,previousDigest:s.digest}]}),rpin=await casePin(rp);
const revision=await exportEvidenceRevision(a.versionText,a.digest,rp,rpin);
assert.ok(revision.portable);
const current=revision.revision.child.digest,text='訂正 🧪 Cash before: 30; after: 20',start=text.indexOf('20');
const plan=JSON.stringify({version:1,parentDigest:current,revisionPlanDigest:rpin,restorations:[{kind:'restore_source',sourceId:s.id,sourceText:text,sourceDigest:await casePin(text),rebindings:[{bindingId:'second',span:selectedSpan(s.id,text,start,start+2)}]}]}),pin=await casePin(plan);
const recovery=await exportEvidenceRecovery(a.versionText,a.digest,rp,rpin,current,plan,pin);
assert.ok(recovery.portable);assert.deepEqual(recovery.recovery.stillMissingBindingIds,['other']);
const wrong='sha256:'+'0'.repeat(64),rows=[];
for(const c of manifest.cases){
 const rev=c.kind==='revision',e=rev?revision:recovery;
 let raw=e.bundleText;const b=JSON.parse(raw);
 const pins=rev?[e.snapshotPin,a.digest,rpin,current]:[e.snapshotPin,a.digest,rpin,current,pin,recovery.recovery.child.digest];
 const last=pins.length-1;
 switch(c.mutation){
 case 'exact':break;
 case 'pretty':raw=JSON.stringify(b,null,2);pins[0]=await casePin(raw);break;
 case 'wrong_snapshot':pins[0]=wrong;break;
 case 'wrong_ancestor':pins[1]=wrong;break;
 case 'wrong_plan':pins[2]=wrong;break;
 case 'wrong_current':pins[3]=wrong;break;
 case 'wrong_recovery_plan':pins[4]=wrong;break;
 case 'wrong_child':pins[last]=wrong;break;
 case 'missing_list_omitted':b[rev?'missingBindingIds':'stillMissingBindingIds']=[];raw=JSON.stringify(b);pins[0]=await casePin(raw);break;
 case 'authority_changed':b.decisionAuthority='AUTHORIZED';raw=JSON.stringify(b);pins[0]=await casePin(raw);break;
 case 'duplicate_key':raw='{"version":"invalid",'+raw.slice(1);pins[0]=await casePin(raw);break;
 case 'forged_child_version':b.childVersion=b.parentVersion;b.childDigest=a.digest;pins[last]=a.digest;raw=JSON.stringify(b);pins[0]=await casePin(raw);break;
 case 'nested_missing_list_omitted':{const nested=JSON.parse(b.priorTransactionText);nested.missingBindingIds=[];b.priorTransactionText=JSON.stringify(nested);b.priorTransactionDigest=await casePin(b.priorTransactionText);raw=JSON.stringify(b);pins[0]=await casePin(raw);break;}
 case 'revived_semantic_link':{const child=JSON.parse(b.childVersion),ann=JSON.parse(child.annotationText);ann.candidates.find(x=>x.id==='secondary_view').facets.definition.references=[{kind:'binding',id:'second'}];child.annotationText=JSON.stringify(ann);child.annotationPin=await casePin(child.annotationText);b.childVersion=JSON.stringify(child);b.childDigest=await casePin(b.childVersion);pins[last]=b.childDigest;raw=JSON.stringify(b);pins[0]=await casePin(raw);break;}
 default:throw Error('UNKNOWN_MUTATION');
 }
 let strict='accept';
 try{await (rev?openEvidenceRevision:openEvidenceRecovery)(raw,...pins);}catch(e){strict='refuse';assert.ok(e instanceof Error);}
 assert.equal(strict,c.expected.strict,c.id);
 const hashOnly=await casePin(raw)===pins[0]?'accept':'refuse';
 let declaredPins='refuse';try{const o=JSON.parse(raw),fields=rev?['parentDigest','planDigest','childDigest']:['ancestorDigest','revisionPlanDigest','parentDigest','recoveryPlanDigest','childDigest'];if(hashOnly==='accept'&&fields.every((k,i)=>o[k]===pins[i+1]))declaredPins='accept';}catch{}
 rows.push({id:c.id,kind:c.kind,raw,pins,strict,hashOnly,declaredPins});
}
console.log(JSON.stringify({profile:'sutra-replay-development-results/v1',frozenBlob,rows}));
