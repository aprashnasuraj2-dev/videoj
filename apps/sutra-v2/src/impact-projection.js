/* Read-only projection of a canonical revision impact, never a new invalidation authority. */
export function impactProjection({before,after,impact}={}){
 if(!before||!after||!impact||before.digest!==impact.beforeDigest||after.digest!==impact.afterDigest||before.digest===after.digest||!Array.isArray(impact.affectedDependencyNodes)||!Array.isArray(impact.candidates))throw Error('IMPACT_VERSION_MISMATCH');
 const roots=new Set([...impact.sourceChanges.map(x=>'source:'+x.id),...impact.bindingChanges.map(x=>'binding:'+x.id),...(impact.questionChanged?['source:question']:[])]);
 const affected=new Set(impact.affectedDependencyNodes),oldNodes=new Map(before.graph.nodes.map(n=>[n.id,n])),newNodes=new Map(after.graph.nodes.map(n=>[n.id,n]));
 const key=e=>JSON.stringify([e.dependency,e.dependent,e.relation,e.authority]);
 function affectedEdges(graph){
  const out=new Map(),adj=new Map();
  for(const e of graph.edges){if(!affected.has(e.dependency)||!affected.has(e.dependent))continue;if(!adj.has(e.dependency))adj.set(e.dependency,[]);adj.get(e.dependency).push(e);}
  const seen=new Set(roots),queue=[...roots];
  for(let i=0;i<queue.length;i++)for(const e of adj.get(queue[i])??[]){out.set(key(e),e);if(!seen.has(e.dependent)){seen.add(e.dependent);queue.push(e.dependent);}}
  return out;
 }
 // Traverse each version separately. Joining edges across versions can invent a path that never existed.
 const oldEdges=affectedEdges(before.graph),newEdges=affectedEdges(after.graph);
 const edges=[...new Set([...oldEdges.keys(),...newEdges.keys()])].sort().map(k=>({...oldEdges.get(k)??newEdges.get(k),state:oldEdges.has(k)?newEdges.has(k)?'both':'before-only':'after-only'}));
 const nodes=[...affected].sort().filter(id=>oldNodes.has(id)||newNodes.has(id)).map(id=>({id,kind:(oldNodes.get(id)??newNodes.get(id)).kind,root:roots.has(id),state:oldNodes.has(id)?newNodes.has(id)?'both':'before-only':'after-only'}));
 const candidates=impact.candidates.map(c=>({id:c.id,before:c.before,after:c.after,outcome:c.outcome,dependencyAffected:c.dependencyAffected,reviewRequired:c.reviewRequired}));
 return {nodes,edges,candidates,roots:[...roots].sort(),beforeDigest:before.digest,afterDigest:after.digest,triage:impact.triage,recomputation:impact.recomputation,qualification:impact.qualification};
}
