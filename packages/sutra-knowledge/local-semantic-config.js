// Exact local interpretation plan; no socket, credential or model call here.
import {parseUniqueJson} from '../sutra-consent/strict-json.js';
import {admitLoopbackRoutes} from '../sutra-inference/loopback-route.js';
import {casePin} from './pinned-investigation.js';
import {prepareHybridSemantic} from './semantic-hybrid.js';
export const VERSION='sutra-local-semantic/v1';
const fail=c=>{throw Object.assign(Error('Local semantic refused: '+c),{code:c});};
const exact=(x,k)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).length===k.length&&k.every(y=>Object.hasOwn(x,y));
const int=(x,min,max)=>Number.isSafeInteger(x)&&x>=min&&x<=max;
export async function admitLocalSemanticConfig(configText){
 if(typeof configText!=='string'||new TextEncoder().encode(configText).length>262144)fail('CONFIG_SIZE');
 const c=parseUniqueJson(configText,{maxChars:262144,maxDepth:8});
 if(!exact(c,['version','contractText','contractPin','sourceIds','connection','maxOutputTokens','timeoutMs',...(Object.hasOwn(c??{},'conversation')?['conversation']:[])])||c.version!==VERSION||!int(c.maxOutputTokens,128,4096)||!int(c.timeoutMs,100,30000))fail('CONFIG');
 const x=c.connection;
 if(!exact(x,['id','label','protocol','endpoint','model','authMode','credentialEnv'])||typeof x.label!=='string'||!x.label.trim()||x.label.length>64||!['none','bearer','anthropic-key'].includes(x.authMode)||(x.authMode==='none'?x.credentialEnv!==null:typeof x.credentialEnv!=='string'||!/^SUTRA_LOCAL_[A-Z0-9_]{1,64}$/.test(x.credentialEnv)))fail('CONNECTION');
 const routes=[{connectionId:x.id,protocol:x.protocol,endpoint:x.endpoint,models:[x.model],authMode:x.authMode}];admitLoopbackRoutes(routes,c.timeoutMs);
 const catalogText=JSON.stringify({version:1,contractDigest:c.contractPin,aliases:[]}),input={contractText:c.contractText,contractPin:c.contractPin,catalogText,catalogPin:await casePin(catalogText)};
 if(c.conversation!==undefined&&!exact(c.conversation,['conversationText','conversationPin','selectedTurnIds']))fail('CONVERSATION');
 const prepared=await prepareHybridSemantic(input,{sourceIds:c.sourceIds,conversation:c.conversation??null});
 const operation={kind:'hybrid-semantic-interpretation-v1',packetDigest:prepared.packetPin,packet:prepared.packet,instruction:'Return only the specified JSON response, echoing packetDigest. No answer, code, tools, or authority.'};
 const plan={version:VERSION,configDigest:await casePin(configText),connection:x,packetPin:prepared.packetPin,operation,maxOutputTokens:c.maxOutputTokens,timeoutMs:c.timeoutMs,limits:{maxCalls:1,maxInputBytes:100000,maxOutputTokens:c.maxOutputTokens,maxConcurrent:1},qualification:'One explicitly approved loopback request. A local process may forward or retain data. Provider identity, semantic accuracy and confidentiality are not established.'};
 const planPin=await casePin(JSON.stringify(plan));
 return {c,input,prepared,routes,plan,planPin};
}
