// Explicit deterministic model test driver; no network, inference, randomness or credentials.
export function createScriptedModel(){
 return {mode:'scripted-test',async chat({messages,tools,signal}){
  signal?.throwIfAborted();
  if(tools.length&&!messages.some(m=>m.role==='tool'))return {content:'',toolCalls:[{id:'fixture-delegation',type:'function',function:{name:tools[0].function.name,arguments:JSON.stringify({request:'Inspect the synthetic recording cue. This is a scripted orchestration test.'})}}]};
  return {content:tools.length?'Scripted orchestration test complete: the evidence agent returned a result. No live AI or factual verification was performed.':'Synthetic evidence helper: a catalog match establishes source consistency only, not factual truth.',toolCalls:[]};
 }};
}
