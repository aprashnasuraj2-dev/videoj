// Durable adapter from the caller-owned Linux history store to the full
// replayed typed investigation graph. Storage never becomes semantic authority.
import {openLocalHistoryStore,createFlockedHistoryStore} from './local-history-store.mjs';
import {createInvestigationHistory,openInvestigationHistory} from './investigation-history.js';

const fail=code=>{throw TypeError('DURABLE_INVESTIGATION_'+code);};
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const validStore=store=>store&&typeof store.read==='function'&&typeof store.initialize==='function'&&typeof store.append==='function';

async function bind(store){
 if(!validStore(store))fail('STORE');
 const open=async expectedHistoryPin=>{
  const loaded=await store.read(expectedHistoryPin);
  const history=await openInvestigationHistory(loaded.historyText,loaded.digest);
  const snapshot=history.snapshot();
  return {loaded,history,snapshot};
 };
 return Object.freeze({
  async initializeRoot({versionText,versionPin,branch='main'}={}){
   const history=await createInvestigationHistory(versionText,versionPin,branch);
   const next=history.snapshot(),loaded=await store.initialize(next.historyText,next.digest);
   const reopened=await openInvestigationHistory(loaded.historyText,loaded.digest);
   const restored=reopened.restore(versionPin);
   return freeze({snapshot:reopened.snapshot(),restored});
  },
  async read(expectedHistoryPin){
   const {history}=await open(expectedHistoryPin);
   return history.snapshot();
  },
  async restore({expectedHistoryPin,versionPin}={}){
   const {history}=await open(expectedHistoryPin);
   return history.restore(versionPin);
  },
  async appendVersion({expectedHistoryPin,branch,expectedBranchHead,versionText,versionPin}={}){
   const {history}=await open(expectedHistoryPin);
   const next=await history.append({expectedHistoryPin,branch,expectedHead:expectedBranchHead,versionText,versionPin});
   const committed=await store.append({expectedHead:expectedHistoryPin,nextText:next.historyText,nextPin:next.digest});
   const reopened=await openInvestigationHistory(committed.historyText,committed.digest);
   return freeze({snapshot:reopened.snapshot(),restored:reopened.restore(versionPin)});
  },
  async fork({expectedHistoryPin,branch,fromVersionPin}={}){
   const {history}=await open(expectedHistoryPin);
   const next=await history.fork({expectedHistoryPin,branch,fromDigest:fromVersionPin});
   const committed=await store.append({expectedHead:expectedHistoryPin,nextText:next.historyText,nextPin:next.digest});
   const reopened=await openInvestigationHistory(committed.historyText,committed.digest);
   return reopened.snapshot();
  },
  async compareSiblings({expectedHistoryPin,baseVersionPin,leftVersionPin,rightVersionPin}={}){
   const {history}=await open(expectedHistoryPin);
   return history.compareSiblings(baseVersionPin,leftVersionPin,rightVersionPin);
  }
 });
}

export async function openDurableInvestigationHistory(directory,options){
 return bind(await openLocalHistoryStore(directory,options));
}
export async function createDurableFlockedInvestigationHistory(directory){
 return bind(await createFlockedHistoryStore(directory));
}
