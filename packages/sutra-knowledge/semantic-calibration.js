// Experimental train/dev/test ambiguity classification; no inference authority.
// A learned score is a diagnostic, not proof of a reading or its meaning.
import {analyzeSemanticContext} from './semantic-context-analyzer.js';
const SIZE=8192;
function hash(s){let h=2166136261;for(const c of s){h^=c.codePointAt(0);h=Math.imul(h,16777619);}return h>>>0;}
const sigmoid=x=>1/(1+Math.exp(-Math.max(-35,Math.min(35,x))));
export function semanticFeatures(question,{context=true}={}){
 const q=question.normalize('NFKC').toLowerCase(),words=q.match(/[\p{L}\p{M}]+(?:['’][\p{L}\p{M}]+)?|\d+(?:\.\d+)?/gu)??[],features=new Map();
 const add=(name,w=1)=>{const h=hash(name),i=1+h%(SIZE-1);features.set(i,(features.get(i)??0)+(h&0x80000000?-w:w));};
 const tokens=words.map(w=>/^(?:18|19|20)\d{2}$/.test(w)?'<year>':/^\d/.test(w)?'<num>':w);
 for(let i=0;i<tokens.length;i++){
  add('w:'+tokens[i]);if(i) add('bi:'+tokens[i-1]+' '+tokens[i]);
  if(i>1)add('tri:'+tokens[i-2]+' '+tokens[i-1]+' '+tokens[i],.6);
 }
 add('begin:'+tokens.slice(0,2).join(' '));add('length:'+Math.min(8,Math.floor(tokens.length/4)));
 add('question:'+q.endsWith('?'));add('quotes:'+/["“”]/u.test(q));
 if(context){
  const a=analyzeSemanticContext({question});for(const x of a.diagnostics)add('cue:'+x.family+':'+x.state,1.3);
  for(const [k,v] of Object.entries(a.profile))if(typeof v==='string'||typeof v==='boolean')add('profile:'+k+':'+v,1.2);
  const marked=a.diagnostics.filter(x=>['REVIEW_REQUIRED','EXPLICIT_OR_REVIEW'].includes(x.state)).map(x=>x.family);
  for(let i=0;i<marked.length;i++)for(let j=i+1;j<marked.length;j++)add('interaction:'+marked[i]+'/'+marked[j],.6);
 }
 const norm=Math.sqrt([...features.values()].reduce((s,x)=>s+x*x,0))||1;
 return [[0,1],...[...features].sort(([a],[b])=>a-b).map(([i,x])=>[i,x/norm])];
}
const dot=(w,f)=>f.reduce((s,[i,x])=>s+w[i]*x,0);
function permutation(n,seed){let r=seed>>>0;const a=Array.from({length:n},(_,i)=>i);for(let i=n-1;i>0;i--){r=(Math.imul(r,1664525)+1013904223)>>>0;const j=r%(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;}
export function fitAmbiguityClassifier(rows,{context=true,epochs=18,learningRate=.45,l2=.0001}={}){
 if(!Array.isArray(rows)||rows.length<20||rows.length>30000||rows.some(x=>typeof x.question!=='string'||typeof x.gold!=='boolean')||!Number.isSafeInteger(epochs)||epochs<1||epochs>50)throw TypeError('CALIBRATION_TRAIN');
 const xs=rows.map(x=>({f:semanticFeatures(x.question,{context}),y:x.gold?1:0})),w=new Float64Array(SIZE);
 for(let e=0;e<epochs;e++)for(const i of permutation(xs.length,0xabcdef+e)){
  const {f,y}=xs[i],p=sigmoid(dot(w,f)),eta=learningRate/(1+e*.12);
  for(const [k,x] of f)w[k]+=eta*((y-p)*x-(k?l2*w[k]:0));
 }
 return {context,weights:Array.from(w),epochs,learningRate,l2};
}
export function rawAmbiguityScore(model,question){return dot(model.weights,semanticFeatures(question,{context:model.context}));}
export function calibrateAmbiguity(raw){
 // Two-parameter logistic calibration fitted on the development fold only.
 let a=1,b=0;for(let e=0;e<250;e++){let ga=0,gb=0;for(const r of raw){const p=sigmoid(a*r.logit+b),d=(r.gold?1:0)-p;ga+=d*r.logit;gb+=d;}a=Math.max(0,Math.min(10,a+.08*ga/raw.length));b+=.08*gb/raw.length;}return {a,b};
}
export const probability=(logit,cal)=>sigmoid(cal.a*logit+cal.b);
const frac=(a,b)=>b?a/b:null;
export function scoreAmbiguity(rows,policy){
 const m={tp:0,tn:0,fp:0,fn:0,abstainAmbiguous:0,abstainUnambiguous:0};let brier=0;const bins=Array.from({length:10},()=>({n:0,p:0,y:0}));
 for(const r of rows){const p=r.p;if(!Number.isFinite(p)||p<0||p>1)throw TypeError('CALIBRATION_PROBABILITY');const predicted=p>=policy.high?'AMBIGUOUS':p<=policy.low?'UNAMBIGUOUS':'ABSTAIN';const k=predicted==='ABSTAIN'?(r.gold?'abstainAmbiguous':'abstainUnambiguous'):predicted==='AMBIGUOUS'?(r.gold?'tp':'fp'):(r.gold?'fn':'tn');m[k]++;brier+=(p-(r.gold?1:0))**2;const bin=bins[Math.min(9,Math.floor(p*10))];bin.n++;bin.p+=p;bin.y+=r.gold?1:0;}
 const n=rows.length,resolved=m.tp+m.tn+m.fp+m.fn,recall=frac(m.tp,m.tp+m.fn+m.abstainAmbiguous),precision=frac(m.tp,m.tp+m.fp);
 return {...m,n,resolved,coverage:frac(resolved,n),precision,recall,negativePrecision:frac(m.tn,m.tn+m.fn),specificity:frac(m.tn,m.tn+m.fp+m.abstainUnambiguous),f1:precision!==null&&recall!==null&&precision+recall?2*precision*recall/(precision+recall):0,selectiveAccuracy:frac(m.tp+m.tn,resolved),overallCorrect:frac(m.tp+m.tn,n),brier:frac(brier,n),ece:frac(bins.reduce((s,b)=>s+Math.abs(b.p-b.y),0),n)};
}
export function chooseAmbiguityPolicies(dev){
 if(dev.length<20)throw TypeError('CALIBRATION_DEV');
 let best=null,selective=null;
 for(let i=1;i<100;i++){
  const threshold=i/100,policy={low:threshold,high:threshold},m=scoreAmbiguity(dev,policy);
  if(!best||m.f1>best.score.f1||m.f1===best.score.f1&&m.recall>best.score.recall)best={policy,score:m};
 }
 // Require minimum support and empirical precision on both classes; if not
 // achievable return null. Never interpret score thresholds as guarantees.
 for(let l=0;l<50;l+=2)for(let h=50;h<=100;h+=2){
  const policy={low:l/100,high:h/100},m=scoreAmbiguity(dev,policy);
  if(m.tp+m.fp<20||m.tn+m.fn<20||m.precision<.85||m.negativePrecision<.85)continue;
  if(!selective||m.coverage>selective.score.coverage||m.coverage===selective.score.coverage&&m.recall>selective.score.recall)selective={policy,score:m};
 }
 return {bestF1:best,selective85:selective,qualification:'Development-fold operating points only. Abstentions count against all-ambiguous recall; positive/negative empirical precision is not a confidence guarantee.'};
}
export function groupedBootstrap(rows,policy,{draws=200,seed=818}={}){
 const by=new Map();for(const r of rows){if(!by.has(r.group))by.set(r.group,[]);by.get(r.group).push(r);}
 const groups=[...by.values()],samples={precision:[],recall:[],coverage:[],selectiveAccuracy:[]};let state=seed;
 for(let i=0;i<draws;i++){const picked=[];for(let j=0;j<groups.length;j++){state=(Math.imul(state,1664525)+1013904223)>>>0;picked.push(...groups[state%groups.length]);}const m=scoreAmbiguity(picked,policy);for(const k of Object.keys(samples))if(m[k]!==null)samples[k].push(m[k]);}
 return Object.fromEntries(Object.entries(samples).map(([k,x])=>{x.sort((a,b)=>a-b);return [k,x.length?[x[Math.floor(.025*(x.length-1))],x[Math.ceil(.975*(x.length-1))]]:null];}));
}
