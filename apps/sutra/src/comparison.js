// Evidence-aware comparison. The engine compares narrowly declared structured
// claims, not semantic truth or the credibility of either source.
const safeString=(v,n)=>typeof v==='string'&&v.trim().length>0&&v.length<=n&&
 !/[\u0000-\u001f\u007f]/.test(v);
const id=/^[A-Za-z][A-Za-z0-9_.:-]{0,99}$/;
const sourceKind=new Set(['video','guide']);
const sha256=/^[a-f0-9]{64}$/;
const safeSourceHref=v=>v===undefined||typeof v==='string'&&v.length<=300&&!/[\u0000-\u001f\u007f\\]/.test(v)&&
 (v.startsWith('./')||v.startsWith('/'))&&!/(^|\/)\.\.(?:\/|$)/.test(v)&&!/^\/\//.test(v);
const isClaim=c=>!!c&&typeof c==='object'&&!Array.isArray(c)&&
 sourceKind.has(c.sourceKind)&&safeString(c.sourceId,100)&&id.test(c.sourceId)&&
 safeString(c.sourceVersion,100)&&safeString(c.scope,160)&&
 safeString(c.claimKey,100)&&id.test(c.claimKey)&&
 (safeString(c.value,120)||Number.isFinite(c.value)||typeof c.value==='boolean')&&
 safeString(c.excerpt,1200)&&safeString(c.title,120)&&safeSourceHref(c.sourceHref)&&(c.sourceHash===undefined||typeof c.sourceHash==='string'&&sha256.test(c.sourceHash))&&
 (c.cueId===undefined||typeof c.cueId==='string'&&/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/.test(c.cueId))&&
 (c.start===undefined&&c.end===undefined||Number.isFinite(c.start)&&Number.isFinite(c.end)&&c.start>=0&&c.end>c.start)&&
 safeString(c.provenance,240)&&
 (c.observedAt===undefined||typeof c.observedAt==='string'&&
  !Number.isNaN(Date.parse(c.observedAt))&&c.observedAt.length<=40)&&
 (c.dateBasis===undefined||safeString(c.dateBasis,120));
const shallow=c=>Object.freeze({
 sourceKind:c.sourceKind,sourceId:c.sourceId,sourceVersion:c.sourceVersion,scope:c.scope,
 claimKey:c.claimKey,value:c.value,excerpt:c.excerpt,title:c.title,provenance:c.provenance,
 ...(c.sourceHref?{sourceHref:c.sourceHref}:{}),...(c.sourceHash?{sourceHash:c.sourceHash}:{}),
 ...(c.observedAt?{observedAt:c.observedAt,dateBasis:c.dateBasis??'Recorded observation'}:{}),
 ...(c.cueId!==undefined?{cueId:c.cueId}:{}),
 ...(Number.isFinite(c.start)&&Number.isFinite(c.end)&&c.start>=0&&c.end>c.start?{start:c.start,end:c.end}:{})
});
export function compareClaimPair({video=null,guide=null}={}){
 if(video!==null&&!isClaim(video)||guide!==null&&!isClaim(guide)){
  return Object.freeze({status:'invalid_source',reason:'One or more source records lack bounded identity, version, excerpt or claim metadata.',video:null,guide:null});
 }
 const left=video?shallow(video):null,right=guide?shallow(guide):null;
 if(!left||!right)return Object.freeze({status:'missing_source',
  reason:!left&&!right?'Neither source is available.':!left?'The video claim has no usable source.':'No reviewed guide claim is connected.',
  video:left,guide:right});
 if(left.sourceKind!=='video'||right.sourceKind!=='guide')return Object.freeze({
  status:'invalid_source',reason:'Sources have incompatible declared roles.',video:null,guide:null});
 if(left.scope!==right.scope||left.claimKey!==right.claimKey)return Object.freeze({
  status:'incomparable',reason:'Claim scope or question identity differs; agreement cannot be inferred.',
  video:left,guide:right});
 if(typeof left.value!==typeof right.value)return Object.freeze({
  status:'unresolved_conflict',
  reason:'The two structured claim values have different types. A reviewer must inspect the original excerpts.',
  video:left,guide:right});
 if(left.value!==right.value)return Object.freeze({
  status:'unresolved_conflict',
  reason:'Published structured claim values disagree. Neither side is declared factually correct.',
  video:left,guide:right});
 if(left.excerpt!==right.excerpt)return Object.freeze({status:'matching_values_unreviewed',
  reason:'The structured values match, but the source excerpts differ. Agreement is not established until the actual excerpts are reviewed.',
  video:left,guide:right});
 return Object.freeze({status:'exact_excerpt_match_unverified',
  reason:'The structured values and exact source excerpts match for the same scope. This is textual consistency only; provenance reliability and factual truth are not verified.',
  video:left,guide:right});
}
export const syntheticComparison=Object.freeze({
 video:Object.freeze({sourceKind:'video',sourceId:'fixture_video',sourceVersion:'v1',
  title:'Hypothetical video note',scope:'synthetic_handover',claimKey:'signature_count',
  value:2,excerpt:'In this invented example, the handover needs two signatures.',provenance:'Authored synthetic comparison fixture, not original video evidence',observedAt:'2026-11-23T00:00:00Z',dateBasis:'Fixture metadata date'}),
 guide:Object.freeze({sourceKind:'guide',sourceId:'fixture_guide',sourceVersion:'v1',
  title:'Hypothetical written checklist',scope:'synthetic_handover',claimKey:'signature_count',
  value:3,excerpt:'In this invented example, the handover needs three signatures.',provenance:'Authored synthetic written checklist fixture, not an external publisher',sourceHref:'./guides/synthetic-comparison-guide.html#signature-count',sourceHash:'2d3b6b2256a7c71ee18558cb6a422b739e32d6bdd9c7cf3ddae282477eefa9c0',observedAt:'2026-11-23T00:00:00Z',dateBasis:'Fixture metadata date'})
});
