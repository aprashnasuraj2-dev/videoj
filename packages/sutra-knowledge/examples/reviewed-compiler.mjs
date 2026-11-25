import {casePin} from '../pinned-investigation.js';
const enc=s=>new TextEncoder().encode(s);
export function exactSpan(sourceId,text,quote){
 const i=text.indexOf(quote);if(i<0||text.indexOf(quote,i+quote.length)!==-1)throw Error('FIXTURE_SPAN');
 const start=enc(text.slice(0,i)).length;return {sourceId,start,end:start+enc(quote).length,quote};
}
export async function compilerFinanceFixture({missing=false}={}){
 const question='Did operating cash minus cash property and equipment additions increase?';
 // Manually normalized historical numeric fields; not original filing bytes.
 const source='FY2025 OCF = 136162; FY2025 PPE = 64551; FY2026 OCF = 182935;'+(missing?'':' FY2026 PPE = 115948;');
 const t={kind:'currency_amount',unit:'USD_million',scope:'microsoft_consolidated_comparison',dimension:[0,0,0]};
 const binding=(id,quote)=>({id,span:exactSpan('normalized_filing',source,quote),type:t});
 const c={version:1,question:{text:question,digest:await casePin(question)},sources:[{id:'normalized_filing',text:source,digest:await casePin(source),lineage:'microsoft_issuer'}],bindings:[binding('ocf25','136162'),binding('ppe25','64551'),binding('ocf26','182935'),...(missing?[]:[binding('ppe26','115948')])]};
 const contractText=JSON.stringify(c),pin=await casePin(contractText);
 const input=id=>({id,kind:'input',bindingId:id});
 const nodes=[input('ocf25'),input('ppe25'),input('ocf26'),missing?{id:'ppe26',kind:'unknown',type:t,reason:'Cash PPE value is absent from the reviewed extract.'}:input('ppe26'),{id:'proxy25',kind:'derive',op:'sub',args:['ocf25','ppe25']},{id:'proxy26',kind:'derive',op:'sub',args:['ocf26','ppe26']},{id:'target',kind:'constraint',op:'gt',args:['proxy26','proxy25']}];
 const p={version:1,contractDigest:pin,questionSpan:exactSpan('question',question,question),claims:[{id:'quoted',kind:'quoted_assertion',span:exactSpan('normalized_filing',source,'FY2026 OCF = 182935')},{id:'method',kind:'hypothesis',text:'The proposed cash-flow proxy is OCF minus cash PPE.'}],nodes,targetId:'target'};
 return {contractText,pin,proposalText:JSON.stringify(p)};
}

export async function compilerContrastFixture(){
 const f=await compilerFinanceFixture(),edit=fn=>{const p=JSON.parse(f.proposalText);fn(p);return JSON.stringify(p);};
 const self=edit(p=>{const target=p.nodes.find(n=>n.id==='target');target.op='eq';target.args=['proxy25','proxy25'];});
 const opposite=edit(p=>{p.nodes.find(n=>n.id==='target').op='lt';});
 const hostile=edit(p=>{p.nodes[0].value='999';});
 const proposals=[...Array.from({length:5},(_,i)=>({id:'scripted_copy_'+(i+1),proposalText:self})),{id:'original_proxy',proposalText:f.proposalText},{id:'reversed_comparison',proposalText:opposite},{id:'fabricated_value',proposalText:hostile}];
 return {...f,batchText:JSON.stringify({version:1,contractDigest:f.pin,proposals})};
}
