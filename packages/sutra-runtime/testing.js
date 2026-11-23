// Explicit deterministic model test driver; no network, inference, randomness or credentials.
export function createScriptedModel(){
 return {mode:'scripted-test',async chat({messages,tools,signal}){
  signal?.throwIfAborted();
  if(tools.length&&!messages.some(m=>m.role==='tool'))return {content:'',toolCalls:[{id:'fixture-delegation',type:'function',function:{name:tools[0].function.name,arguments:JSON.stringify({request:'Inspect the synthetic recording cue. This is a scripted orchestration test.'})}}]};
  return {content:tools.length?'Scripted orchestration test complete: the evidence agent returned a result. No live AI or factual verification was performed.':'Synthetic evidence helper: a catalog match establishes source consistency only, not factual truth.',toolCalls:[]};
 }};
}

// Exercises real source transport with deterministic decisions, never model inference.
export function createSourceScriptedModel(){
 let sequence=0;
 return {mode:'scripted-test',async chat({messages,tools,signal}){
  signal?.throwIfAborted();const called=messages.filter(m=>m.role==='tool');
  const call=(name,args)=>({content:'',toolCalls:[{id:`source-fixture-${++sequence}`,type:'function',function:{name,arguments:JSON.stringify(args)}}]});
  if(tools.some(t=>t.function.name==='evidence'))return called.length?{content:called[0].content,toolCalls:[]}:call('evidence',{request:'Find the synthetic timing cue.'});
  if(!called.length)return call('mcp_search_lesson',{query:'timing'});
  const search=JSON.parse(called[0].content);const cue=search.receipts?.[0];if(!cue)throw Error('No source result.');
  if(called.length===1)return call('mcp_read_cue',{sourceId:cue.sourceId,cueId:cue.cueId});
  const read=JSON.parse(called[1].content);if(!read.receipts?.[0])throw Error('No cue result.');
  return {content:`Scripted source test complete. ${read.receipts[0].excerpt} Source consistency only; factual truth remains unverified. No live AI was used.`,toolCalls:[]};
 }};
}


// Deterministic caller/peer driver. It invokes the first available tool once per
// agent, then summarizes the returned tool result. This exercises real browser
// composition without model inference, credentials or factual claims.
export function createPeerScriptedModel(){
 let sequence=0;
 return {mode:'scripted-test',async chat({messages,tools,signal}){
  signal?.throwIfAborted();
  const returned=messages.filter(message=>message.role==='tool');
  if(!tools.length)return {content:'Peer helper fixture: rights-cleared lesson provenance remains pending.',toolCalls:[]};
  if(returned.length)return {content:'Scripted composition observed: '+returned[0].content,toolCalls:[]};
  const name=tools[0].function.name;
  return {content:'',toolCalls:[{id:`peer-browser-${++sequence}`,type:'function',function:{name,arguments:JSON.stringify({request:'Inspect the published source state. This is a scripted browser composition test.'})}}]};
 }};
}


// Deterministic MCP browser driver. Discovery/call consent and transport are real;
// only the model decision is scripted.
export function createMcpScriptedModel(){
 let sequence=0;
 return {mode:'scripted-test',async chat({messages,tools,signal}){
  signal?.throwIfAborted();const returned=messages.filter(message=>message.role==='tool');
  if(!tools.length)return {content:'Scripted MCP test continued without an approved third-party tool.',toolCalls:[]};
  if(returned.length)return {content:'Scripted MCP read observed: '+returned[0].content,toolCalls:[]};
  return {content:'',toolCalls:[{id:`mcp-browser-${++sequence}`,type:'function',function:{name:tools[0].function.name,arguments:JSON.stringify({request:'synthetic public lookup'})}}]};
 }};
}
