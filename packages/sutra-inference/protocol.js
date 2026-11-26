import {parseUniqueJson} from '../sutra-consent/strict-json.js';
export class InferenceError extends Error{constructor(code){super(`Inference stopped (${code}); no complete result is claimed.`);this.name='InferenceError';this.code=code;}}
export const stop=code=>{throw new InferenceError(code);};
export const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
export const MAX_SSE_BYTES=262144;
const MAX_SSE_LINE_CHARS=32768;
// Restricted chat-completion SSE profile. Decode actual events, not individual
// data lines: an unterminated event (including DONE) cannot certify success.
// Named non-message events are not part of this response contract.
export async function* readSse(response,{signal,maxBytes=MAX_SSE_BYTES}={}){
 if(!Number.isSafeInteger(maxBytes)||maxBytes<1||maxBytes>MAX_SSE_BYTES)stop('STREAM_SIZE');
 const reader=response.body?.getReader();if(!reader)stop('MISSING_STREAM');
 const decoder=new TextDecoder('utf-8',{fatal:true});let buffer='',total=0,empty=0,chunks=0,lines=0,skipLf=false,data='',hasData=false,eventType='';
 try{
  for(;;){
   if(signal?.aborted)stop('CANCELLED');const {done,value}=await abortable(reader.read(),signal);
   if(signal?.aborted)stop('CANCELLED');
   if(!done&&!(value instanceof Uint8Array))stop('STREAM_ENCODING');
   if(value){total+=value.byteLength;if(total>maxBytes||!value.byteLength&&++empty>256)stop('STREAM_SIZE');
    if(++chunks%1024===0){await new Promise(resolve=>setTimeout(resolve,0));if(signal?.aborted)stop('CANCELLED');}}

   try{buffer+=decoder.decode(value??new Uint8Array(),{stream:!done});}catch{stop('STREAM_ENCODING');}
   for(;;){
    if(signal?.aborted)stop('CANCELLED');
    // CR, LF and CRLF are SSE line endings. A CRLF pair may be split
    // between chunks; process the CR once, then swallow its optional LF.
    if(skipLf&&buffer.length){if(buffer[0]==='\n')buffer=buffer.slice(1);skipLf=false;}
    const newline=buffer.search(/[\r\n]/);
    if(newline<0)break;
    if(newline>MAX_SSE_LINE_CHARS)stop('STREAM_SIZE');
    if(++lines%1024===0){await new Promise(resolve=>setTimeout(resolve,0));if(signal?.aborted)stop('CANCELLED');}
    const line=buffer.slice(0,newline),ending=buffer[newline];buffer=buffer.slice(newline+1);
    if(ending==='\r')skipLf=true;
    if(line===''){
     const payload=data,type=eventType,present=hasData;
     data='';eventType='';hasData=false;
     if(!present)continue;
     if(type&&type!=='message')stop('STREAM_EVENT');
     if(payload.trim()==='[DONE]'){yield {done:true};return;}
     let parsed;try{parsed=parseUniqueJson(payload,{maxChars:MAX_SSE_LINE_CHARS,maxDepth:32});}catch{stop('STREAM_JSON');}
     if(!plain(parsed)||parsed.error)stop('UPSTREAM_STREAM');yield {data:parsed};
     continue;
    }
    if(line.startsWith(':'))continue;
    const colon=line.indexOf(':'),field=colon<0?line:line.slice(0,colon);
    let part=colon<0?'':line.slice(colon+1);if(part[0]===' ')part=part.slice(1);
    if(field==='event'){eventType=part;continue;}
    // These standard metadata fields do not trigger reconnection or a
    // resume request: this host never retries a model operation.
    if(field==='id'||field==='retry')continue;
    if(field!=='data')stop('STREAM_FORMAT');
    if(data.length+(hasData?1:0)+part.length>MAX_SSE_LINE_CHARS)stop('STREAM_SIZE');
    data+=(hasData?'\n':'')+part;hasData=true;
   }
   if(buffer.length>MAX_SSE_LINE_CHARS)stop('STREAM_SIZE');
   // EOF never dispatches a pending unterminated event.
   if(done)stop('INCOMPLETE_STREAM');
  }
 }finally{try{void Promise.resolve(reader.cancel()).catch(()=>{});}catch{}try{reader.releaseLock();}catch{}}
}
export function sanitizeChunk(raw){
 if(!plain(raw)||!Array.isArray(raw.choices)||raw.choices.length>1)stop('STREAM_SHAPE');
 const choices=raw.choices.map(choice=>{
  if(!plain(choice)||choice.index!==0||!plain(choice.delta))stop('STREAM_SHAPE');const delta={};
  if(choice.delta.content!==undefined&&choice.delta.content!==null){if(typeof choice.delta.content!=='string'||choice.delta.content.length>16000)stop('STREAM_SHAPE');delta.content=choice.delta.content;}
  if(choice.delta.tool_calls!==undefined){
   if(!Array.isArray(choice.delta.tool_calls)||choice.delta.tool_calls.length>2)stop('STREAM_SHAPE');
   delta.tool_calls=choice.delta.tool_calls.map(call=>{
    if(!plain(call)||!Number.isInteger(call.index)||call.index<0||call.index>1)stop('STREAM_SHAPE');const out={index:call.index};
    if(call.id!==undefined){if(typeof call.id!=='string'||call.id.length>100)stop('STREAM_SHAPE');out.id=call.id;}
    if(call.type!==undefined){if(call.type!=='function')stop('STREAM_SHAPE');out.type='function';}
    if(call.function!==undefined){if(!plain(call.function))stop('STREAM_SHAPE');out.function={};for(const key of ['name','arguments'])if(call.function[key]!==undefined){if(typeof call.function[key]!=='string'||call.function[key].length>(key==='name'?100:8000))stop('STREAM_SHAPE');out.function[key]=call.function[key];}}
    return out;
   });
  }
  const finish=choice.finish_reason??null;if(![null,'stop','tool_calls','length','content_filter'].includes(finish))stop('STREAM_SHAPE');
  return {index:0,delta,finish_reason:finish};
 });
 const out={choices};
 if(raw.usage!==undefined&&raw.usage!==null){const usage={};for(const key of ['prompt_tokens','completion_tokens','total_tokens']){if(!Number.isInteger(raw.usage[key])||raw.usage[key]<0||raw.usage[key]>1000000)stop('STREAM_SHAPE');usage[key]=raw.usage[key];}if(usage.prompt_tokens+usage.completion_tokens!==usage.total_tokens)stop('USAGE_INCONSISTENT');out.usage=usage;}
 return out;
}
export function makeAccumulator(){
 let content='',finish=null,usage=null,ended=false;const tools=[];
 return {
  accept(raw){if(ended)stop('AFTER_FINISH');const chunk=sanitizeChunk(raw);
   for(const choice of chunk.choices){if(finish)stop('AFTER_FINISH');
    if(choice.delta.content){content+=choice.delta.content;if(content.length>16000)stop('OUTPUT_SIZE');}
    for(const call of choice.delta.tool_calls??[]){const tool=tools[call.index]??={id:'',type:'function',function:{name:'',arguments:''}};if(call.id){if(tool.id&&tool.id!==call.id)stop('TOOL_ID');tool.id=call.id;}if(call.function?.name)tool.function.name+=call.function.name;if(call.function?.arguments)tool.function.arguments+=call.function.arguments;if(tool.function.name.length>100||tool.function.arguments.length>8000)stop('OUTPUT_SIZE');}
    if(choice.finish_reason)finish=choice.finish_reason;
   }
   // Usage is a single terminal observation, not an overwritable counter.
   // Never convert an earlier length/content_filter finish into success.
   if(chunk.usage){if(!finish||usage)stop('USAGE_SEQUENCE');usage=chunk.usage;}
   return chunk;},
  finish(){if(ended)stop('AFTER_FINISH');ended=true;if(!['stop','tool_calls'].includes(finish))stop('INCOMPLETE_RESULT');const calls=tools.filter(Boolean);if(calls.length!==tools.length||new Set(calls.map(c=>c.id)).size!==calls.length)stop('TOOL_SHAPE');if(finish==='tool_calls'&&!calls.length||finish==='stop'&&calls.length)stop('TOOL_SHAPE');for(const call of calls){if(!call.id||!call.function.name)stop('TOOL_SHAPE');try{if(!plain(parseUniqueJson(call.function.arguments,{maxChars:8000,maxDepth:16})))stop('TOOL_SHAPE');}catch{stop('TOOL_SHAPE');}}return {content,toolCalls:calls,finishReason:finish,usage};},
  get ended(){return ended;},
 };
}
export async function abortable(promise,signal){
 if(signal?.aborted){void Promise.resolve(promise).catch(()=>{});stop('CANCELLED');}let cancel;
 const stopped=new Promise((_,reject)=>{cancel=()=>reject(new InferenceError('CANCELLED'));signal?.addEventListener('abort',cancel,{once:true});});
 try{return await Promise.race([promise,stopped]);}finally{signal?.removeEventListener('abort',cancel);}
}
