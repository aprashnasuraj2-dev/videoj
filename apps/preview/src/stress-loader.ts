import { createDhagoPlayer } from '@/create-player';
import { createSkinStressHarness, portableStressFixtures, type PortableSkinAdapter, type PortableStressCaseId, type StressResult, type StressStatus } from '@/stress-lab/harness';

const VIDEO='./media/studies-in-thread.mp4';
const AUDIO='https://commons.wikimedia.org/wiki/Special:Redirect/file/WWS_Loom.ogg';
const POSTER='./media/poster.webp';
let fixtureWorker:ServiceWorkerRegistration|null=null;
async function installFixtureWorker(){
  if(!('serviceWorker' in navigator))return null;
  try{
    const registration=await navigator.serviceWorker.register('./stress-sw.js',{scope:'./'});
    await navigator.serviceWorker.ready;
    if(!navigator.serviceWorker.controller){
      await Promise.race([
        new Promise<void>(resolve=>navigator.serviceWorker.addEventListener('controllerchange',()=>resolve(),{once:true})),
        new Promise<void>(resolve=>setTimeout(resolve,1500)),
      ]);
    }
    fixtureWorker=registration;
    document.documentElement.dataset.stressFixtures='service-worker';
    return registration;
  }catch(error){
    document.documentElement.dataset.stressFixtures='static-fallback';
    console.warn('[Stress Lab] service-worker fixtures unavailable; static error fixtures remain usable.',error);
    return null;
  }
}
addEventListener('pagehide',()=>{void fixtureWorker?.unregister()},{once:true});
const q=<T extends Element=HTMLElement>(s:string)=>document.querySelector<T>(s)!;
const results:StressResult[]=[];

const builtIn:PortableSkinAdapter={
  name:'DHAGO built-in reference',
  async mount(host,input){
    const root=createDhagoPlayer({source:input.source,poster:input.poster,chapters:input.chapters,captions:input.captions?.[0]?.src,mediaKind:input.mediaKind,metadataTracks:input.metadataTracks,surface:'warm'});
    host.append(root);
    const media=root.querySelector<HTMLMediaElement>('video,audio,mux-video');
    if(media)for(const c of input.captions?.slice(1)??[]){const t=document.createElement('track');t.kind='captions';t.src=c.src;t.label=c.label;t.srclang=c.language;t.default=Boolean(c.default);media.append(t)}
    return {root,media,destroy(){media?.pause();root.remove()}};
  }
};
const direct=createSkinStressHarness({source:VIDEO,audioSource:AUDIO,missingSource:'/__stress-fixtures/missing.mp4',poster:POSTER,adapter:builtIn});

