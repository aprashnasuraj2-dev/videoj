"""Resumable, deterministic 9:16 broadcast-format renderer.

Requires a human or natural-quality licensed narration file. Deliberately refuses
robotic TTS fallback and never invents research facts or edits user sources.
"""
from __future__ import annotations
import hashlib
import bisect
import json
import math
import re
import shutil
import subprocess
import tempfile
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .audio import build_bed
from .graphics import render_scene
from .validation import load, source_ledger
from .i18n import language, is_nepali, verify_text_engine, subtitle_font, sentence_ends, ass_subtitle_style


def run(args, *, capture=True):
    result=subprocess.run([str(x) for x in args], text=True, stdout=subprocess.PIPE if capture else None, stderr=subprocess.PIPE if capture else None)
    if result.returncode:
        raise RuntimeError(f"Command failed [{result.returncode}]: {' '.join(str(x) for x in args)}\n{(result.stderr or '')[-3500:]}")
    return result


def ffprobe_duration(path: Path)->float:
    r=run(['ffprobe','-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',path])
    try: return float(r.stdout.strip())
    except Exception as e:raise RuntimeError(f"Unable to determine duration of {path}") from e


def voice_path(manifest:dict, project_path:Path, override:Path|None=None):
    p=Path(override) if override else Path(str(manifest.get('voice',{}).get('file','')))
    if not str(p) or str(p)=='.':raise FileNotFoundError("Natural voice audio required: set voice.file or pass --voice /path/to/narration.wav")
    if not p.is_absolute():p=project_path.parent/p
    if not p.is_file():raise FileNotFoundError(f"Narration missing: {p}\nNo automatic robotic-voice fallback is allowed")
    if p.suffix.lower() not in {'.wav','.mp3','.m4a','.flac','.aac','.ogg'}:
        raise ValueError("Narration must be recognized audio format WAV/MP3/M4A/FLAC/AAC/OGG")
    return p.resolve()


def make_timeline(manifest:dict, voice_duration:float, lead=0.45, tail=1.4):
    """True timestamps take precedence. Otherwise use estimated word-weighted cues."""
    scenes=manifest['scenes'];all_have=all('cue_start' in s and 'cue_end' in s for s in scenes)
    any_have=any('cue_start' in s or 'cue_end' in s for s in scenes)
    if any_have and not all_have:
        raise ValueError("Partial narration cue timestamps: supply cue_start and cue_end for EVERY scene or NONE")
    if all_have:
        end_last=0; boundaries=[]
        for i,s in enumerate(scenes):
            start=float(s['cue_start']);end=float(s['cue_end'])
            if start<end_last-0.1: raise ValueError(f"Scene {i+1} cue overlaps previous narration")
            if end>voice_duration+0.2:raise ValueError(f"Scene {i+1} cue exceeds voice duration {voice_duration:.2f}s")
            boundaries.append((start,end));end_last=end
        # Visual scene boundaries at the midpoint between voice cues, so speech does not get cut.
        starts=[0.0]
        for i in range(1,len(scenes)):
            starts.append((boundaries[i-1][1]+boundaries[i][0])/2)
        starts.append(voice_duration+tail)
        mode='timecoded'
    else:
        min_secs=2.6
        available=max(0,voice_duration-len(scenes)*min_secs)
        if available<=0:raise ValueError(f"Narration {voice_duration:.1f}s too short for {len(scenes)} scenes (min {len(scenes)*min_secs:.1f}s)")
        weights=[max(1,len(re.findall(r'\S+',s['voiceover']))) for s in scenes]
        denom=sum(weights);durations=[min_secs+available*w/denom for w in weights]
        starts=[0.0]
        for d in durations:starts.append(starts[-1]+d)
        starts[-1]+=tail
        mode='estimated_no_word_alignment'
    intervals=[]
    for i,s in enumerate(scenes):
        intervals.append({'scene':i+1,'start':round(starts[i]+lead,3),'end':round(starts[i+1]+lead,3),'voiceover':s['voiceover'],'headline':s['headline']})
    return intervals,round(voice_duration+lead+tail,3),mode


