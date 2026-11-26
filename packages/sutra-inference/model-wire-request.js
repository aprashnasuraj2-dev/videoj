// Shared bounded Node wire-request validation; no credentials or network.
import {parseUniqueJson} from '../sutra-consent/strict-json.js';
const MAX_REQUEST=131072;
const fail=code=>{const e=new Error('Model wire request refused ('+code+').');e.code=code;throw e;};
const closed=(x,keys)=>x!==null&&typeof x==='object'&&[Object.prototype,null].includes(Object.getPrototypeOf(x))&&Reflect.ownKeys(x).length===keys.length&&keys.every(k=>{const d=Object.getOwnPropertyDescriptor(x,k);return d?.enumerable&&Object.hasOwn(d,'value');});
export function admitBody(bodyText,model,outputCap,protocol){
 if(typeof bodyText!=='string'||Buffer.byteLength(bodyText,'utf8')>MAX_REQUEST||bodyText.length===0||/[\ud800-\udfff]/u.test(bodyText))fail('BODY');
 const b=parseUniqueJson(bodyText,{maxChars:MAX_REQUEST,maxDepth:8});
 const native=protocol==='ollama-chat-json',common=['model','messages',native?'options':'max_tokens','stream'];
 if(!closed(b,protocol==='anthropic-messages-json'?[...common,'system']:common)||b.model!==model||(native?(!closed(b.options,['num_predict'])||b.options.num_predict!==outputCap):b.max_tokens!==outputCap)||b.stream!==false||!Array.isArray(b.messages)||b.messages.length!==(protocol==='anthropic-messages-json'?1:2))fail('BODY');
 const user=b.messages.at(-1);
 if(!closed(user,['role','content'])||user.role!=='user'||typeof user.content!=='string'||!user.content.length)fail('BODY');
 if(protocol==='anthropic-messages-json'){if(typeof b.system!=='string'||!b.system.length)fail('BODY');}
 else{const s=b.messages[0];if(!closed(s,['role','content'])||s.role!=='system'||typeof s.content!=='string'||!s.content.length)fail('BODY');}
}
