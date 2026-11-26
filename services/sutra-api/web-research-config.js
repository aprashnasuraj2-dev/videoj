import {webQuotaLimits} from './quota.js';

const providerOrigin='https://api.firecrawl.dev';
const secret=value=>typeof value==='string'&&value.length>=32&&value.length<=512&&!/[\s\u0000-\u001f\u007f]/.test(value);
export function webResearchRequested(env={}){
 return env.SUTRA_ENABLE_WEB_RESEARCH==='true';
}
export function webResearchConfig(env={}){
 if(!webResearchRequested(env))return null;
 const limits=webQuotaLimits(env),quota=env.SUTRA_QUOTA;
 if(env.SUTRA_WEB_PROVIDER!=='firecrawl'||typeof env.SUTRA_FIRECRAWL_API_KEY!=='string'||env.SUTRA_FIRECRAWL_API_KEY.length<12||env.SUTRA_FIRECRAWL_API_KEY.length>512||/[\s\u0000-\u001f\u007f]/.test(env.SUTRA_FIRECRAWL_API_KEY)||
    !secret(env.SUTRA_WEB_TOKEN_SECRET)||typeof env.SUTRA_CLIENT_HASH_SECRET!=='string'||env.SUTRA_CLIENT_HASH_SECRET.length<32||
    !limits||!quota||typeof quota.get!=='function'||typeof quota.idFromName!=='function')return null;
 return Object.freeze({provider:'firecrawl',providerOrigin,apiKey:env.SUTRA_FIRECRAWL_API_KEY,tokenSecret:env.SUTRA_WEB_TOKEN_SECRET,limits:Object.freeze({...limits})});
}
export function publicWebResearchStatus(env={}){
 return webResearchConfig(env)?'configured':'disabled';
}
