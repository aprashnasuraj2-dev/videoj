import {casePin} from '../pinned-investigation.js';
import {sealReviewedDraft} from '../reviewed-draft.js';
import {exportReviewedQuestion} from '../reviewed-question.js';
import assert from 'node:assert/strict';
const cases=[],refused=[];
async function prepare(prefix,relation,prior,now,thresholds=['amount','fraction'],suffix='?'){
 const q=prefix+'前期 to 𐐀 current '+relation+' limit'+suffix;let text='';const bindings=[];
 for(const [id,value,kind,unit] of [['prior',prior,'currency_amount','USD'],['now',now,'currency_amount','USD'],['amount','15','currency_amount','USD'],['fraction','1/4','ratio','one']]){
  text+=id+': ';const start=text.length;text+=value;bindings.push({id,sourceId:'record',start,end:text.length,type:{kind,unit,scope:'same_company',dimension:[0,0,0]}});text+='; ';
 }
 const x=await sealReviewedDraft(JSON.stringify({version:1,question:q,sources:[{id:'record',lineage:'synthetic',text}],bindings})),op=(alias,bindingIds)=>({start:q.indexOf(alias),end:q.indexOf(alias)+alias.length,bindingIds});
 const pt=JSON.stringify({version:2,contractDigest:x.pin,baseline:op('前期',['prior']),current:op('𐐀 current',['now']),threshold:op('limit',thresholds)});
 return {ct:x.contractText,cp:x.pin,pt,pp:await casePin(pt)};
}
for(const prefix of ['Is the change from ','Is the signed difference from ','Is the signed relative change from '])for(const relation of ['greater than','at least','not less than'])for(const [prior,now] of [['100','120'],['100','125'],['0','120'],['-100','-125']]){
 const x=await prepare(prefix,relation,prior,now),v=await exportReviewedQuestion(x.ct,x.cp,x.pt,x.pp);assert.ok(v.portable);cases.push({bundleText:v.bundleText,snapshotPin:v.snapshotPin,contractPin:x.cp,planPin:x.pp});
}
for(const prefix of ['Is the percentage change from ','Is the causal change from ']){const x=await prepare(prefix,'greater than','100','120');await assert.rejects(exportReviewedQuestion(x.ct,x.cp,x.pt,x.pp),/QUESTION_/);refused.push(x);}
console.log(JSON.stringify({cases,refused}));
