// Per-agent information-flow policy for reviewed expression councils.
// Scope ordering includes the sender's whole visible binding set, not just its
// chosen expression: a private value can influence selection of a public formula.
import {councilClosed as closed,councilFail as fail,denseCouncilArray as dense} from './council-scheduler.js';
const ID=/^[A-Za-z][A-Za-z0-9_-]{0,63}$/;
const validIds=(xs,min,max)=>Array.isArray(xs)&&xs.length>=min&&xs.length<=max&&dense(xs)&&xs.every(x=>typeof x==='string'&&ID.test(x))&&new Set(xs).size===xs.length;
const subset=(a,b)=>a.every(x=>b.includes(x));
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
// Legacy uniform disclosure remains supported. Explicit agent scopes are
// complete and default-deny peer feedback unless individually approved.
export function admitCouncilDisclosure(disclosure,agentIds){
 if(!validIds(agentIds,1,6)||!(closed(disclosure,['bindingIds','includeValues'])||closed(disclosure,['bindingIds','includeValues','agentScopes']))||!validIds(disclosure.bindingIds,1,16)||typeof disclosure.includeValues!=='boolean')fail('DISCLOSURE');
 const envelope={bindingIds:[...disclosure.bindingIds],includeValues:disclosure.includeValues},scopes=[];
 if(!Object.hasOwn(disclosure,'agentScopes')){
  for(const agentId of agentIds)scopes.push({agentId,bindingIds:[...envelope.bindingIds],includeValues:envelope.includeValues,feedbackFrom:agentIds.filter(id=>id!==agentId)});
 }else{
  const raw=disclosure.agentScopes;
  if(!Array.isArray(raw)||raw.length!==agentIds.length||!dense(raw))fail('DISCLOSURE');
  const seen=new Set();
  for(const x of raw){
   if(!closed(x,['agentId','bindingIds','includeValues','feedbackFrom'])||!agentIds.includes(x.agentId)||seen.has(x.agentId)||!validIds(x.bindingIds,1,16)||!subset(x.bindingIds,envelope.bindingIds)||typeof x.includeValues!=='boolean'||x.includeValues&&!envelope.includeValues||!validIds(x.feedbackFrom,0,5)||x.feedbackFrom.some(id=>id===x.agentId||!agentIds.includes(id)))fail('DISCLOSURE');
   seen.add(x.agentId);scopes.push({agentId:x.agentId,bindingIds:[...x.bindingIds],includeValues:x.includeValues,feedbackFrom:[...x.feedbackFrom]});
  }
 }
 for(const receiver of scopes)for(const senderId of receiver.feedbackFrom){
  const sender=scopes.find(x=>x.agentId===senderId);
  if(!subset(sender.bindingIds,receiver.bindingIds)||sender.includeValues&&!receiver.includeValues)fail('DISCLOSURE_FLOW');
 }
 return freeze({bindingIds:envelope.bindingIds,includeValues:envelope.includeValues,scopes:agentIds.map(id=>scopes.find(x=>x.agentId===id)),explicit:Object.hasOwn(disclosure,'agentScopes')});
}
export function projectCouncilBindings(contract,scope){
 return freeze(contract.bindings.filter(b=>scope.bindingIds.includes(b.id)).map(b=>({id:b.id,type:b.type,...(scope.includeValues?{valueLexeme:b.span.quote}:{})})));
}