const makeMarkdown=()=>{
  const out=['# Skin Stress Lab report','','Generated: '+new Date().toISOString(),'Browser: '+navigator.userAgent,'Viewport: '+innerWidth+'×'+innerHeight,'','| Case | Status | Observation |','| --- | --- | --- |'];
  for(const r of results){const a=r.assertions.find(x=>x.status==='fail')||r.assertions.find(x=>x.status==='warning')||r.assertions[0];out.push('| '+r.caseLabel.replaceAll('|','\\|')+' | '+r.status.toUpperCase()+' | '+String(a?.evidence||a?.label||'—').replaceAll('|','\\|')+' |')}
  out.push('','Forced colors/reduced motion are only marked RUN when the real media query is active. Browser zoom and live/DVR remain manual gates unless genuinely supplied.');
  return out.join('\n');
};
const render=()=>{
  const body=q<HTMLTableSectionElement>('#portable-result-body');body.replaceChildren();
  for(const r of results){const tr=document.createElement('tr');tr.dataset.status=r.status;const th=document.createElement('th');th.scope='row';th.textContent=r.caseLabel;const st=document.createElement('td');st.className='stress-status stress-status-'+r.status;st.textContent=r.status.toUpperCase();const ob=document.createElement('td');const a=r.assertions.find(x=>x.status==='fail')||r.assertions.find(x=>x.status==='warning')||r.assertions[0];ob.textContent=a?.evidence||a?.label||'No assertions returned.';tr.append(th,st,ob);body.append(tr)}
  const c=(s:StressStatus)=>results.filter(r=>r.status===s).length;
  q('#portable-summary').textContent=results.length?'Latest run: '+c('pass')+' pass · '+c('fail')+' fail · '+c('warning')+' warning · '+c('not-run')+' not run':'No portable run yet.';
};
const setState=(message:string,state='idle')=>{q('#portable-loader-status').textContent=message;q('#portable-loader-status').setAttribute('data-state',state)};
const download=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify({generatedAt:new Date().toISOString(),userAgent:navigator.userAgent,results},null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='skin-stress-report.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),0)};

type Descriptor={mode:'url'|'source';url?:string;source?:string};
const sandboxSource=String.raw`<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:#f3eee4}*{box-sizing:border-box}#host{min-height:140px;max-width:100%}</style><div id="host"></div><script>
(()=>{let sid='',adapter=null,mounted=null,urls=[];const host=document.getElementById('host');const send=(type,x={})=>parent.postMessage({type,sessionId:sid,...x},'*');const revoke=()=>{urls.forEach(URL.revokeObjectURL);urls=[]};const cleanup=async()=>{try{await mounted?.destroy?.()}catch{};try{mounted?.root?.remove()}catch{};mounted=null;revoke();host.replaceChildren();host.style.width='100%'};
const blob=(text,type)=>{const u=URL.createObjectURL(new Blob([text],{type}));urls.push(u);return u};const stamp=n=>{n=Math.max(0,Number.isFinite(n)?n:0);return String(Math.floor(n/60)).padStart(2,'0')+':'+String(Math.floor(n%60)).padStart(2,'0')+'.000'};const vtt=c=>'WEBVTT\\n\\n'+c.map(x=>stamp(x.start)+' --> '+stamp(x.end)+'\\n'+x.label).join('\\n\\n')+'\\n';const dense=n=>Array.from({length:n},(_,i)=>({start:64*i/n,end:64*(i+1)/n,label:'Chapter '+(i+1)}));
const chapters=id=>{if(['no-chapters','late-metadata','audio-only','missing-media','live-dvr'].includes(id))return;if(id==='dense-40')return vtt(dense(40));if(id==='dense-100')return vtt(dense(100));if(id==='uneven-chapters')return vtt([{start:0,end:2,label:'Two seconds'},{start:2,end:62,label:'Long passage'},{start:62,end:64,label:'Final two seconds'}]);if(id==='long-title')return vtt([{start:0,end:32,label:'A deliberately very long English chapter title that should wrap or truncate without hiding playback controls'},{start:32,end:64,label:'Second chapter'}]);if(id==='international-text')return vtt([{start:0,end:20,label:'धागो र समय'},{start:20,end:42,label:'نسيج من الذاكرة'},{start:42,end:64,label:'時間を織る'}]);if(id==='malformed-cues')return 'WEBVTT\\n\\n00:35.000 --> 02:00.000\\nOverrun\\n\\n00:00.000 --> 00:12.000\\nFirst\\n\\n00:07.000 --> 00:19.000\\nOverlap\\n\\n00:19.000 --> 00:19.000\\nZero length\\n';return vtt([{start:0,end:16,label:'A thread of light'},{start:16,end:32,label:'The shape of quiet'},{start:32,end:48,label:'Where shadows gather'},{start:48,end:64,label:'Coming home'}])};
const load=async d=>{await cleanup();adapter=null;try{let m;if(d.mode==='url'){try{const r=await fetch(d.url,{mode:'cors',cache:'no-store'});if(!r.ok)throw new Error('HTTP '+r.status)}catch(e){send('stress:error',{code:'cors-blocked',message:'Adapter URL blocked/unavailable under CORS: '+String(e)});return}m=await import(d.url)}else{const u=blob(d.source,'text/javascript');m=await import(u)}adapter=m?.default;if(!adapter||typeof adapter.name!=='string'||typeof adapter.mount!=='function'){send('stress:error',{code:'invalid-contract',message:'Default export must provide name and mount(host,input).'});return}send('stress:ready',{adapterName:adapter.name})}catch(e){send('stress:error',{code:'invalid-module',message:e instanceof Error?e.message:String(e)})}};
const overall=a=>a.some(x=>x.status==='fail')?'fail':a.some(x=>x.status==='warning')?'warning':a.some(x=>x.status==='pass')?'pass':'not-run';
const run=async(f,b)=>{if(!adapter){send('stress:error',{code:'not-loaded',message:'Load an adapter first.'});return}await cleanup();const started=performance.now();const env={userAgent:navigator.userAgent,viewport:{width:innerWidth,height:innerHeight},devicePixelRatio:devicePixelRatio||1,forcedColors:matchMedia('(forced-colors: active)').matches,reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches,online:navigator.onLine};const evidence=f.manualOnly||(f.requiresForcedColors&&!env.forcedColors?'NOT RUN — forced-colors is inactive.':'')||(f.requiresReducedMotion&&!env.reducedMotion?'NOT RUN — reduced motion is inactive.':'');if(evidence){send('stress:result',{result:{caseId:f.id,caseLabel:f.label,adapterName:adapter.name,status:'not-run',assertions:[{id:'environment',label:'Environment can prove this case',status:'not-run',expected:true,observed:false,evidence}],environment:env,durationMs:performance.now()-started,notes:[]}});return}
host.style.width=f.width?f.width+'px':'100%';const cv=chapters(f.id);const input={source:f.missingMedia?b.missingSource:(f.mediaKind==='audio'?b.audioSource:b.source),poster:f.missingPoster?b.missingPoster:b.poster,chapters:cv?blob(cv,'text/vtt'):undefined,captions:f.id==='multi-captions'?[{src:blob('WEBVTT\\n\\n00:00.000 --> 00:08.000\\nA deliberately long caption for wrapping.\\n','text/vtt'),label:'English / long',language:'en',default:true},{src:blob('WEBVTT\\n\\n00:00.000 --> 00:08.000\\nالنسيج يحمل ذاكرة المكان\\n','text/vtt'),label:'Arabic',language:'ar'}]:undefined,mediaKind:f.mediaKind||'video'};
try{mounted=await adapter.mount(host,input);if(!mounted||!(mounted.root instanceof HTMLElement))throw new Error('mount() must return root HTMLElement.');if(!mounted.root.isConnected)host.append(mounted.root);let media=mounted.media||mounted.root.querySelector('video,audio');await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));let a=[{id:'root-mounted',label:'Adapter root mounted',status:mounted.root.isConnected?'pass':'fail',expected:true,observed:mounted.root.isConnected},{id:'media-found',label:'Media element exposed',status:media?'pass':'fail',expected:true,observed:Boolean(media),evidence:media?media.tagName:'No media element exposed.'}];const overflow=Math.max(0,mounted.root.scrollWidth-host.clientWidth);a.push({id:'horizontal-overflow',label:'No horizontal overflow',status:overflow<=1?'pass':'fail',expected:0,observed:overflow,evidence:'root.scrollWidth='+mounted.root.scrollWidth+'; host.clientWidth='+host.clientWidth});if(f.width){const w=Math.round(host.getBoundingClientRect().width);a.push({id:'host-width',label:'Real host width',status:Math.abs(w-f.width)<=1?'pass':'fail',expected:f.width,observed:w,evidence:'Measured inside sandbox.'})}if(media&&f.id==='late-metadata'){const t=document.createElement('track');t.kind='chapters';t.src=blob(vtt(dense(4)),'text/vtt');t.default=true;media.append(t);t.track.mode='hidden';a.push({id:'late-track',label:'Late chapter track attached',status:'pass',expected:true,observed:true})}if(f.sourceReplacement){const old=mounted.root;await mounted.destroy?.();old.remove();mounted=await adapter.mount(host,{...input,source:b.source});if(!mounted.root.isConnected)host.append(mounted.root);a.push({id:'old-root-detached',label:'Old root detached',status:old.isConnected?'fail':'pass',expected:false,observed:old.isConnected})}send('stress:result',{result:{caseId:f.id,caseLabel:f.label,adapterName:adapter.name,status:overall(a),assertions:a,environment:env,durationMs:performance.now()-started,notes:[]}})}catch(e){send('stress:result',{result:{caseId:f.id,caseLabel:f.label,adapterName:adapter.name,status:'fail',assertions:[{id:'adapter-run',label:'Adapter mounted fixture',status:'fail',expected:'successful mount',observed:'exception',evidence:e instanceof Error?e.message:String(e)}],environment:env,durationMs:performance.now()-started,notes:[]}})}};
addEventListener('message',e=>{if(e.source!==parent||!e.data||typeof e.data!=='object')return;const m=e.data;if(m.type==='stress:init'){sid=String(m.sessionId||'');send('stress:initialized');return}if(!sid||m.sessionId!==sid)return;if(m.type==='stress:load')void load(m.adapter);if(m.type==='stress:run')void run(m.fixture,m.base)});})();<\/script>`;

class Sandbox{
  frame:HTMLIFrameElement|null=null;sid='';pending=new Map<string,{ok:(v:any)=>void;bad:(e:Error)=>void;timer:number}>();
  initialized:Promise<void>|null=null;resolveInitialized:(()=>void)|null=null;
  listener=(e:MessageEvent)=>{if(!this.frame||e.source!==this.frame.contentWindow||e.data?.sessionId!==this.sid)return;const d=e.data;if(d.type==='stress:initialized'){this.resolveInitialized?.();this.resolveInitialized=null;return}if(d.type==='stress:error'){const key=this.pending.has('load')?'load':this.pending.has('run')?'run':null;const p=key?this.pending.get(key):undefined;if(p&&key){clearTimeout(p.timer);this.pending.delete(key);p.bad(new Error(String(d.code)+': '+String(d.message)))}}if(d.type==='stress:ready'){const p=this.pending.get('load');if(p){clearTimeout(p.timer);this.pending.delete('load');p.ok(d)}}if(d.type==='stress:result'){const p=this.pending.get('run');if(p){clearTimeout(p.timer);this.pending.delete('run');p.ok(d.result)}}};
  ensure(){if(this.frame&&this.initialized)return this.initialized;this.sid=Array.from(crypto.getRandomValues(new Uint32Array(4))).join('-');const f=document.createElement('iframe');f.title='Isolated skin adapter specimen';f.className='portable-sandbox';f.setAttribute('sandbox','allow-scripts');f.srcdoc=sandboxSource;q('#portable-sandbox-host').replaceChildren(f);this.frame=f;addEventListener('message',this.listener);this.initialized=new Promise<void>(resolve=>{this.resolveInitialized=resolve});f.addEventListener('load',()=>f.contentWindow?.postMessage({type:'stress:init',sessionId:this.sid},'*'),{once:true});return this.initialized}
  async request(kind:'load'|'run',data:any){await this.ensure();return new Promise<any>((ok,bad)=>{const timer=window.setTimeout(()=>{this.pending.delete(kind);bad(new Error('Sandbox '+kind+' timed out.'))},12000);this.pending.set(kind,{ok,bad,timer});this.frame!.contentWindow?.postMessage({...data,sessionId:this.sid},'*')})}
  load(adapter:Descriptor){return this.request('load',{type:'stress:load',adapter})}
  run(id:PortableStressCaseId){const fixture=portableStressFixtures.find(x=>x.id===id)!;return this.request('run',{type:'stress:run',fixture,base:{source:new URL(VIDEO,location.href).href,audioSource:AUDIO,poster:new URL(POSTER,location.href).href,missingSource:new URL('/__stress-fixtures/missing.mp4',location.href).href,missingPoster:new URL('/__stress-fixtures/missing-poster.webp',location.href).href}}) as Promise<StressResult>}
  destroy(){removeEventListener('message',this.listener);this.frame?.remove();this.frame=null;this.initialized=null;this.resolveInitialized=null;for(const p of this.pending.values()){clearTimeout(p.timer);p.bad(new Error('Sandbox destroyed.'))}this.pending.clear()}
}

if(document.querySelector('#portable-tool')){
  const sandbox=new Sandbox();let mode:'builtin'|'sandbox'='builtin';
  q<HTMLSelectElement>('#portable-case').replaceChildren(...portableStressFixtures.map(f=>{const o=document.createElement('option');o.value=f.id;o.textContent=f.label;return o}));
  const runOne=async(id:PortableStressCaseId)=>{setState('Running '+id+'…','loading');try{const r=mode==='builtin'?(await direct.run(q('#portable-direct-host'),id)).result:await sandbox.run(id);results.push(r);render();setState(r.caseLabel+': '+r.status.toUpperCase(),r.status);return r}catch(e){setState(e instanceof Error?e.message:String(e),'error');throw e}};
  const activateSandbox=async()=>{await direct.destroy();q('#portable-direct-host').replaceChildren();mode='sandbox'};
  q('#portable-use-dhago').addEventListener('click',async()=>{sandbox.destroy();q('#portable-sandbox-host').replaceChildren();mode='builtin';await direct.destroy();q('#portable-direct-host').replaceChildren();setState('Built-in DHAGO reference adapter active.','ready')});
  q('#portable-load-url').addEventListener('click',async()=>{const url=q<HTMLInputElement>('#portable-adapter-url').value.trim();if(!url){setState('Enter an ESM adapter URL.','error');return}await activateSandbox();setState('Loading URL adapter in isolated sandbox…','loading');try{const r=await sandbox.load({mode:'url',url});setState('Loaded: '+String(r.adapterName||url),'ready')}catch(e){setState(e instanceof Error?e.message:String(e),'error')}});
  q<HTMLInputElement>('#portable-adapter-file').addEventListener('change',async e=>{const file=(e.currentTarget as HTMLInputElement).files?.[0];if(!file)return;if(!/\.(m?js)$/i.test(file.name)){setState('Local adapter must be .js or .mjs.','error');return}await activateSandbox();setState('Loading local adapter in isolated sandbox…','loading');try{const r=await sandbox.load({mode:'source',source:await file.text()});setState('Loaded locally: '+String(r.adapterName||file.name)+'. File was not uploaded.','ready')}catch(err){setState(err instanceof Error?err.message:String(err),'error')}});
  q('#portable-run-case').addEventListener('click',()=>void runOne(q<HTMLSelectElement>('#portable-case').value as PortableStressCaseId));
  q('#portable-run-suite').addEventListener('click',async()=>{for(const f of portableStressFixtures.filter(x=>!x.manualOnly))await runOne(f.id);setState('Compatible suite finished.','ready')});
  q('#portable-copy-json').addEventListener('click',()=>void navigator.clipboard.writeText(JSON.stringify({generatedAt:new Date().toISOString(),userAgent:navigator.userAgent,results},null,2)).then(()=>setState('JSON copied.','ready')));
  q('#portable-download-json').addEventListener('click',download);
  q('#portable-copy-markdown').addEventListener('click',()=>void navigator.clipboard.writeText(makeMarkdown()).then(()=>setState('Markdown report copied.','ready')));
  q('#portable-clear-results').addEventListener('click',()=>{results.splice(0);render();setState('Result matrix cleared.','ready')});
  void installFixtureWorker();
  render();setState('Built-in DHAGO reference adapter active.','ready');
}
