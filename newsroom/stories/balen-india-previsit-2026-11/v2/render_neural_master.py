"""Final correct-Nepali master: native ne-NP neural TTS + proofread timed SRT.

Uses the existing original Pillow illustrations, never generative fake meeting footage.
"""
from __future__ import annotations
from pathlib import Path
import json, subprocess, sys
repo_path=Path(__file__).resolve().parents[4]
sys.path.insert(0, str(repo_path if (repo_path/'newsroom').is_dir() else Path('/mnt/data/newsroom-engine')))
from newsroom.audio import build_bed
from newsroom.pipeline import qc_mp4
BASE=Path(__file__).resolve().parent
OUT=BASE/'output'; OUT.mkdir(exist_ok=True)
A=BASE/'audio'
STATS=json.loads((A/'timing_ne.json').read_text('utf8'))
sc=STATS['scene_timings']; duration=float(STATS['duration'])
assert 60<=duration<=75,duration
assert STATS['voice']=='ne-NP-HemkalaNeural'
assert len(sc)==9
subs=A/'captions_ne_PROOFREAD.srt'
assert subs.is_file()
# ffconcat file pictures have bounded durations, full 72.18 seconds end-to-end
concat=OUT/'corrected_9_scenes.ffconcat'
rows=['ffconcat version 1.0']
for i,s in enumerate(sc):
    im=(OUT/'illustrations'/f'scene_{i+1:02}.png').resolve()
    assert im.is_file(),im
    nxt=float(sc[i+1]['start']) if i+1<len(sc) else duration
    cur=0 if i==0 else float(s['start'])
    delta=nxt-cur
    assert delta>4,(i,delta)
    rows += [f"file '{im}'",f'duration {delta:.5f}']
rows.append(f"file '{(OUT/'illustrations'/'scene_09.png').resolve()}'")
concat.write_text('\n'.join(rows)+'\n','utf8')
# Original licensed procedural sound bed. Low-volume under spoken explanation.
bed=OUT/'neural_mix_music.wav'
if not bed.is_file(): build_bed(bed,duration,rate=24000,seed=772)
master=OUT/'Balen_India_Three_Doors_NEURAL_VOICE_CORRECTED.mp4'
prelim=OUT/'Balen_India_NEURAL_WITHOUT_CAPTIONS.mp4'
subpath=str(subs.resolve()).replace('\\','\\\\').replace(':','\\:').replace("'","\\'")
# ASS style units are referenced to PlayResY=288; 9 units ≈60px at 1080x1920.
style='FontName=Noto Sans Devanagari,FontSize=9,Alignment=2,MarginV=35,MarginL=12,MarginR=12,Outline=0.45,Shadow=0.3,PrimaryColour=&H00F5F6F5&,OutlineColour=&H000C1421&'
filter_complex=(
    f'[0:v]fade=t=out:st={duration-.55:.3f}:d=0.55[v];'
    '[1:a]highpass=f=85,lowpass=f=12000,acompressor=threshold=-22dB:ratio=1.7:attack=12:release=155,volume=1.12[n];'
    '[2:a]volume=0.13[m];'
    f'[n][m]amix=inputs=2:duration=longest:dropout_transition=0,afade=t=out:st={duration-.55:.3f}:d=0.55,loudnorm=I=-16:TP=-1.5:LRA=9[a]'
)
cmd=['ffmpeg','-hide_banner','-loglevel','error','-y','-safe','0','-f','concat','-i',str(concat),
     '-i',str(A/'neural_ne_np.wav'),'-i',str(bed),'-filter_complex',filter_complex,
     '-map','[v]','-map','[a]','-r','24','-t',f'{duration:.3f}',
     '-c:v','libx264','-preset','ultrafast','-threads','2','-tune','stillimage','-crf','20','-pix_fmt','yuv420p',
     '-c:a','aac','-b:a','192k','-ar','48000','-movflags','+faststart','-metadata','title=तीन ढोका, एउटै परीक्षा | The Signal',str(prelim)]
print('Rendering corrected neural Nepali master',master,'seconds=',duration,'scene-count=',len(sc),flush=True)
with (OUT/'neural_master_ffmpeg.log').open('w') as f:
    process=subprocess.run(cmd,stderr=f,stdout=f)
if process.returncode: raise RuntimeError(f'Phase1 FFmpeg error {process.returncode}: {(OUT/"neural_master_ffmpeg.log").read_text()[-3500:]}')
# Burn subtitles only after video is explicitly frame-expanded to 24 FPS.
# The previous direct PNG-concat filter silently missed nearly every caption.
cmd2=['ffmpeg','-hide_banner','-loglevel','error','-y','-filter_threads','2','-i',str(prelim),
      '-vf',f"subtitles=filename='{subpath}':force_style='{style}'",'-c:v','libx264',
      '-preset','veryfast','-threads','2','-crf','20','-pix_fmt','yuv420p',
      '-c:a','copy','-movflags','+faststart',str(master)]
print('Burning 26 timed Nepali caption cues onto actual 24fps video frames',flush=True)
with (OUT/'neural_subtitle_ffmpeg.log').open('w') as f:
 process2=subprocess.run(cmd2,stdout=f,stderr=f)
if process2.returncode: raise RuntimeError(f'Phase2 FFmpeg error {process2.returncode}: {(OUT/"neural_subtitle_ffmpeg.log").read_text()[-3500:]}')
qa=qc_mp4(master,duration,1080,1920)
from verify_caption_burn import inspect_caption_burn
qa['caption_visual_regression']=inspect_caption_burn(master,OUT/'illustrations')
if not qa['caption_visual_regression']['passed']:qa['passed']=False
qa.update({'language':'ne-NP','narrator':'Microsoft ne-NP-HemkalaNeural AI-generated voice (not human)','voice_original_espeak_replaced':True,
           'captions':'26 manually proofread phrase-level cues; mostly provider time-anchored, one scene approximate',
           'source_cutoff':'2026-11-20','cut':'PRE-VISIT; NOT outcome report','script_proofread':True,'main_branch_unchanged':True})
(OUT/'Balen_India_Corrected_QA.json').write_text(json.dumps(qa,indent=2,ensure_ascii=False)+'\n','utf8')
print('QA',json.dumps(qa,ensure_ascii=False,indent=2),flush=True)
if not qa.get('passed'):raise RuntimeError('Failed video QA; review QA report')