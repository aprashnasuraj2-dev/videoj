// Lazy DOM mounting and demand-driven updates. This module has no execution or
// authorization authority. Every view is mounted at most once per workspace.
export function createLazyViews(entries,{makePlaceholder,removePlaceholder,onFailure}){
 if(!Array.isArray(entries)||!entries.length||entries.length>24)throw Error('VIEW_REGISTRY');
 const records=new Map();
 for(const entry of entries){
  if(!entry||typeof entry.id!=='string'||records.has(entry.id)||typeof entry.mount!=='function')throw Error('VIEW_ENTRY');
  records.set(entry.id,{...entry,element:makePlaceholder(entry),instance:null,mounting:false,error:false});
 }
 let selected=null,closed=false;
 function get(id){return records.get(id)??null;}
 function ensure(id){
  if(closed)throw Error('VIEW_CLOSED');
  const r=get(id);
  if(!r)throw Error('VIEW_UNKNOWN');
  if(r.instance)return r.instance;
  if(r.mounting)throw Error('VIEW_REENTRANT');
  r.mounting=true;
  try{
   const instance=r.mount();
   const element=instance?.section??instance;
   if(!element||element.id!==r.panelId||typeof element.hidden!=='boolean')throw Error('VIEW_MOUNT_CONTRACT');
   element.hidden=true;
   removePlaceholder(r.element);
   r.element=element;
   r.instance=instance;
   r.error=false;
   return instance;
  }catch(e){
   r.error=true;
   onFailure?.(r,e);
   return null;
  }finally{r.mounting=false;}
 }
 function show(id){
  const r=get(id);
  if(!r||closed)return null;
  const value=ensure(id);
  if(!value)return null;
  selected=id;
  for(const [key,item] of records){
   item.element.hidden=key!==id;
   if(item.instance&&typeof item.instance.setActive==='function')item.instance.setActive(key===id);
  }
  return value;
 }
 function suspend(){
  for(const r of records.values()){
   if(r.instance&&typeof r.instance.setActive==='function')r.instance.setActive(false);
  }
 }
 function resume(){
  if(closed||!selected)return;
  for(const [id,r] of records)if(r.instance&&typeof r.instance.setActive==='function')r.instance.setActive(id===selected);
 }
 function destroy(){
  if(closed)return;
  closed=true;
  for(const r of records.values()){
   if(r.instance&&typeof r.instance.destroy==='function')r.instance.destroy();
   else if(r.instance&&typeof r.instance.cancel==='function')r.instance.cancel();
  }
  records.clear();
 }
 return Object.freeze({
  ensure,show,suspend,resume,destroy,
  instance(id){return get(id)?.instance??null;},
  snapshot(){return Object.freeze({selected,closed,views:Object.freeze([...records.values()].map(r=>Object.freeze({id:r.id,mounted:!!r.instance,error:r.error})))})}
 });
}
// Keep all accepted events in the authoritative journal. The renderer only
// needs the most recent dirty notification, not one DOM rebuild per event.
export function createCoalescedRefresh(refresh,schedule=queueMicrotask){
 if(typeof refresh!=='function'||typeof schedule!=='function')throw Error('REFRESH_CALLBACK');
 let pending=false,closed=false,epoch=0,last;
 function request(value){
  if(closed)return false;
  last=value;
  if(pending)return true;
  pending=true;
  const ticket=epoch;
  schedule(()=>{
   if(closed||ticket!==epoch)return;
   pending=false;
   const value=last;
   last=undefined;
   refresh(value);
  });
  return true;
 }
 function flush(){
  if(closed||!pending)return false;
  pending=false;
  epoch++;
  const value=last;
  last=undefined;
  refresh(value);
  return true;
 }
 function cancel(){
  pending=false;
  epoch++;
  last=undefined;
 }
 function destroy(){
  closed=true;
  cancel();
 }
 return Object.freeze({request,flush,cancel,destroy,pending:()=>pending});
}
