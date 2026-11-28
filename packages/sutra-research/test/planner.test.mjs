import test from 'node:test';
import assert from 'node:assert/strict';
import {createResearchPlan,chooseResearchQuery,questionProgress,researchQueryCandidates,browserQueryChoices,chooseBrowserQuery} from '../research-planner.js';
import {rankFrontier} from '../source-ranker.js';
import {formatMarkdownReport} from '../research-report.js';
test('planner exposes subquestions, gaps and targeted counterevidence without remote text',()=>{
 const objective='Compare battery storage costs',p=createResearchPlan(objective),first=chooseResearchQuery(objective,[],{});
 assert.equal(first.query,objective);assert.equal(p.questions.length,5);
 const second=chooseResearchQuery(objective,[first],{missing:['storage'],domainCount:1});assert.match(second.query,/primary evidence storage/);
 const third=chooseResearchQuery(objective,[first,second],{potentialDiscrepancies:1,domainCount:2});assert.equal(third.questionId,'comparability');assert.equal(third.role,'spark');
 assert.ok(questionProgress(p,[first,second,third]).every(q=>q.acceptanceSatisfied===false));
});
test('discovery ranking gives unseen domains priority without truth status',()=>{
 const a={url:'https://old.org/a',title:'Battery storage costs',rank:1,depth:0},b={url:'https://new.org/a',title:'Battery storage costs',rank:2,depth:0};
 assert.equal(rankFrontier([a,b],'battery storage costs',new Map([['old.org',2]]))[0].url,b.url);
});
test('markdown candidate report escapes hostile text and preserves qualification',()=>{
 const r={objective:'<script>alert(1)</script>',state:'closed',terminationReason:'budget_exhausted',qualification:'Candidate evidence only',queries:[],passages:[{sourceId:'s1',supportingText:'<img src=x onerror=evil>',locator:{startOffset:0,endOffset:24}}],documents:[],coverage:{unmatchedTerms:[]},usage:{searches:1,documents:1,reservedBytes:100,reservedCostMicros:10}};
 const md=formatMarkdownReport(r);assert.ok(!md.includes('<script>'));assert.ok(!md.includes('<img'));assert.match(md,/Candidate evidence only/);assert.match(md,/offsets 0–24/);
});

test('browser query selection uses only bounded metadata and avoids repeated subquestions',()=>{
 const objective='Compare battery storage costs',history=[chooseResearchQuery(objective,[],{}),{query:objective+' official data methodology',questionId:'primary',role:'drone'}];
 const candidates=researchQueryCandidates(objective,history,{missing:['costs'],domainCount:1,potentialDiscrepancies:1}),choices=browserQueryChoices(candidates,history);
 assert.ok(choices.length>1);assert.equal(choices[0].questionId,'comparability');assert.equal(chooseBrowserQuery(choices),choices[0].id);
 assert.ok(choices.every(x=>!Object.hasOwn(x,'query')&&!Object.hasOwn(x,'url')));
 const x=[{id:'query_0',questionId:'primary',role:'drone',attempts:2},{id:'query_1',questionId:'counterevidence',role:'spark',attempts:0}];
 assert.equal(chooseBrowserQuery(x),'query_1');
 for(const c of [[{...x[0],query:'unapproved'}],[{...x[0],id:'query_16'}],[{...x[0],attempts:31}],[x[0],x[0]]])assert.throws(()=>chooseBrowserQuery(c),/QUERY_SELECTION/);
});
