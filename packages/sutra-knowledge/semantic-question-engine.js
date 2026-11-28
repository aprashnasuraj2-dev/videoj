// Repaired portable semantic-engine intake over SUTRA reviewed contracts.
// Deterministic bounded grammar; aliases are caller declarations, not semantic authority.
import {parseUniqueJson} from '../sutra-consent/strict-json.js';
import {casePin} from './pinned-investigation.js';
import {validateReviewedContract} from './reviewed-claim-compiler.js';
import {compileReviewedExpression} from './reviewed-expression.js';
import {analyzeSemanticContext} from './semantic-context-analyzer.js';

export const VERSION='sutra-semantic-question-engine/v1';
export const AMBIGUITY_FAMILIES=Object.freeze(['entity_identity','metric_definition','numerator','denominator','reporting_period','population','geography','units','scaling','sign','absolute_vs_relative','percentage_vs_percentage_point','aggregation','negation_scope','quantifier_scope','conditional_scope','baseline_selection','measurement_assumptions','modality','causal_vs_observational']);
const ID=/^[A-Za-z][A-Za-z0-9_-]{0,63}$/;
const ALIAS=/^[\p{L}\p{M}\p{N}_]+(?:[ _-][\p{L}\p{M}\p{N}_]+)*$/u;
const RESERVED=/(?:^|[ _-])(?:and|or|if|unless|because|except|cause|causes|caused|causal|approve|ignore|instruction)(?:$|[ _-])/iu;
const REL=[['not greater than','<='],['not less than','>='],['no more than','<='],['no less than','>='],['greater than','>'],['higher than','>'],['less than','<'],['lower than','<'],['at least','>='],['at most','<='],['equal to','==']];
const RELMAP=Object.freeze(Object.fromEntries(REL));
const fail=x=>{throw TypeError('SEMANTIC_ENGINE_'+x);};
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const keys=(x,k)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).length===k.length&&k.every(y=>Object.hasOwn(x,y));
const parse=(s,d=10)=>parseUniqueJson(s,{maxChars:262144,maxDepth:d});
const safe=s=>typeof s==='string'&&s.length>0&&s.length<=128&&ALIAS.test(s)&&!RESERVED.test(s);
const sort=(a,b)=>a<b?-1:a>b?1:0;
function catalog(raw,contractPin,ids){
 if(!keys(raw,['version','contractDigest','aliases'])||raw.version!==1||raw.contractDigest!==contractPin||!Array.isArray(raw.aliases)||raw.aliases.length>128)fail('CATALOG');
 const map=new Map();
 for(const row of raw.aliases){
  if(!keys(row,['alias','bindingIds'])||!safe(row.alias)||map.has(row.alias)||!Array.isArray(row.bindingIds)||!row.bindingIds.length||row.bindingIds.length>8||new Set(row.bindingIds).size!==row.bindingIds.length||row.bindingIds.some(id=>!ID.test(id)||!ids.has(id)))fail('ALIAS');
  map.set(row.alias,row.bindingIds.slice().sort(sort));
 }
 return map;
}
function relation(text){for(const [phrase,op] of REL){const marker=' '+phrase+' ',i=text.lastIndexOf(marker);if(i>=0)return {phrase,op,index:i,after:i+marker.length};}return null;}
function product(options){return options.reduce((n,x)=>n*x.length,1);}
function mappings(parts,lookup,limit=64){
 const options=[];for(const part of parts){const ids=lookup.get(part.alias);if(!ids)return {missing:[part.alias],rows:[]};options.push({role:part.role,alias:part.alias,ids});}
 const count=product(options.map(x=>x.ids));if(count>limit)return {missing:[],rows:[],count,truncated:true};
 const rows=[];function walk(i,row){if(i===options.length){rows.push(row);return;}const o=options[i];for(const id of o.ids)walk(i+1,{...row,[o.role]:id});}walk(0,{});
 return {missing:[],rows,count,truncated:false};
}
function splitList(raw){const xs=raw.split(/\s*,\s*(?:and\s+)?|\s+and\s+/i).map(x=>x.trim()).filter(Boolean);return xs.length>=2&&xs.length<=8&&xs.every(safe)?xs:null;}
function parseQuestion(q){
 if(typeof q!=='string'||q.length>2048||!q.endsWith('?')||/[\u200b\u200c\u200d\u2060\ufeff]/u.test(q))return [];
 const out=[];
 let m=/^Is (.+) (not greater than|not less than|no more than|no less than|greater than|higher than|less than|lower than|at least|at most|equal to) (.+)\?$/.exec(q);
 if(m&&safe(m[1])&&safe(m[3])){const op=RELMAP[m[2]];out.push({mode:'DIRECT_COMPARISON',parts:[{role:'left',alias:m[1]},{role:'right',alias:m[3]}],build:x=>'['+x.left+']'+op+'['+x.right+']'});}
 m=/^Is the (signed difference|signed relative change|change) from (.+) to (.+) (not greater than|not less than|no more than|no less than|greater than|higher than|less than|lower than|at least|at most|equal to) (.+)\?$/.exec(q);
 if(m&&safe(m[2])&&safe(m[3])&&safe(m[5])){const op=RELMAP[m[4]],parts=[{role:'prior',alias:m[2]},{role:'now',alias:m[3]},{role:'limit',alias:m[5]}];if(m[1]!=='signed relative change')out.push({mode:'SIGNED_DIFFERENCE',parts,build:x=>'(['+x.now+']-['+x.prior+'])'+op+'['+x.limit+']'});if(m[1]!=='signed difference')out.push({mode:'SIGNED_RELATIVE_CHANGE',parts,build:x=>'((['+x.now+']-['+x.prior+'])/['+x.prior+'])'+op+'['+x.limit+']'});}
 m=/^Is the (ratio|proportion|rate) of (.+) to (.+) (not greater than|not less than|no more than|no less than|greater than|higher than|less than|lower than|at least|at most|equal to) (.+)\?$/.exec(q);
 if(m&&safe(m[2])&&safe(m[3])&&safe(m[5])){const op=RELMAP[m[4]];out.push({mode:'RATIO',parts:[{role:'numerator',alias:m[2]},{role:'denominator',alias:m[3]},{role:'limit',alias:m[5]}],build:x=>'(['+x.numerator+']/['+x.denominator+'])'+op+'['+x.limit+']'});}
 m=/^Is the percentage point change from (.+) to (.+) (not greater than|not less than|no more than|no less than|greater than|higher than|less than|lower than|at least|at most|equal to) (.+)\?$/.exec(q);
 if(m&&safe(m[1])&&safe(m[2])&&safe(m[4])){const op=RELMAP[m[3]];out.push({mode:'PERCENTAGE_POINT_CHANGE',parts:[{role:'prior',alias:m[1]},{role:'now',alias:m[2]},{role:'limit',alias:m[4]}],build:x=>'(['+x.now+']-['+x.prior+'])'+op+'['+x.limit+']'});}
 m=/^Is (.+) in ((?:19|20)\d{2}) (not greater than|not less than|no more than|no less than|greater than|higher than|less than|lower than|at least|at most|equal to) (.+) in ((?:19|20)\d{2})\?$/.exec(q);
 if(m&&safe(m[1])&&safe(m[4])){const a=m[1]+' '+m[2],b=m[4]+' '+m[5];if(safe(a)&&safe(b)){const op=RELMAP[m[3]];out.push({mode:'TEMPORAL_COMPARISON',parts:[{role:'left',alias:a},{role:'right',alias:b}],build:x=>'['+x.left+']'+op+'['+x.right+']'});}}
 m=/^Is the (?:percentage|percent|relative) change in (.+) from ((?:19|20)\d{2}) to ((?:19|20)\d{2}) (not greater than|not less than|no more than|no less than|greater than|higher than|less than|lower than|at least|at most|equal to) (.+)\?$/.exec(q);
 if(m&&safe(m[1])&&safe(m[5])){const a=m[1]+' '+m[2],b=m[1]+' '+m[3];if(safe(a)&&safe(b)){const op=RELMAP[m[4]];out.push({mode:'TEMPORAL_RELATIVE_CHANGE',parts:[{role:'prior',alias:a},{role:'now',alias:b},{role:'limit',alias:m[5]}],build:x=>'((['+x.now+']-['+x.prior+'])/['+x.prior+'])'+op+'['+x.limit+']'});}}
 m=/^Is the weighted (?:average|mean) of (.+) with weight (.+) and (.+) with weight (.+) (not greater than|not less than|no more than|no less than|greater than|higher than|less than|lower than|at least|at most|equal to) (.+)\?$/.exec(q);
 if(m&&[m[1],m[2],m[3],m[4],m[6]].every(safe)){const op=RELMAP[m[5]];out.push({mode:'WEIGHTED_MEAN',parts:[{role:'a',alias:m[1]},{role:'wa',alias:m[2]},{role:'b',alias:m[3]},{role:'wb',alias:m[4]},{role:'limit',alias:m[6]}],build:x=>'((['+x.a+']*['+x.wa+'])+(['+x.b+']*['+x.wb+']))/(['+x.wa+']+['+x.wb+'])'+op+'['+x.limit+']'});}
 m=/^Is the (sum|total|average|mean) of (.+) (not greater than|not less than|no more than|no less than|greater than|higher than|less than|lower than|at least|at most|equal to) (.+)\?$/.exec(q);
 if(m){const items=splitList(m[2]);if(items&&safe(m[4])){const op=RELMAP[m[3]],parts=[...items.map((alias,i)=>({role:'item'+i,alias})),{role:'limit',alias:m[4]}];if(m[1]==='sum'||m[1]==='total')out.push({mode:'AGGREGATE_SUM',parts,build:x=>'('+items.map((_,i)=>'['+x['item'+i]+']').join('+')+')'+op+'['+x.limit+']'});else out.push({mode:'AGGREGATE_MEAN',parts,portableOnly:'CURRENT_KERNEL_REQUIRES_REVIEWED_DIVISOR_BINDING'});}}
 return out;
}
export async function previewSemanticQuestion({contractText,contractPin,catalogText,catalogPin}={}){
 if(typeof catalogPin!=='string'||await casePin(catalogText)!==catalogPin)fail('CATALOG_PIN');
 await validateReviewedContract(contractText,contractPin);
 const c=parse(contractText),raw=parse(catalogText,8);if(raw?.contractDigest!==contractPin)fail('STALE_CATALOG');
 const lookup=catalog(raw,contractPin,new Set(c.bindings.map(x=>x.id))),parses=parseQuestion(c.question.text),candidates=[],unresolved=[];
 const aliasCollisions=[...lookup].filter(([,ids])=>ids.length>1).map(([alias])=>alias),byId=new Map(c.bindings.map(x=>[x.id,x])),typeCollisions=[];
 for(const [alias,ids] of lookup){if(new Set(ids.map(id=>JSON.stringify(byId.get(id)?.type))).size>1)typeCollisions.push(alias);}
 const context=analyzeSemanticContext({question:c.question.text,sources:c.sources,aliasCollisions,typeCollisions});
 for(const p of parses){const resolved=mappings(p.parts,lookup,64);if(resolved.missing.length){unresolved.push(...resolved.missing);continue;}if(resolved.truncated){unresolved.push('CANDIDATE_LIMIT:'+resolved.count);continue;}if(p.portableOnly){candidates.push({id:'portable_'+(candidates.length+1),mode:p.mode,status:'PORTABLE_ONLY',reason:p.portableOnly,expression:null,mapping:null,decisionAuthority:'NONE'});continue;}for(const mapping of resolved.rows)candidates.push({id:'candidate_'+(candidates.length+1),mode:p.mode,status:'KERNEL_READY',expression:p.build(mapping),mapping,decisionAuthority:'NONE'});}
 const diagnostics=context.diagnostics,state=!parses.length?(context.admission==='REFUSE'?'UNSUPPORTED_GRAMMAR':'SEMANTIC_REVIEW'):candidates.length?'UNREVIEWED_CANDIDATES':'UNRESOLVED_BINDINGS';
 const preview={version:VERSION,contractDigest:contractPin,catalogDigest:catalogPin,question:c.question.text,state,candidates,unresolved:[...new Set(unresolved)].sort(),ambiguities:diagnostics,contextProfile:context.profile,reviewPrompts:context.reviewPrompts,refusalReason:context.refusalReason,reviewRequired:true,decisionAuthority:'NONE',qualification:'Bounded structural/contextual semantic review plus a closed executable grammar. Review-only language is never promoted to computation; kernel-ready candidates still require reviewed computation. Unsupported hostile or semantically hidden suffixes fail closed.'};
 const previewText=JSON.stringify(preview),previewPin=await casePin(previewText);return freeze({...preview,previewText,previewPin});
}
export async function compileSemanticCandidate(input,candidateId,expectedPreviewPin){
 const preview=await previewSemanticQuestion(input);if(preview.previewPin!==expectedPreviewPin)fail('PREVIEW_NOT_RETAINED');
 const candidate=preview.candidates.find(x=>x.id===candidateId);if(!candidate||candidate.status!=='KERNEL_READY'||typeof candidate.expression!=='string')fail('CANDIDATE');
 const compiled=await compileReviewedExpression(input.contractText,input.contractPin,candidate.expression);
 if(compiled.decisionAuthority!=='NONE')fail('AUTHORITY');
 return freeze({version:VERSION,previewPin:preview.previewPin,candidate,compiled,reviewRequired:true,decisionAuthority:'NONE'});
}
