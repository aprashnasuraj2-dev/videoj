// Normalize five proposal pathways against one already-reviewed evidence contract.
import {parseUniqueJson} from '../sutra-consent/strict-json.js';
import {casePin} from './pinned-investigation.js';
import {validateReviewedContract} from './reviewed-claim-compiler.js';
import {compileReviewedExpression} from './reviewed-expression.js';
import {semanticOperationExpression as expression} from './semantic-operation-schema.js';

export const VERSION='sutra-semantic-input-pathway/v1';
export const PATHWAYS=Object.freeze(['structured_table','template_rule','user_expression','document_extract','model_proposal']);
const OPS=new Set(['>','>=','<','<=','==']);
const MODES=new Set(['DIRECT_COMPARISON','SIGNED_DIFFERENCE','SIGNED_RELATIVE_CHANGE','RATIO','PERCENTAGE_POINT_CHANGE','AGGREGATE_SUM','WEIGHTED_MEAN','TEMPORAL_COMPARISON','TEMPORAL_RELATIVE_CHANGE']);
const fail=x=>{throw TypeError('SEMANTIC_PATHWAY_'+x);};
const keys=(x,k)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).length===k.length&&k.every(y=>Object.hasOwn(x,y));
const parse=(s,d=10)=>parseUniqueJson(s,{maxChars:262144,maxDepth:d});
const sort=(a,b)=>a<b?-1:a>b?1:0;
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
function roles(x,ids){
 if(!x||typeof x!=='object'||Array.isArray(x))fail('ROLES');const out=Object.create(null);
 for(const [k,v] of Object.entries(x).sort(([a],[b])=>sort(a,b))){if(!/^[A-Za-z][A-Za-z0-9_-]{0,31}$/.test(k)||typeof v!=='string'||!ids.has(v))fail('ROLE_BINDING');out[k]=v;}
 return out;
}
function semantic(mode,operator,roleMap){return JSON.stringify({mode,operator,roles:roleMap});}
export async function normalizeSemanticPathway({contractText,contractPin,pathway,payloadText,payloadPin}={}){
 if(!PATHWAYS.includes(pathway)||typeof payloadPin!=='string'||await casePin(payloadText)!==payloadPin)fail('INPUT');
 await validateReviewedContract(contractText,contractPin);
 const contract=parse(contractText,9),ids=new Set(contract.bindings.map(b=>b.id)),p=parse(payloadText,10);
 let mode,operator,roleMap,expr;
 if(pathway==='structured_table'){
  if(!keys(p,['version','mode','operator','columns','rows'])||p.version!==1||!Array.isArray(p.columns)||JSON.stringify(p.columns)!==JSON.stringify(['role','bindingId'])||!Array.isArray(p.rows))fail('TABLE');
  const seen=new Set();roleMap=roles(Object.fromEntries(p.rows.map(row=>{if(!Array.isArray(row)||row.length!==2||typeof row[0]!=='string'||seen.has(row[0]))fail('TABLE_ROW');seen.add(row[0]);return row;})),ids);mode=p.mode;operator=p.operator;expr=expression(mode,roleMap,operator);
 }else if(pathway==='template_rule'){
  if(!keys(p,['version','template','operator','arguments'])||p.version!==1)fail('TEMPLATE');mode=p.template;operator=p.operator;roleMap=roles(p.arguments,ids);expr=expression(mode,roleMap,operator);
 }else if(pathway==='user_expression'){
  if(!keys(p,['version','declaredMode','operator','roles','expression'])||p.version!==1||typeof p.expression!=='string')fail('EXPRESSION');mode=p.declaredMode;operator=p.operator;roleMap=roles(p.roles,ids);expr=expression(mode,roleMap,operator);if(expr!==p.expression)fail('EXPRESSION_MISMATCH');
 }else if(pathway==='document_extract'){
  if(!keys(p,['version','relationship','selections'])||p.version!==1||!keys(p.relationship,['mode','operator']))fail('DOCUMENT');mode=p.relationship.mode;operator=p.relationship.operator;roleMap=roles(p.selections,ids);expr=expression(mode,roleMap,operator);
 }else{
  if(!keys(p,['version','authority','proposal'])||p.version!==1||p.authority!=='UNTRUSTED_PROPOSAL'||!keys(p.proposal,['mode','operator','roles']))fail('MODEL');mode=p.proposal.mode;operator=p.proposal.operator;roleMap=roles(p.proposal.roles,ids);expr=expression(mode,roleMap,operator);
 }
 return freeze({version:VERSION,pathway,contractDigest:contractPin,payloadDigest:payloadPin,mode,operator,roles:roleMap,expression:expr,semanticSignature:semantic(mode,operator,roleMap),
  pathwayProvenance:pathway==='model_proposal'?'UNTRUSTED_MODEL_PROPOSAL':'CALLER_SUPPLIED_REVIEW_INPUT',decisionAuthority:'NONE'});
}
export async function compileSemanticPathway(input){
 const normalized=await normalizeSemanticPathway(input),compiled=await compileReviewedExpression(input.contractText,input.contractPin,normalized.expression);
 return freeze({normalized,proposalDigest:compiled.proposalDigest,targetStatus:compiled.target.status,decisionAuthority:'NONE'});
}
export function proveSemanticPathwayConvergence(compiledRows){
 if(!Array.isArray(compiledRows)||compiledRows.length!==PATHWAYS.length)fail('CONVERGENCE_SET');
 const names=compiledRows.map(x=>x.normalized?.pathway).sort();if(JSON.stringify(names)!==JSON.stringify([...PATHWAYS].sort()))fail('CONVERGENCE_PATHWAYS');
 const first=compiledRows[0],differences=[];
 for(const row of compiledRows.slice(1)){
  for(const field of ['contractDigest','expression','semanticSignature'])if(row.normalized[field]!==first.normalized[field])differences.push({pathway:row.normalized.pathway,field,before:first.normalized[field],after:row.normalized[field]});
  if(row.proposalDigest!==first.proposalDigest)differences.push({pathway:row.normalized.pathway,field:'proposalDigest',before:first.proposalDigest,after:row.proposalDigest});
 }
 return freeze({version:VERSION,status:differences.length?'DIVERGED':'CONVERGED',contractDigest:first.normalized.contractDigest,expression:first.normalized.expression,semanticSignature:first.normalized.semanticSignature,differences,decisionAuthority:'NONE',
  qualification:'Convergence means the five supplied pathways compiled to the same reviewed evidence contract and executable proposal identity. It does not prove the inputs expressed the user\'s intended meaning.'});
}
