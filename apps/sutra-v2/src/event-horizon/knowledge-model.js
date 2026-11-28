// Canonical graph projection, not a new truth or invalidation authority.
import {investigationGraph,traceDependencies} from '../investigation-graph.js';
const names=Object.freeze({question:'Question',declared_lineage:'Declared lineage',evidence:'Evidence',reviewed_quantity:'Reviewed quantity',candidate_interpretation:'Interpretation'});
export function knowledgeProjection(workspace){
 if(!workspace)return null;
 const graph=investigationGraph(workspace);
 const sources=new Map(workspace.sources.map(s=>['source:'+s.id,s]));
 const bindings=new Map(workspace.bindings.map(b=>['binding:'+b.id,b]));
 const candidates=new Map((workspace.current?.report.investigation.candidates??[]).map(c=>['candidate:'+c.id,c]));
 const nodes=graph.nodes.map(n=>{
  const source=sources.get(n.id),binding=bindings.get(n.id),candidate=candidates.get(n.id);
  const text=binding?(sources.get('source:'+binding.sourceId)?.text??(binding.sourceId==='question'?workspace.question:undefined)):undefined;
  return {key:n.id,kind:n.kind,label:n.kind==='question'?'Original question':n.id.slice(n.id.indexOf(':')+1),description:names[n.kind]??n.kind,
   status:candidate?.computation?.status??(candidate?'REFUSED':workspace.current?'recorded':'draft'),identity:n.identity,
   ...(source?{source:{id:source.id,lineage:source.lineage,text:source.text}}:{}),
   ...(binding?{binding:{id:binding.id,sourceId:binding.sourceId,start:binding.start,end:binding.end,quote:typeof text==='string'?text.slice(binding.start,binding.end):null,type:binding.type}}:{}),
   ...(candidate?{candidate:{meaning:candidate.meaning,admission:candidate.admission,status:candidate.computation?.status??candidate.reason??'REFUSED',coverage:candidate.questionCoverage,meaningStatus:candidate.meaningStatus}}:{})};
 });
 return {nodes,edges:graph.edges.map(e=>({from:e.dependency,to:e.dependent,kind:e.relation,authority:e.authority})),graph,question:workspace.question??'',version:workspace.current?.digest??null,baseline:workspace.baseline?.digest??null,triage:workspace.current?.report.investigation.triage.state??null,qualification:graph.qualification??'Recorded dependency graph; not empirical proof.'};
}
export function knowledgeRelations(model,id){
 if(!model?.nodes.some(n=>n.key===id))return {upstream:new Set(),downstream:new Set(),direct:[]};
 return {upstream:traceDependencies(model.graph,id,false),downstream:traceDependencies(model.graph,id,true),direct:model.edges.filter(e=>e.from===id||e.to===id)};
}
export function declaredLineageGroups(model){
 const map=new Map();for(const n of model?.nodes??[]){if(!n.source)continue;const name=n.source.lineage;if(!map.has(name))map.set(name,[]);map.get(name).push(n.source.id);}
 return [...map].map(([lineage,sources])=>({lineage,sources}));
}
