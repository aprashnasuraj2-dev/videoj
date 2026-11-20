"""Review-first newsroom pipeline tests, including fail-closed and tamper checks."""
import json
from pathlib import Path
import wave
import numpy as np
import pytest
from newsroom.review_gate import text_audit, parse_srt, build_review_pack, check_release

SRC=Path(__file__).resolve().parents[1]/'templates'/'example_ai_bubble_ne.json'
def story():return json.loads(SRC.read_text(encoding='utf-8'))

def test_editorial_audit_catches_corrupted_nepali_and_voice():
    m=story(); assert text_audit(m)['mechanical_passed']
    m['scenes'][0]['headline'] += '\ufffd'
    m['voice']['provider']='eSpeak NP prototype'
    e=text_audit(m)['issues']
    assert len(e)>=2
    assert any('glyph' in x for x in e)
    assert any('voice' in x.lower() for x in e)

def test_srt_parsing_rejects_invisible_and_overlapping():
    from tempfile import TemporaryDirectory
    with TemporaryDirectory() as d:
        f=Path(d)/'a.srt'
        f.write_text('1\n00:00:00,000 --> 00:00:01,000\nनमस्ते।\n\n2\n00:00:01,001 --> 00:00:02,000\nसबैलाई।\n',encoding='utf-8')
        assert len(parse_srt(f))==2
        f.write_text('1\n00:00:00,000 --> 00:00:01,000\nसही।\n\n2\n00:00:00,900 --> 00:00:02,000\nगलत।\n')
        with pytest.raises(ValueError,match='Overlapping'):parse_srt(f)

def test_release_gate_rejects_unreviewed_and_changed_files(tmp_path):
    m=story();p=tmp_path/'story.json';p.write_text(json.dumps(m,ensure_ascii=False),encoding='utf-8')
    wav=tmp_path/'voice.wav'
    sr=22050; a=np.zeros(sr*15,dtype=np.int16)
    with wave.open(str(wav),'wb') as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(sr);w.writeframes(a.tobytes())
    srt=tmp_path/'a.srt';srt.write_text('1\n00:00:00,000 --> 00:00:03,000\nनेपालको आवाज।\n',encoding='utf-8')
    sample=tmp_path/'sample.mp4';sample.write_bytes(b'fake preview')
    approval={'immutable_hashes':{},'approved':{},'ratings':{}}
    sign=tmp_path/'sign.json';sign.write_text(json.dumps(approval))
    r=check_release(p,wav,srt,sample,sign)
    assert not r['release_ready']
    assert any('Stale approval' in i for i in r['issues'])
    assert any('reviewer' in i for i in r['issues'])

def test_review_pack_creates_offline_nepali_scene_contact_sheet(tmp_path):
    m=story();m['scenes']=m['scenes'][:3]
    # no voice: editorial copy and typography can be checked independently
    m['voice']['file']=''
    src=tmp_path/'story.json';src.write_text(json.dumps(m,ensure_ascii=False),encoding='utf-8')
    r=build_review_pack(src,tmp_path/'audit')
    assert r['manual_review_required']
    assert not r['voice_present']
    assert (tmp_path/'audit/contact_sheet.jpg').is_file()
    assert (tmp_path/'audit/review.html').is_file()
    assert (tmp_path/'audit/frames/scene_03.png').is_file()
    saved=json.loads((tmp_path/'audit/approval_template.json').read_text())
    assert not any(saved['approved'].values())
    assert saved['immutable_hashes']['story_sha256']

def test_sample_preview_is_real_video_with_nepali_audio_and_captions(tmp_path):
    m=story();m['scenes']=m['scenes'][:3]
    m['voice']['file']=''
    src=tmp_path/'story.json';src.write_text(json.dumps(m,ensure_ascii=False),encoding='utf-8')
    sr=24000;seconds=16
    t=np.arange(sr*seconds,dtype=np.float64)/sr
    a=(np.sin(t*2*np.pi*220)*2500).astype(np.int16)
    v=tmp_path/'tone.wav'
    with wave.open(str(v),'wb') as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(sr);w.writeframes(a.tobytes())
    srt=tmp_path/'a.srt';srt.write_text('1\n00:00:00,200 --> 00:00:04,000\nनेपालको व्यापार।\n\n2\n00:00:04,200 --> 00:00:10,000\nनयाँ प्रश्न।\n',encoding='utf-8')
    r=build_review_pack(src,tmp_path/'audit',voice=v,subs=srt,seconds=10)
    assert r['voice_present'] and r['captions_present']
    from newsroom.pipeline import ffprobe_duration
    d=ffprobe_duration(Path(r['preview_mp4']))
    assert 9.8 <= d <=10.2
    assert (tmp_path/'audit/audition.wav').stat().st_size>10000


def test_caption_coverage_checks_content_not_merely_timestamps():
    from newsroom.review_gate import caption_script_coverage
    m=story();m['scenes']=m['scenes'][:3]
    narration=' '.join(s['voiceover'] for s in m['scenes'])
    assert caption_script_coverage(m,[{'start':0,'end':2,'text':narration}])==1
    assert caption_script_coverage(m,[{'start':0,'end':2,'text':'गलत र फरक क्याप्सन'}])<.5


def test_relative_cli_voice_is_resolved_from_current_working_directory(tmp_path,monkeypatch):
    from newsroom.pipeline import voice_path
    monkeypatch.chdir(tmp_path)
    clip=tmp_path/'yes.wav';clip.write_bytes(b'voice fixture')
    manifest=story()
    assert voice_path(manifest,tmp_path/'project'/'story.json',Path('yes.wav'))==clip


def test_valid_fixture_review_is_later_invalidated_by_audio_change(tmp_path):
    from datetime import datetime,timezone
    from newsroom.review_gate import sha256_file,APPROVALS
    m=story();p=tmp_path/'story.json';p.write_text(json.dumps(m,ensure_ascii=False),encoding='utf-8')
    wav=tmp_path/'voice.wav';wav.write_bytes(b'fixture\x00')
    srt=tmp_path/'a.srt'
    srt.write_text('1\n00:00:00,100 --> 00:00:05,000\n'+' '.join(s['voiceover'] for s in m['scenes'])+'\n',encoding='utf-8')
    opening=tmp_path/'opening.mp4';opening.write_bytes(b'test preview')
    a={
     'reviewer':'Test Fixture Only',
     'reviewed_at_utc':datetime.now(timezone.utc).isoformat(),
     'published_as_of_rechecked_at_utc':datetime.now(timezone.utc).isoformat(),
     'voice_owner_consent':True,'voice_clone_permission':False,
     'ratings':{'nepali_language':5,'pronunciation':5,'visual_storytelling':4,'narration_naturalness':4},
     'approved':{k:True for k in APPROVALS},
     'review_notes':'Unit-test fixture, not an actual human review. All paths deliberately fake.',
     'immutable_hashes':{'story_sha256':sha256_file(p),'voice_sha256':sha256_file(wav),
                         'captions_sha256':sha256_file(srt),'opening_sha256':sha256_file(opening)}
    }
    sign=tmp_path/'review.json';sign.write_text(json.dumps(a))
    assert check_release(p,wav,srt,opening,sign)['release_ready']
    wav.write_bytes(b'changed voice without reapproval')
    result=check_release(p,wav,srt,opening,sign)
    assert not result['release_ready']
    assert any('voice_sha256' in i for i in result['issues'])