def srt_timestamp(sec:float)->str:
    n=int(round(sec*1000));h,n=divmod(n,3600000);m,n=divmod(n,60000);s,ms=divmod(n,1000)
    return f'{h:02d}:{m:02d}:{s:02d},{ms:03d}'


def captions_estimated(timeline:list[dict], output:Path)->None:
    """Proportional scene captions; QC explicitly records that these are estimates."""
    out=[];idx=0
    for t in timeline:
        words=t['voiceover'].split()
        chunks=[];current=[]
        for word in words:
            current.append(word)
            if len(current)>=5 or (sentence_ends(word) and len(current)>=3):
                chunks.append(' '.join(current));current=[]
        if current:chunks.append(' '.join(current))
        if not chunks:continue
        # Grapheme count respects syllables/matras rather than Python \w character class.
        import regex as unicode_regex
        dur=(t['end']-t['start']);weights=[max(len(unicode_regex.findall(r'\X',c)),1) for c in chunks];total=sum(weights)
        used=0.0
        for i,chunk in enumerate(chunks):
            start=t['start']+dur*used/total;used+=weights[i];end=t['start']+dur*used/total
            idx+=1
            out.append(f"{idx}\n{srt_timestamp(start)} --> {srt_timestamp(end)}\n{chunk}\n")
    output.write_text('\n'.join(out),encoding='utf-8')


def offset_srt(source:Path,dest:Path,offset:float)->None:
    """Move speech-relative professional SRT into the video timeline (intro padding)."""
    pattern=re.compile(r'(\d{2}:\d{2}:\d{2},\d{3})\s+-->\s+(\d{2}:\d{2}:\d{2},\d{3})')
    data=source.read_text(encoding='utf-8-sig')
    if not pattern.search(data):raise ValueError('No valid SRT timings found in supplied --subs file')
    def sec(t):
        h,m,s=t.split(':'); ss,ms=s.split(',');return int(h)*3600+int(m)*60+int(ss)+int(ms)/1000
    dest.write_text(pattern.sub(lambda m:f'{srt_timestamp(sec(m.group(1))+offset)} --> {srt_timestamp(sec(m.group(2))+offset)}',data),encoding='utf-8')


def digest_scene(scene:dict,meta:dict,width,height):
    src=json.dumps([scene,meta,width,height,'graphics-2.0-nepali'],sort_keys=True,ensure_ascii=False)
    return hashlib.sha256(src.encode()).hexdigest()


def video_clip(png:Path, clip:Path, frames:int, width:int,height:int, fps:int, crf:int, workers:int):
    # zoompan is run entirely on fixed image; no external assets needed.
    # Fade is kept subtle; continuity maintained by audio.
    vf=f"zoompan=z='min(zoom+0.00025,1.035)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s={width}x{height}:fps={fps},fade=t=in:st=0:d=0.18,fade=t=out:st={max(0.1,frames/fps-0.2):.3f}:d=0.18,format=yuv420p"
    run(['ffmpeg','-hide_banner','-loglevel','error','-y','-loop','1','-framerate',fps,'-i',png,'-vf',vf,'-frames:v',frames,'-an','-c:v','libx264','-pix_fmt','yuv420p','-preset','veryfast','-crf',crf,'-threads',max(1,workers),clip])


