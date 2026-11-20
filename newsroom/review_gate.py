"""Offline, fail-closed editorial review stages for the Newsroom Reel Engine.

A file being playable is NOT proof of accurate reporting, natural Nepali speech,
readable captions, authenticity or adequate human review. This module deliberately
keeps those judgments outside automated metrics and requires evidenced signoff.
"""
from __future__ import annotations

import hashlib
import html
import difflib
import json
import math
import re
import shutil
import subprocess
import tempfile
import unicodedata
from datetime import date, datetime, timezone
from pathlib import Path

from PIL import Image, ImageOps, ImageDraw
from .graphics import render_scene
from .i18n import language, verify_text_engine
from .pipeline import ffprobe_duration, make_timeline, offset_srt, qc_mp4, voice_path
from .validation import load

APPROVALS = (
    "sources_rechecked", "nepali_copy_proofread", "voice_sample_listened",
    "natural_speech_approved", "pronunciation_checked", "visual_frames_inspected",
    "caption_timing_reviewed", "media_rights_verified", "opening_hook_approved",
)
FORBIDDEN_AUDIO_BACKENDS = ("espeak", "flite", "festival", "gtts", "google translate tts")
SUBTITLE_CLOCK = re.compile(r"^(\d{2}):(\d{2}):(\d{2}),(\d{3})\s+-->\s+(\d{2}):(\d{2}):(\d{2}),(\d{3})$")


def sha256_file(p: Path) -> str:
    h = hashlib.sha256()
    with Path(p).open('rb') as f:
        while True:
            chunk=f.read(1024 * 1024)
            if not chunk:break
            h.update(chunk)
    return h.hexdigest()


