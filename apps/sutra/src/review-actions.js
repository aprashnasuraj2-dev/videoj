import {createLocalActionRegistry} from '../../../packages/sutra-actions/index.js';
import {validateReceipt} from '../../../packages/sutra-evidence/index.js';
import {serializeReviewExport} from './review-export.js';
const exact=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const shape=(a,keys)=>a&&typeof a==='object'&&!Array.isArray(a)&&Object.keys(a).length===keys.length&&keys.every(k=>Object.hasOwn(a,k));
export function createReviewActions({store,sources,download,idFactory}){
 if(!store||typeof download!=='function')throw TypeError('Review action host required.');
 const catalog=structuredClone(sources);
 const registry=createLocalActionRegistry([
  {name:'save-review-card',effect:'write_local',destination:'This browser only (local storage)',description:'Save exactly the reviewed source receipt; not factual verification.',
   validate:a=>shape(a,['receipt'])&&validateReceipt(a.receipt,{sources:catalog}).valid,
   execute:(a,context)=>{const pending=store.prepare(a.receipt,{id:context.proposalId});return store.commit(pending.id);}},
  {name:'export-receipt',effect:'download',destination:'Browser-managed local file download',description:'Request a download of the exact current catalog-matched saved receipt.',
   validate:a=>shape(a,['id','snapshot'])&&typeof a.id==='string'&&a.snapshot?.id===a.id&&(()=>{try{serializeReviewExport(a.snapshot,{sources:catalog});return true;}catch{return false;}})(),
   execute:a=>{const current=store.inspect().find(r=>r.id===a.id&&r.status==='valid')?.record;if(!current||!exact(current,a.snapshot))throw Error('Saved review changed or was deleted; inspect it again.');
    const json=serializeReviewExport(current,{sources:catalog});download(json,'sutra-source-review.json');return {outcome:'download_requested',id:a.id};}}
 ],idFactory?{idFactory}:{});
 return registry;
}
