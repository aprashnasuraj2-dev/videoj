// Portable unreviewed mapping artifact, not a canonical proof capsule.
import {casePin} from './pinned-investigation.js';
import {parseUniqueJson} from '../sutra-consent/strict-json.js';
import {induceReviewedQuestion} from './alias-intent-induction.js';
const VERSION='sutra-alias-intent-artifact/v1';
const keys=(o,k)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).length===k.length&&k.every(x=>Object.hasOwn(o,x));
const fail=c=>{throw TypeError('INDUCTION_ARTIFACT_'+c);};
const freeze=o=>{if(o&&typeof o==='object'&&!Object.isFrozen(o)){Object.values(o).forEach(freeze);Object.freeze(o);}return o;};
export async function exportInducedQuestion(input){
 const preview=await induceReviewedQuestion(input);
 const artifactText=JSON.stringify({version:VERSION,contractText:input.contractText,contractPin:input.contractPin,catalogText:input.catalogText,catalogPin:input.catalogPin,preview});
 const size=new TextEncoder().encode(artifactText).length;
 if(size>262144||artifactText.length>262144)fail('SIZE');
 return freeze({artifactText,artifactPin:await casePin(artifactText),byteLength:size,decisionAuthority:'NONE'});
}
export async function replayInducedQuestion({artifactText,artifactPin,expectedContractPin,expectedCatalogPin,signal}={}){
 if(typeof artifactPin!=='string'||await casePin(artifactText)!==artifactPin)fail('PIN');
 const a=parseUniqueJson(artifactText,{maxChars:262144,maxDepth:16});
 if(!keys(a,['version','contractText','contractPin','catalogText','catalogPin','preview'])||a.version!==VERSION)fail('SHAPE');
 if(typeof expectedContractPin!=='string'||typeof expectedCatalogPin!=='string'||a.contractPin!==expectedContractPin||a.catalogPin!==expectedCatalogPin)fail('EXPECTED_INPUTS');
 const preview=await induceReviewedQuestion({contractText:a.contractText,contractPin:a.contractPin,catalogText:a.catalogText,catalogPin:a.catalogPin,signal});
 if(JSON.stringify(preview)!==JSON.stringify(a.preview))fail('PREVIEW_MISMATCH');
 return freeze({version:VERSION,artifactPin,preview,decisionAuthority:'NONE',reviewRequired:true,qualification:'Recomputed mapping preview only; no semantic approval, computation, evidence truth or authenticated history.'});
}
