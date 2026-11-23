import {handleInference,inferenceStatus,readJson} from './inference.js';
import {createSourceTools} from '../../packages/sutra-source-tools/index.js';
import fixture from '../../apps/sutra/src/fixtures/timing-source.json' with {type:'json'};
export {InferenceQuota} from './quota.js';
const sourceTools=createSourceTools([fixture.source]);
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
// Restricted, stateless JSON-RPC/MCP facade. No caller URL, filesystem or DOM access.
export async function handleSourceTools(request){
 if(request.headers.has('MCP-Protocol-Version')&&request.headers.get('MCP-Protocol-Version')!=='2025-06-18')return json({error:{code:'PROTOCOL'}},400);
 if(request.method!=='POST')return json({error:{code:'METHOD'}},405);
 if(request.headers.get('Origin')!==new URL(request.url).origin||!request.headers.get('Content-Type')?.startsWith('application/json'))return json({error:{code:'ORIGIN_OR_HEADERS'}},403);
 let rpc;try{rpc=await readJson(request,4096);}catch{return json({error:{code:'PAYLOAD'}},400);}
 if(!rpc||rpc.jsonrpc!=='2.0'||typeof rpc.method!=='string'||!(typeof rpc.id==='string'&&rpc.id.length<=100||Number.isSafeInteger(rpc.id)||rpc.id===undefined))return json({error:{code:'RPC'}},400);
 if(rpc.method==='notifications/initialized'&&rpc.id===undefined)return new Response(null,{status:202});
 if(rpc.id===undefined)return json({error:{code:'RPC'}},400);
 const result=value=>json({jsonrpc:'2.0',id:rpc.id,result:value});
 if(rpc.method==='initialize')return result({protocolVersion:'2025-06-18',capabilities:{tools:{listChanged:false}},serverInfo:{name:'sutra-source-tools',version:'0.1.0'}});
 if(rpc.method==='tools/list')return result({tools:sourceTools.list().map(({effect,...d})=>({...d,annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false}}))});
 if(rpc.method==='tools/call'){try{const output=sourceTools.call(rpc.params?.name,rpc.params?.arguments);return result({content:[{type:'text',text:JSON.stringify(output)}],structuredContent:output,isError:false});}catch{return result({content:[{type:'text',text:'Source tool unavailable; no result is claimed.'}],isError:true});}}
 return json({jsonrpc:'2.0',id:rpc.id,error:{code:-32601,message:'Method unavailable.'}});
}
export default {async fetch(request,env){const path=new URL(request.url).pathname;
 if(path==='/api/infer')return handleInference(request,env);
 if(path==='/api/source-tools')return handleSourceTools(request);
 if(path==='/api/status'&&request.method==='GET')return json({inference:inferenceStatus(env)?'configured':'disabled',sourceTools:'synthetic-catalog',factualTruth:'unverified'});
 if(path.startsWith('/api/'))return json({error:{code:'NOT_FOUND'}},404);
 return env.ASSETS?.fetch(request)??new Response('Not found',{status:404});
}};
