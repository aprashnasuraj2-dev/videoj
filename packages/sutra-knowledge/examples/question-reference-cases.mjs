import assert from 'node:assert/strict';
import {casePin} from '../pinned-investigation.js';
import {sealReviewedDraft} from '../reviewed-draft.js';
import {exportReviewedQuestion} from '../reviewed-question.js';
const phrases=['greater than','higher than','less than','lower than','at least','at most','equal to','not greater than','not higher than','not less than','not lower than','no more than','no less than'];
const source='current: 12; earlier: 12; alternative: 8; other: 5; fifth: 3; sixth: 2;';
const fields=[['current','12'],['earlier','12'],['alternative','8'],['other','5'],['fifth','3'],['sixth','2']];
async function fixture(question,different=false){
 const bindings=fields.map(([id,value])=>{const start=source.indexOf(id+': ')+id.length+2;return {id,sourceId:'source',start,end:start+value.length,type:{kind:'currency_amount',unit:'USD',scope:different&&id==='alternative'?'other_scope':'same_company',dimension:[0,0,0]}};});
 return sealReviewedDraft(JSON.stringify({version:1,question,sources:[{id:'source',lineage:'synthetic',text:source}],bindings}));
}
async function prepare(q,left,right,a,b,different=false){
 const c=await fixture(q,different),plan={version:1,contractDigest:c.pin,left:{start:q.indexOf(left),end:q.indexOf(left)+left.length,bindingIds:a},right:{start:q.lastIndexOf(right),end:q.lastIndexOf(right)+right.length,bindingIds:b}};
 const pt=JSON.stringify(plan);return {ct:c.contractText,cp:c.pin,pt,pp:await casePin(pt)};
}
const cases=[],refused=[];
async function accept(q,l,r,a,b,different=false){
 const x=await prepare(q,l,r,a,b,different),v=await exportReviewedQuestion(x.ct,x.cp,x.pt,x.pp);
 assert.equal(v.portable,true);cases.push({bundleText:v.bundleText,snapshotPin:v.snapshotPin,contractPin:x.cp,planPin:x.pp});
}
async function reject(q,l,r,a,b){
 const x=await prepare(q,l,r,a,b);await assert.rejects(exportReviewedQuestion(x.ct,x.cp,x.pt,x.pp),/QUESTION_/);refused.push(x);
}
for(const phrase of phrases)for(const [a,b] of [['current','earlier'],['current','alternative'],['alternative','current']])await accept('Is current revenue '+phrase+' prior revenue?','current revenue','prior revenue',[a],[b]);
await accept('Is 売上高 higher than 前期売上高?','売上高','前期売上高',['current'],['earlier']);
await accept('Is 𐐀 revenue at least 𐐁 revenue?','𐐀 revenue','𐐁 revenue',['current'],['earlier']);
await accept('Is revenue not less than threshold?','revenue','threshold',['current','alternative','earlier','other'],['earlier','sixth'],true);
await accept('Is revenue equal to revenue?','revenue','revenue',['current'],['current']);
await reject('Is revenue not equal to threshold?','revenue','threshold',['current'],['earlier']);
await reject('Is revenue greater than threshold and cost?','revenue','threshold and cost',['current'],['earlier']);
await reject('Is revenue unleſs cost greater than threshold?','revenue unleſs cost','threshold',['current'],['earlier']);
await reject('Is revenue higher than threshold?','revenue','threshold',['current','alternative','earlier'],['other','fifth','sixth']);
console.log(JSON.stringify({cases,refused}));
