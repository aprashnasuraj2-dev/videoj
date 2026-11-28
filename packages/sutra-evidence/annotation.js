// Selective recovery of PR #48's Web Annotation media-evidence capability.
// Pure export from a receipt + independent catalog and media mapping.
// No fetch, player seek, DOM mutation, publisher identity or truth assertion.
import {snapshotDataRecord,validateReceipt} from './index.js';
const fail=code=>{throw Object.assign(Error('Media annotation refused: '+code),{code});};
const fields=(o,keys)=>Object.keys(o).length===keys.length&&keys.every(k=>Object.hasOwn(o,k));
const mediaTypes={Video:['video/mp4','video/webm'],Audio:['audio/mpeg','audio/ogg','audio/wav','audio/mp4','audio/webm']};
function seconds(n){
 if(!Number.isFinite(n)||n<0||n>86400||Object.is(n,-0)||Number(n.toFixed(3))!==n)fail('FRAGMENT_PRECISION');
 return n.toFixed(3).replace(/\.?0+$/,'')||'0';
}
export function exportMediaAnnotation(receipt,{sources,media}={}){
 let r,m;try{r=snapshotDataRecord(receipt,32);m=snapshotDataRecord(media,8);}catch{fail('DATA');}
 const checked=validateReceipt(r,{sources});if(!checked.valid||checked.level!=='catalog_matched')fail('CATALOG_REQUIRED');
 if(!fields(m,['sourceId','mediaHash','url','type','format'])||m.sourceId!==r.sourceId||m.mediaHash!==r.mediaHash||!Object.hasOwn(mediaTypes,m.type)||!mediaTypes[m.type].includes(m.format)||typeof m.url!=='string'||m.url.length>2048)fail('MEDIA_MAPPING');
 let u;try{u=new URL(m.url);}catch{fail('MEDIA_URL');}
 if(u.protocol!=='https:'||u.href!==m.url||u.username||u.password||u.search||u.hash)fail('MEDIA_URL');
 const fragment='t='+seconds(r.start)+','+seconds(r.end);
 const bodyId='urn:sutra:cue:'+r.sourceHash+':'+r.cueId;
 const annotation={'@context':'http://www.w3.org/ns/anno.jsonld',type:'Annotation',id:'urn:sutra:annotation:'+r.sourceHash+':'+r.cueId,motivation:'linking',created:r.retrievedAt,generator:{id:'urn:sutra:evidence:web-annotation-media:0.1',type:'Software'},body:{id:bodyId,type:'TextualBody',purpose:'describing',format:'text/plain',value:r.excerpt},target:{type:'SpecificResource',source:{id:u.href,type:m.type,format:m.format},selector:{type:'FragmentSelector',conformsTo:'http://www.w3.org/TR/media-frags/',value:fragment}}};
 return {schema:'sutra-media-annotation-export/v1',annotation,cueHref:u.href+'#'+fragment,integrity:{sourceId:r.sourceId,sourceVersion:r.sourceVersion,sourceHash:r.sourceHash,mediaHash:r.mediaHash,cueId:r.cueId,verification:'catalog_matched'},truthStatus:'unverified',authority:'NONE',qualification:'Independent catalog and mapping matched; media bytes and publisher identity not independently verified. No external access performed.'};
}
