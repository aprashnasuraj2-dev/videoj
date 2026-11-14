/**
 * Compile an authored video + real WebVTT chapters into a reproducible weave.
 * Output palette derives from actual chapter midpoint pixels; horizontal strand
 * thickness derives from chapter mean audio dBFS. No playback telemetry.
 *
 * This is an offline build operation. It never changes video duration, cues,
 * seeking, captions, and does not run at playback time.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';

const source=resolve(process.argv[2] ?? 'apps/preview/public/media/studies-in-thread.mp4');
const cueFile=resolve(process.argv[3] ?? 'apps/preview/public/media/chapters.vtt');
const output=resolve(process.argv[4] ?? 'apps/preview/src/weave-studies.json');
const posterOutput=resolve(process.argv[5] ?? 'apps/preview/public/media/studies-in-thread.weave.svg');
const strict=process.env.DHAGO_REQUIRE_WEBM==='1';
const fail=(message)=>{console.error('[DHAGO/weave] '+message);if(strict)process.exit(1)};
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const stamp=value=>{
  const components=value.trim().replace(',','.').split(':').map(Number);
  if(components.some(n=>!Number.isFinite(n))||(components.length!==2&&components.length!==3))return NaN;
  if(components.length===2)return components[0]*60+components[1];
  return components[0]*3600+components[1]*60+components[2];
};
const escapeXml=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;')
 .replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&apos;");
const run=(program,args,opts={})=>spawnSync(program,args,{
  encoding:opts.encoding??null, timeout:Math.max(opts.timeout??90000,1000),
  maxBuffer:16*1024*1024, stdio:['ignore','pipe','pipe']
});
const parseChapters=text=>{
  const lines=text.split(/\r?\n/);const found=[];
  for(let i=0;i<lines.length;i++){
    const m=lines[i].match(/^\s*(\d{2}:\d{2}(?::\d{2})?\.\d{3})\s+-->\s+(\d{2}:\d{2}(?::\d{2})?\.\d{3})(?:\s|$)/);
    if(!m)continue;
    const start=stamp(m[1]),end=stamp(m[2]),name=(lines[i+1]||'').trim();
    if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start)continue;
    found.push({start,end,title:name.slice(0,200)});
  }
  return found.sort((a,b)=>a.start-b.start);
};
const colorFromFrame=seconds=>{
  const r=run('ffmpeg',['-hide_banner','-loglevel','error','-nostdin','-ss',seconds.toFixed(3),
    '-i',source,'-map','0:v:0','-vf','scale=1:1,format=rgb24','-frames:v','1','-f','rawvideo','pipe:1']);
  if(r.status!==0||!r.stdout||r.stdout.length<3)throw Error('Cannot decode source frame at '+seconds+' seconds');
  const hex=(v)=>Number(v).toString(16).padStart(2,'0');
  return '#'+[r.stdout[0],r.stdout[1],r.stdout[2]].map(hex).join('');
};
const probeHasAudio=()=>{
  const r=run('ffprobe',['-v','error','-select_streams','a','-show_entries','stream=index','-of','csv=p=0',source],{encoding:'utf8'});
  return r.status===0&&Boolean(r.stdout?.trim());
};
const meanAudioDb=(start,end)=>{
  const r=run('ffmpeg',['-hide_banner','-nostats','-nostdin','-ss',start.toFixed(3),
    '-t',(end-start).toFixed(3),'-i',source,'-vn','-af','volumedetect','-f','null','-'],{encoding:'utf8'});
  const m=r.stderr?.match(/mean_volume:\s*(-?[\d.]+)\s*dB/);
  return m?Number(m[1]):null;
};
function svgDocument(chapters){
  const maxEnd=Math.max(...chapters.map(c=>c.end));
  let left=48, width=1104, y=116, clothHeight=346;
  const panels=chapters.map((c,i)=>{
    const x=left+c.start/maxEnd*width;
    const w=(c.end-c.start)/maxEnd*width;
    const id='weft-'+i;
    const period=clamp(8-c.threadPx,4.4,7.2);
    return '<pattern id="'+id+'" patternUnits="userSpaceOnUse" width="'+period+'" height="6">'
      +'<path d="M0 0V6" stroke="#161c22" stroke-opacity=".22" stroke-width="'+c.threadPx+'" />'
      +'<path d="M0 1H'+period+'" stroke="#fff1e1" stroke-opacity=".5" stroke-width="1"/></pattern>'
      +'<rect x="'+x.toFixed(2)+'" y="'+y+'" width="'+w.toFixed(2)+'" height="'+clothHeight+'" fill="'+c.color+'"/>'
      +'<rect x="'+x.toFixed(2)+'" y="'+y+'" width="'+w.toFixed(2)+'" height="'+clothHeight+'" fill="url(#'+id+')" />'
      +'<path d="M'+x.toFixed(2)+' '+y+'v'+clothHeight+'" stroke="#f4ebdd" stroke-opacity=".85" stroke-width="3" />';
  }).join('');
  const legend=chapters.map((c,i)=>{
    const x=48+(i%4)*275,y=522+Math.floor(i/4)*30;
    return '<circle cx="'+x+'" cy="'+(y-4)+'" r="5" fill="'+c.color+'"/>'
      +'<text x="'+(x+14)+'" y="'+y+'" font-family="system-ui,sans-serif" font-size="14" fill="#f1e9d8">'+
      escapeXml((i+1)+'. '+c.title.slice(0,24))+'</text>';
  }).join('');
  return '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-labelledby="title desc">'
    +'<title id="title">DHAGO — the chromatic weave of Studies in Thread</title>'
    +'<desc id="desc">The colors are sampled from actual video frames at chapter midpoints. Thread weights reflect actual measured chapter mean audio volume where available. This image is a textile visualization, not a waveform.</desc>'
    +'<rect width="1200" height="630" fill="#1e2625"/>'
    +'<text x="48" y="62" fill="#f2e7d4" font-family="Georgia,serif" font-size="34" letter-spacing="1">DHAGO / Time, woven.</text>'
    +'<text x="1152" y="62" text-anchor="end" fill="#b6b9a9" font-family="system-ui,sans-serif" font-size="13">ONE FILM · ONE WEAVE</text>'
    +'<path d="M48 87H1152" stroke="#65736c" stroke-width="1"/>'
    +panels+'<path d="M48 462H1152" stroke="#e5d5bd" stroke-width="2" />'
    +legend+'<text x="48" y="609" fill="#acb5a9" font-family="system-ui,sans-serif" font-size="12">'
    +'Colors: real frames · Widths: chapter durations · Strand thickness: chapter audio level'
    +'</text></svg>\n';
}
if(!existsSync(source)||!existsSync(cueFile)){
  fail('Missing local source or WebVTT chapter file.');
}else{
  try{
    const chapters=parseChapters(readFileSync(cueFile,'utf8'));
    if(!chapters.length||chapters.length>80)throw Error('Expected 1–80 valid chapter cues');
    const hasAudio=probeHasAudio();
    const records=chapters.map(c=>{
      const midpoint=c.start+(c.end-c.start)/2;
      const color=colorFromFrame(midpoint);
      const audioDb=hasAudio?meanAudioDb(c.start,c.end):null;
      // dBFS, not fictitious waveform amplitude. Typical -48..-12 dB maps to 1.2..3.2px.
      const threadPx=audioDb===null?1.8:Number(clamp(1.2+(audioDb+48)/36*2,1.2,3.2).toFixed(2));
      return {...c,color,audioDb,threadPx};
    });
    const manifest={format:'dhago-weave-v1',method:'chapter-midpoint RGB + mean audio dBFS',audioMeasured:hasAudio,chapters:records};
    mkdirSync(dirname(output),{recursive:true});
    mkdirSync(dirname(posterOutput),{recursive:true});
    writeFileSync(output,JSON.stringify(manifest,null,2)+'\n');
    writeFileSync(posterOutput,svgDocument(records));
    console.log('[DHAGO/weave] Compiled '+records.length+' actual video chapter swatches; audio='+hasAudio+'; source-derived image written.');
  }catch(error){fail(error instanceof Error?error.message:String(error))}
}
