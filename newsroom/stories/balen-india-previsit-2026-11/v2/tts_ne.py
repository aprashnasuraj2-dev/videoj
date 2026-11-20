"""Produce audited native ne-NP neural audio and provider-timed Nepali SRT.

Runs on GitHub Actions (remote) because the ChatGPT render sandbox is offline.
No undocumented fallback to eSpeak or Hindi voice; failure is explicit.
"""
from __future__ import annotations
import asyncio, json, hashlib, pathlib, subprocess, wave, re, unicodedata
import imageio_ffmpeg
FFMPEG=imageio_ffmpeg.get_ffmpeg_exe()

ROOT=pathlib.Path(__file__).resolve().parent
SCENES=json.loads((ROOT/'story.json').read_text('utf-8'))['scenes']
OUT=ROOT/'audio';OUT.mkdir(exist_ok=True)
VOICE='ne-NP-HemkalaNeural'
RATE='+8%'; PITCH='+0Hz'; SAMPLE_RATE=24000


def run(cmd):
 p=subprocess.run(cmd,capture_output=True,text=True)
 if p.returncode: raise RuntimeError(f'FFmpeg failed: {p.stderr[-2500:]}')
 return p


def fmt(sec:float)->str:
 n=round(sec*1000);h,n=divmod(n,3600000);m,n=divmod(n,60000);s,n=divmod(n,1000)
 return f'{h:02}:{m:02}:{s:02},{n:03}'


def norm(s:str)->str:
 s=unicodedata.normalize('NFC',s)
 return re.sub(r'[।,?!.:;—–\-\s]+','',s)


async def synth_one(i:int,text:str):
 import edge_tts
 mp3=OUT/f'segment_{i:02}.mp3';wav=OUT/f'segment_{i:02}.wav';words=[]
 data=[]
 comm=edge_tts.Communicate(text=text,voice=VOICE,rate=RATE,pitch=PITCH,boundary='WordBoundary')
 async for item in comm.stream():
  if item['type']=='audio':data.append(item['data'])
  elif item['type']=='WordBoundary':words.append({'text':str(item['text']),'start':float(item['offset'])/10_000_000,'end':(float(item['offset'])+float(item['duration']))/10_000_000})
 if not data: raise RuntimeError(f'No audio returned by {VOICE} for segment {i}')
 mp3.write_bytes(b''.join(data))
 run([FFMPEG,'-hide_banner','-loglevel','error','-y','-i',str(mp3),'-ac','1','-ar',str(SAMPLE_RATE),'-c:a','pcm_s16le',str(wav)])
 with wave.open(str(wav),'rb') as w:
  if (w.getframerate(),w.getnchannels(),w.getsampwidth())!=(SAMPLE_RATE,1,2):raise RuntimeError('Unsupported WAV format')
  pcm=w.readframes(w.getnframes());duration=w.getnframes()/SAMPLE_RATE
 print(json.dumps({'segment':i,'duration':round(duration,2),'provider_word_events':len(words),'first_words':[x['text'] for x in words[:4]]},ensure_ascii=False),flush=True)
 return pcm,duration,words


def make_cues(scene,text,dur,global_start,events):
 """Prefer exact word onset data; fallback uses relative positions, explicitly marked."""
 tokens=text.split(); positions=[]
 if len(events)>=len(tokens)*.67:
  # Some provider word events are split on punctuation or compound script parts;
  # find each spoken word by concatenating adjacent word events.
  ptr=0
  for tok in tokens:
   v='';first=ptr;found=False
   while ptr<len(events) and len(v)<len(norm(tok))+8:
    v+=norm(events[ptr]['text']);ptr+=1
    if v==norm(tok):found=True;break
   if not found:positions=[];break
   positions.append((max(0,events[first]['start']),min(dur,events[ptr-1]['end'])))
 mode='provider_word_boundary' if len(positions)==len(tokens) else 'estimated_by_text_length'
 if not positions:
  weights=[max(2,len(t)) for t in tokens]
  total=sum(weights);clock=0.08
  for j,w in enumerate(weights):
   a=clock;clock=.08+(dur-.16)*sum(weights[:j+1])/total
   positions.append((a,min(dur-.03,clock)))
 chunks=[];cur=[]
 for j,t in enumerate(tokens):
  cur.append((t,positions[j]))
  if len(cur)>=5 or (len(cur)>=3 and t.endswith(('।','?','!'))):
   chunks.append(cur);cur=[]
 if cur:chunks.append(cur)
 result=[]
 for chunk in chunks:
  txt=' '.join(x[0] for x in chunk)
  start=global_start+chunk[0][1][0]
  stop=global_start+chunk[-1][1][1]
  if stop-start<.27:stop=start+.27
  result.append((start,stop,txt))
 return result,mode


async def main():
 pcm=[];events=[];times=[];current=.4
 pcm.append(b'\x00\x00'*round(.4*SAMPLE_RATE))
 for i,sc in enumerate(SCENES,1):
  text=sc['voiceover']
  if not any('\u0900'<=c<='\u097f' for c in text):raise ValueError('Narration not Nepali')
  raw,dur,wds=await synth_one(i,text)
  cues,mode=make_cues(i,text,dur,current,wds)
  events+=cues
  times.append({'scene':i,'start':round(current,3),'end':round(current+dur,3),'narration':text,'caption_mode':mode,'provider_word_events':len(wds)})
  pcm.append(raw);current+=dur
  if i<len(SCENES):
   pause=.18
   pcm.append(b'\x00\x00'*round(pause*SAMPLE_RATE));current+=pause
 pcm.append(b'\x00\x00'*round(.5*SAMPLE_RATE));current+=.5
 with wave.open(str(OUT/'neural_ne_np.wav'),'wb') as w:
  w.setnchannels(1);w.setsampwidth(2);w.setframerate(SAMPLE_RATE);w.writeframes(b''.join(pcm))
 subs='\n\n'.join(f'{idx}\n{fmt(s)} --> {fmt(e)}\n{line}' for idx,(s,e,line) in enumerate(events,1))+'\n'
 (OUT/'captions_ne.srt').write_text(subs,'utf-8')
 summary={'voice':VOICE,'rate':RATE,'duration':round(current,3),'language':'ne-NP','scene_timings':times,'total_captions':len(events),'provider_words_used_for_cues':sum(t['caption_mode']=='provider_word_boundary' for t in times),'sha256_wav':hashlib.sha256((OUT/'neural_ne_np.wav').read_bytes()).hexdigest(),'warning':'Do not claim voice is human; this is neural synthesis. Listen and approve before publication.'}
 (OUT/'timing_ne.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n','utf-8')
 if not 52<=current<=95:raise RuntimeError(f'Duration {current:.1f}s outside supported preflight window 52–95s: revise script or time stretch audio before finalizing')
 print(json.dumps(summary,ensure_ascii=False,indent=2),flush=True)

if __name__=='__main__':asyncio.run(main())