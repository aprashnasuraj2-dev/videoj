// Deterministic, bounded, display-only layouts. Edges never grant execution authority.
export const layouts=Object.freeze(['auto','radial','layered','clustered','grid','list']);
export function selectLayout(graph){
 const nodes=graph.nodes,edges=graph.edges;
 if(nodes.length<=1)return 'grid';
 if(nodes.length>48)return 'list';
 const meaningful=edges.filter(e=>e.kind==='dependency'||e.kind==='invocation ancestry');
 if(meaningful.length){
  const counts=new Map();for(const e of meaningful)counts.set(e.from,(counts.get(e.from)??0)+1);
  if(nodes.length<=12&&Math.max(...counts.values())>=3)return 'radial';
  return 'layered';
 }
 if(edges.length&&nodes.length>2)return 'clustered';
 return 'grid';
}
function connectedComponents(nodes,edges){
 const adjacency=new Map(nodes.map(n=>[n.key,[]]));for(const e of edges){if(!adjacency.has(e.from)||!adjacency.has(e.to))continue;adjacency.get(e.from).push(e.to);adjacency.get(e.to).push(e.from);}
 const byKey=new Map(nodes.map(n=>[n.key,n])),visited=new Set(),groups=[];
 for(const n of nodes){if(visited.has(n.key))continue;const queue=[n.key];visited.add(n.key);for(let i=0;i<queue.length;i++)for(const id of adjacency.get(queue[i]))if(!visited.has(id)){visited.add(id);queue.push(id);}groups.push(queue.map(id=>byKey.get(id)));}
 return groups;
}
function depthMap(nodes,edges){
 const ids=new Set(nodes.map(n=>n.key)),incoming=new Map(nodes.map(n=>[n.key,0])),children=new Map(nodes.map(n=>[n.key,[]])),depth=new Map(nodes.map(n=>[n.key,0]));
 for(const e of edges){if(!ids.has(e.from)||!ids.has(e.to)||e.from===e.to)continue;children.get(e.from).push(e.to);incoming.set(e.to,incoming.get(e.to)+1);}
 const queue=nodes.filter(n=>incoming.get(n.key)===0).map(n=>n.key);
 for(let i=0;i<queue.length;i++){const from=queue[i];for(const to of children.get(from)){depth.set(to,Math.max(depth.get(to),depth.get(from)+1));incoming.set(to,incoming.get(to)-1);if(!incoming.get(to))queue.push(to);}}
 return queue.length===nodes.length?depth:null;
}
export function layoutGraph(graph,mode='auto'){
 const nodes=graph.nodes.slice(0,64),ids=new Set(nodes.map(n=>n.key)),edges=graph.edges.filter(e=>ids.has(e.from)&&ids.has(e.to));
 const requested=layouts.includes(mode)?mode:'auto';
 let selected=requested==='auto'?selectLayout(graph):requested;
 if(selected==='list'||graph.nodes.length>64)return {mode:'list',positions:[],width:720,height:300};
 const positions=[];
 let width=720,height=300;
 if(selected==='radial'&&nodes.length<=12){
  // Only choose a real hub if it has outgoing edges; otherwise use a ring with no fake center.
  const out=new Map(nodes.map(n=>[n.key,0]));
  for(const e of edges)out.set(e.from,out.get(e.from)+1);
  const hub=nodes.reduce((best,n)=>out.get(n.key)>(out.get(best?.key)??0)?n:best,null);
  const ring=nodes.filter(n=>n!==hub);height=420;
  if(hub)positions.push({key:hub.key,x:360,y:210});
  ring.forEach((n,i)=>{const angle=-Math.PI/2+i*2*Math.PI/Math.max(1,ring.length);positions.push({key:n.key,x:360+245*Math.cos(angle),y:210+145*Math.sin(angle)});});
 }else if(selected==='layered'){
  const depth=depthMap(nodes,edges);
  if(!depth)selected='grid';
  else{
   const columns=new Map();for(const n of nodes){const d=depth.get(n.key);if(!columns.has(d))columns.set(d,[]);columns.get(d).push(n);}
   const maxRows=Math.max(1,...[...columns.values()].map(a=>a.length));
   width=Math.max(720,columns.size*156);height=Math.max(300,maxRows*108);
   for(const [d,col] of columns)col.forEach((n,i)=>positions.push({key:n.key,x:78+d*(width-156)/Math.max(1,columns.size-1),y:(i+1)*height/(col.length+1)}));
  }
 }else if(selected==='clustered'){
  const groups=connectedComponents(nodes,edges),cols=Math.min(3,Math.max(1,groups.length)),cellWidth=240,cellHeight=Math.max(180,...groups.map(g=>Math.ceil(g.length/2)*105));
  width=Math.max(720,cols*cellWidth);height=Math.max(300,Math.ceil(groups.length/cols)*cellHeight);
  groups.forEach((group,i)=>{const left=(i%cols)*width/cols,top=Math.floor(i/cols)*cellHeight,subcols=group.length===1?1:2;group.forEach((n,j)=>positions.push({key:n.key,x:left+(j%subcols+.5)*width/cols/subcols,y:top+48+Math.floor(j/subcols)*100}));});
 }else selected='grid';
 if(selected==='grid'){
  const cols=Math.min(5,Math.max(1,Math.ceil(Math.sqrt(nodes.length))));const rows=Math.max(1,Math.ceil(nodes.length/cols));height=Math.max(240,rows*110);
  nodes.forEach((n,i)=>positions.push({key:n.key,x:(i%cols+.5)*width/cols,y:(Math.floor(i/cols)+.5)*height/rows}));
 }
 return {mode:selected,positions,width,height};
}
// Stable visual signature; not a cryptographic identity or a trust score.
export function identityStyle(node){
 const palette=['#8DD7C2','#A8A4F5','#F1C477','#F19B82','#E2A5CE','#9ABAE8'];
 let h=2166136261;for(const c of String(node.definitionLabel??node.id)){h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;}
 return {color:palette[h%palette.length],shape:node.kind==='agent'?'circle':node.kind==='invocation'?'diamond':node.kind==='task'?'square':node.kind==='evidence'?'document':'hexagon'};
}
