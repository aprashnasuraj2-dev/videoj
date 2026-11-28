// Pinned conversation evidence and conservative reference alternatives.
// Dialogue is data, not instruction or proof; no assistant claim becomes a user declaration.
import {parseUniqueJson} from '../sutra-consent/strict-json.js';
import {casePin} from './pinned-investigation.js';
export const CONVERSATION_VERSION='sutra-semantic-conversation/v1';
export const CONTEXT_FACETS=Object.freeze(['entity','metric','period','population','geography','baseline','unit','condition','definition']);
const fail=c=>{throw TypeError('SEMANTIC_CONVERSATION_'+c);};
const exact=(x,ks)=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).length===ks.length&&ks.every(k=>Object.hasOwn(x,k));
const id=x=>typeof x==='string'&&/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(x);
const txt=(x,n)=>typeof x==='string'&&x.length>0&&x.length<=n&&x.trim().length>0&&!/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u200b\u200c\u200d\u2060\ufeff\ud800-\udfff]/u.test(x);
const enc=new TextEncoder();
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
function span(x,text){if(!exact(x,['start','end','quote'])||!Number.isSafeInteger(x.start)||Object.is(x.start,-0)||!Number.isSafeInteger(x.end)||x.start<0||x.end<=x.start||x.end>text.length||x.end-x.start>500||!txt(x.quote,500)||text.slice(x.start,x.end)!==x.quote)fail('SPAN');}
const markers=[
 ['entity',/\b(?:it|its|they|them|their|he|she|his|her|that company|the former|the latter|that one|this one)\b/giu],
 ['metric',/\b(?:that metric|same metric|that figure|this figure|that rate|same rate|that measure|same measure)\b/giu],
 ['period',/\b(?:then|that year|same year|that period|same period|previous year|next year|the following year|last year|this year|currently|still|now)\b/giu],
 ['baseline',/\b(?:same baseline|previous baseline|as before|same comparison|compared with before)\b/giu],
 ['geography',/\b(?:there|same region|that location|same country)\b/giu],
 ['population',/\b(?:same group|those customers|that population|those people)\b/giu],
 ['unit',/\b(?:same units?|same currency)\b/giu],
 ['condition',/\b(?:same conditions?|under those conditions|same assumptions?)\b/giu],
 ['definition',/\b(?:same definition|same method|as defined earlier)\b/giu]
];
const continuation=/^(?:and\b|what about\b|how about\b|instead\b|compared (?:with|to)\b|for (?:the|that|this)\b)/iu;
const correction=/\b(?:actually|rather than|not .{1,80} but|instead of|correction|I meant)\b/iu;
function key(a){return a.quote.normalize('NFKC').toLowerCase().replace(/\s+/g,' ');}
export async function inspectSemanticConversation({conversationText,conversationPin,question,selectedTurnIds=[]}={}){
 if(typeof conversationText!=='string'||enc.encode(conversationText).length>32768||await casePin(conversationText)!==conversationPin||!txt(question,2048))fail('PIN');
 const c=parseUniqueJson(conversationText,{maxChars:32768,maxDepth:10});
 if(!exact(c,['version','turns'])||c.version!==CONVERSATION_VERSION||!Array.isArray(c.turns)||c.turns.length<1||c.turns.length>24||!Array.isArray(selectedTurnIds)||selectedTurnIds.length>12||new Set(selectedTurnIds).size!==selectedTurnIds.length||selectedTurnIds.some(x=>!id(x)))fail('SCHEMA');
 const seen=new Set(),active=new Map(CONTEXT_FACETS.map(f=>[f,[]])),events=[];
 for(const t of c.turns){
  if(!exact(t,['id','role','text','updates'])||!id(t.id)||seen.has(t.id)||!['user','assistant'].includes(t.role)||!txt(t.text,2048)||!Array.isArray(t.updates)||t.updates.length>16||t.role==='assistant'&&t.updates.length)fail('TURN');
  seen.add(t.id);const touched=new Set();
  for(const u of t.updates){
   if(!exact(u,['facet','action','anchors'])||!CONTEXT_FACETS.includes(u.facet)||touched.has(u.facet)||!['replace','append','clear'].includes(u.action)||!Array.isArray(u.anchors)||u.anchors.length>8||(u.action==='clear')!==(u.anchors.length===0))fail('UPDATE');
   touched.add(u.facet);for(const a of u.anchors)span(a,t.text);
   const next=u.action==='append'?[...active.get(u.facet),...u.anchors.map(a=>({...a,turnId:t.id}))]:u.anchors.map(a=>({...a,turnId:t.id}));
   const unique=[...new Map(next.map(a=>[key(a),a])).values()];if(unique.length>8)fail('FOCUS_LIMIT');
   active.set(u.facet,unique);
   events.push({turnId:t.id,facet:u.facet,action:u.action});
  }
 }
 if(c.turns.at(-1).role!=='user'||c.turns.at(-1).text!==question)fail('QUESTION_MISMATCH');
 if(selectedTurnIds.some(x=>!seen.has(x)||x===c.turns.at(-1).id))fail('SELECTION');
 const selected=new Set(selectedTurnIds),turns=c.turns.slice(0,-1).filter(t=>selected.has(t.id)).map(({id,role,text})=>({id,role,text}));
 // Current user anchors are also visible (question itself is already disclosed).
 const allowed=new Set([...selected,c.turns.at(-1).id]),facets=Object.fromEntries([...active].map(([f,as])=>[f,as.filter(a=>allowed.has(a.turnId))]));
 const signals=[];
 for(const [facet,re] of markers)for(const m of question.matchAll(re)){
  const options=facets[facet];
  signals.push({facet,span:{start:m.index,end:m.index+m[0].length,quote:m[0]},state:options.length===0?'MISSING_CONTEXT':options.length===1?'ONE_DECLARED_CANDIDATE_REVIEW_REQUIRED':'MULTIPLE_DECLARED_CANDIDATES',options});
 }
 // Continuations and corrections carry potential omission or changed scope.
 // Don't automatically inherit the latest entity on bare 'and in 2025?'.
 const dependent=continuation.test(question)||correction.test(question);
 if(dependent&&!signals.some(s=>s.facet==='entity'))signals.push({facet:'entity',span:{start:0,end:question.length,quote:question},state:facets.entity.length===0?'MISSING_CONTEXT':facets.entity.length===1?'ONE_DECLARED_CANDIDATE_REVIEW_REQUIRED':'MULTIPLE_DECLARED_CANDIDATES',options:facets.entity});
 const currentTurnId=c.turns.at(-1).id;
 return freeze({version:CONVERSATION_VERSION,conversationPin,currentTurnId,turns,activeFacets:facets,references:signals.map((s,i)=>({id:'reference_'+(i+1),...s})),dependentContinuation:dependent,correctionCue:correction.test(question),decisionAuthority:'NONE',qualification:'User-declared anchors only. Historical assistant text is untrusted dialogue. Unselected or superseded anchors are not candidate values. References and declarations do not establish intent or factual truth.'});
}
