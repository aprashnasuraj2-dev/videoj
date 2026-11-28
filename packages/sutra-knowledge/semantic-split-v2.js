// Frozen, label-blind cross-corpus grouping. Never import the evolving analyzer.
// Hash assignment is deterministic allocation, not cryptographic isolation.
export const VERSION='sutra-semantic-scenario-split/v2';
const KEEP=new Set('what which who where when why how is are was were be been being did does do has have had can could should would may might must the a an of in on at to from for by with and or not no all any each every some none both either neither if unless than more less most least current last next this that these those as per into about between during before after since until always sometimes usually never often exactly at least only once twice'.split(' '));
export function normalizedText(text){if(typeof text!=='string'||!text.trim()||text.length>8192)throw TypeError('SCENARIO_TEXT');return text.normalize('NFKC').toLowerCase().replace(/[\u2018\u2019]/gu,"'").replace(/\s+/gu,' ').trim();}
export function structuralKey(text){
 const words=normalizedText(text).match(/[\p{L}\p{M}]+(?:'[\p{L}\p{M}]+)?|\d+(?:\.\d+)?/gu)??[];
 const mapped=words.map(t=>/^(?:18|19|20)\d{2}$/.test(t)?'<year>':/^\d/.test(t)?'<num>':KEEP.has(t)?t:/(?:n't)$/.test(t)?'<verb_neg>':'<content>');
 return mapped.filter((x,i)=>i===0||x!==mapped[i-1]).join(' ');
}
function bucket(text){let h=2166136261;for(const c of text){h^=c.codePointAt(0);h=Math.imul(h,16777619);}return (h>>>0)%100;}
export function groupScenarios(records){
 if(!Array.isArray(records)||records.length<2||records.length>30000)throw TypeError('SCENARIO_RECORDS');
 const seen=new Set(),keys=new Map(),parent=records.map((_,i)=>i),sizes=records.map(()=>1),members=[];
 function find(i){while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;}
 function union(a,b){a=find(a);b=find(b);if(a===b)return;if(sizes[a]<sizes[b])[a,b]=[b,a];parent[b]=a;sizes[a]+=sizes[b];}
 function link(key,i){if(keys.has(key))union(i,keys.get(key));else keys.set(key,i);}
 for(const [i,r] of records.entries()){
  if(!r||Object.keys(r).length!==4||!['id','corpus','texts','developmentOnly'].every(k=>Object.hasOwn(r,k))||typeof r.id!=='string'||!r.id||r.id.length>160||seen.has(r.id)||typeof r.corpus!=='string'||!r.corpus||r.corpus.length>80||!Array.isArray(r.texts)||r.texts.length<1||r.texts.length>32||typeof r.developmentOnly!=='boolean')throw TypeError('SCENARIO_RECORD');
  seen.add(r.id);const sigs=new Set();
  for(const t of r.texts){sigs.add('exact:'+normalizedText(t));sigs.add('shape:'+structuralKey(t));}
  for(const k of sigs)link(k,i);members.push(sigs);
 }
 const groups=new Map();for(const [i,r] of records.entries()){const root=find(i);if(!groups.has(root))groups.set(root,{ids:[],corpora:new Set(),developmentOnly:false,keys:new Set()});const g=groups.get(root);g.ids.push(r.id);g.corpora.add(r.corpus);g.developmentOnly||=r.developmentOnly;for(const k of members[i])g.keys.add(k);}
 const assignments=[],groupRows=[];
 for(const g of groups.values()){const key=[...g.keys].sort()[0],n=bucket(key),fold=g.developmentOnly?'development':n<70?'train':n<85?'dev':'test';const id=g.ids.slice().sort()[0];groupRows.push({id,fold,records:g.ids.length,corpora:[...g.corpora].sort(),developmentConnected:g.developmentOnly,keyCount:g.keys.size});for(const row of g.ids)assignments.push({id:row,group:id,fold});}
 assignments.sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);groupRows.sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
 const perCorpus={};const folds=new Map(assignments.map(x=>[x.id,x.fold]));for(const r of records){perCorpus[r.corpus]??={development:0,train:0,dev:0,test:0};perCorpus[r.corpus][folds.get(r.id)]++;}
 const keyFolds=new Map();for(const [i,r] of records.entries())for(const k of members[i]){const f=folds.get(r.id);if(keyFolds.has(k)&&keyFolds.get(k)!==f)throw Error('SCENARIO_LEAK');keyFolds.set(k,f);}
 return {version:VERSION,records:records.length,groups:groupRows.length,crossCorpusGroups:groupRows.filter(x=>x.corpora.length>1).length,largestGroup:Math.max(...groupRows.map(x=>x.records)),developmentConnectedRecords:groupRows.filter(x=>x.developmentConnected).reduce((n,x)=>n+x.records,0),perCorpus,crossFoldExactOrStructuralKeyOverlap:0,assignments,groupRows,heldOutClaim:false,qualification:'Public corpora have prior development exposure; grouping is a robustness split, not an unseen-test guarantee. Exact, structural and supplied item relationships are grouped across corpora. Semantic paraphrase contamination remains possible.'};
}
