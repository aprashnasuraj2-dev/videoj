// Ephemeral same-tab offers. These are navigation conveniences, not authority.
// Receivers must independently replay the exact pinned content before applying.
function channel(){
 let current=null;const listeners=new Set();
 const notify=()=>{for(const listener of listeners)listener(current);};
 return Object.freeze({
  read(){return current;},
  offer(text,pin){
   if(typeof text!=='string'||!text.length||new TextEncoder().encode(text).length>262144||typeof pin!=='string'||!/^sha256:[a-f0-9]{64}$/.test(pin))throw Error('HANDOFF_PROFILE');
   current=Object.freeze({text,pin});notify();return current;
  },
  clear(expected){if(expected!==current)return false;current=null;notify();return true;},
  subscribe(fn){listeners.add(fn);fn(current);return ()=>listeners.delete(fn);}
 });
}
export const reviewedContractHandoff=channel();
export const investigationHandoff=channel();
