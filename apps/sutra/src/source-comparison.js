const ID=/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const TEXT=/^[\s\S]{1,1200}$/;
const date=/^\d{4}-\d{2}-\d{2}$/;
const clean=value=>String(value??'').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim();
function normalize(input,label){
 if(!input||input.version!==1||!input.source||!input.claim)throw new TypeError(label+' source is invalid.');
 const s=input.source,c=input.claim;
 if(!ID.test(s.id)||!ID.test(s.version)||!date.test(s.publishedAt)||!TEXT.test(s.scope)||!TEXT.test(s.provenance))throw new TypeError(label+' source metadata is invalid.');
 if(!ID.test(c.id)||!Number.isFinite(c.start)||!Number.isFinite(c.end)||c.start<0||c.end<=c.start||c.end>86400||!TEXT.test(c.excerpt))throw new TypeError(label+' claim is invalid.');
 return Object.freeze({version:1,source:Object.freeze({id:s.id,version:s.version,publishedAt:s.publishedAt,scope:clean(s.scope),provenance:clean(s.provenance)}),claim:Object.freeze({id:c.id,start:c.start,end:c.end,excerpt:clean(c.excerpt)}),verification:input.verification==='unverified'?'unverified':'unverified'});
}
const valueKey=claim=>JSON.stringify([claim.id,claim.start,claim.end]);
export function compareSourceClaims(localInput,peerInput){
 const local=normalize(localInput,'Local');
 if(!peerInput)return Object.freeze({status:'missing',reviewed:false,local,peer:null,summary:'Written peer source is unavailable; no comparison result is inferred.'});
 const peer=normalize(peerInput,'Peer');
 if(local.claim.id!==peer.claim.id)return Object.freeze({status:'unsupported',reviewed:false,local,peer,summary:'Sources address different claim identifiers; no agreement or conflict is inferred.'});
 if(valueKey(local.claim)!==valueKey(peer.claim))return Object.freeze({status:'conflict_unresolved',reviewed:false,local,peer,summary:'The source windows conflict and remain unresolved.'});
 if(local.claim.excerpt!==peer.claim.excerpt)return Object.freeze({status:'unsupported',reviewed:false,local,peer,summary:'Structured values align but source excerpts differ; agreement is not inferred.'});
 return Object.freeze({status:'agreement_unverified',reviewed:false,local,peer,summary:'Structured value and exact excerpt agree; factual truth is still unverified.'});
}
export function markComparisonReviewed(result){
 if(!result||!['missing','unsupported','conflict_unresolved','agreement_unverified'].includes(result.status))throw new TypeError('Invalid comparison result.');
 return Object.freeze({...result,reviewed:true,summary:result.status==='conflict_unresolved'?'Human review recorded; the source conflict remains unresolved.':result.summary});
}
