// Deliberately isolated native-function-call wire contract for the credentialed
// synthetic smoke only. No arbitrary tools, messages, evidence, or endpoints.
import {createHash} from 'node:crypto';
import {parseUniqueJson} from '../sutra-consent/strict-json.js';
const fail=()=>{throw Object.assign(Error('Native smoke wire refused'),{code:'NATIVE_SMOKE_BODY'});};
const exact=(o,k)=>o&&Object.getPrototypeOf(o)===Object.prototype&&Object.keys(o).length===k.length&&k.every(x=>Object.hasOwn(o,x));
const id=/^[A-Za-z0-9_-]{1,100}$/;
export const nativeSmokeText=challenge=>'Synthetic challenge: '+challenge+'; not empirical evidence.';
const end=nativeSmokeText('0'.repeat(16)).length;
export const nativeSmokeCoordinates=()=>({sourceId:'synthetic_source',start:0,end});
export const nativeSmokeTool=()=>({type:'function',function:{name:'inspect_evidence',description:'Read the exact synthetic evidence coordinates supplied by the user.',parameters:{type:'object',properties:{sourceId:{type:'string'},start:{type:'integer'},end:{type:'integer'}},required:['sourceId','start','end'],additionalProperties:false}}});
export const NATIVE_SMOKE_SYSTEM='Use inspect_evidence exactly once with the supplied coordinates. After the tool returns, respond with JSON only: {"claims":[{"kind":"source_claim","text":"what the synthetic source says","citation":{"sourceId":"...","sourceDigest":"...","start":0,"end":1,"quote":"..."}},{"kind":"uncertainty","text":"why this is not empirical evidence","citation":null}]}. Cite the ENTIRE exact tool quote and its absolute UTF-16 start/end. No extra keys.';
function parse(text,maxChars=4096){try{return parseUniqueJson(text,{maxChars,maxDepth:12});}catch{fail();}}
function coords(o){return exact(o,['sourceId','start','end'])&&o.sourceId==='synthetic_source'&&o.start===0&&!Object.is(o.start,-0)&&o.end===end;}
export function admitNativeSmokeCall(call){
 if(!exact(call,['id','type','function'])||typeof call.id!=='string'||!id.test(call.id)||call.type!=='function'||!exact(call.function,['name','arguments'])||call.function.name!=='inspect_evidence'||typeof call.function.arguments!=='string'||!coords(parse(call.function.arguments)))fail();
 return {id:call.id,type:'function',function:{name:'inspect_evidence',arguments:JSON.stringify(nativeSmokeCoordinates())}};
}
export function admitNativeSmokeBody(bodyText,model,outputCap,protocol){
 if(protocol!=='openai-compatible-json'||outputCap!==1024||typeof bodyText!=='string'||Buffer.byteLength(bodyText)>16384)fail();
 const b=parse(bodyText,16384);
 if(!exact(b,['model','messages','max_tokens','stream','tools','tool_choice'])||b.model!==model||b.max_tokens!==outputCap||b.stream!==false||!Array.isArray(b.tools)||b.tools.length!==1||JSON.stringify(b.tools[0])!==JSON.stringify(nativeSmokeTool())||!Array.isArray(b.messages)||![2,4].includes(b.messages.length))fail();
 const [system,user,assistant,tool]=b.messages;
 if(!exact(system,['role','content'])||system.role!=='system'||system.content!==NATIVE_SMOKE_SYSTEM||!exact(user,['role','content'])||user.role!=='user'||!coords(parse(user.content)))fail();
 if(b.messages.length===2){if(b.tool_choice!=='auto')fail();return;}
 if(b.tool_choice!=='none'||!exact(assistant,['role','content','tool_calls'])||assistant.role!=='assistant'||assistant.content!==null||!Array.isArray(assistant.tool_calls)||assistant.tool_calls.length!==1)fail();
 const call=admitNativeSmokeCall(assistant.tool_calls[0]);
 if(!exact(tool,['role','tool_call_id','content'])||tool.role!=='tool'||tool.tool_call_id!==call.id)fail();
 const evidence=parse(tool.content);
 if(!exact(evidence,['sourceId','sourceDigest','start','end','quote','coordinateSystem','truthStatus','authority'])||!coords({sourceId:evidence.sourceId,start:evidence.start,end:evidence.end})||typeof evidence.quote!=='string'||!/^Synthetic challenge: [a-f0-9]{16}; not empirical evidence\.$/.test(evidence.quote)||evidence.sourceDigest!=='sha256:'+createHash('sha256').update(evidence.quote).digest('hex')||evidence.coordinateSystem!=='utf16-extracted-text'||evidence.truthStatus!=='UNVERIFIED'||evidence.authority!=='NONE')fail();
}
