import {createHash} from 'node:crypto';
const SHA40=/^[a-f0-9]{40}$/i,SHA256=/^[a-f0-9]{64}$/,MODEL=/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,99}$/;
const BACKENDS=new Set(['self_hosted','hosted']);
const plain=v=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
const exact=(o,keys,required=keys)=>plain(o)&&Object.keys(o).every(k=>keys.includes(k))&&required.every(k=>Object.hasOwn(o,k));
const origin=value=>{if(typeof value!=='string')return null;try{const u=new URL(value);return u.protocol==='https:'&&u.origin===value&&!u.username&&!u.password&&u.pathname==='/'&&!u.search&&!u.hash?u.origin:null;}catch{return null;}};
const canonical=value=>JSON.stringify(value,null,2)+'\n';
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const freeze=v=>{if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
const privateRef=v=>typeof v==='string'&&/^private:[A-Za-z0-9][A-Za-z0-9._/-]{2,191}$/.test(v);
const time=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(v)&&Number.isFinite(Date.parse(v));
const HOSTED_ENDPOINT='https://api.openai.com/v1/chat/completions';
const gateway=value=>{if(typeof value!=='string')return null;try{const u=new URL(value),labels=u.hostname.split('.');return u.protocol==='https:'&&!u.port&&!u.username&&!u.password&&!u.search&&!u.hash&&u.pathname==='/v1/chat/completions'&&u.href===value&&/^[a-z0-9.-]+$/.test(u.hostname)&&labels.length>=2&&!labels.some(x=>!x||x.startsWith('-')||x.endsWith('-'))&&!['local','localhost','internal','invalid'].includes(labels.at(-1))&&!/^[0-9.]+$/.test(u.hostname)?u.href:null;}catch{return null;}};

export const launchSpecCommit='fd872b9221aeb8ff762b75a5badbf84b23c133cc';
export const currentSpecCommit='d67755e762545de983e38a395ec45d89b77c9311';
export const currentSpecBlob='b72fcdf433e323e30a6052e9e0c0718b835672c1';

export function validateReleaseConfig(config){
 const keys=['schema','sourceRevision','publicOrigin','peerOrigin','backend','selfHostedGatewayUrl','model','liveEvidence','budgetEvidence','contentEvidence','spec'];
 if(!exact(config,keys)||config.schema!==1||!SHA40.test(config.sourceRevision)||!origin(config.publicOrigin)||!origin(config.peerOrigin)||config.publicOrigin===config.peerOrigin||
  !BACKENDS.has(config.backend)||!MODEL.test(config.model)||config.model==='mock-1')throw Error('Invalid release configuration.');
 if(config.backend==='self_hosted'?!gateway(config.selfHostedGatewayUrl):config.selfHostedGatewayUrl!==null)throw Error('Invalid inference backend configuration.');
 const live=config.liveEvidence;
 const expectedUpstream=config.backend==='self_hosted'?config.selfHostedGatewayUrl:HOSTED_ENDPOINT;
 if(!exact(live,['status','backend','model','upstreamSha256','costEvidenceKind','observedAt','runRecordHash','costReportHash','usageComplete','judgePathPassed'])||live.status!=='live_verified'||live.backend!==config.backend||live.model!==config.model||
  live.costEvidenceKind!==(config.backend==='self_hosted'?'self_hosted_resource':'provider_pricing')||
  !SHA256.test(live.upstreamSha256)||live.upstreamSha256!==digest(expectedUpstream)||!time(live.observedAt)||!SHA256.test(live.runRecordHash)||!SHA256.test(live.costReportHash)||live.usageComplete!==true||live.judgePathPassed!==true)throw Error('Live inference evidence is incomplete.');
 const budget=config.budgetEvidence;
 if(!exact(budget,['approved','costMode','spendCeilingUsd','judgingReserveRuns','evidenceRef'])||budget.approved!==true||!['operator_owned','provider_billed'].includes(budget.costMode)||typeof budget.spendCeilingUsd!=='number'||!Number.isFinite(budget.spendCeilingUsd)||
  budget.spendCeilingUsd<0||budget.spendCeilingUsd>10000||!Number.isInteger(budget.judgingReserveRuns)||budget.judgingReserveRuns<20||budget.judgingReserveRuns>100000||!privateRef(budget.evidenceRef)||
  config.backend==='self_hosted'&&budget.costMode!=='operator_owned'||config.backend==='hosted'&&(budget.costMode!=='provider_billed'||budget.spendCeilingUsd<=0))throw Error('Budget evidence is incomplete.');
 const content=config.contentEvidence;
 if(!exact(content,['status','contentVersion','profileSha256','catalogSha256','mediaSha256','transcriptSha256','guideSha256','intakeRecordHash','rightsAttested','factualReviewAttested','evidenceRef'])||
  content.status!=='reviewed_attested'||typeof content.contentVersion!=='string'||!/^[A-Za-z][A-Za-z0-9._-]{0,99}$/.test(content.contentVersion)||
  !SHA256.test(content.profileSha256)||!SHA256.test(content.catalogSha256)||!SHA256.test(content.mediaSha256)||!SHA256.test(content.transcriptSha256)||!SHA256.test(content.guideSha256)||!SHA256.test(content.intakeRecordHash)||
  content.rightsAttested!==true||content.factualReviewAttested!==true||!privateRef(content.evidenceRef))throw Error('Reviewed content evidence is incomplete.');
 if(!exact(config.spec,['launchCommit','compatibilityCommit','compatibilityBlob'])||config.spec.launchCommit!==launchSpecCommit||config.spec.compatibilityCommit!==currentSpecCommit||config.spec.compatibilityBlob!==currentSpecBlob)throw Error('Specification pin is not the reviewed release pin.');
 return freeze(structuredClone(config));
}

function validateDevelopmentManifest(manifest){
 if(!plain(manifest)||!Array.isArray(manifest.networks)||manifest.networks.length<1||manifest.networks.length>32||manifest.llm_router!==undefined)throw Error('Expected router-free development manifest.');
 if(new Set(manifest.networks.map(x=>x?.name)).size!==manifest.networks.length)throw Error('Duplicate network identity.');
 for(const entry of manifest.networks)if(!plain(entry)||typeof entry.name!=='string'||typeof entry.front_man!=='string'||typeof entry.hocon!=='string'||!/^[A-Za-z][A-Za-z0-9_]{0,59}$/.test(entry.name))throw Error('Invalid development network entry.');
 return manifest;
}

export function prepareReleaseArtifacts({manifest,links,graphs,config}){
 const cfg=validateReleaseConfig(config),dev=validateDevelopmentManifest(manifest);
 if(!plain(links)||links.version!==1||!plain(links.networks)||!plain(graphs))throw Error('Invalid publication inputs.');
 const outputGraphs={},networks=[];
 for(const entry of dev.networks){
  const graph=graphs[entry.name];
  if(!plain(graph)||!Array.isArray(graph.tools)||graph.tools.length<1)throw Error('Missing graph: '+entry.name);
  const transformed=structuredClone(graph);
  if(transformed.llm_config!==undefined&&(!plain(transformed.llm_config)||Object.keys(transformed.llm_config).some(k=>k!=='model_name')))throw Error('Unsupported graph model metadata.');
  transformed.llm_config={model_name:cfg.model};
  const bytes=canonical(transformed),sha=digest(bytes),path='./release/'+sha+'/'+entry.name+'.network.json';
  outputGraphs[entry.name]={path,sha256:sha,bytes,graph:transformed};
  networks.push({...structuredClone(entry),hocon:path});
 }
 const outLinks=structuredClone(links);
 const linked=outLinks.networks.linked_learner;
 if(linked!==undefined){
  if(!plain(linked)||Object.keys(linked).some(k=>k!=='guide_peer'))throw Error('Unexpected linked learner bindings.');
  linked.guide_peer=cfg.peerOrigin+'/agents/checklist';
 }
 const releaseManifest={...structuredClone(dev),
  networks,
  llm_router:{base_url:cfg.publicOrigin+'/api/v1',mock:false,publisher_funded:true},
  allowed_peers:[cfg.peerOrigin],
  peer_policy:{mode:'closed'},
  deployment:{mode:'static',runtime:'/runtime/sutra-runtime.js',self_contained_runtime:true,browser_mock:false,direct_byok:false,direct_mcp_requires_cors:true,public_mcp_facade:false}
 };
 const releaseRecord={
  schema:1,sourceRevision:cfg.sourceRevision,publicOrigin:cfg.publicOrigin,peerOrigin:cfg.peerOrigin,backend:cfg.backend,model:cfg.model,
  spec:{...cfg.spec},liveEvidence:{...cfg.liveEvidence},budgetEvidence:{...cfg.budgetEvidence},contentEvidence:{...cfg.contentEvidence},
  manifestSha256:digest(canonical(releaseManifest)),linksSha256:digest(canonical(outLinks)),
  graphSha256:Object.fromEntries(Object.entries(outputGraphs).map(([name,v])=>[name,v.sha256])),
  limitation:'This record proves deterministic release-artifact construction from supplied evidence identifiers. It cannot prove provider billing, budget approval authenticity, public deployment, TLS/CORS reachability, entrant eligibility, or factual content review.'
 };
 return freeze({manifest:releaseManifest,links:outLinks,graphs:outputGraphs,releaseRecord:{...releaseRecord,recordSha256:digest(canonical(releaseRecord))}});
}

export function validatePreparedRelease({manifest,links,graphs,releaseRecord}){
 if(!plain(releaseRecord)||!SHA40.test(releaseRecord.sourceRevision)||!BACKENDS.has(releaseRecord.backend)||!SHA256.test(releaseRecord.recordSha256))throw Error('Invalid release record.');
 const recordCopy=structuredClone(releaseRecord);delete recordCopy.recordSha256;if(digest(canonical(recordCopy))!==releaseRecord.recordSha256)throw Error('Release record hash mismatch.');
 if(!plain(manifest?.llm_router)||manifest.llm_router.base_url!==releaseRecord.publicOrigin+'/api/v1'||manifest.llm_router.publisher_funded!==true||manifest.llm_router.mock!==false||Object.hasOwn(manifest.llm_router,'byok_router'))throw Error('Invalid publisher-funded manifest router.');
 if(manifest.deployment?.runtime!=='/runtime/sutra-runtime.js'||manifest.deployment?.self_contained_runtime!==true||manifest.deployment?.browser_mock!==false||manifest.deployment?.direct_byok!==false)throw Error('Invalid release runtime metadata.');
 if(!Array.isArray(manifest.allowed_peers)||manifest.allowed_peers.length!==1||manifest.allowed_peers[0]!==releaseRecord.peerOrigin||manifest.peer_policy?.mode!=='closed')throw Error('Invalid release peer policy.');
 if(!plain(links?.networks)||links.networks.linked_learner?.guide_peer!==releaseRecord.peerOrigin+'/agents/checklist')throw Error('Release links do not match peer origin.');
 if(!Array.isArray(manifest.networks)||manifest.networks.length!==Object.keys(graphs).length)throw Error('Release network set mismatch.');
 for(const entry of manifest.networks){
  const g=graphs[entry.name];if(!g||g.graph?.llm_config?.model_name!==releaseRecord.model||g.sha256!==releaseRecord.graphSha256?.[entry.name]||digest(g.bytes)!==g.sha256||entry.hocon!==g.path)throw Error('Release graph/model/hash mismatch.');
 }
 return freeze({valid:true,sourceRevision:releaseRecord.sourceRevision,backend:releaseRecord.backend,model:releaseRecord.model,router:manifest.llm_router.base_url,peer:releaseRecord.peerOrigin,networkCount:manifest.networks.length});
}
