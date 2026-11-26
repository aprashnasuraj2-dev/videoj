import test from 'node:test';
import assert from 'node:assert/strict';
import {casePin} from '../pinned-investigation.js';
import {previewBindingSuggestions,applyReviewedBindingSuggestions} from '../binding-suggestions.js';
import {sealReviewedDraft} from '../reviewed-draft.js';
const type={kind:'stress',unit:'MPa',scope:'same_condition',dimension:[-1,1,-2]};
const draft={version:1,question:'Is A higher than B?',sources:[{id:'a',lineage:'r1',text:'測定 🧪 A: 12.50; repeat: 12.50;'},{id:'b',lineage:'r2',text:'B: 10.25;'}],bindings:[]};
const suggest=(id,sourceId,quote,before='',after='')=>({id,sourceId,quote,before,after,type});
async function inputs(suggestions,d=draft){const draftText=JSON.stringify(d),proposalText=JSON.stringify({version:1,suggestions});return {draftText,draftPin:await casePin(draftText),proposalText,proposalPin:await casePin(proposalText)};}
async function select(input,reviewedIds){const selectionText=JSON.stringify({version:1,draftPin:input.draftPin,proposalPin:input.proposalPin,reviewedIds});return {...input,selectionText,selectionPin:await casePin(selectionText)};}
test('exact anchor resolves a repeated number; ambiguous, missing, fabricated and partial tokens stay refused',async()=>{
 const input=await inputs([suggest('a_value','a','12.50','repeat: ',';'),suggest('ambiguous','a','12.50'),suggest('made_up','a','99'),suggest('partial','a','2.50','repeat: 1',';'),suggest('wrong_source','c','10.25'),suggest('b_value','b','10.25')]);
 const result=await previewBindingSuggestions(input);
 assert.deepEqual(result.rows.map(r=>r.state),['REVIEW_REQUIRED','REFUSED','REFUSED','REFUSED','REFUSED','REVIEW_REQUIRED']);
 assert.equal(result.rows[1].reason,'BINDING_SUGGESTION_AMBIGUOUS');assert.equal(result.rows[3].reason,'COMPILER_NUMBER_BOUNDARY');
 assert.equal(result.rows[0].span.start,new TextEncoder().encode(draft.sources[0].text.slice(0,draft.sources[0].text.lastIndexOf('12.50'))).length);
 assert.equal(JSON.parse(input.draftText).bindings.length,0);
 const applied=await applyReviewedBindingSuggestions(await select(input,['a_value','b_value']));
 assert.equal(applied.draft.bindings.length,2);assert.deepEqual(applied.draft.sources,draft.sources);assert.equal(applied.contractPin,(await sealReviewedDraft(JSON.stringify(applied.draft))).pin);
 await assert.rejects(applyReviewedBindingSuggestions(await select(input,['ambiguous'])),/BINDING_SUGGESTION_SELECTION/);
});
test('same exact span suggested under two names cannot be jointly admitted; stale and tampered pins fail',async()=>{
 const input=await inputs([suggest('first','b','10.25'),suggest('second','b','10.25')]);
 assert.equal((await previewBindingSuggestions(input)).rows.filter(r=>r.state==='REVIEW_REQUIRED').length,2);
 await assert.rejects(applyReviewedBindingSuggestions(await select(input,['first','second'])),/COMPILER_DUPLICATE_BINDING_SPAN/);
 await assert.rejects(applyReviewedBindingSuggestions({...await select(input,['first']),draftText:input.draftText+' '}),/BINDING_SUGGESTION_PIN/);
 await assert.rejects(applyReviewedBindingSuggestions({...await select(input,['first']),selectionText:'{}'}),/BINDING_SUGGESTION_SELECTION_PIN/);
 await assert.rejects(applyReviewedBindingSuggestions(await select(input,['first','first'])),/BINDING_SUGGESTION_SELECTION/);
});
test('invalid types, undeclared source and duplicate proposal identifiers do not grant evidence authority',async()=>{
 const input=await inputs([{...suggest('bad','b','10.25'),type:{...type,dimension:[1,1,99]}},suggest('q','question','A')]);
 assert.deepEqual((await previewBindingSuggestions(input)).rows.map(r=>r.state),['REFUSED','REFUSED']);
 const repeated=await inputs([suggest('x','b','10.25'),suggest('x','a','12.50')]);
 await assert.rejects(previewBindingSuggestions(repeated),/BINDING_SUGGESTION_SHAPE/);
});
