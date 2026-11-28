import test from 'node:test';import assert from 'node:assert/strict';
import {casePin} from '../pinned-investigation.js';import {inspectSemanticConversation,CONVERSATION_VERSION} from '../semantic-conversation.js';
const a=(text,quote)=>({start:text.indexOf(quote),end:text.indexOf(quote)+quote.length,quote});
const u=(facet,action,anchors)=>({facet,action,anchors});
const t=(id,role,text,updates=[])=>({id,role,text,updates});
async function run(turns,selectedTurnIds=turns.slice(0,-1).map(t=>t.id)){const conversationText=JSON.stringify({version:CONVERSATION_VERSION,turns});return inspectSemanticConversation({conversationText,conversationPin:await casePin(conversationText),question:turns.at(-1).text,selectedTurnIds});}
test('multi-turn reference ambiguity, explicit correction, and missing-context distinctions',async()=>{
 const p='Compare Acme and Beta in 2024.',x=t('t1','user',p,[u('entity','replace',[a(p,'Acme'),a(p,'Beta')]),u('period','replace',[a(p,'2024')])]);
 const q=t('t2','user','Did it improve that year?');
 let r=await run([x,q]);assert.equal(r.references.find(s=>s.facet==='entity').state,'MULTIPLE_DECLARED_CANDIDATES');assert.equal(r.references.find(s=>s.facet==='period').options[0].quote,'2024');
 const corr='I meant Beta, not Acme.',c=t('t3','user',corr,[u('entity','replace',[a(corr,'Beta')])]);r=await run([x,c,t('t4','user','Did it improve?')]);assert.deepEqual(r.references[0].options.map(v=>v.quote),['Beta']);assert.equal(r.references[0].state,'ONE_DECLARED_CANDIDATE_REVIEW_REQUIRED');assert.equal(r.decisionAuthority,'NONE');
 r=await run([x,c,t('t4','user','Did it improve?')],['t1']);assert.equal(r.references[0].state,'MISSING_CONTEXT');assert.ok(!JSON.stringify(r.activeFacets).includes('Acme'));assert.ok(!JSON.stringify(r.activeFacets).includes('Beta'));
});
test('assistant assertions cannot change focus, unselected turns never disclose, missing antecedent never guessed',async()=>{
 const q=t('t3','user','What about there?'),p='Acme in Nepal',x=t('t1','user',p,[u('entity','replace',[a(p,'Acme')]),u('geography','replace',[a(p,'Nepal')])]),y=t('t2','assistant','Hidden claim about Mars');
 const r=await run([x,y,q],['t1']);assert.ok(!JSON.stringify(r).includes('Mars'));assert.equal(r.references.find(s=>s.facet==='geography').options[0].quote,'Nepal');
 await assert.rejects(run([x,{...y,updates:[u('geography','replace',[a(y.text,'Mars')])]},q]),/TURN/);
 await assert.rejects(run([x,t('t1','user','What about there?')]),/TURN/);
 await assert.rejects(run([x,t('t3','user','What about there?', [u('entity','replace',[{start:0,end:4,quote:'fake'}])])]),/SPAN/);
});
test('ellipsis and explicit clear do not turn historical values into current facts',async()=>{
 const p='Use net profit of Acme',x=t('t1','user',p,[u('entity','replace',[a(p,'Acme')]),u('metric','replace',[a(p,'net profit')])]);
 const r=await run([x,t('t2','user','And in 2025?')]);assert.equal(r.dependentContinuation,true);assert.equal(r.references.find(x=>x.facet==='entity').options[0].quote,'Acme');
 const r2=await run([x,t('t2','user','Clear company focus',[u('entity','clear',[])]),t('t3','user','Did it improve?')]);assert.equal(r2.references[0].state,'MISSING_CONTEXT');
 const text=JSON.stringify({version:CONVERSATION_VERSION,turns:[x,t('t2','user','Did it improve?')]});await assert.rejects(inspectSemanticConversation({conversationText:text,conversationPin:await casePin(text),question:'Different question',selectedTurnIds:['t1']}),/QUESTION_MISMATCH/);
});
