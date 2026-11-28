/* Demand-driven presentation clock. Never an execution or computation authority. */
export function createFrameDriver({request,cancel,visible,onFrame}){
 let handle=null,last=null,generation=0;
 function wake(){
  if(handle!==null||!visible())return false;
  const ticket=generation;
  handle=request(now=>{
   if(ticket!==generation)return;
   handle=null;
   if(!visible()){last=null;return;}
   const dt=last===null?.016:Math.min(.05,Math.max(0,(now-last)/1000));last=now;
   const more=onFrame(now,dt);
   if(more)wake();
   if(handle===null)last=null;
  });
  return true;
 }
 function stop(){generation++;if(handle!==null)cancel(handle);handle=null;last=null;}
 return {wake,stop};
}
