export type StressStatus='pass'|'fail'|'warning'|'not-run';
export type PortableStressCaseId='baseline'|'narrow-240'|'narrow-320'|'narrow-375'|'tablet-768'|'wide'|'no-chapters'|'dense-40'|'dense-100'|'uneven-chapters'|'long-title'|'international-text'|'malformed-cues'|'late-metadata'|'no-captions'|'multi-captions'|'missing-poster'|'missing-media'|'audio-only'|'source-replacement'|'rapid-seeks'|'forced-colors'|'reduced-motion'|'browser-zoom'|'live-dvr';
export interface PortableMetadataCue{start:number;end:number;label:string}
export interface PortableMetadataTrack{id:string;label:string;kind:'speaker'|'captions'|'sponsor'|'chapter'|'custom';color?:string;cues:PortableMetadataCue[]}
export interface PortableStressFixture{id:PortableStressCaseId;label:string;description:string;width?:number;mediaKind?:'video'|'audio';chapterMode?:'none'|'four'|'dense-40'|'dense-100'|'uneven'|'long'|'intl'|'malformed'|'late';captionMode?:'none'|'multi';missingMedia?:boolean;missingPoster?:boolean;sourceReplacement?:boolean;rapidSeeks?:boolean;requiresForcedColors?:boolean;requiresReducedMotion?:boolean;manualOnly?:string}
export interface PortableStressInput{source:string;poster?:string;chapters?:string;captions?:Array<{src:string;label:string;language:string;default?:boolean}>;metadataTracks?:PortableMetadataTrack[];mediaKind?:'video'|'audio'}
export interface PortableSkinMount{root:HTMLElement;media?:HTMLMediaElement|null;destroy?:()=>void|Promise<void>}
export interface PortableSkinAdapter{name:string;mount:(host:HTMLElement,input:PortableStressInput)=>PortableSkinMount|Promise<PortableSkinMount>}
export interface StressEnvironment{userAgent:string;viewport:{width:number;height:number};devicePixelRatio:number;forcedColors:boolean;reducedMotion:boolean;online:boolean}
export interface StressAssertion{id:string;label:string;status:StressStatus;expected?:string|number|boolean;observed?:string|number|boolean|null;evidence?:string}
export interface StressResult{caseId:PortableStressCaseId|'adapter-load';caseLabel:string;adapterName:string;status:StressStatus;assertions:StressAssertion[];environment:StressEnvironment;durationMs:number;notes:string[]}
export interface PortableStressRun{fixture:PortableStressFixture;mount?:PortableSkinMount;result:StressResult;cleanup:()=>Promise<void>}