def qc_mp4(video:Path, expected_length:float, width:int,height:int)->dict:
    r=run(['ffprobe','-v','error','-print_format','json','-show_format','-show_streams',video]);data=json.loads(r.stdout)
    streams=data['streams'];vid=next((x for x in streams if x['codec_type']=='video'),None);aud=next((x for x in streams if x['codec_type']=='audio'),None)
    dur=float(data['format']['duration']);size=int(data['format']['size'])
    report={'file':str(video),'duration_s':round(dur,3),'size_bytes':size,'video_codec':vid.get('codec_name') if vid else None,'audio_codec':aud.get('codec_name') if aud else None,'dimensions':f"{vid.get('width')}x{vid.get('height')}" if vid else None,'expected_duration_s':round(expected_length,3),'passes':{},'warnings':[]}
    report['passes']={'video_stream':bool(vid),'audio_stream':bool(aud),'h264':bool(vid and vid['codec_name']=='h264'),'aac':bool(aud and aud['codec_name']=='aac'),'resolution':bool(vid and vid['width']==width and vid['height']==height),'duration':abs(dur-expected_length)<=.75,'nonzero_size':size>1000}
    # Audio readback validates this final file has nonzero samples.
    try:
        a=run(['ffmpeg','-hide_banner','-nostats','-i',video,'-map','0:a:0','-af','volumedetect','-f','null','-'])
        m=re.search(r'mean_volume:\s*([\-\d.]+) dB',a.stderr)
        if m:report['audio_mean_dbfs']=float(m.group(1));report['passes']['not_silent']=float(m.group(1)) > -48
        else: report['warnings'].append('Audio level not measured')
    except Exception as e:report['warnings'].append(f"Audio QA unavailable: {e}")
    try:
        r=run(['ffmpeg','-hide_banner','-nostats','-i',video,'-filter_complex','ebur128=peak=true','-f','null','-'])
        matches=re.findall(r'Integrated loudness:\s*I:\s*(-?[\d.]+) LUFS',r.stderr)
        if matches:
            report['integrated_lufs']=float(matches[-1])
            report['passes']['loudness_acceptable']= -21 <= report['integrated_lufs'] <= -12
        else:report['warnings'].append('Integrated loudness not measured')
    except Exception as e:report['warnings'].append(f'Loudness QA unavailable: {e}')
    report['passed']=all(report['passes'].values())
    return report


