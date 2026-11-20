"""Nepali-first production regressions: no broken glyphs or estimated strict captions."""
from __future__ import annotations
import json
from pathlib import Path
import subprocess
import numpy as np
import pytest
import soundfile as sf
from PIL import Image, ImageDraw
from newsroom.i18n import verify_text_engine, has_devanagari, ass_subtitle_style
from newsroom.graphics import glyph_runs, measure_rich, render_scene
from newsroom.validation import validate, ManifestError
from newsroom.pipeline import build, captions_estimated, make_timeline, qc_mp4
from newsroom.timing import import_timestamps

SAMPLE=Path(__file__).resolve().parents[1]/'templates'/'example_ai_bubble_ne.json'
def sample():return json.loads(SAMPLE.read_text(encoding='utf-8'))


def test_nepali_manifest_and_audition_policy():
    obj=sample();validate(obj)
    assert obj['metadata']['language']=='ne'
    assert obj['voice']['locale']=='ne-NP'
    assert any('।' in s['voiceover'] for s in obj['scenes'])
    # Refuse an English narrator mislabeled as Nepali / a Hindi locale.
    obj['voice']['locale']='hi-IN'
    with pytest.raises(ManifestError,match='ne-NP'):validate(obj)
    obj=sample();obj['metadata']['language']='ne-en';validate(obj)
    obj['metadata']['language']='xx'
    with pytest.raises(ManifestError,match='metadata.language'):validate(obj)


def test_devanagari_latin_runs_and_complex_shaping(tmp_path):
    tech=verify_text_engine('ne')
    assert tech['complex_text_layout_raqm']
    assert Path(tech['font']).exists()
    assert has_devanagari('प्रविधि र cash flow')
    runs=glyph_runs('ऋण $1.77T र ४७%')
    assert any(s=='dev' for r,s in runs)
    assert any(s=='lat' and '$1.77T' in r for r,s in runs)
    im=Image.new('RGB',(720,150),'#0b1922');dr=ImageDraw.Draw(im)
    assert measure_rich(dr,'ऋण $1.77T र ४७%',65,True)>200
    # Rendered mixed-script figures must not become empty boxes.
    from newsroom.graphics import draw_rich
    draw_rich(dr,20,10,'ऋण $1.77T र ४७%',65,'white',True)
    assert sum(1 for r,g,b in im.getdata() if r>200 and g>200 and b>200)>200
    im.save(tmp_path/'glyphs.png')


def test_nepali_cards_without_overflow(tmp_path):
    obj=sample()
    for i,scene in enumerate(obj['scenes']):
        p=tmp_path/f'{i}.png'
        render_scene(scene,obj['metadata'],i,len(obj['scenes']),p,432,768)
        assert p.is_file() and Image.open(p).size==(432,768)


def test_ass_font_is_in_script_units_not_output_pixels():
    style=ass_subtitle_style('ne')
    assert 'FontSize=10' in style and 'FontSize=50' not in style
    assert 'FontName=Noto Sans Devanagari' in style
    assert 'MarginV=23' in style


def test_nepali_estimated_captions_keep_danda(tmp_path):
    obj=sample();obj['scenes']=obj['scenes'][:3]
    t,_,m=make_timeline(obj,20.0)
    assert m=='estimated_no_word_alignment'
    srt=tmp_path/'ne.srt';captions_estimated(t,srt)
    contents=srt.read_text(encoding='utf-8')
    assert '।' in contents
    assert 'एन्थ्रोपिक' in contents


def test_exact_nepali_word_timestamps_and_mismatch(tmp_path):
    obj=sample();obj['scenes']=obj['scenes'][:3]
    project=tmp_path/'ne.json';project.write_text(json.dumps(obj,ensure_ascii=False),encoding='utf-8')
    words=' '.join(sc['voiceover'] for sc in obj['scenes']).split()
    stamps={'words':[{'text':w,'start':i*.18,'end':i*.18+.15} for i,w in enumerate(words)]}
    p=tmp_path/'words.json';p.write_text(json.dumps(stamps,ensure_ascii=False),encoding='utf-8')
    dst=tmp_path/'timed.json';srt=tmp_path/'aligned.srt'
    result=import_timestamps(project,p,dst,srt)
    assert result['mode']=='exact_word_timestamps'
    assert result['scenes']==3
    timed=json.loads(dst.read_text(encoding='utf-8'))
    assert all('cue_start' in s for s in timed['scenes'])
    assert '।' in srt.read_text(encoding='utf-8')
    stamps['words'][10]['text']='गलत'
    p.write_text(json.dumps(stamps,ensure_ascii=False),encoding='utf-8')
    with pytest.raises(ValueError,match='differs from authored narration'):import_timestamps(project,p,dst,srt)


def test_exact_nepali_character_timestamps(tmp_path):
    obj=sample();obj['scenes']=obj['scenes'][:3]
    project=tmp_path/'ne.json';project.write_text(json.dumps(obj,ensure_ascii=False),encoding='utf-8')
    content=' '.join(s['voiceover'] for s in obj['scenes'])
    chars=[{'text':c,'start_time':i*.035,'end_time':(i+1)*.035} for i,c in enumerate(content)]
    stamps=tmp_path/'characters.json';stamps.write_text(json.dumps({'original_characters':chars},ensure_ascii=False),encoding='utf-8')
    target=tmp_path/'timed_ne.json';srt=tmp_path/'ne.srt'
    result=import_timestamps(project,stamps,target,srt)
    assert result['mode']=='exact_provider_timestamps'
    assert 'अमेरिकी' in srt.read_text(encoding='utf-8')


def test_nepali_cli_new(tmp_path):
    dest=tmp_path/'new_ne.json'
    r=subprocess.run(['python','-m','newsroom','new',str(dest),'--language','ne-en'],capture_output=True,text=True)
    assert r.returncode==0,r.stderr
    data=json.loads(dest.read_text(encoding='utf-8'))
    assert data['metadata']['language']=='ne-en'
    validate(data)


def test_nepali_mp4_render_and_cache(tmp_path):
    obj=sample();obj['scenes']=obj['scenes'][:3];obj['voice']['file']='test-tone.wav'
    file=tmp_path/'ne.json';file.write_text(json.dumps(obj,ensure_ascii=False),encoding='utf-8')
    sr=12000;duration=12
    time=np.arange(duration*sr,dtype=np.float32)/sr
    sf.write(tmp_path/'test-tone.wav',.15*np.sin(2*np.pi*175*time),sr)
    path=tmp_path/'nepali_preview.mp4'
    a=build(file,output=path,preview=True)
    assert a['passed'] and a['caption_font']=='Noto Sans Devanagari',a
    assert a['language']=='ne' and a['complex_text_layout_raqm']
    assert '।' in path.with_suffix('.srt').read_text(encoding='utf-8')
    b=build(file,output=path,preview=True)
    assert b['new_encoded_scenes']==0 and b['reused_encoded_scenes']==3