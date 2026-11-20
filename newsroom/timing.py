"""Convert HeyGen character timestamps into truthful scene and word cues."""
from __future__ import annotations
import json
import re
from pathlib import Path
from .validation import load, validate


def srt_time(sec: float) -> str:
    ms=int(round(sec*1000));h,ms=divmod(ms,3600000);m,ms=divmod(ms,60000);s,ms=divmod(ms,1000)
    return f'{h:02d}:{m:02d}:{s:02d},{ms:03d}'


def load_provider(source:Path):
    data=json.loads(Path(source).read_text(encoding='utf-8'))
    if isinstance(data,dict) and 'text' in data and isinstance(data['text'],str):
        data=json.loads(data['text'])
    items=data.get('original_characters') if isinstance(data,dict) else None
    if not items or not isinstance(items,list):
        raise ValueError('Expected HeyGen original_characters array from a single speech generation with withTimestamps=true')
    chars=[str(c['text']) for c in items]
    if any(len(c)!=1 for c in chars):raise ValueError('Expected one character in each original_characters entry')
    return items,''.join(chars)


def make_aligned_srt(items:list,combined:str,srt:Path):
    words=list(re.finditer(r'\S+',combined))
    if not words:raise ValueError('No words in provider timestamps')
    chunks=[];current=[]
    for word in words:
        current.append(word)
        if len(current)>=7 or (len(current)>=4 and word.group(0).endswith(('.', '?','!'))):
            chunks.append(current);current=[]
    if current:chunks.append(current)
    blocks=[]
    for idx,chunk in enumerate(chunks,1):
        first,last=chunk[0],chunk[-1]
        a=float(items[first.start()]['start_time']);b=float(items[last.end()-1]['end_time'])
        if b<=a:raise ValueError(f'Invalid provider timestamp in caption {idx}')
        # Preserve the provider's exact characters, not a re-tokenized guess.
        text=combined[first.start():last.end()]
        blocks.append(f'{idx}\n{srt_time(a)} --> {srt_time(b)}\n{text}\n')
    srt.parent.mkdir(parents=True,exist_ok=True)
    srt.write_text('\n'.join(blocks),encoding='utf-8')
    return len(blocks)


def import_heygen_timestamps(project:Path,source:Path,target:Path,srt:Path|None=None)->dict:
    obj=load(project)
    items,combined=load_provider(source)
    cursor=0
    for i,sc in enumerate(obj['scenes']):
        phrase=sc['voiceover'];found=combined.find(phrase,cursor)
        if found<0:
            raise ValueError(f'Scene {i+1} does not match generated speech verbatim; do NOT guess timestamp. Excerpt: {phrase[:60]}')
        end=found+len(phrase)-1
        sc['cue_start']=float(items[found]['start_time'])
        sc['cue_end']=float(items[end]['end_time'])
        cursor=end+1
    validate(obj)
    target=Path(target);target.parent.mkdir(parents=True,exist_ok=True)
    target.write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    res={'scenes':len(obj['scenes']),'output':str(target),'mode':'exact_provider_timestamps'}
    if srt:res['aligned_captions']=make_aligned_srt(items,combined,Path(srt));res['srt_file']=str(srt)
    return res