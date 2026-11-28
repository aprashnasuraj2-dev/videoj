// Pure, bounded graph navigation. All coordinates are presentation-only.
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
const validSize=(w,h)=>finite(w)&&finite(h)&&w>0&&h>0&&w<=100000&&h<=100000;
export function fitViewport(width,height){
 if(!validSize(width,height))throw Error('VIEWPORT_SIZE');
 return Object.freeze({x:0,y:0,width,height,extentWidth:width,extentHeight:height,zoom:1});
}
function viewport(x,y,width,height,extentWidth,extentHeight){
 if(!validSize(width,height)||!validSize(extentWidth,extentHeight)||!finite(x)||!finite(y))throw Error('VIEWPORT_DATA');
 const padX=extentWidth*.06,padY=extentHeight*.06;
 const minX=width>=extentWidth?-(width-extentWidth)/2:-padX,maxX=width>=extentWidth?minX:extentWidth-width+padX;
 const minY=height>=extentHeight?-(height-extentHeight)/2:-padY,maxY=height>=extentHeight?minY:extentHeight-height+padY;
 return Object.freeze({x:clamp(x,minX,maxX)||0,y:clamp(y,minY,maxY)||0,width,height,extentWidth,extentHeight,zoom:extentWidth/width});
}
export function zoomViewport(v,factor,{x=.5,y=.5}={}){
 if(!finite(factor)||factor<=0||!finite(x)||!finite(y))throw Error('VIEWPORT_ZOOM');
 const z=clamp(v.zoom*factor,1,5),width=v.extentWidth/z,height=v.extentHeight/z;
 const ax=clamp(x,0,1),ay=clamp(y,0,1);
 return viewport(v.x+(v.width-width)*ax,v.y+(v.height-height)*ay,width,height,v.extentWidth,v.extentHeight);
}
export function panViewport(v,dx,dy){
 if(!finite(dx)||!finite(dy))throw Error('VIEWPORT_PAN');
 return viewport(v.x+dx,v.y+dy,v.width,v.height,v.extentWidth,v.extentHeight);
}
export function centerViewport(v,x,y){
 if(!finite(x)||!finite(y))throw Error('VIEWPORT_CENTER');
 return viewport(x-v.width/2,y-v.height/2,v.width,v.height,v.extentWidth,v.extentHeight);
}
export function viewBox(v){return [v.x,v.y,v.width,v.height].map(n=>Number(n.toFixed(4))).join(' ');}
export function entityPage(nodes,page=0,size=32){
 if(!Array.isArray(nodes)||!Number.isSafeInteger(page)||!Number.isSafeInteger(size)||size<1||size>64)throw Error('ENTITY_PAGE');
 const pages=Math.max(1,Math.ceil(nodes.length/size)),index=clamp(page,0,pages-1),start=index*size;
 return {index,pages,total:nodes.length,start,end:Math.min(nodes.length,start+size),nodes:nodes.slice(start,start+size)};
}
export function projectGraphFilter(graph,{query='',kind='all',relation='all'}={}){
 const q=String(query).slice(0,100).trim().toLowerCase();
 const accepted=kind==='participants'?new Set(['agent','invocation']):kind==='operations'?new Set(['task','tool','operation']):kind==='evidence'?new Set(['evidence']):null;
 const nodes=graph.nodes.filter(n=>(!accepted||accepted.has(n.kind))&&(!q||(n.label+' '+n.kind+' '+n.status).toLowerCase().includes(q)));
 const keys=new Set(nodes.map(n=>n.key));
 return {...graph,nodes,edges:graph.edges.filter(e=>keys.has(e.from)&&keys.has(e.to)&&(relation==='all'||e.kind===relation))};
}
