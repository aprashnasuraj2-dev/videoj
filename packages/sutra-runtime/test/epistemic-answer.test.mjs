import test from 'node:test';
import assert from 'node:assert/strict';
import {validateEpistemicAnswer,formatEpistemicAnswer} from '../epistemic-answer.js';

const lesson={sourceId:'lesson-1',cueId:'cue-7',excerpt:'The lesson states that evidence consistency is not factual verification.'};
const webA={sourceId:'web-1',url:'https://alpha.example/article',excerpt:'Alpha reports that the measured value was forty two units in the study.'};
const webB={sourceId:'web-2',url:'https://beta.example/paper',excerpt:'Beta reports that the measured value was thirty eight units in its replication.'};
const encode=claims=>JSON.stringify({claims});

test('mixed epistemic claims bind quotes to receipts and preserve inference as uncited model output',()=>{
 const answer=encode([
  {kind:'source_claim',text:'The lesson separates consistency from truth.',citations:[{kind:'lesson',sourceId:'lesson-1',cueId:'cue-7',quote:'evidence consistency is not factual verification'}]},
  {kind:'source_claim',text:'Alpha reports forty two units.',citations:[{kind:'web',sourceId:'web-1',quote:'measured value was forty two units'}]},
  {kind:'inference',text:'The two ideas should not be conflated.',citations:[]}
 ]);
 const result=validateEpistemicAnswer(answer,{lessonReceipts:[lesson],webReceipts:[webA,webB]});
 assert.equal(result.basis,'lesson_and_web');assert.equal(result.verification,'quotation_integrity_only');assert.equal(result.truthStatus,'unverified');
 assert.match(formatEpistemicAnswer(result),/Source claim:/);assert.match(formatEpistemicAnswer(result),/Model inference:/);
 assert.ok(Object.isFrozen(result));assert.ok(Object.isFrozen(result.claims));assert.ok(Object.isFrozen(result.claims[0].citations));
});

test('inference-only and uncertainty-only answers require no invented citation',()=>{
 const inference=validateEpistemicAnswer(encode([{kind:'inference',text:'This is a model inference, not a sourced fact.',citations:[]}]));
 assert.equal(inference.basis,'model_inference');
 const uncertain=validateEpistemicAnswer(encode([{kind:'uncertainty',text:'Available evidence is insufficient to answer.',citations:[]}]));
 assert.equal(uncertain.basis,'uncertainty');
});

test('source claims cannot cite search leads, invented quotes or absent receipts',()=>{
 for(const claims of [
  [{kind:'source_claim',text:'unsupported',citations:[]}],
  [{kind:'source_claim',text:'fabricated quote',citations:[{kind:'web',sourceId:'web-1',quote:'this quotation never appeared in the retrieved source'}]}],
  [{kind:'source_claim',text:'unknown source',citations:[{kind:'web',sourceId:'web-9',quote:'measured value was forty two units'}]}],
  [{kind:'inference',text:'citation laundering',citations:[{kind:'web',sourceId:'web-1',quote:'measured value was forty two units'}]}]
 ])assert.throws(()=>validateEpistemicAnswer(encode(claims),{lessonReceipts:[lesson],webReceipts:[webA]}),e=>['CITATION_REQUIRED','CITATION_INVALID','CITATION_FORBIDDEN'].includes(e.code));
});

test('conflict requires two distinct evidence authorities rather than duplicated citations',()=>{
 const valid=validateEpistemicAnswer(encode([{kind:'conflict',text:'The reports disagree.',citations:[
  {kind:'web',sourceId:'web-1',quote:'measured value was forty two units'},
  {kind:'web',sourceId:'web-2',quote:'measured value was thirty eight units'}
 ]}]),{webReceipts:[webA,webB]});
 assert.equal(valid.claims[0].kind,'conflict');
 const sameHost={...webB,url:'https://alpha.example/other'};
 assert.throws(()=>validateEpistemicAnswer(encode([{kind:'conflict',text:'Not independently corroborated.',citations:[
  {kind:'web',sourceId:'web-1',quote:'measured value was forty two units'},
  {kind:'web',sourceId:'web-2',quote:'measured value was thirty eight units'}
 ]}]),{webReceipts:[webA,sameHost]}),e=>e.code==='INDEPENDENCE_REQUIRED');
});

test('ambiguous JSON, extra fields and accessor-backed evidence fail closed',()=>{
 assert.throws(()=>validateEpistemicAnswer('{"claims":[],"claims":[]}'),e=>e.code==='ANSWER_FORMAT');
 assert.throws(()=>validateEpistemicAnswer(encode([{kind:'uncertainty',text:'x',citations:[],verified:true}])),e=>e.code==='ANSWER_FORMAT');
 let touched=0;const bad={sourceId:'web-1',url:'https://alpha.example/article'};Object.defineProperty(bad,'excerpt',{enumerable:true,get(){touched++;return webA.excerpt;}});
 assert.throws(()=>validateEpistemicAnswer(encode([{kind:'source_claim',text:'x',citations:[{kind:'web',sourceId:'web-1',quote:'measured value was forty two units'}]}]),{webReceipts:[bad]}),e=>e.code==='EVIDENCE_FORMAT');assert.equal(touched,0);
});
