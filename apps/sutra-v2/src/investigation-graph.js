/* Read-only projection of the reviewed workspace; never grants evidence or computation authority. */
function draftGraph(s){
 const nodes=[{id:'source:question',kind:'question',identity:s.question}],edges=[];
 for(const x of s.sources){const root='lineage:'+x.lineage;if(!nodes.some(n=>n.id===root))nodes.push({id:root,kind:'declared_lineage',identity:x.lineage});nodes.push({id:'source:'+x.id,kind:'evidence',identity:x.id});edges.push({dependent:'source:'+x.id,dependency:root,relation:'declared_ancestry',authority:'HOST_DECLARATION'});}
 for(const b of s.bindings){const x=s.sources.find(x=>x.id===b.sourceId);nodes.push({id:'binding:'+b.id,kind:'reviewed_quantity',identity:(x?.text??s.question).slice(b.start,b.end)});edges.push({dependent:'binding:'+b.id,dependency:'source:'+b.sourceId,relation:'selected_source_span',authority:'DRAFT_DECLARATION'});}
 return {nodes,edges,qualification:'Draft selections and declared ancestry only. Evaluate meanings to obtain compiler-admitted dependencies.'};
}

export function investigationGraph(state){return state.current?.report.graph??draftGraph(state);}
export function traceDependencies(g,id,reverse=false){
 const adjacency=new Map();
 for(const e of g.edges){
  const from=reverse?e.dependency:e.dependent,to=reverse?e.dependent:e.dependency;
  if(!adjacency.has(from))adjacency.set(from,[]);
  adjacency.get(from).push(to);
 }
 const seen=new Set([id]),stack=[id];
 while(stack.length){for(const to of adjacency.get(stack.pop())??[]){if(!seen.has(to)){seen.add(to);stack.push(to);}}}
 seen.delete(id);return seen;
}
