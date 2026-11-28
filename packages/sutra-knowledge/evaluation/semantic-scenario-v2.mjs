import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {groupScenarios} from '../semantic-split-v2.js';
const root=new URL('./',import.meta.url),read=p=>readFileSync(new URL(p,root),'utf8'),jsonl=p=>read(p).trimEnd().split('\n').map(JSON.parse);
const csv=t=>{const rows=[];let row=[],field='',q=false;for(let i=0;i<t.length;i++){const ch=t[i];if(q){if(ch==='"'&&t[i+1]==='"'){field+='"';i++;}else if(ch==='"')q=false;else field+=ch;}else if(ch==='"')q=true;else if(ch===','){row.push(field);field='';}else if(ch==='\n'){row.push(field);field='';if(row.some(x=>x!==''))rows.push(row);row=[];}else if(ch!=='\r')field+=ch;}if(field||row.length){row.push(field);rows.push(row);}const h=rows.shift();return rows.map(r=>Object.fromEntries(h.map((x,i)=>[x,r[i]??''])));};
const manifest=JSON.parse(read('semantic-model-authored-manifest-v1.json'));
const records=manifest.shards.flatMap(s=>jsonl(s.path)).map(r=>({id:r.id,corpus:'SUTRA-synthetic',texts:[r.question],developmentOnly:true}));
for(const r of jsonl('ambient-human-full-v1.jsonl')){const texts=[r.premise,r.hypothesis,...r.disambiguations.flatMap(x=>[x.premise,x.hypothesis]).filter(x=>typeof x==='string'&&x.trim())];records.push({id:'ambient:'+r.id,corpus:'AmbiEnt',texts:[...new Set(texts)],developmentOnly:false});}
for(const [i,r] of JSON.parse(read('tempambiqa-human-full-v1.json')).entries())records.push({id:'temporal:'+i,corpus:'TempAmbiQA',texts:[r.question],developmentOnly:false});
for(const [i,name] of ['scope-exp1b-base.csv','scope-exp2a-base.csv','scope-exp2b-base.csv'].entries()){const by=new Map();for(const r of csv(read('scope-ambiguity-human-v1/'+name))){if(!by.has(r.idx))by.set(r.idx,new Set());by.get(r.idx).add(r.sentence);}for(const [id,set] of by)records.push({id:'scope:'+(i+6)+':'+id,corpus:'McGill-scope',texts:[...set],developmentOnly:false});}
const report=groupScenarios(records),{assignments,groupRows,...summary}=report;
const assignmentSha256=createHash('sha256').update(JSON.stringify(assignments)).digest('hex');
const output={...report,assignmentSha256};
if(process.env.SUTRA_SCENARIO_SPLIT_REPORT)writeFileSync(process.env.SUTRA_SCENARIO_SPLIT_REPORT,JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({...summary,assignmentSha256,largestGroups:groupRows.slice().sort((a,b)=>b.records-a.records).slice(0,5)},null,2));
