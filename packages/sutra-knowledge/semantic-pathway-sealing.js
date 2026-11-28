import {parseUniqueJson} from '../sutra-consent/strict-json.js';
import {casePin} from './pinned-investigation.js';
import {sealReviewedDraft} from './reviewed-draft.js';
import {compileReviewedExpression} from './reviewed-expression.js';
import {PATHWAYS} from './semantic-input-pathways.js';
import {semanticOperationExpression as expr} from './semantic-operation-schema.js';

export const VERSION='sutra-semantic-pathway-sealing/v1';
const OPS=new Set(['>','>=','<','<=','==']);
const MODES=new Set(['DIRECT_COMPARISON','SIGNED_DIFFERENCE','SIGNED_RELATIVE_CHANGE','RATIO','PERCENTAGE_POINT_CHANGE','AGGREGATE_SUM','WEIGHTED_MEAN','TEMPORAL_COMPARISON','TEMPORAL_RELATIVE_CHANGE']);
const fail=x=>{throw TypeError('SEMANTIC_SEAL_'+x);};
const keys=(x,k)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).length===k.length&&k.every(y=>Object.hasOwn(x,y));
const parse=(s,d=14)=>parseUniqueJson(s,{maxChars:262144,maxDepth:d});
const sort=(a,b)=>a<b?-1:a>b?1:0;
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
function stable(x){if(x===null||typeof x!=='object')return x;if(Array.isArray(x))return x.map(stable);return Object.fromEntries(Object.keys(x).sort().map(k=>[k,stable(x[k])]))}
function canonicalEvidenceDraft(d){
 if(!keys(d,['version','question','sources','bindings'])||d.version!==1||typeof d.question!=='string'||!Array.isArray(d.sources)||!Array.isArray(d.bindings))fail('EVIDENCE');
 const sources=d.sources.map(s=>{if(!keys(s,['id','text','lineage']))fail('SOURCE');return {id:s.id,text:s.text,lineage:s.lineage}}).sort((a,b)=>sort(a.id,b.id));
 const bindings=d.bindings.map(b=>{if(!keys(b,['id','sourceId','start','end','type']))fail('BINDING');return {id:b.id,sourceId:b.sourceId,start:b.start,end:b.end,type:stable(b.type)}}).sort((a,b)=>sort(a.id,b.id));
 return {version:1,question:d.question,sources,bindings};
}
function roleRows(rows){
 if(!Array.isArray(rows))fail('ROLE_ROWS');const out=Object.create(null);
 for(const row of rows){if(!Array.isArray(row)||row.length!==2||typeof row[0]!=='string'||Object.hasOwn(out,row[0]))fail('ROLE_ROW');out[row[0]]=row[1];}
 return out;
}
function normalizeRoles(raw,ids){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))fail('ROLES');const out=Object.create(null);
 for(const [k,v] of Object.entries(raw).sort(([a],[b])=>sort(a,b))){if(!/^[A-Za-z][A-Za-z0-9_-]{0,31}$/.test(k)||typeof v!=='string'||!ids.has(v))fail('ROLE_BINDING');out[k]=v}return out;
}
function prepare(pathway,p){
 if(pathway==='structured_table'){
  if(!keys(p,['version','question','source','bindingColumns','bindingRows','mode','operator','columns','rows'])||p.version!==2||JSON.stringify(p.bindingColumns)!==JSON.stringify(['id','sourceId','start','end','type'])||JSON.stringify(p.columns)!==JSON.stringify(['role','bindingId'])||!Array.isArray(p.bindingRows)||!Array.isArray(p.rows))fail('TABLE');
  const bindings=p.bindingRows.map(row=>{if(!Array.isArray(row)||row.length!==5)fail('TABLE_BINDING_ROW');return {id:row[0],sourceId:row[1],start:row[2],end:row[3],type:row[4]}});
  return {draft:canonicalEvidenceDraft({version:1,question:p.question,sources:[p.source],bindings}),mode:p.mode,operator:p.operator,roles:roleRows(p.rows),supplied:null};
 }
 if(pathway==='template_rule'){if(!keys(p,['version','evidence','template','operator','arguments'])||p.version!==2)fail('TEMPLATE');return {draft:canonicalEvidenceDraft(p.evidence),mode:p.template,operator:p.operator,roles:p.arguments,supplied:null}}
 if(pathway==='user_expression'){if(!keys(p,['version','evidence','declaredMode','operator','roles','expression'])||p.version!==2||typeof p.expression!=='string')fail('EXPRESSION');return {draft:canonicalEvidenceDraft(p.evidence),mode:p.declaredMode,operator:p.operator,roles:p.roles,supplied:p.expression}}
 if(pathway==='document_extract'){
  if(!keys(p,['version','question','document','relationship','selections'])||p.version!==2||!keys(p.document,['id','text','lineage'])||!keys(p.relationship,['mode','operator'])||!p.selections||typeof p.selections!=='object'||Array.isArray(p.selections))fail('DOCUMENT');
  const byId=new Map(),roles=Object.create(null);for(const [role,s] of Object.entries(p.selections)){if(!keys(s,['bindingId','start','end','type']))fail('DOCUMENT_SELECTION');roles[role]=s.bindingId;const row={id:s.bindingId,sourceId:p.document.id,start:s.start,end:s.end,type:s.type},prior=byId.get(s.bindingId);if(prior&&JSON.stringify(stable(prior))!==JSON.stringify(stable(row)))fail('DOCUMENT_DUPLICATE');byId.set(s.bindingId,row)}
  return {draft:canonicalEvidenceDraft({version:1,question:p.question,sources:[p.document],bindings:[...byId.values()]}),mode:p.relationship.mode,operator:p.relationship.operator,roles,supplied:null};
 }
 if(!keys(p,['version','authority','reviewedEvidence','proposal'])||p.version!==2||p.authority!=='UNTRUSTED_PROPOSAL'||!keys(p.proposal,['mode','operator','roles']))fail('MODEL');
 return {draft:canonicalEvidenceDraft(p.reviewedEvidence),mode:p.proposal.mode,operator:p.proposal.operator,roles:p.proposal.roles,supplied:null};
}
export async function sealAndCompileSemanticPathway({pathway,payloadText,payloadPin}={}){
 if(!PATHWAYS.includes(pathway)||typeof payloadPin!=='string'||await casePin(payloadText)!==payloadPin)fail('INPUT');
 const prepared=prepare(pathway,parse(payloadText)),sealed=await sealReviewedDraft(JSON.stringify(prepared.draft)),contract=parse(sealed.contractText,10),roles=normalizeRoles(prepared.roles,new Set(contract.bindings.map(b=>b.id))),expression=expr(prepared.mode,roles,prepared.operator);
 if(prepared.supplied!==null&&prepared.supplied!==expression)fail('EXPRESSION_MISMATCH');
 const compiled=await compileReviewedExpression(sealed.contractText,sealed.pin,expression);
 return freeze({version:VERSION,pathway,contractText:sealed.contractText,contractPin:sealed.pin,mode:prepared.mode,operator:prepared.operator,roles,expression,semanticSignature:JSON.stringify({mode:prepared.mode,operator:prepared.operator,roles}),proposalDigest:compiled.proposalDigest,targetStatus:compiled.target.status,pathwayProvenance:pathway==='model_proposal'?'UNTRUSTED_MODEL_PROPOSAL':'CALLER_SUPPLIED_REVIEW_INPUT',decisionAuthority:'NONE'});
}
export function proveSealedPathwayConvergence(rows){
 if(!Array.isArray(rows)||rows.length!==PATHWAYS.length)fail('SET');const names=rows.map(x=>x.pathway).sort();if(JSON.stringify(names)!==JSON.stringify([...PATHWAYS].sort()))fail('PATHWAYS');
 const first=rows[0],differences=[];for(const row of rows.slice(1))for(const field of ['contractPin','contractText','expression','semanticSignature','proposalDigest'])if(row[field]!==first[field])differences.push({pathway:row.pathway,field,before:first[field],after:row[field]});
 return freeze({version:VERSION,status:differences.length?'DIVERGED':'CONVERGED',contractPin:first.contractPin,expression:first.expression,semanticSignature:first.semanticSignature,proposalDigest:first.proposalDigest,differences,decisionAuthority:'NONE',qualification:'Each pathway independently normalized and sealed its evidence representation. Exact convergence does not establish intended meaning or empirical truth.'});
}
