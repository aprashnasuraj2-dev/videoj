// Evidence-aware comparison. The engine compares narrowly declared structured
// claims, not semantic truth or the credibility of either source.
const safeString=(v,n)=>typeof v==='string'&&v.trim().length>0&&v.length<=n&&
 !/[\u0000-\u001f\u007f]/.test(v);
const id=/^[A-Za-z][A-Za-z0-9_.:-]{0,99}$/;
const sourceKind=new Set(['video','guide']);
const isClaim=c=>!!c&&typeof c==='object'&&!Array.isArray(c)&&
 sourceKind.has(c.sourceKind)&&safeString(c.sourceId,100)&&id.test(c.sourceId)&&
 safeString(c.sourceVersion,100)&&safeString(c.scope,160)&&
 safeString(c.claimKey,100)&&id.test(c.claimKey)&&
 (typeof c.value==='string'&&c.value.length<=120||Number.isFinite(c.value)||typeof c.value==='boolean')&&
 safeString(c.excerpt,1200)&&safeString(c.title,120);
const shallow=c=>Object.freeze({
 sourceKind:c.sourceKind,sourceId:c.sourceId,sourceVersion:c.sourceVersion,scope:c.scope,
 claimKey:c.claimKey,value:c.value,excerpt:c.excerpt,title:c.title,
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
 return Object.freeze({status:'consistent_unverified',
  reason:'The structured values match for the same scope, but semantic support, independent provenance and factual truth are not verified.',
  video:left,guide:right});
}
export const syntheticComparison=Object.freeze({
 video:Object.freeze({sourceKind:'video',sourceId:'fixture_video',sourceVersion:'v1',
  title:'Hypothetical video note',scope:'synthetic_handover',claimKey:'signature_count',
  value:2,excerpt:'In this invented example, the handover needs two signatures.',start:2,end:4}),
 guide:Object.freeze({sourceKind:'guide',sourceId:'fixture_guide',sourceVersion:'v1',
  title:'Hypothetical written checklist',scope:'synthetic_handover',claimKey:'signature_count',
  value:3,excerpt:'In this invented example, the handover needs three signatures.'})
});
