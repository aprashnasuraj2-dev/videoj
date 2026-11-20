import json
from copy import deepcopy
from pathlib import Path
import subprocess
import numpy as np
import pytest
import soundfile as sf
from newsroom.validation import load,validate,ManifestError,source_ledger
from newsroom.pipeline import ffprobe_duration,make_timeline,srt_timestamp,build,qc_mp4
from newsroom.timing import import_heygen_timestamps
from newsroom.audio import build_bed

SAMPLE=Path(__file__).resolve().parents[1]/'templates'/'example_ai_bubble.json'

def sample():return json.loads(SAMPLE.read_text())

def test_editorial_manifest_has_sources():
    obj=sample();validate(obj)
    assert len(obj['scenes'])>=3
    assert 'Reuters' in source_ledger(obj)


def test_refuse_uncited_claim():
    obj=sample();obj['scenes'][0]['claims'][0]['source_ids']=[]
    with pytest.raises(ManifestError,match='reported claims MUST cite'):validate(obj)


def test_refuse_fake_source_and_impostor():
    obj=sample();obj['scenes'][1]['claims'][0]['source_ids']=['NONEXISTENT']
    with pytest.raises(ManifestError,match='unknown source'):validate(obj)
    obj=sample();obj['metadata']['publisher']='Reuters'
    with pytest.raises(ManifestError,match='impersonate'):validate(obj)


def test_timing_modes():
    obj=sample();t,d,m=make_timeline(obj,50.0)
    assert m=='estimated_no_word_alignment' and len(t)==7 and d>50
    assert t[0]['start']>0 and t[-1]['end']<=d+.01
    obj['scenes'][0]['cue_start']=0.0
    with pytest.raises(ValueError,match='Partial'):make_timeline(obj,50.0)


def test_bed_duration_and_determinism(tmp_path):
    p=tmp_path/'bed.wav';q=tmp_path/'bed2.wav'
    build_bed(p,1.5,rate=8000,seed=77)
    build_bed(q,1.5,rate=8000,seed=77)
    assert p.read_bytes()==q.read_bytes()
    assert abs(sf.info(p).duration-1.5)<.01


def test_provider_timestamp_exact_match(tmp_path):
    obj=sample();obj['scenes']=obj['scenes'][:3]
    project=tmp_path/'p.json';project.write_text(json.dumps(obj))
    full=' '.join(s['voiceover'] for s in obj['scenes'])
    chars=[{'text':x,'start_time':i*.05,'end_time':(i+1)*.05} for i,x in enumerate(full)]
    provider=tmp_path/'provider.json';provider.write_text(json.dumps({'original_characters':chars}))
    target=tmp_path/'timed.json'
    info=import_heygen_timestamps(project,provider,target,tmp_path/"aligned.srt")
    assert info['scenes']==3
    assert (tmp_path/'aligned.srt').exists()
    timed=json.loads(target.read_text())
    assert timed['scenes'][1]['cue_start']>timed['scenes'][0]['cue_end']
    # Refuse to invent a timestamp when provider text differs.
    chars[15]['text']='x';provider.write_text(json.dumps({'original_characters':chars}))
    with pytest.raises(ValueError,match='does not match'):import_heygen_timestamps(project,provider,target)


def test_render_preview_and_resume(tmp_path):
    # A test tone stands in for a user-provided *file*, not a production narration.
    obj=sample();obj['voice']['file']='tone.wav';obj['scenes']=obj['scenes'][:3]
    project=tmp_path/'news.json';project.write_text(json.dumps(obj))
    sr=16000;seconds=11
    t=np.arange(sr*seconds)/sr
    voice=np.sin(2*np.pi*180*t).astype('float32')*.15
    sf.write(tmp_path/'tone.wav',voice,sr)
    video=tmp_path/'test_preview.mp4'
    rep=build(project,output=video,preview=True)
    assert rep['passed'],rep
    assert rep['dimensions']=='432x768'
    assert rep['caption_alignment']=='estimated'
    assert video.is_file() and (tmp_path/'test_preview.srt').exists()
    again=build(project,output=video,preview=True)
    assert again['reused_encoded_scenes']==3
    assert again['new_encoded_scenes']==0
    assert again['passed']


def test_strict_requires_true_cues_and_subs(tmp_path):
    obj=sample();obj["scenes"]=obj["scenes"][:3];obj["voice"]["file"]="tone.wav"
    project=tmp_path/"p.json";project.write_text(json.dumps(obj))
    sf.write(tmp_path/"tone.wav",np.zeros(16000*15,dtype="float32"),16000)
    with pytest.raises(ValueError,match="BOTH exact provider"):
        build(project,output=tmp_path/"v.mp4",preview=True,strict=True)