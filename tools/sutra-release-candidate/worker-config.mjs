import {createHash} from 'node:crypto';
import {validateReleaseConfig} from './release.mjs';
const plain=v=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
const digest=v=>createHash('sha256').update(JSON.stringify(v,null,2)+'\n').digest('hex');
const numeric=(vars,key,min,max)=>{const n=Number(vars[key]);if(!Number.isInteger(n)||n<min||n>max)throw Error('Invalid '+key);return String(n);};
export function renderWorkerConfig({baseConfig,releaseConfig}){
 const cfg=validateReleaseConfig(releaseConfig);
 if(!plain(baseConfig)||typeof baseConfig.name!=='string'||!baseConfig.name||typeof baseConfig.main!=='string'||!baseConfig.main||baseConfig.workers_dev!==false||baseConfig.preview_urls!==false||!plain(baseConfig.vars))throw Error('Invalid private Worker base config.');
 if(['SUTRA_PROVIDER_KEY','SUTRA_SELF_HOSTED_TOKEN','SUTRA_CLIENT_HASH_SECRET'].some(key=>Object.hasOwn(baseConfig.vars,key)))throw Error('Secret values/names must not be stored in public Worker vars.');
 const cleanVars={...baseConfig.vars};delete cleanVars.SUTRA_SELF_HOSTED_UPSTREAM_URL;
 const vars={...cleanVars,
  SUTRA_ENABLE_INFERENCE:'true',
  SUTRA_INFERENCE_BACKEND:cfg.backend,
  ...(cfg.backend==='self_hosted'?{SUTRA_SELF_HOSTED_UPSTREAM_URL:cfg.selfHostedGatewayUrl}:{}),
  SUTRA_ALLOWED_ORIGIN:cfg.publicOrigin,
  SUTRA_MODELS:cfg.model,
  SUTRA_PEER_ORIGINS:cfg.peerOrigin,
  SUTRA_MAX_OUTPUT_TOKENS:numeric(baseConfig.vars,'SUTRA_MAX_OUTPUT_TOKENS',64,1024),
  SUTRA_MAX_DAILY_CALLS:numeric(baseConfig.vars,'SUTRA_MAX_DAILY_CALLS',1,100000),
  SUTRA_MAX_CLIENT_CALLS:numeric(baseConfig.vars,'SUTRA_MAX_CLIENT_CALLS',1,1000),
  SUTRA_MAX_DAILY_INPUT_BYTES:numeric(baseConfig.vars,'SUTRA_MAX_DAILY_INPUT_BYTES',1024,1024*1024*1024),
  SUTRA_MAX_DAILY_OUTPUT_TOKENS:numeric(baseConfig.vars,'SUTRA_MAX_DAILY_OUTPUT_TOKENS',64,100000000),
  SUTRA_MAX_CONCURRENT:numeric(baseConfig.vars,'SUTRA_MAX_CONCURRENT',1,10)
 };
 if(Number(vars.SUTRA_MAX_CLIENT_CALLS)>Number(vars.SUTRA_MAX_DAILY_CALLS))throw Error('Client call ceiling exceeds global ceiling.');
 if(Number(vars.SUTRA_MAX_DAILY_OUTPUT_TOKENS)>Number(vars.SUTRA_MAX_DAILY_CALLS)*Number(vars.SUTRA_MAX_OUTPUT_TOKENS))throw Error('Output-token ceiling exceeds call/output reservation envelope.');
 const rendered={...structuredClone(baseConfig),vars};
 const requiredSecretBindings=cfg.backend==='self_hosted'?['SUTRA_SELF_HOSTED_TOKEN','SUTRA_CLIENT_HASH_SECRET']:['SUTRA_PROVIDER_KEY','SUTRA_CLIENT_HASH_SECRET'];
 const publicRecord={schema:1,sourceRevision:cfg.sourceRevision,workerName:rendered.name,publicOrigin:cfg.publicOrigin,peerOrigin:cfg.peerOrigin,backend:cfg.backend,model:cfg.model,upstreamSha256:cfg.liveEvidence.upstreamSha256,
  policy:{maxOutputTokens:Number(vars.SUTRA_MAX_OUTPUT_TOKENS),maxDailyCalls:Number(vars.SUTRA_MAX_DAILY_CALLS),maxClientCalls:Number(vars.SUTRA_MAX_CLIENT_CALLS),maxDailyInputBytes:Number(vars.SUTRA_MAX_DAILY_INPUT_BYTES),maxDailyOutputTokens:Number(vars.SUTRA_MAX_DAILY_OUTPUT_TOKENS),maxConcurrent:Number(vars.SUTRA_MAX_CONCURRENT)},
  requiredSecretBindings,
  limitation:'This rendered config contains no secret values and does not prove that platform secrets, Durable Object migrations, billing, routes or deployment are present.'};
 return Object.freeze({config:Object.freeze(rendered),record:Object.freeze({...publicRecord,recordHash:digest(publicRecord)})});
}