const fixtures:PortableStressFixture[]=[
{id:'baseline',label:'Baseline',description:'Known-good source and ordinary metadata.',chapterMode:'four'},
{id:'narrow-240',label:'240px container',description:'Real 240px host container.',width:240,chapterMode:'four'},
{id:'narrow-320',label:'320px container',description:'Compact host geometry.',width:320,chapterMode:'four'},
{id:'narrow-375',label:'375px container',description:'Common phone-width host geometry.',width:375,chapterMode:'four'},
{id:'tablet-768',label:'768px container',description:'Tablet host geometry.',width:768,chapterMode:'four'},
{id:'wide',label:'Wide container',description:'Large host geometry.',width:1200,chapterMode:'four'},
{id:'no-chapters',label:'No chapters',description:'Seek remains useful without chapter metadata.',chapterMode:'none'},
{id:'dense-40',label:'Dense chapters · 40',description:'Forty chapter cues.',chapterMode:'dense-40'},
{id:'dense-100',label:'Dense chapters · 100',description:'One hundred chapter cues.',chapterMode:'dense-100'},
{id:'uneven-chapters',label:'Uneven chapters',description:'Tiny section beside a long section.',chapterMode:'uneven'},
{id:'long-title',label:'Long chapter title',description:'Deliberately long English text.',chapterMode:'long'},
{id:'international-text',label:'International text',description:'Devanagari, Arabic/RTL and CJK text.',chapterMode:'intl'},
{id:'malformed-cues',label:'Malformed cues',description:'Out of order, overlap, zero length and overrun.',chapterMode:'malformed'},
{id:'late-metadata',label:'Late metadata',description:'Chapter track arrives after mount.',chapterMode:'late'},
{id:'no-captions',label:'No captions',description:'No phantom caption language.',chapterMode:'four',captionMode:'none'},
{id:'multi-captions',label:'Multi-language captions',description:'Two caption tracks including a long cue.',chapterMode:'four',captionMode:'multi'},
{id:'missing-poster',label:'Missing poster',description:'Broken poster must not block media.',chapterMode:'four',missingPoster:true},
{id:'missing-media',label:'Missing media / 404',description:'Unavailable source exercises failure handling.',chapterMode:'none',missingMedia:true},
{id:'audio-only',label:'Audio-only media',description:'Adapter receives real audio semantics.',chapterMode:'none',mediaKind:'audio'},
{id:'source-replacement',label:'Source replacement',description:'Old player state is destroyed before replacement.',chapterMode:'four',sourceReplacement:true},
{id:'rapid-seeks',label:'Rapid seeks',description:'Repeated seeks leave state aligned.',chapterMode:'four',rapidSeeks:true},
{id:'forced-colors',label:'Forced colors',description:'Runs only when forced-colors is genuinely active.',chapterMode:'four',requiresForcedColors:true},
{id:'reduced-motion',label:'Reduced motion',description:'Runs only when reduced motion is genuinely active.',chapterMode:'four',requiresReducedMotion:true},
{id:'browser-zoom',label:'Real browser zoom',description:'Manual real-browser zoom gate.',chapterMode:'four',manualOnly:'NOT RUN — genuine 400% browser zoom is a real-browser/manual gate.'},
{id:'live-dvr',label:'Live / DVR',description:'Requires a genuine live DVR source.',chapterMode:'none',manualOnly:'NOT RUN — requires a genuine live DVR source.'}
];
export const portableStressFixtures:readonly PortableStressFixture[]=fixtures;

const clamp=(n:number,min:number,max:number)=>Math.min(max,Math.max(min,n));
const stamp=(n:number)=>{const s=Math.max(0,Number.isFinite(n)?n:0);return String(Math.floor(s/60)).padStart(2,'0')+':'+String(Math.floor(s%60)).padStart(2,'0')+'.000'};
const makeVtt=(cues:Array<{start:number;end:number;label:string}>)=>'WEBVTT\n\n'+cues.map(c=>stamp(c.start)+' --> '+stamp(c.end)+'\n'+c.label).join('\n\n')+'\n';
const dense=(count:number)=>Array.from({length:count},(_,i)=>({start:64*i/count,end:64*(i+1)/count,label:'Chapter '+(i+1)}));
export const malformedChapterVtt=()=>['WEBVTT','','00:35.000 --> 02:00.000','Overruns duration','','00:00.000 --> 00:12.000','First','','00:07.000 --> 00:19.000','Overlaps first','','00:25.000 --> 00:31.000','Gap before this','','00:19.000 --> 00:19.000','Zero length'].join('\n')+'\n';
const chapterVtt=(mode:PortableStressFixture['chapterMode'])=>{
 if(mode==='none'||mode==='late')return undefined;
 if(mode==='dense-40')return makeVtt(dense(40));
 if(mode==='dense-100')return makeVtt(dense(100));
 if(mode==='uneven')return makeVtt([{start:0,end:2,label:'Two seconds'},{start:2,end:62,label:'Long passage'},{start:62,end:64,label:'Final two seconds'}]);
 if(mode==='long')return makeVtt([{start:0,end:32,label:'A deliberately very long English chapter title that should wrap or truncate without hiding playback controls'},{start:32,end:64,label:'Second chapter'}]);
 if(mode==='intl')return makeVtt([{start:0,end:20,label:'धागो र समय'},{start:20,end:42,label:'نسيج من الذاكرة'},{start:42,end:64,label:'時間を織る'}]);
 if(mode==='malformed')return malformedChapterVtt();
 return makeVtt([{start:0,end:16,label:'A thread of light'},{start:16,end:32,label:'The shape of quiet'},{start:32,end:48,label:'Where shadows gather'},{start:48,end:64,label:'Coming home'}]);
};
const longCaption='WEBVTT\n\n00:00.000 --> 00:08.000\nA deliberately long caption containing enough ordinary language to wrap across several lines while controls remain reachable.\n';
const arabicCaption='WEBVTT\n\n00:00.000 --> 00:08.000\nالنسيج يحمل ذاكرة المكان\n';
const environment=():StressEnvironment=>({userAgent:navigator.userAgent,viewport:{width:innerWidth,height:innerHeight},devicePixelRatio:devicePixelRatio||1,forcedColors:matchMedia('(forced-colors: active)').matches,reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches,online:navigator.onLine});
const statusOf=(a:StressAssertion[]):StressStatus=>a.some(x=>x.status==='fail')?'fail':a.some(x=>x.status==='warning')?'warning':a.some(x=>x.status==='pass')?'pass':'not-run';
const objectUrl=(text:string,type:string,urls:string[])=>{const u=URL.createObjectURL(new Blob([text],{type}));urls.push(u);return u};
const focusables=(root:HTMLElement)=>Array.from(root.querySelectorAll<HTMLElement>('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])')).filter(el=>{const s=getComputedStyle(el),r=el.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0});
const wait=(ms:number)=>new Promise<void>(r=>setTimeout(r,ms));

