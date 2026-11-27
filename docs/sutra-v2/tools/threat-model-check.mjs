import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const fail=message=>{throw new Error('THREAT_MODEL_INVALID: '+message);};
const readJson=file=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));

const model=readJson('docs/sutra-v2/threat-model.json');
const roadmap=readJson('docs/sutra-v2/roadmap.json');
if(model.version!=='sutra-v2-threat-model-v1')fail('unexpected version');
for(const key of ['principals','assets','boundaries','threats','nonClaims'])if(!Array.isArray(model[key])||model[key].length===0)fail(key+' empty');

const unique=(items,key,label)=>{
 const seen=new Set();
 for(const item of items){
  const value=item[key];
  if(typeof value!=='string'||!value)fail(label+' missing '+key);
  if(seen.has(value))fail('duplicate '+label+' '+value);
  seen.add(value);
 }
 return seen;
};
const principals=unique(model.principals,'id','principal');
unique(model.assets,'id','asset');
unique(model.boundaries,'id','boundary');
unique(model.threats,'id','threat');

for(const boundary of model.boundaries){
 if(!principals.has(boundary.from)||!principals.has(boundary.to))fail(boundary.id+' references unknown principal');
 if(typeof boundary.allowed!=='string'||!boundary.allowed||typeof boundary.forbidden!=='string'||!boundary.forbidden)fail(boundary.id+' missing allowed/forbidden contract');
}

const nodes=[...(roadmap.historicalIndex??[]),...(roadmap.phases??[]).flatMap(phase=>phase.requirements??[])];
const gates=new Set(nodes.map(item=>item.id));
const severities=new Set(['critical','high','medium','low']);
const categories=new Set(['confidentiality','integrity','availability','cost','privacy','supply-chain']);
let evidenceCount=0,critical=0,openOnly=0;
for(const threat of model.threats){
 if(!severities.has(threat.severity))fail(threat.id+' invalid severity');
 if(threat.severity==='critical')critical++;
 if(!Array.isArray(threat.category)||!threat.category.length||threat.category.some(c=>!categories.has(c)))fail(threat.id+' invalid category');
 for(const key of ['mechanism','invariant'])if(typeof threat[key]!=='string'||threat[key].length<20)fail(threat.id+' weak '+key);
 if(!Array.isArray(threat.evidence)||!Array.isArray(threat.openGates))fail(threat.id+' missing evidence/openGates');
 if(!threat.evidence.length&&!threat.openGates.length)fail(threat.id+' has neither regression evidence nor open gate');
 if(!threat.evidence.length)openOnly++;
 for(const gate of threat.openGates)if(!gates.has(gate))fail(threat.id+' references missing gate '+gate);
 for(const evidence of threat.evidence){
  if(typeof evidence.path!=='string'||typeof evidence.test!=='string'||!evidence.path||!evidence.test)fail(threat.id+' malformed evidence');
  const full=path.join(root,evidence.path);
  if(!fs.existsSync(full)||!fs.statSync(full).isFile())fail(threat.id+' evidence path missing: '+evidence.path);
  const text=fs.readFileSync(full,'utf8');
  if(!text.includes(evidence.test))fail(threat.id+' evidence marker missing from '+evidence.path+': '+evidence.test);
  evidenceCount++;
 }
}
if(critical<10)fail('critical threat inventory unexpectedly small');
if(evidenceCount<20)fail('regression evidence inventory unexpectedly small');
if(!model.nonClaims.some(x=>/coordinated|both authority and witness/i.test(x)&&/roll(?:back| back)/i.test(x)))fail('coordinated rollback non-claim missing');
if(!model.nonClaims.some(x=>x.includes('BYOK')&&x.includes('disabled')))fail('BYOK disabled non-claim missing');

console.log(JSON.stringify({
 accepted:true,
 version:model.version,
 principals:model.principals.length,
 assets:model.assets.length,
 boundaries:model.boundaries.length,
 threats:model.threats.length,
 critical,
 evidence:evidenceCount,
 openOnly,
 roadmapNodes:gates.size,
 statement:'Coverage means exact evidence marker or explicit open dependency; it is not security certification.'
},null,2));
