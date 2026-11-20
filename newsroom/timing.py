"""Convert HeyGen character timestamps into truthful scene and word cues."""
from __future__ import annotations
import json
import re
from pathlib import Path
from .validation import load, validate
from .i18n import sentence_ends, language


def srt_time(sec: float) -> str:
    ms=int(round(sec*1000));h,ms=divmod(ms,3600000);m,ms=divmod(ms,60000);s,ms=divmod(ms,1000)
    return f'{h:02d}:{m:02d}:{s:02d},{ms:03d}'


def load_provider(source:Path):
    data=json.loads(Path(source).read_text(encoding='utf-8'))
    if isinstance(data,dict) and 'text' in data and isinstance(data['text'],str):
        data=json.loads(data['text'])
    items=data.get('original_characters') if isinstance(data,dict) else None
    if not items or not isinstance(items,list):
        raise ValueError('Expected original_characters array of exact character-level timings (e.g. HeyGen withTimestamps=true); other verified providers can use this schema')
    chars=[str(c['text']) for c in items]
    if any(len(c)!=1 for c in chars):raise ValueError('Expected one character in each original_characters entry')
    return items,''.join(chars)


def make_aligned_srt(items:list,combined:str,srt:Path,lang:str='en'):
    words=list(re.finditer(r'\S+',combined))
    if not words:raise ValueError('No words in provider timestamps')
    chunks=[];current=[]
    for word in words:
        current.append(word)
        limit = 5 if lang in {'ne', 'ne-en'} else 7
        if len(current)>=limit or (len(current)>=3 and sentence_ends(word.group(0))):
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
    if srt:res['aligned_captions']=make_aligned_srt(items,combined,Path(srt),language(obj['metadata']));res['srt_file']=str(srt)
    return res


def import_word_timestamps(project:Path, source:Path, target:Path, srt:Path|None=None)->dict:
    """Import provider-neutral exact word boundaries for Nepali or English.

    Structure: {"words": [{"text":"नेपाली", "start":0.0, "end":0.5}, ...]}.
    Each word must match the authored script exactly, including punctuation.
    This deliberately refuses weak ASR matches: review/revise transcript first.
    """
    obj=load(project)
    raw=json.loads(Path(source).read_text(encoding='utf-8'))
    words=raw.get('words') if isinstance(raw,dict) else None
    if words is None and isinstance(raw,dict):words=raw.get('word_timestamps')
    if not isinstance(words,list) or not words:
        raise ValueError('Expected nonempty words/word_timestamps array with text/start/end')
    expected=[w for sc in obj['scenes'] for w in sc['voiceover'].split()]
    supplied=[str(w.get('text',w.get('word',''))).strip() if isinstance(w,dict) else '' for w in words]
    if supplied!=expected:
        first=next((i for i,(x,y) in enumerate(zip(supplied,expected)) if x!=y), min(len(supplied),len(expected)))
        raise ValueError(f'Word timestamp transcript differs from authored narration at token {first+1}; exact alignment required. No estimated reconciliation.')
    last_end=-1.0
    for i,w in enumerate(words):
        try:
            a=float(w.get('start',w.get('start_time')));b=float(w.get('end',w.get('end_time')))
        except (ValueError,TypeError):raise ValueError(f'Missing numeric word timestamp at word {i+1}') from None
        if a<0 or b<=a or a<last_end-0.05:
            raise ValueError(f'Invalid or overlapping word boundary at word {i+1}')
        last_end=b
    cursor=0
    for sc in obj['scenes']:
        n=len(sc['voiceover'].split())
        sc['cue_start']=float(words[cursor].get('start',words[cursor].get('start_time')))
        sc['cue_end']=float(words[cursor+n-1].get('end',words[cursor+n-1].get('end_time')))
        cursor+=n
    validate(obj)
    target=Path(target);target.parent.mkdir(parents=True,exist_ok=True)
    target.write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    result={'scenes':len(obj['scenes']),'output':str(target),'mode':'exact_word_timestamps'}
    if srt:
        chunks=[];current=[]
        limit=5 if language(obj['metadata']) in {'ne','ne-en'} else 7
        for w in words:
            current.append(w)
            if len(current)>=limit or (len(current)>=3 and sentence_ends(w.get('text',w.get('word','')))):
                chunks.append(current);current=[]
        if current:chunks.append(current)
        entries=[]
        for i,group in enumerate(chunks,1):
            a=float(group[0].get('start',group[0].get('start_time')))
            b=float(group[-1].get('end',group[-1].get('end_time')))
            phrase=' '.join(str(w.get('text',w.get('word',''))) for w in group)
            entries.append(f'{i}\n{srt_time(a)} --> {srt_time(b)}\n{phrase}\n')
        srt=Path(srt);srt.parent.mkdir(parents=True,exist_ok=True)
        srt.write_text('\n'.join(entries),encoding='utf-8')
        result.update(aligned_captions=len(chunks),srt_file=str(srt))
    return result


def import_timestamps(project:Path,source:Path,target:Path,srt:Path|None=None)->dict:
    """Autodetect lossless character or word timestamps, never guess alignment."""
    data=json.loads(Path(source).read_text(encoding='utf-8'))
    if isinstance(data,dict) and ('words' in data or 'word_timestamps' in data):
        return import_word_timestamps(project,source,target,srt)
    return import_heygen_timestamps(project,source,target,srt)