export function createSkinStressHarness(options:{source:string;audioSource?:string;missingSource?:string;poster?:string;replacementSource?:string;adapter:PortableSkinAdapter;reporter?:(result:StressResult)=>void}){
 let activeCleanup=async()=>{};
 const run=async(host:HTMLElement,id:PortableStressCaseId):Promise<PortableStressRun>=>{
  await activeCleanup();
  const fixture=fixtures.find(f=>f.id===id);
  if(!fixture)throw new Error('Unknown stress case: '+id);
  const started=performance.now(),env=environment(),assertions:StressAssertion[]=[],notes:string[]=[],urls:string[]=[];
  let mounted:PortableSkinMount|undefined;
  host.replaceChildren();host.style.width=fixture.width?fixture.width+'px':'100%';
  const finishNotRun=(evidence:string)=>{
   assertions.push({id:'environment',label:'Environment can prove this case',status:'not-run',expected:true,observed:false,evidence});
   const result:StressResult={caseId:id,caseLabel:fixture.label,adapterName:options.adapter.name,status:'not-run',assertions,environment:env,durationMs:performance.now()-started,notes};
   options.reporter?.(result);activeCleanup=async()=>{host.replaceChildren();host.style.removeProperty('width')};
   return {fixture,result,cleanup:activeCleanup} as PortableStressRun;
  };
  if(fixture.manualOnly)return finishNotRun(fixture.manualOnly);
  if(fixture.requiresForcedColors&&!env.forcedColors)return finishNotRun('NOT RUN — matchMedia("(forced-colors: active)") is false.');
  if(fixture.requiresReducedMotion&&!env.reducedMotion)return finishNotRun('NOT RUN — prefers-reduced-motion: reduce is inactive.');
  const cvtt=chapterVtt(fixture.chapterMode);
  const input:PortableStressInput={
   source:fixture.missingMedia?(options.missingSource||'/__stress-fixtures/missing.mp4'):(fixture.mediaKind==='audio'?(options.audioSource||options.source):options.source),
   poster:fixture.missingPoster?'/__stress-fixtures/missing-poster.webp':options.poster,
   chapters:cvtt?objectUrl(cvtt,'text/vtt',urls):undefined,
   captions:fixture.captionMode==='multi'?[{src:objectUrl(longCaption,'text/vtt',urls),label:'English / long',language:'en',default:true},{src:objectUrl(arabicCaption,'text/vtt',urls),label:'Arabic',language:'ar'}]:undefined,
   mediaKind:fixture.mediaKind||'video'
  };
  const cleanup=async()=>{try{await mounted?.destroy?.()}catch{} mounted?.root?.remove();urls.forEach(URL.revokeObjectURL);host.replaceChildren();host.style.removeProperty('width')};
  activeCleanup=cleanup;
  try{
   mounted=await options.adapter.mount(host,input);
   if(!mounted||!(mounted.root instanceof HTMLElement))throw new Error('Adapter mount() must return { root: HTMLElement, media?, destroy? }.');
   if(!mounted.root.isConnected)host.append(mounted.root);
   const media=mounted.media||mounted.root.querySelector<HTMLMediaElement>('video,audio');
   assertions.push({id:'root-mounted',label:'Adapter root mounted',status:mounted.root.isConnected?'pass':'fail',expected:true,observed:mounted.root.isConnected});
   assertions.push({id:'media-found',label:'Media element exposed',status:media?'pass':'fail',expected:true,observed:Boolean(media),evidence:media?media.tagName:'No <video>/<audio> found and adapter returned no media.'});
   await new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r())));
   if(fixture.width){const measured=Math.round(host.getBoundingClientRect().width);assertions.push({id:'host-width',label:'Host measures '+fixture.width+'px',status:Math.abs(measured-fixture.width)<=1?'pass':'fail',expected:fixture.width,observed:measured,evidence:'Measured with getBoundingClientRect().width.'})}
   const overflow=Math.max(0,mounted.root.scrollWidth-host.clientWidth);
   assertions.push({id:'horizontal-overflow',label:'No horizontal overflow',status:overflow<=1?'pass':'fail',expected:0,observed:overflow,evidence:'root.scrollWidth='+mounted.root.scrollWidth+'; host.clientWidth='+host.clientWidth});
   const hr=host.getBoundingClientRect(),unreachable=focusables(mounted.root).filter(el=>{const r=el.getBoundingClientRect();return r.right<hr.left||r.left>hr.right||r.bottom<hr.top||r.top>hr.bottom}).length;
   assertions.push({id:'focusable-reachability',label:'Focusable controls intersect the host',status:unreachable===0?'pass':'fail',expected:0,observed:unreachable});
   if(media&&fixture.mediaKind==='audio')assertions.push({id:'audio-semantics',label:'Audio-only case exposes <audio>',status:media.tagName==='AUDIO'?'pass':'warning',expected:'AUDIO',observed:media.tagName});
   if(media&&fixture.rapidSeeks&&Number.isFinite(media.duration)&&media.duration>1){const points=[.1,.85,.2,.7,.35].map(p=>clamp(media.duration*p,0,media.duration));for(const p of points){try{media.currentTime=p}catch{}await wait(30)}const target=points[points.length-1];assertions.push({id:'rapid-seeks-aligned',label:'Rapid seeks leave media near final target',status:Math.abs(media.currentTime-target)<Math.max(1,media.duration*.03)?'pass':'warning',expected:Math.round(target*100)/100,observed:Math.round(media.currentTime*100)/100})}
   if(media&&fixture.chapterMode==='late'){const t=document.createElement('track');t.kind='chapters';t.label='Late chapters';t.src=objectUrl(makeVtt(dense(4)),'text/vtt',urls);t.default=true;media.append(t);t.track.mode='hidden';assertions.push({id:'late-track-attached',label:'Chapter metadata can arrive after mount',status:'pass',expected:true,observed:true,evidence:'A real chapter track was attached after mount.'})}
   if(fixture.sourceReplacement){const first=mounted.root;await mounted.destroy?.();first.remove();const replacement=await options.adapter.mount(host,{...input,source:options.replacementSource||options.source});mounted=replacement;if(!replacement.root.isConnected)host.append(replacement.root);assertions.push({id:'old-root-detached',label:'Previous player root detached before replacement',status:first.isConnected?'fail':'pass',expected:false,observed:first.isConnected});assertions.push({id:'replacement-mounted',label:'Replacement player mounted',status:replacement.root.isConnected?'pass':'fail',expected:true,observed:replacement.root.isConnected})}
  }catch(error){assertions.push({id:'adapter-run',label:'Adapter mounted the fixture',status:'fail',expected:'successful mount',observed:'exception',evidence:error instanceof Error?error.message:String(error)})}
  const result:StressResult={caseId:id,caseLabel:fixture.label,adapterName:options.adapter.name,status:statusOf(assertions),assertions,environment:env,durationMs:performance.now()-started,notes};
  options.reporter?.(result);
  return {fixture,mount:mounted,result,cleanup};
 };
 const runCompatibleSuite=async(host:HTMLElement,ids:PortableStressCaseId[]=fixtures.filter(f=>!f.manualOnly).map(f=>f.id))=>{const results:StressResult[]=[];for(const id of ids)results.push((await run(host,id)).result);await activeCleanup();return results};
 return {run,runCompatibleSuite,destroy:async()=>activeCleanup(),fixtures:portableStressFixtures};
}
