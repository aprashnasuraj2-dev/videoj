// Diagnostic incremental replay, never a replacement for full version admission.
import {parseUniqueJson} from '../sutra-consent/strict-json.js';
import {createVerifier} from './index.js';
import {casePin} from './pinned-investigation.js';
import {replayInvestigationVersion,compareInvestigationVersions} from './investigation-revision.js';
import {compileReviewedProposal} from './reviewed-claim-compiler.js';
export const VERSION='sutra-revision-reuse-audit/v1';
const parse=(s,d=9)=>parseUniqueJson(s,{maxChars:262144,maxDepth:d});
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const canonical=x=>x===null||typeof x!=='object'?JSON.stringify(x):Array.isArray(x)?'['+x.map(canonical).join(',')+']':'{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canonical(x[k])).join(',')+'}';
const outcomes=r=>(r?.receipts??[]).map(x=>({id:x.id,outcome:x.outcome}));
async function project(compiled){
 if(!compiled?.graphText)return null;
 const graph=parse(compiled.graphText),nodes=new Map(compiled.nodes.map(n=>[n.id,n])),bindings=new Map(compiled.bindings.map(b=>[b.id,b]));
 for(const node of graph.nodes){
  if(node.kind!=='input')continue;
  const b=bindings.get(nodes.get(node.id).bindingId);
  // Bind the full compiler-admitted span, exact source digest, lineage, type and value.
  // The separate version pin remains authoritative; this basis is only a cache identity.
  node.basis='reviewed-binding/v1 '+await casePin(canonical(b));
 }
 return JSON.stringify(graph);
}
async function prepare(versionText,expectedPin){
 const r=await replayInvestigationVersion(versionText,expectedPin),v=parse(versionText,6),b=parse(v.batchText,5);
 const proposals=new Map(b.proposals.map(p=>[p.id,p.proposalText])),out=new Map();
 for(const c of r.investigation.candidates){
  const compiled=c.admission==='ADMITTED'?await compileReviewedProposal(v.contractText,v.contractPin,proposals.get(c.id)):null;
  out.set(c.id,{state:c.computation?.status??'REFUSED',compiled,graph:await project(compiled)});
 }
 return out;
}
export async function auditRevisionReuse(beforeText,beforePin,afterText,afterPin){
 const impact=await compareInvestigationVersions(beforeText,beforePin,afterText,afterPin);
 const before=await prepare(beforeText,beforePin),after=await prepare(afterText,afterPin),rows=[];
 for(const id of [...new Set([...before.keys(),...after.keys()])].sort()){
  const a=before.get(id),b=after.get(id),verifier=createVerifier();
  const first=a?.graph?await verifier.evaluate(a.graph):null;
  const next=b?.graph?await verifier.evaluate(b.graph):null;
  const fresh=b?.graph?await createVerifier().evaluate(b.graph):null;
  if(canonical(outcomes(first?.report))!==canonical(outcomes(a?.compiled?.report))||
    canonical(outcomes(next?.report))!==canonical(outcomes(b?.compiled?.report))||
    (next?.reportText??null)!==(fresh?.reportText??null))throw Error('REVISION_REUSE_DIVERGENCE');
  rows.push({id,before:a?.state??'ABSENT',after:b?.state??'ABSENT',reused:next?.stats.reused??[],executed:next?.stats.executed??[],
   removed:next?.stats.removed??(first?.report.receipts.map(r=>r.id)??[]),projectedReportDigest:next?.report.graphDigest??null,
   freshCanonicalMatch:true,compilerOutcomesMatch:true});
 }
 return freeze({version:VERSION,beforeDigest:beforePin,afterDigest:afterPin,rows,
  counts:{reused:rows.reduce((n,r)=>n+r.reused.length,0),executed:rows.reduce((n,r)=>n+r.executed.length,0),removed:rows.reduce((n,r)=>n+r.removed.length,0)},
  fullImpact:impact,decisionAuthority:'NONE',qualification:'Diagnostic projected computation reuse only. Both complete versions and compiler outcomes are replayed; no end-to-end speedup claimed. Projected receipts are not version-specific compiler receipts or external evidence. Changes to source bytes, span, declared lineage, type or value invalidate binding identity. No imported cache.'});
}
