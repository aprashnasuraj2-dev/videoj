// Metadata-only execution evidence; adapted from legacy PR #48's provenance-store design.
// A receipt is not a signed attestation, provider billing receipt or proof of source truth.
const knownAgents=new Set(['planner','critic','checklist','source_select']);
const knownTools=new Set(['critic','mcp_inspect_evidence','guide','source_select']);
const knownNetworks=new Set(['investigation','reviewed_investigation','peer_investigation','checklist']);
const allowed=(set,v)=>set.has(v);
export function createBrowserRunReceipt({preview,result,consentEvents=[]}){
 const {network,graphPin,model,router,limits,peerUrl}=preview;
 const peerOrigin=peerUrl?new URL(peerUrl).origin:null;
 const events=[];
 for(const e of result.events){
  if(events.length>=512)break;
  if(!['agent','tool','model_call'].includes(e.kind)||!['start','end'].includes(e.phase))continue;
  const safe={kind:e.kind,phase:e.phase};
  if(['ok','error','cancelled'].includes(e.status))safe.status=e.status;
  if(allowed(knownAgents,e.agent))safe.agent=e.agent;
  if(allowed(knownTools,e.tool))safe.tool=e.tool;
  if(allowed(knownNetworks,e.network))safe.network=e.network;
  if(e.origin==='sutra-local'||peerOrigin&&e.origin===peerOrigin)safe.origin=e.origin;
  events.push(safe);
 }
 const consent=consentEvents.filter(e=>peerOrigin&&e.origin===peerOrigin&&['peer_manifest','peer_graph'].includes(e.contactKind)&&['intent','decision','outcome'].includes(e.type)).slice(0,32).map(e=>({type:e.type,contactKind:e.contactKind,origin:peerOrigin,...(['allow','deny'].includes(e.decision)?{decision:e.decision}:{}),...(['completed','failed'].includes(e.status)?{status:e.status}:{}),...(e.scope==='once'?{scope:'once'}:{})}));
 return {schema:'sutra-browser-run-receipt/v1',status:'completed',network,graphPin,model,router,limits,modelCalls:result.modelCalls,agentCalls:result.agentCalls,transport:result.mode,peerOrigin,events,consent,authority:'NONE',qualification:'Browser-observed metadata only. Omits objective, source, claims, raw messages and credentials. Transport mode does not attest live upstream inference; injected HTTP fixtures can exercise the same protocol.'};
}
