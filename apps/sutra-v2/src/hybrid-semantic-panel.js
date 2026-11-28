// Local-only review panel over the actual sealed workspace. Nothing is sent to a model.
import {parseUniqueJson} from '../../../packages/sutra-consent/strict-json.js';
import {casePin} from '../../../packages/sutra-knowledge/pinned-investigation.js';
import {prepareHybridSemantic,evaluateHybridSemantic} from '../../../packages/sutra-knowledge/semantic-hybrid.js';
export function installHybridSemanticPanel({anchor,getSealed,isBusy,download}){
 const el=(tag,text)=>{const x=document.createElement(tag);if(text!==undefined)x.textContent=text;return x;};
 const section=el('details');section.id='review-hybrid-panel';section.append(el('summary','Hybrid semantic interpretation (review required)'),el('p','Prepare an exact local packet from the sealed question and only selected sources. No model is contacted here. Import a structured untrusted response from a model or other caller; all meanings remain conditional.'));
 const sources=el('select');sources.id='review-hybrid-sources';sources.multiple=true;sources.size=4;const sl=el('label','Sources explicitly selected for the packet');sl.htmlFor=sources.id;
 const history=el('textarea');history.id='review-hybrid-history';history.rows=4;history.maxLength=32768;history.spellcheck=false;const hl=el('label','Optional pinned dialogue JSON (prior turns and current question)');hl.htmlFor=history.id;
 const historyPin=el('input');historyPin.id='review-hybrid-history-pin';historyPin.type='text';historyPin.maxLength=71;const hpl=el('label','Independently retained dialogue SHA-256 pin');hpl.htmlFor=historyPin.id;
 const turns=el('select');turns.id='review-hybrid-turns';turns.multiple=true;turns.size=4;const tl=el('label','Prior turns explicitly selected for disclosure');tl.htmlFor=turns.id;
 const prepare=el('button','Prepare local interpretation packet');prepare.id='review-hybrid-prepare';prepare.type='button';
 const packet=el('textarea');packet.id='review-hybrid-packet';packet.readOnly=true;packet.rows=6;const pl=el('label','Exact packet text (inspect before sharing externally)');pl.htmlFor=packet.id;
 const pin=el('p');pin.className='mono';pin.id='review-hybrid-pin';
 const checkbox=el('input');checkbox.type='checkbox';checkbox.id='review-hybrid-approve';const approval=el('label');approval.append(checkbox,document.createTextNode(' I reviewed this exact packet and want to admit a response against it.'));
 const response=el('textarea');response.id='review-hybrid-response';response.rows=6;response.maxLength=65536;response.spellcheck=false;const rl=el('label','Structured response JSON (untrusted)');rl.htmlFor=response.id;
 const evaluate=el('button','Evaluate competing meanings locally');evaluate.id='review-hybrid-evaluate';evaluate.type='button';
 const save=el('button','Export conditional review report');save.id='review-hybrid-export';save.type='button';
 const status=el('p','Seal a reviewed contract first.');status.id='review-hybrid-status';status.setAttribute('role','status');
 const result=el('pre');result.id='review-hybrid-result';
 section.append(sl,sources,hl,history,hpl,historyPin,tl,turns,prepare,pl,packet,pin,approval,rl,response,evaluate,save,status,result);anchor.after(section);
 let contract=null,prepared=null,report=null,revision=0,working=false;
 const selected=()=>[...sources.selectedOptions].map(o=>o.value);
 function clear(){revision++;prepared=null;report=null;packet.value='';pin.textContent='';checkbox.checked=false;response.value='';result.textContent='';}
 function control(){const c=getSealed();if(c!==contract){contract=c;clear();history.value='';historyPin.value='';turns.replaceChildren();sources.replaceChildren();if(c)for(const s of JSON.parse(c.contractText).sources){const o=el('option',s.id);o.value=s.id;sources.append(o);}status.textContent=c?'Select sources and prepare an exact packet.':'Seal a reviewed contract first.';}
  const disabled=working||isBusy()||!contract;sources.disabled=disabled;history.disabled=disabled;historyPin.disabled=disabled;turns.disabled=disabled;prepare.disabled=disabled;checkbox.disabled=disabled||!prepared;response.disabled=disabled||!prepared;evaluate.disabled=disabled||!prepared||!checkbox.checked||!response.value.trim();save.disabled=disabled||!report;
 }
 history.oninput=()=>{clear();turns.replaceChildren();try{const x=parseUniqueJson(history.value,{maxChars:32768,maxDepth:10});if(Array.isArray(x.turns)&&x.turns.length<=24)for(const t of x.turns.slice(0,-1)){if(typeof t.id!=='string'||typeof t.role!=='string')continue;const o=el('option',t.id+' ('+t.role+')');o.value=t.id;turns.append(o);}}catch{}status.textContent='Dialogue changed; retain the matching digest and select prior turns.';control();};
 historyPin.oninput=turns.onchange=()=>{clear();status.textContent='Dialogue selection changed; prepare a new packet.';control();};
 sources.onchange=()=>{clear();status.textContent='Source selection changed; prepare a new packet.';control();};checkbox.onchange=()=>{report=null;result.textContent='';control();};response.oninput=()=>{report=null;result.textContent='';control();};
 prepare.onclick=async()=>{if(prepare.disabled)return;clear();const ticket=revision,c=contract,sourceIds=selected(),conversation=history.value.trim()?{conversationText:history.value,conversationPin:historyPin.value.trim(),selectedTurnIds:[...turns.selectedOptions].map(o=>o.value)}:null;working=true;control();
  try{const catalogText=JSON.stringify({version:1,contractDigest:c.pin,aliases:[]}),input={contractText:c.contractText,contractPin:c.pin,catalogText,catalogPin:await casePin(catalogText)},p=await prepareHybridSemantic(input,{sourceIds,conversation});if(ticket!==revision||getSealed()!==c)return;prepared={input,sourceIds,conversation,p};packet.value=p.packetText;pin.textContent=p.packetPin;status.textContent='Local packet prepared; no network request. Review the disclosure before copying.';}
  catch{if(ticket===revision)status.textContent='Packet refused: unsafe or oversized disclosure, or invalid question.';}
  finally{working=false;control();}
 };
 evaluate.onclick=async()=>{if(evaluate.disabled)return;const ticket=revision,c=contract,record=prepared,raw=response.value;working=true;report=null;result.textContent='';control();
  try{const r=await evaluateHybridSemantic(record.input,{sourceIds:record.sourceIds,conversation:record.conversation,approvedPacketPin:record.p.packetPin,responseText:raw});if(ticket!==revision||getSealed()!==c||response.value!==raw||!checkbox.checked)return;report=r;status.textContent=r.disposition.replaceAll('_',' ')+' · no decision authority';result.textContent=JSON.stringify({alternatives:r.alternatives,contrasts:r.contrasts,clarifications:r.clarifications,referenceObligations:r.referenceObligations,reportPin:r.reportPin},null,2);}
  catch{if(ticket===revision)status.textContent='Response refused: invalid schema, stale packet, ungrounded evidence or operand.';}
  finally{working=false;control();}
 };
 save.onclick=()=>{if(!save.disabled&&report&&getSealed()===contract)download(report.reportText,'sutra-hybrid-semantic-review.json','application/json');};
 control();return control;
}
