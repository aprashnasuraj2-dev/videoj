// Explicit deterministic model test driver; no network, inference, randomness or credentials.
export function createScriptedModel(){
 return {mode:'scripted-test',async chat({messages,tools,signal}){
  signal?.throwIfAborted();
  if(tools.length&&!messages.some(m=>m.role==='tool'))return {content:'',toolCalls:[{id:'fixture-delegation',type:'function',function:{name:tools[0].function.name,arguments:JSON.stringify({request:'Inspect the synthetic recording cue. This is a scripted orchestration test.'})}}]};
  return {content:tools.length?'Scripted orchestration test complete: the evidence agent returned a result. No live AI or factual verification was performed.':'Synthetic evidence helper: a catalog match establishes source consistency only, not factual truth.',toolCalls:[]};
 }};
}

// Exercises real source transport with deterministic decisions, never model inference.
export function createSourceScriptedModel({query='timing'}={}){
 if(typeof query!=='string'||!query.trim()||query.length>120)throw new TypeError('One bounded literal fixture query is required.');
 let sequence=0;
 return {mode:'scripted-test',async chat({messages,tools,signal}){
  signal?.throwIfAborted();const called=messages.filter(m=>m.role==='tool');
  const call=(name,args)=>({content:'',toolCalls:[{id:`source-fixture-${++sequence}`,type:'function',function:{name,arguments:JSON.stringify(args)}}]});
  if(tools.some(t=>t.function.name==='evidence'))return called.length?{content:called[0].content,toolCalls:[]}:call('evidence',{request:'Find the synthetic timing cue.'});
  if(!called.length)return call('mcp_search_lesson',{query});
  const search=JSON.parse(called[0].content);if(search.truthStatus!=='unverified'||!Array.isArray(search.receipts))throw Error('Invalid source result.');
  const cue=search.receipts[0];if(!cue)return {content:'Scripted source test abstains: no matching source cue. No factual conclusion or live AI is claimed.',toolCalls:[]};
  if(called.length===1)return call('mcp_read_cue',{sourceId:cue.sourceId,cueId:cue.cueId});
  const read=JSON.parse(called[1].content);if(!read.receipts?.[0])throw Error('No cue result.');
  return {content:`Scripted source test complete. ${read.receipts[0].excerpt} Source consistency only; factual truth remains unverified. No live AI was used.`,toolCalls:[]};
 }};
}