def build(project:Path, *, output:Path|None=None, voice_override:Path|None=None, preview=False, strict=False, workers=2, subs:Path|None=None)->dict:
    project=Path(project).resolve();manifest=load(project)
    lang=language(manifest['metadata'])
    typography=verify_text_engine(lang)
    v=voice_path(manifest,project,voice_override)
    vdur=ffprobe_duration(v)
    lead=.45;tail=1.25
    timing,total,method=make_timeline(manifest,vdur,lead,tail)
    if strict and (method!='timecoded' or not subs):
        raise ValueError('Strict broadcast mode requires BOTH exact provider scene cues AND a genuine aligned SRT (--subs); never accept estimated captions')
    width,height,fps,crf=(432,768,15,24) if preview else (1080,1920,24,21)
    out=(Path(output).resolve() if output else project.parent/'output'/f"{project.stem}{'_preview' if preview else ''}.mp4")
    out.parent.mkdir(parents=True,exist_ok=True)
    cache=out.parent/f".{project.stem}-{'preview' if preview else 'production'}-cache"
    frames_dir=cache/'frames';clips_dir=cache/'clips';frames_dir.mkdir(parents=True,exist_ok=True);clips_dir.mkdir(exist_ok=True)
    state_file=cache/'state.json'
    try: state=json.loads(state_file.read_text())
    except Exception:state={'hashes':{},'clips':{}}
    framecounts=[];timeline=[dict(t) for t in timing]
    # Use a monotonic integer-frame timeline to prevent cumulative A/V skew.
    edges=[0]
    for t in timing:edges.append(round(t['end']*fps))
    for i in range(len(timing)):framecounts.append(max(1,edges[i+1]-edges[i]))
    calculated_length=edges[-1]/fps
    scene_inputs=[]
    for i,scene in enumerate(manifest['scenes']):
        key=f'{i+1:02d}';png=frames_dir/f'scene_{key}.png';clip=clips_dir/f'clip_{key}.mp4'
        h=digest_scene(scene,manifest['metadata'],width,height)
        if not png.exists() or state['hashes'].get(key)!=h:
            render_scene(scene,manifest['metadata'],i,len(manifest['scenes']),png,width,height)
            state['hashes'][key]=h
        clip_key=f'{h}-{framecounts[i]}-{fps}-{crf}'
        if not clip.exists() or state['clips'].get(key)!=clip_key:
            scene_inputs.append((i,png,clip,framecounts[i],clip_key))
        timeline[i]['visual_start']=round(edges[i]/fps,3)
        timeline[i]['visual_end']=round(edges[i+1]/fps,3)
    # Generate only invalidated clips. Limits ffmpeg encoders, avoiding RAM spikes.
    def do_one(item):
        i,png,clip,framecount,key=item
        video_clip(png,clip,framecount,width,height,fps,crf,workers)
        return f'{i+1:02d}',key
    if scene_inputs:
        with ThreadPoolExecutor(max_workers=max(1,min(2,workers))) as pool:
            for key,h in pool.map(do_one,scene_inputs):state['clips'][key]=h
    state_file.write_text(json.dumps(state,indent=2),encoding='utf-8')
    # Fast concat with stream copy; soundbed never recomputed if same settings.
    listing=cache/'concat.txt'
    listing.write_text(''.join("file '"+str((clips_dir/f"clip_{i+1:02d}.mp4").resolve()).replace("'","'\\''")+"'\n" for i in range(len(timing))),encoding='utf-8')
    visuals=cache/'visuals.mp4'
    # Concat can be rerun quickly; source changes may invalidate output.
    run(['ffmpeg','-hide_banner','-loglevel','error','-y','-f','concat','-safe','0','-i',listing,'-an','-c:v','copy','-movflags','+faststart',visuals])
    bed=cache/'original_soundbed.wav'
    if not bed.exists() or abs(ffprobe_duration(bed)-calculated_length)>.1:
        build_bed(bed,calculated_length)
    srt=out.with_suffix('.srt')
    if subs:
        offset_srt(Path(subs),srt,lead);subtitle_method='provided_aligned_srt'
    else:
        # Captions are approximate unless professional timestamps are supplied separately.
        captions_estimated(timeline,srt);subtitle_method='estimated'
    # Burn subtitles in the safe lower third, no VTT re-parsing at the client.
    escaped=str(srt.resolve()).replace('\\','\\\\').replace(':','\\:').replace("'","\\'").replace(',','\\,')
    # Voice has clear priority: -6dB high-pass cleanup, bed -30dB relative to voice peak.
    # Short fade-out avoids clicks; FFmpeg loudnorm prevents clipped AAC delivery.
    filters=(
        '[1:a]highpass=f=70,lowpass=f=13000,volume=1.25,'+f'adelay={round(lead*1000)}|{round(lead*1000)}[n];'
        '[2:a]volume=0.13[b];[n][b]amix=inputs=2:duration=longest:dropout_transition=0,'
        f'afade=t=out:st={max(0,total-.65):.3f}:d=0.6,'
        'loudnorm=I=-16:TP=-1.5:LRA=10[a]'
    )
    # ASS FontSize is in script-coordinate units (PlayResY=288 for SRT->ASS),
    # not final video pixels: 50 would create ~333 px captions at 1920h.
    vf=f"subtitles=filename='{escaped}':force_style='{ass_subtitle_style(lang)}'"
    run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',visuals,'-i',v,'-i',bed,'-filter_complex',filters,
         '-map','0:v','-map','[a]','-vf',vf,'-t',calculated_length,'-c:v','libx264','-preset','veryfast','-crf',crf,'-r',fps,
         '-pix_fmt','yuv420p','-c:a','aac','-b:a','160k','-ar','48000','-movflags','+faststart',out])
    report=qc_mp4(out,calculated_length,width,height)
    report.update({'rendered_at_utc':datetime.now(timezone.utc).isoformat(),'source_manifest':str(project),'voice_file':str(v),
      'voice_duration_s':vdur,'caption_alignment':subtitle_method,'scene_timing_method':method,'scene_count':len(timing),
      'new_encoded_scenes':len(scene_inputs),'reused_encoded_scenes':len(timing)-len(scene_inputs),'preview':preview,
      'language':lang,'caption_font':subtitle_font(lang),'complex_text_layout_raqm':typography['complex_text_layout_raqm']})
    if subtitle_method=='estimated':report['warnings'].append('Captions and visual scene cuts are based on estimated word allocation; supply real timestamps or aligned SRT for publication')
    qc_path=out.with_name(out.stem+'_QA.json');qc_path.write_text(json.dumps(report,indent=2),encoding='utf-8')
    ledger=out.with_name(out.stem+'_SOURCES.md');ledger.write_text(source_ledger(manifest),encoding='utf-8')
    if not report['passed']:raise RuntimeError(f"Rendered MP4 failed QA: {qc_path}")
    return report