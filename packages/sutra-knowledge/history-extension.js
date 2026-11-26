// Compare two independently pinned, fully replayed histories. An append-only
// relation is not a freshness proof without a separately retained checkpoint.
import {replayInvestigationHistory} from './investigation-history.js';
const fail=code=>{throw TypeError('HISTORY_EXTENSION_'+code);};
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
export async function verifyHistoryExtension({previousText,previousPin,nextText,nextPin}={}){
 const [previous,next]=await Promise.all([replayInvestigationHistory(previousText,previousPin),replayInvestigationHistory(nextText,nextPin)]);
 if(previous.root!==next.root)fail('ROOT');
 const versions=new Map(next.versions.map(v=>[v.digest,v]));
 const previousIds=new Set(previous.versions.map(v=>v.digest));
 if(previous.versions.some(v=>!versions.has(v.digest)))fail('VERSION_LOSS');
 // Existing wire versions are immutable by digest. Retain the ordered prefix,
 // not merely set membership: the history append operation does not reorder.
 if(previous.versions.some((v,i)=>next.versions[i]?.digest!==v.digest))fail('PREFIX');
 const nextBranches=new Map(next.branches.map(b=>[b.name,b.head]));
 const advances=[];
 for(const b of previous.branches){
  const head=nextBranches.get(b.name);if(!head)fail('BRANCH_LOSS');
  let cursor=head,steps=0;
  while(cursor!==b.head&&cursor!==null){cursor=versions.get(cursor)?.parent??null;steps++;}
  if(cursor!==b.head)fail('BRANCH_REWIND_OR_FORK');
  advances.push({branch:b.name,from:b.head,to:head,steps});
 }
 return freeze({version:1,previousPin,nextPin,status:previousPin===nextPin?'UNCHANGED':'APPEND_ONLY_EXTENSION',addedVersions:next.versions.filter(v=>!previousIds.has(v.digest)).map(v=>v.digest),addedBranches:next.branches.filter(b=>!previous.branches.some(p=>p.name===b.name)).map(b=>b.name),advances,decisionAuthority:'NONE',qualification:'Both histories replayed; exact ordered version prefix and descendant branch heads retained. No independent freshness, durable atomic storage, external witness or semantic authority.'});
}
