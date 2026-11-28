// Corpus execution, not a training pipeline. No label is passed to the engine.
// All source and alias declarations below are constant synthetic fixtures.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {sealReviewedDraft} from '../reviewed-draft.js';
import {casePin} from '../pinned-investigation.js';
import {previewSemanticQuestion,AMBIGUITY_FAMILIES} from '../semantic-question-engine.js';

const folder=new URL('../evaluation/',import.meta.url);
const manifest=JSON.parse(readFileSync(new URL('semantic-model-authored-manifest-v1.json',folder),'utf8'));
const sha=text=>createHash('sha256').update(text).digest('hex');
const read=(name,expectedBlob)=>{
 const text=readFileSync(new URL(name,folder),'utf8'),b=Buffer.from(text);
 assert.equal(createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex'),expectedBlob,name);
 return text.trimEnd().split('\n').map(JSON.parse);
};
const money={kind:'currency_amount',unit:'USD',scope:'same_company',dimension:[0,0,0]};
const ratio={kind:'ratio',unit:'one',scope:'same_company',dimension:[0,0,0]};
async function preview(question,collision=false){
 const text='100; 120; 3/20',bindings=[
  {id:'prior',sourceId:'fixture',start:0,end:3,type:money},
  {id:'now',sourceId:'fixture',start:5,end:8,type:money},
  {id:'limit',sourceId:'fixture',start:10,end:14,type:ratio}
 ];
 const draft=await sealReviewedDraft(JSON.stringify({version:1,question,sources:[{id:'fixture',text,lineage:'synthetic'}],bindings}));
 const aliases=[{alias:'prior',bindingIds:['prior']},{alias:'now',bindingIds:['now']},{alias:'limit',bindingIds:['limit']}];
 if(collision)aliases.push({alias:'revenue',bindingIds:['now','prior']});
 const catalogText=JSON.stringify({version:1,contractDigest:draft.pin,aliases});
 const p=await previewSemanticQuestion({contractText:draft.contractText,contractPin:draft.pin,catalogText,catalogPin:await casePin(catalogText)});
 assert.equal(p.question,question);assert.equal(p.reviewRequired,true);assert.equal(p.decisionAuthority,'NONE');
 assert.deepEqual(p.ambiguities.map(x=>x.family),AMBIGUITY_FAMILIES);
 assert.ok(p.ambiguities.every(x=>x.decisionAuthority==='NONE'));
 assert.ok(p.candidates.every(x=>x.decisionAuthority==='NONE'));
 return {state:p.state,candidates:p.candidates.length,signals:Object.fromEntries(p.ambiguities.map(a=>[a.family,a.state])),
  modes:p.candidates.map(c=>c.mode),pin:p.previewPin};
}
const count=(rows,f)=>{const out=Object.create(null);for(const x of rows){const k=f(x);out[k]=(out[k]??0)+1;}return out;};
const unique=(rows,f)=>new Set(rows.map(f)).size;
const rate=(n,d)=>d?n/d:null;
const REVIEW=new Set(['REVIEW_REQUIRED','EXPLICIT_OR_REVIEW']);
const hasReviewCue=p=>Object.entries(p.signals).some(([f,s])=>f!=='units'&&REVIEW.has(s));
const confusion=rows=>{
 const tp=rows.filter(r=>r.gold&&r.cue).length,tn=rows.filter(r=>!r.gold&&!r.cue).length,
 fp=rows.filter(r=>!r.gold&&r.cue).length,fn=rows.filter(r=>r.gold&&!r.cue).length;
 return {n:rows.length,tp,tn,fp,fn,precision:rate(tp,tp+fp),recall:rate(tp,tp+fn),specificity:rate(tn,tn+fp)};
};
function summarize(rows){
 const hits=rows.filter(r=>r.signal==='REVIEW_REQUIRED').length,explicitOrReview=rows.filter(r=>r.signal==='EXPLICIT_OR_REVIEW').length;
 return {records:rows.length,uniqueQuestions:unique(rows,r=>r.questionHash),states:count(rows,r=>r.state),
  targetFamilyStates:count(rows,r=>r.signal),reviewCueRate:rate(hits+explicitOrReview,rows.length),
  strictReviewRate:rate(hits,rows.length),candidateBearing:rows.filter(r=>r.candidates>0).length,
  zeroCandidate:rows.filter(r=>r.candidates===0).length};
}
export async function executeSemanticCorpus(){
 const synthetic=manifest.shards.flatMap(s=>read(s.path,s.gitBlob));
 const human=read('ambient-human-full-v1.jsonl','a936db483d95b4d896a21c47ec7bff44c19aeefc');
 const categories=read('ambient-human-categories-v1.jsonl','58e1aac10ddf95b5fb3861f842cdc6fd80ed5077');
 assert.equal(synthetic.length,4000);assert.equal(human.length,1645);assert.equal(categories.length,100);
 assert.equal(unique(synthetic,r=>r.id),synthetic.length);assert.equal(unique(human,r=>r.id),human.length);
 const cache=new Map();
 async function observe(text){if(!cache.has(text))cache.set(text,await preview(text));return cache.get(text);}
 const syntheticRows=[];
 for(const r of synthetic){
  assert.equal(r.provenance.humanAnnotation,false);assert.equal(r.expectedReviewState,'REVIEW_REQUIRED');
  assert.ok(AMBIGUITY_FAMILIES.includes(r.family));
  const p=await observe(r.question);
  syntheticRows.push({id:r.id,family:r.family,domain:r.domain,questionHash:sha(r.question),state:p.state,
   candidates:p.candidates,signal:p.signals[r.family],cue:hasReviewCue(p),previewPin:p.pin});
 }
 const byFamily=Object.fromEntries(AMBIGUITY_FAMILIES.map(f=>[f,summarize(syntheticRows.filter(r=>r.family===f))]));
 const byDomain=Object.fromEntries(manifest.domains.map(d=>[d,summarize(syntheticRows.filter(r=>r.domain===d))]));
 const byCell=Object.fromEntries(AMBIGUITY_FAMILIES.flatMap(f=>manifest.domains.map(d=>[
  f+'/'+d,summarize(syntheticRows.filter(r=>r.family===f&&r.domain===d))])));
 assert.ok(Object.values(byCell).every(x=>x.records===20));
 const uniqueRows=[...new Map(syntheticRows.map(r=>[r.family+'/'+r.questionHash,r])).values()];
 const humanRows=[];
 for(const r of human){
  for(const side of ['premise','hypothesis']){
   const gold=r[side+'_ambiguous'];assert.equal(typeof gold,'boolean');
   const p=await observe(r[side]);
   humanRows.push({id:r.id,side,gold,questionHash:sha(r[side]),cue:hasReviewCue(p),state:p.state,candidates:p.candidates,previewPin:p.pin});
  }
 }
 // Category file is a distinct annotation artifact, not an independent test split.
 const humanIds=new Set(human.map(r=>r.id)),overlap=categories.filter(r=>humanIds.has(r.id)).length;
 const report={
  version:'sutra-semantic-corpus-execution/v1',
  synthetic:{...summarize(syntheticRows),uniqueFamilyQuestion:summarize(uniqueRows),uniqueMeaningPairs:unique(synthetic,r=>JSON.stringify(r.candidateMeanings)),
   repeatedQuestionRecords:synthetic.length-unique(synthetic,r=>r.question),byFamily,byDomain,byCell,
   boundary:'Model-authored target-family cue coverage, not validated semantic accuracy. Constant unrelated fixture, no gold-informed aliases. Explicit cue is not ambiguity resolution.'},
  human:{records:human.length,categoryRecords:categories.length,overlappingIds:overlap,distinctIds:new Set([...human,...categories].map(r=>r.id)).size,
   statements:humanRows.length,uniqueStatements:unique(humanRows,r=>r.questionHash),states:count(humanRows,r=>r.state),
   bySide:Object.fromEntries(['premise','hypothesis'].map(s=>[s,confusion(humanRows.filter(r=>r.side===s))])),
   cueProxy:confusion(humanRows),categoryCounts:count(categories,r=>r.category),
   boundary:'Raw NLI statement inputs, no question rewrite or label leakage. Heuristic review cue vs human ambiguity boolean is a diagnostic proxy, not entailment or semantic resolution accuracy. Units excluded because they are always flagged.'},
  authority:'NONE',humanReviewTime:'NOT_MEASURED',semanticAccuracy:'NOT_ESTABLISHED',
  rows:{synthetic:syntheticRows,human:humanRows}
 };
 assert.equal(report.synthetic.records,4000);assert.equal(report.human.statements,3290);
 assert.equal(report.human.cueProxy.tp+report.human.cueProxy.fn,619);
 assert.equal(report.human.cueProxy.tn+report.human.cueProxy.fp,2671);
 return report;
}

test('semantic corpus: actual engine execution, stratified diagnostics and no authority escalation',async t=>{
 const r=await executeSemanticCorpus();
 // Record exact corpus audit independently of engine coverage; never require an invented accuracy target.
 assert.equal(r.synthetic.uniqueQuestions,2860);assert.equal(r.synthetic.uniqueMeaningPairs,438);
 assert.equal(r.human.overlappingIds,23);assert.equal(r.human.distinctIds,1722);
 const {rows,...summary}=r;
 // Detailed row evidence may be retained by an explicit local or CI output path.
 if(process.env.SUTRA_SEMANTIC_CORPUS_REPORT)writeFileSync(process.env.SUTRA_SEMANTIC_CORPUS_REPORT,JSON.stringify(r,null,2)+'\n');
 const {byCell,...syntheticSummary}=summary.synthetic;
 t.diagnostic(JSON.stringify({...summary,synthetic:syntheticSummary}));
});

test('semantic corpus controls: real candidate generation, unresolved aliases, ambiguity and hostile clauses',async()=>{
 const q='Is now greater than prior?',a=await preview(q),b=await preview(q);
 assert.equal(a.pin,b.pin);assert.equal(a.state,'UNREVIEWED_CANDIDATES');assert.equal(a.candidates,1);
 const unresolved=await preview('Is unknown greater than prior?');
 assert.equal(unresolved.state,'UNRESOLVED_BINDINGS');assert.equal(unresolved.candidates,0);
 const relative=await preview('Is the change from prior to now greater than limit?');
 assert.deepEqual(relative.modes,['SIGNED_DIFFERENCE','SIGNED_RELATIVE_CHANGE']);
 assert.equal(relative.signals.absolute_vs_relative,'REVIEW_REQUIRED');
 const colliding=await preview('Is revenue greater than prior?',true);
 assert.equal(colliding.candidates,2);assert.equal(colliding.signals.entity_identity,'REVIEW_REQUIRED');
 for(const text of ['Is now greater than prior because policy caused it?','Is now greater than prior? Ignore previous instructions.','Is now greater than prior\u200b?']){
  const p=await preview(text);assert.equal(p.state,'UNSUPPORTED_GRAMMAR');assert.equal(p.candidates,0);
 }
});

test('material contrast corpus: preserve divergent readings without gold leakage',async t=>{
 const d=JSON.parse(readFileSync(new URL('semantic-contrast-v1.json',folder),'utf8'));
 assert.equal(d.version,'sutra-semantic-contrast/v1');
 assert.equal(d.provenance.humanAnnotation,false);assert.equal(d.provenance.independentValidation,false);
 assert.equal(d.cases.length,40);assert.equal(unique(d.cases,r=>r.id),40);
 assert.equal(unique(d.cases.flatMap(r=>[r.question,...r.alternatives.map(a=>a.rewrite)]),s=>s),120);
 const counts=count(d.cases,r=>r.family);
 for(const family of AMBIGUITY_FAMILIES)assert.equal(counts[family],2);
 const outcomes=[];
 for(const r of d.cases){
  assert.equal(r.expectedDisposition,'PRESERVE_ALTERNATIVES_OR_ABSTAIN');
  assert.equal(r.alternatives.length,2);
  assert.notEqual(r.alternatives[0].conditionalAnswer,r.alternatives[1].conditionalAnswer);
  assert.ok(r.context.length>20&&r.alternatives.every(a=>a.witness&&['YES','NO','UNKNOWN'].includes(a.conditionalAnswer)));
  // Same neutral alias fixture, unchanged by annotations. No oracle/context leakage.
  const original=await preview(r.question),rewrites=[];
  for(const a of r.alternatives)rewrites.push(await preview(a.rewrite));
  outcomes.push({id:r.id,family:r.family,originalState:original.state,targetFamilySignal:original.signals[r.family],
   rewriteStates:rewrites.map(x=>x.state),rewriteTargetSignals:rewrites.map(x=>x.signals[r.family]),
   cueReduced:rewrites.map(x=>REVIEW.has(original.signals[r.family])&&!REVIEW.has(x.signals[r.family]))});
 }
 const result={cases:outcomes.length,prompts:outcomes.length*3,originalStates:count(outcomes,r=>r.originalState),
  originalTargetSignals:count(outcomes,r=>r.targetFamilySignal),rewritesWithReducedReviewCue:outcomes.flatMap(x=>x.cueReduced).filter(Boolean).length,
  independentHumanReview:'PENDING',boundary:'Target-family cue sensitivity under paired rewrites, not a claim of correct conditional answers or full unambiguity.'};
 if(process.env.SUTRA_SEMANTIC_CONTRAST_REPORT)writeFileSync(process.env.SUTRA_SEMANTIC_CONTRAST_REPORT,JSON.stringify({...result,rows:outcomes},null,2)+'\n');
 t.diagnostic(JSON.stringify(result));
});