def invoke(*args):
    r=subprocess.run([str(x) for x in args],stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
    if r.returncode:raise RuntimeError("Command failed: " + " ".join(map(str,args)) + "\n"+r.stderr[-900:])
    return r


def parse_srt(path: Path) -> list[dict]:
    """Explicit parse ensures timestamp monotonicity, text and reject empty blocks."""
    data=Path(path).read_text(encoding='utf-8-sig').strip()
    blocks=[]
    if not data:raise ValueError('Caption file is empty')
    for block in re.split(r'\n\s*\n',data):
        lines=[x.strip() for x in block.strip().splitlines()]
        if len(lines)<3:raise ValueError('Subtitle block needs index, timing and text')
        if not lines[0].isdigit():raise ValueError('Subtitle sequence numbers must be numeric')
        m=SUBTITLE_CLOCK.match(lines[1])
        if not m:raise ValueError('Invalid SRT timestamp format')
        n=list(map(int,m.groups()))
        a=n[0]*3600+n[1]*60+n[2]+n[3]/1000
        b=n[4]*3600+n[5]*60+n[6]+n[7]/1000
        if b<=a:raise ValueError('Subtitle has zero or negative duration')
        text=' '.join(lines[2:])
        if '\ufffd' in text or not text.strip():raise ValueError('Subtitle is empty or contains replacement glyphs')
        if blocks and a<blocks[-1]['end']-.001:raise ValueError('Overlapping subtitles')
        blocks.append({'start':a,'end':b,'text':text})
    return blocks


def text_audit(manifest:dict) -> dict:
    """Report mechanical hazards; never claim to verify Nepali grammatical quality."""
    lang=language(manifest['metadata']);issues=[];warnings=[]
    sources={s['id']:s for s in manifest['sources']}
    as_of=date.fromisoformat(manifest['metadata']['as_of'])
    for s in manifest['sources']:
        try:
            published=date.fromisoformat(s['published'])
            if published>as_of:issues.append(f"Source {s['id']} dated after story cutoff")
        except ValueError: warnings.append(f"Source {s['id']}: publication date not machine-verified")
    titles=[]
    for i,s in enumerate(manifest['scenes'],1):
        title=s['headline'];text=s['voiceover']; titles.append(title)
        for name,value in (('headline',title),('voiceover',text),('detail',str(s.get('detail','')))):
            if any(c in value for c in ('\ufffd','\u25a1','\u25af')):
                issues.append(f'Scene {i}: corrupt/replacement glyph in {name}')
            if any(unicodedata.category(c)=='Cc' and c not in '\n\t' for c in value):
                issues.append(f'Scene {i}: control char in {name}')
        if len(title)>75:warnings.append(f'Scene {i}: long on-screen headline ({len(title)} characters)')
        if len(text.split())>42:warnings.append(f'Scene {i}: long narration ({len(text.split())} space-delimited words)')
        if lang in {'ne','ne-en'}:
            # Script-presence check, not a grammar or fluency checker.
            letters=[c for c in text if unicodedata.category(c).startswith('L')]
            devanagari=sum('\u0900'<=c<='\u097f' for c in letters)
            if letters and devanagari/len(letters)<.45:
                issues.append(f'Scene {i}: Nepali-labeled scene contains mostly non-Devanagari narration')
        for sid in s.get('source_ids',[]):
            if sid not in sources:issues.append(f'Scene {i}: unknown source ID {sid}')
    if len(set(titles))<len(titles):warnings.append('Duplicate headlines; visual story may be repetitive')
    provider=str(manifest.get('voice',{}).get('provider','')).casefold()
    if any(x in provider for x in FORBIDDEN_AUDIO_BACKENDS):
        issues.append('Low-quality robotic voice backend or prototype detected in voice.provider')
    return {'mechanical_passed':not issues,'issues':issues,'warnings':warnings,
            'human_only_checks':['Nepali grammar and idiom','news truth and balance','voice naturalness','editing originality','glyph legibility']}


def caption_script_coverage(manifest:dict,cues:list[dict])->float:
    """Compare visible caption text with authored narration; no ASR or voice-truth claim."""
    def normalize(s):
        return ''.join(c for c in unicodedata.normalize('NFKC',s)
                       if not c.isspace() and not unicodedata.category(c).startswith('P'))
    script=normalize(' '.join(s['voiceover'] for s in manifest['scenes']))
    subtitles=normalize(' '.join(c['text'] for c in cues))
    if not script:return 0.0
    return difflib.SequenceMatcher(a=script,b=subtitles,autojunk=False).ratio()


def make_contact_sheet(files:list[Path],output:Path):
    if not files:raise ValueError('No frames to montage')
    tile_w,tile_h=288,512
    cols=min(4,len(files));rows=math.ceil(len(files)/cols)
    out=Image.new('RGB',(cols*(tile_w+12)+12,rows*(tile_h+36)+12),'#08141f')
    d=ImageDraw.Draw(out)
    for i,f in enumerate(files):
        im=Image.open(f).convert('RGB');im=ImageOps.fit(im,(tile_w,tile_h))
        x=12+(i%cols)*(tile_w+12);y=12+(i//cols)*(tile_h+36)
        out.paste(im,(x,y));d.text((x+5,y+tile_h+6),f'SCENE {i+1:02d}',fill='#dbe6e7')
    out.save(output,optimize=True)


def review_html(manifest:dict,diagnostics:dict,review_dir:Path,voice_present:bool,sub_present:bool,locked:dict):
    sections=[]
    for i,s in enumerate(manifest['scenes']):
        claims='; '.join(f"{c.get('kind','?')}: {c.get('text','')}" for c in s.get('claims',[]))
        sections.append('<section><img alt="Scene '+str(i+1)+'" src="frames/scene_'+str(i+1).zfill(2)+'.png" />'
                        +'<div><h2>Scene '+str(i+1)+': '+html.escape(s['headline'])+'</h2>'
                        +'<p><b>Narration:</b> '+html.escape(s['voiceover'])+'</p>'
                        +'<p><b>Evidence:</b> '+html.escape(claims or 'No explicit claims')+'</p></div></section>')
    audio='<audio controls preload="none" src="audition.wav"></audio>' if voice_present else '<p class="warn">VOICE MISSING: this is not publishable.</p>'
    preview='<video controls playsinline preload="metadata" src="opening_14s.mp4"></video>' if voice_present else ''
    checks=''.join('<li><label><input type="checkbox" class="approval" data-approval="'+html.escape(key)+'" /> '+html.escape(key.replace('_',' '))+'</label></li>' for key in APPROVALS)
    ratings=''.join('<label>'+html.escape(k.replace('_',' '))+' (1–5): <select class="rating" data-rating="'+k+'">'+''.join('<option value="'+str(n)+'">'+str(n)+'</option>' for n in range(0,6))+'</select></label><br>' for k in ('nepali_language','pronunciation','visual_storytelling','narration_naturalness'))
    frozen=json.dumps(locked,ensure_ascii=False).replace('<','\\u003c')
    cloned='clone' in str(manifest.get('voice',{}).get('provider','')).casefold()
    body=f'''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Newsroom Review — {html.escape(manifest['metadata']['title'])}</title>
<style>body{{background:#07131e;color:#edf3f2;font:16px/1.6 system-ui,sans-serif;max-width:1080px;margin:3rem auto;padding:0 1rem}}h1{{font-size:1.9rem}}a{{color:#68dbc5}}section{{display:flex;gap:24px;border-top:1px solid #314f58;padding:20px 0}}section img{{width:220px;max-width:38%;object-fit:contain}}video{{width:280px;max-width:100%}}audio{{width:360px;max-width:100%}}.warn{{color:#ffbd73}}.muted{{color:#bacdd1}}@media(max-width:520px){{section{{display:block}}section img{{max-width:100%;width:260px}}}}</style>
<h1>{html.escape(manifest['metadata']['title'])}</h1><p class="muted">Editorial cutoff: {html.escape(manifest['metadata']['as_of'])} · Language: {html.escape(language(manifest['metadata']))} · Offline review pack</p>
<h2>FIRST: listen to the actual narrator, check Devanagari lettering, then watch the 14s opening sample.</h2>{audio}{preview}
<p class="warn">This page does NOT constitute approval. The separate <code>approval_template.json</code> stays false until a human actually reviews the material.</p>
<p>Mechanical text issues: {html.escape('; '.join(diagnostics['issues']) or 'none found')} · Warnings: {html.escape('; '.join(diagnostics['warnings']) or 'none')}</p>
<h2>Human editorial approval (cannot be automated)</h2>
<p class="muted">Listen and inspect first. None of these boxes is pre-checked. Only a human who actually checked sources, recorded speech rights and listened to the actual sample should sign.</p>
<label>Reviewer: <input id="reviewer" placeholder="Your name" /></label><br>
<label>Review notes: <textarea id="notes" placeholder="Describe corrected Nepali expressions, voice quality and remaining doubts" rows="3" cols="55"></textarea></label>
<ul>{checks}</ul><p>{ratings}</p>
<label><input type="checkbox" id="voice-consent" /> I have explicit rights/consent to use this voice sample.</label><br>
<label><input type="checkbox" id="clone-consent" /> The narrator separately consented to AI voice cloning (only needed if cloning).</label><br>
<button type="button" id="download-signoff">Generate human-signed release approval JSON</button>
<p id="status" role="status"></p><p class="warn">The author of the recording can refuse cloning. A sample may be used for rhythm/style reference without cloning.</p>
<h2>Every scene</h2>{''.join(sections)}
<p class="muted">This offline web page never uploads private voice recordings or makes network calls. Do not put personal voices into Git.</p>
<script>
const locked={frozen};const cloned={str(cloned).lower()};
document.getElementById('download-signoff').addEventListener('click',()=>{{
 const approvals={{}}; document.querySelectorAll('.approval').forEach(x=>approvals[x.dataset.approval]=x.checked);
 const ratings={{}}; document.querySelectorAll('.rating').forEach(x=>ratings[x.dataset.rating]=Number(x.value));
 const reviewer=document.getElementById('reviewer').value.trim();
 const notes=document.getElementById('notes').value.trim();
 const voiceConsent=document.getElementById('voice-consent').checked;
 const cloneConsent=document.getElementById('clone-consent').checked;
 const errors=[];
 if(!reviewer)errors.push('Reviewer name required');
 if(notes.length<20)errors.push('Meaningful review notes required (20+ characters)');
 if(Object.values(approvals).some(x=>!x))errors.push('All editorial approvals must be checked');
 if(Object.values(ratings).some(x=>x<4))errors.push('Each quality score must be 4 or 5');
 if(!voiceConsent)errors.push('Voice owner consent required');
 if(cloned&&!cloneConsent)errors.push('Cloning needs explicit separate permission');
 if(!locked.voice_sha256 || !locked.captions_sha256 || !locked.opening_sha256)errors.push('Missing voice, exact captions or 14-second preview');
 const status=document.getElementById('status');
 if(errors.length){{ status.textContent='NOT READY: '+errors.join('; ');return; }}
 const now=new Date().toISOString();
 const data={{schema:'newsroom.editorial_acceptance.v1',immutable_hashes:locked,
 reviewer,reviewed_at_utc:now,published_as_of_rechecked_at_utc:now,
 voice_owner_consent:voiceConsent,voice_clone_permission:cloneConsent,ratings,approved:approvals,review_notes:notes}};
 const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{{type:'application/json'}}));
 const a=document.createElement('a');a.href=url;a.download='human_review_approved.json';a.click();URL.revokeObjectURL(url);
 status.textContent='Downloaded sign-off. Run the independent release-check; any script, voice, caption or opening change invalidates this approval.';
}});
</script></html>'''
    (review_dir/'review.html').write_text(body,encoding='utf-8')


def build_review_pack(project:Path,output:Path,voice:Path|None=None,subs:Path|None=None,seconds:float=14)->dict:
    project=Path(project).resolve();manifest=load(project)
    if not 5<=seconds<=20:raise ValueError('Opening audition must be between 5 and 20 seconds')
    out=Path(output).resolve();out.mkdir(parents=True,exist_ok=True)
    diagnostics=text_audit(manifest)
    verify_text_engine(language(manifest['metadata']))
    pics=out/'frames';pics.mkdir(exist_ok=True)
    for i,s in enumerate(manifest['scenes']):
        render_scene(s,manifest['metadata'],i,len(manifest['scenes']),pics/f'scene_{i+1:02d}.png',432,768)
    make_contact_sheet(sorted(pics.glob('scene_*.png')),out/'contact_sheet.jpg')
    if voice:
        v=voice_path(manifest,project,voice)
    else:
        try:v=voice_path(manifest,project,None)
        except FileNotFoundError:v=None
    if not v:
        # Missing voice can still yield an independent copy+design review.
        (out/'NEEDS_VOICE.txt').write_text('Supply a consenting narrator WAV/MP3. Do not use eSpeak or Hindi masquerading as Nepali.',encoding='utf-8')
    if subs is not None:
        subs=Path(subs).resolve();cues=parse_srt(subs)
        if cues[-1]['end']>240:diagnostics['warnings'].append('Unusually long subtitle timeline')
    else:cues=[]
    if v:
        duration=ffprobe_duration(v)
        invoke('ffmpeg','-hide_banner','-loglevel','error','-y','-i',v,'-t',seconds,'-ar','24000','-ac','1','-c:a','pcm_s16le',out/'audition.wav')
        timeline,total,method=make_timeline(manifest,duration,lead=.45,tail=1.25)
        # Scene images need not be 1080p for editorial sign-off; avoid a costly full render.
        scene_edges=[0.0]+[float(x['start']) for x in timeline[1:]]+[seconds]
        slide=[]
        for i in range(len(manifest['scenes'])):
            st=scene_edges[i];en=min(seconds,scene_edges[i+1]);
            if st>=seconds:break
            if en>st+.001:slide.append((pics/f'scene_{i+1:02d}.png',en-st))
        with tempfile.TemporaryDirectory(prefix='nr_review_') as td:
            tmp=Path(td);segments=[]
            for i,(im,dur) in enumerate(slide):
                p=tmp/f'clip_{i:02}.mp4'
                invoke('ffmpeg','-hide_banner','-loglevel','error','-y','-loop','1','-framerate','15','-i',im,'-t',f'{dur:.3f}',
                       '-vf','format=yuv420p','-an','-r','15','-c:v','libx264','-preset','ultrafast','-crf','30',p)
                segments.append(p)
            lst=tmp/'inputs.txt';lst.write_text(''.join("file '"+str(p).replace("'", "'\\''")+"'\n" for p in segments),encoding='utf-8')
            video=tmp/'visuals.mp4'
            invoke('ffmpeg','-hide_banner','-loglevel','error','-y','-f','concat','-safe','0','-i',lst,'-t',seconds,'-c','copy',video)
            # Crucially: subtitle filter AFTER the image sequence becomes video frames.
            filt='format=yuv420p'
            if subs:
                ss=tmp/'offset.srt';offset_srt(subs,ss,.45)
                # libass ASS/SRT file path filter; paths in tmp contain no colons.
                filt=f"subtitles='{str(ss)}',format=yuv420p"
            target=out/'opening_14s.mp4'
            invoke('ffmpeg','-hide_banner','-loglevel','error','-y','-i',video,'-i',v,
                '-filter_complex',f'[0:v]{filt}[v];[1:a]adelay=450,atrim=0:{seconds},aresample=async=1:first_pts=0[a]',
                '-map','[v]','-map','[a]','-t',seconds,'-r','15','-c:v','libx264','-preset','ultrafast','-crf','29',
                '-c:a','aac','-b:a','96k','-movflags','+faststart',target)
    locked={'story_sha256':sha256_file(project),'voice_sha256':sha256_file(v) if v else None,
            'captions_sha256':sha256_file(subs) if subs else None,
            'opening_sha256':sha256_file(out/'opening_14s.mp4') if v else None}
    review={'schema':'newsroom.editorial_acceptance.v1','immutable_hashes':locked,'reviewer':'',
        'reviewed_at_utc':'','published_as_of_rechecked_at_utc':'',
        'voice_owner_consent':False,'voice_clone_permission':False,
        'ratings':{'nepali_language':0,'pronunciation':0,'visual_storytelling':0,'narration_naturalness':0},
        'approved':{k:False for k in APPROVALS},'review_notes':''}
    (out/'approval_template.json').write_text(json.dumps(review,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    (out/'mechanical_report.json').write_text(json.dumps(diagnostics,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    review_html(manifest,diagnostics,out,bool(v),bool(subs),locked)
    return {'review_dir':str(out),'mechanical_passed':diagnostics['mechanical_passed'],'warnings':diagnostics['warnings'],
        'voice_present':bool(v),'captions_present':bool(subs),'preview_mp4':str(out/'opening_14s.mp4') if v else None,
        'manual_review_required':True,'hashes':locked}


def check_release(project:Path,voice:Path,subs:Path,preview:Path,review_path:Path,video:Path|None=None)->dict:
    manifest=load(project);report=text_audit(manifest);issues=list(report['issues'])
    try:review=json.loads(Path(review_path).read_text(encoding='utf-8'))
    except Exception as e:raise ValueError('Missing or invalid human review signoff file') from e
    expected={'story_sha256':sha256_file(project),'voice_sha256':sha256_file(voice),
              'captions_sha256':sha256_file(subs),'opening_sha256':sha256_file(preview)}
    for k,val in expected.items():
        if review.get('immutable_hashes',{}).get(k)!=val:issues.append(f'Stale approval: {k} changed after audition')
    if not review.get('reviewer','').strip():issues.append('Missing named human reviewer')
    try:
        reviewed=datetime.fromisoformat(review['reviewed_at_utc'].replace('Z','+00:00'))
        if reviewed.tzinfo is None:raise ValueError
        age=(datetime.now(timezone.utc)-reviewed.astimezone(timezone.utc)).total_seconds()
        if age<0 or age>7*86400:issues.append('Human approval older than seven days, or in the future')
    except (ValueError,KeyError,TypeError):issues.append('Missing valid UTC review timestamp')
    try:
        rechecked=datetime.fromisoformat(review['published_as_of_rechecked_at_utc'].replace('Z','+00:00'))
        if rechecked.tzinfo is None:raise ValueError
        age=(datetime.now(timezone.utc)-rechecked.astimezone(timezone.utc)).total_seconds()
        if age<0 or age>24*3600:issues.append('Breaking-news sources must be rechecked within 24h of release')
    except (ValueError,KeyError,TypeError):issues.append('No recent news/source recheck timestamp')
    if review.get('voice_owner_consent') is not True:issues.append('Narrator has not consented to this recording/use')
    provider=str(manifest.get('voice',{}).get('provider','')).casefold()
    if 'clone' in provider and review.get('voice_clone_permission') is not True:
        issues.append('Voice cloning requires separately documented speaker permission')
    for k in APPROVALS:
        if review.get('approved',{}).get(k) is not True:issues.append('Approval missing: '+k)
    for k,r in review.get('ratings',{}).items():
        if not isinstance(r,(int,float)) or r<4:issues.append(f'Human score for {k} must be at least 4/5')
    if len(review.get('ratings',{}))<4:issues.append('All four quality dimensions must be scored')
    if not review.get('review_notes','').strip():issues.append('Human reviewer must record a meaningful note')
    try:
        cues=parse_srt(subs)
        completeness=caption_script_coverage(manifest,cues)
        if completeness<.97:issues.append(f'Subtitle text coverage {completeness:.1%} < 97% of exact narration text')
    except ValueError as e:issues.append('Caption error: '+str(e))
    technical=None
    if video:
        technical=qc_mp4(video,ffprobe_duration(voice)+1.7,1080,1920)
        if not technical['passed']:issues.append('MP4 technical QA failed')
    return {'release_ready':not issues,'issues':issues,'mechanical_report':report,
            'technical_video_check':technical,'disclaimer':'Consent and human checks are self-attested; the software cannot independently prove a human listened, or that news claims are true.'}