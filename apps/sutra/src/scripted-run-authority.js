// Development-only scripted network runs still have real artifact/POST
// authority. Distinguish their asynchronous epochs from persisted lesson
// evidence: navigation invalidates every pending read and late trace callback.
export function createScriptedRunAuthority(){
 const running=new Map();
 return Object.freeze({
  begin(key){
   if(typeof key!=='string'||!key)throw Error('Scripted run key required.');
   if(running.has(key))return null;
   const token=Object.freeze({controller:new AbortController()});
   running.set(key,token);return token;
  },
  current(key,token){return running.get(key)===token&&!token.controller.signal.aborted;},
  finish(key,token){
   if(running.get(key)!==token)return false;
   running.delete(key);return true;
  },
  revoke(){
   const keys=[...running.keys()];
   for(const token of running.values())token.controller.abort();
   running.clear();
   return keys;
  }
 });
}
