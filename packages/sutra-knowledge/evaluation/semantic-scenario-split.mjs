// Deterministic scenario-grouped partitioning. Labels are never inputs to scenario keys or fold assignment.
import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';import path from 'node:path';import {analyzeSemanticContext} from '../semantic-context-analyzer.js';
export const VERSION='sutra-semantic-scenario-split/v1';
const FN=new Set('how what who where when which why is are was were be been being did does do has have had can could should would may might must the a an of in on at to from for by with and or not no all any each every some if unless than more less most least current last next this that these those as per into about between during before after'.split(' '));
const collapse=xs=>xs.filter((x,i)=>i===0||x!==xs[i-1]);
export function scenarioKey(text){
 if(typeof text!=='string'||!text.trim())throw TypeError('SCENARIO_TEXT');
 const a=analyzeSemanticContext({question:text}),tokens=text.normalize('NFKC').match(/[A-Za-z]+(?:'[A-Za-z]+)?|\d+(?:\.\d+)?/g)??[];
 const mapped=collapse(tokens.map((raw,i)=>{const t=raw.toLowerCase();if(/^(?:18|19|20)\d{2}$/.test(t))return '<year>';if(/^\d/.test(t))return '<num>';if(FN.has(t))return t;if(i>0&&/^[A-Z]/.test(raw))return '<entity>';return '<content>';}));
 const p=a.profile,bits=[p.temporalAnchor,p.change?'C':'-',p.ratio?'R':'-',p.scopeInteraction?'S':'-',p.negation?'N':'-',p.conditional?'I':'-',p.aggregate?'A':'-',p.dynamicRole?'DROLE':'-',p.dynamicQuantity?'DQTY':'-'].join('|');
 return bits+'|'+mapped.join(' ');
}
export function foldForKey(key){const n=parseInt(createHash('sha256').update(key).digest('hex').slice(0,8),16)%100;return n<70?'train':n<85?'dev':'test';}
const parseCsv=t=>{const rows=[];let row=[],field='',q=false;for(let i=0;i<t.length;i++){const ch=t[i];if(q){if(ch==='"'&&t[i+1]==='"'){field+='"';i++;}else if(ch==='"')q=false;else field+=ch;}else if(ch==='"')q=true;else if(ch===','){row.push(field);field='';}else if(ch==='\n'){row.push(field);field='';if(row.some(x=>x!==''))rows.push(row);row=[];}else if(ch!=='\r')field+=ch;}const h=rows.shift();return rows.map(r=>Object.fromEntries(h.map((x,i)=>[x,r[i]??''])));};
const summarize=(name,texts,labels=null)=>{const keys=texts.map(scenarioKey),folds=keys.map(foldForKey),counts={train:0,dev:0,test:0},unique={train:new Set(),dev:new Set(),test:new Set()};folds.forEach((f,i)=>{counts[f]++;unique[f].add(keys[i]);});const overlap=[...new Set(keys)].filter(k=>new Set(folds.filter((_,i)=>keys[i]===k)).size>1).length;const out={name,records:texts.length,uniqueScenarioKeys:new Set(keys).size,recordsByFold:counts,scenarioKeysByFold:Object.fromEntries(Object.entries(unique).map(([k,v])=>[k,v.size])),crossFoldScenarioKeyOverlap:overlap};if(labels){out.labelDistribution={};for(let i=0;i<labels.length;i++){const f=folds[i];out.labelDistribution[f]??={};const k=String(labels[i]);out.labelDistribution[f][k]=(out.labelDistribution[f][k]??0)+1;}}return out;};
export function buildScenarioSplitReport(){
 const root=new URL('./',import.meta.url),temp=JSON.parse(readFileSync(new URL('tempambiqa-human-full-v1.json',root),'utf8'));
 const manifest=JSON.parse(readFileSync(new URL('semantic-model-authored-manifest-v1.json',root),'utf8')),synthetic=manifest.shards.flatMap(s=>readFileSync(new URL(s.path,root),'utf8').trim().split('\n').map(JSON.parse));
 const scopeRoot=new URL('scope-ambiguity-human-v1/',root),scope=['scope-exp1b-base.csv','scope-exp2a-base.csv','scope-exp2b-base.csv'].flatMap(f=>parseCsv(readFileSync(new URL(f,scopeRoot),'utf8')));
 const report={version:VERSION,assignment:'SHA256(structural scenario key) => 70/15/15 train/dev/test',labelUsedForAssignment:false,
  corpora:[summarize('TempAmbiQA',temp.map(x=>x.question),temp.map(x=>x.is_ambiguous)),summarize('SUTRA model-authored',synthetic.map(x=>x.question),synthetic.map(x=>x.family)),summarize('McGill scope',scope.map(x=>x.sentence))],
  boundary:'Structural grouping masks content words, years and numbers conservatively. It reduces template/entity leakage but does not prove semantic independence or absence of training contamination.'};
 for(const c of report.corpora)if(c.crossFoldScenarioKeyOverlap!==0)throw Error('SCENARIO_SPLIT_LEAK');
 return report;
}
if(fileURLToPath(import.meta.url)===path.resolve(process.argv[1]??''))console.log(JSON.stringify(buildScenarioSplitReport(),null,2));
