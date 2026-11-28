import test from 'node:test';import assert from 'node:assert/strict';
import {sealReviewedDraft} from '../reviewed-draft.js';import {casePin} from '../pinned-investigation.js';import {buildSemanticIntentIR} from '../semantic-intent-ir.js';import {renderControlledIntent,detectControlledIntentDrift,verifyControlledIntentRoundtrip} from '../controlled-intent-roundtrip.js';
async function artifact(){const text='100; 120; 3/20',money={kind:'currency_amount',unit:'USD',scope:'company_A',dimension:[0,0,0]},ratio={kind:'ratio',unit:'one',scope:'company_A',dimension:[0,0,0]},bindings=[{id:'prior',sourceId:'s',start:0,end:3,type:money},{id:'now',sourceId:'s',start:5,end:8,type:money},{id:'limit',sourceId:'s',start:10,end:14,type:ratio}],sealed=await sealReviewedDraft(JSON.stringify({version:1,question:'Is the signed relative change from prior to now greater than limit?',sources:[{id:'s',text,lineage:'synthetic'}],bindings})),catalogText=JSON.stringify({version:1,contractDigest:sealed.pin,aliases:[{alias:'prior',bindingIds:['prior']},{alias:'now',bindingIds:['now']},{alias:'limit',bindingIds:['limit']}]});return buildSemanticIntentIR({contractText:sealed.contractText,contractPin:sealed.pin,catalogText,catalogPin:await casePin(catalogText)});}
function mutate(text,fn){const rows=text.trimEnd().split('\n'),i=rows.findIndex(x=>x.startsWith('RELATION\t'));assert.ok(i>=0,'fixture must contain a RELATION row');const o=JSON.parse(rows[i].slice(rows[i].indexOf('\t')+1));fn(o);rows[i]='RELATION\t'+JSON.stringify(o);return rows.join('\n')+'\n';}
test('controlled round trip is clean without mutation',async()=>{const a=await artifact();assert.equal(a.candidates.length,1);const r=await verifyControlledIntentRoundtrip(a.intentText,a.intentPin);assert.equal(r.status,'ROUNDTRIP_CLEAN');assert.deepEqual(r.classes,[]);});
test('scope definition negation denominator and invented relation drift are explicit',async()=>{const a=await artifact(),r=await renderControlledIntent(a.intentText,a.intentPin);
 const cases=[['DENOMINATOR_DRIFT',o=>o.denominatorBinding='now'],['NEGATION_DRIFT',o=>o.negated=!o.negated],['SCOPE_DRIFT',o=>o.declaredTypes.prior.scope='company_B'],['DEFINITION_DRIFT',o=>o.mode='SIGNED_DIFFERENCE'],['INVENTED_RELATION_DRIFT',o=>o.operator='<=']];
 for(const [kind,fn] of cases){const text=mutate(r.controlledText,fn),d=await detectControlledIntentDrift(a.intentText,a.intentPin,text,await casePin(text));assert.ok(d.classes.includes(kind),kind);}
});

test('re-pinning controlled text cannot hide baseline, type dimension, meaning, status or obligations drift',async()=>{
 const a=await artifact(),r=await renderControlledIntent(a.intentText,a.intentPin);
 function change(tag,mut){return r.controlledText.split('\n').map(row=>{if(!row.startsWith(tag+'\t'))return row;const value=JSON.parse(row.slice(tag.length+1));mut(value);return tag+'\t'+JSON.stringify(value);}).join('\n');}
 for(const [tag,kind,fn] of [
  ['RELATION','BASELINE_DRIFT',o=>o.baselineBinding='now'],
  ['RELATION','DIMENSION_DRIFT',o=>o.declaredTypes.prior.dimension=[9,0,0]],
  ['RELATION','TYPE_RECORD_DRIFT',o=>o.declaredTypes.prior.extra='invented'],
  ['CANDIDATE','MEANING_DRIFT',o=>o.meaning='invented meaning'],
  ['CANDIDATE','STATUS_DRIFT',o=>o.status='APPROVED'],
  ['OBLIGATIONS','OBLIGATION_DRIFT',o=>o.obligations.empiricalValidity.state='VERIFIED']
 ]){const text=change(tag,fn),d=await detectControlledIntentDrift(a.intentText,a.intentPin,text,await casePin(text));assert.equal(d.status,'DRIFT_DETECTED');assert.ok(d.classes.includes(kind),kind);assert.equal(d.decisionAuthority,'NONE');}
 const rows=r.controlledText.trimEnd().split('\n'),duplicate=rows.concat(rows.slice(2)).join('\n')+'\n';
 await assert.rejects(detectControlledIntentDrift(a.intentText,a.intentPin,duplicate,await casePin(duplicate)),/CONTROLLED_INTENT_CANDIDATE/);
});
