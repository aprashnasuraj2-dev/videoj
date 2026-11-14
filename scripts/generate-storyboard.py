#!/usr/bin/env python3
"""Extract real timestamped video frames into a compact WebVTT sprite.

No frames are fabricated. Cue boundaries derive from ffprobe's encoded duration.
FFmpeg fps sampling picks the frame at or immediately after each second.
"""
import argparse, json, math, subprocess
from pathlib import Path

def main():
    p=argparse.ArgumentParser()
    p.add_argument('source')
    p.add_argument('--out',default=None)
    p.add_argument('--period',type=float,default=1.0)
    p.add_argument('--columns',type=int,default=8)
    a=p.parse_args()
    src=Path(a.source)
    out=Path(a.out or src.parent);out.mkdir(parents=True,exist_ok=True)
    probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','json',str(src)]))
    duration=float(probe['format']['duration'])
    if not math.isfinite(duration) or duration<=0:raise ValueError('Invalid encoded duration')
    count=math.ceil(duration/a.period)
    if count>1200:raise ValueError('Storyboard bound exceeded')
    cols=a.columns;rows=math.ceil(count/cols)
    name=src.stem+'-storyboard'
    image=out/(name+'.jpg')
    track=out/(name+'.vtt')
    fps=1/a.period
    filt=f'fps={fps:.8f},scale=160:90:flags=lanczos,tile={cols}x{rows}'
    subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(src),'-vf',filt,'-frames:v','1','-q:v','3',str(image)],check=True)
    def vtt(t):
        h=int(t//3600);m=int(t//60)%60;s=int(t)%60;ms=int(round((t-int(t))*1000))
        if ms==1000:s+=1;ms=0
        return f'{h:02}:{m:02}:{s:02}.{ms:03}'
    lines=['WEBVTT','']
    for i in range(count):
        st=i*a.period;end=min(duration,(i+1)*a.period)
        col=i%cols;row=i//cols
        lines.extend([f'{vtt(st)} --> {vtt(end)}',f'{image.name}#xywh={160*col},{90*row},160,90',''])
    track.write_text('\n'.join(lines))
    print(json.dumps({'source':str(src),'duration':duration,'frames':count,'size':[cols*160,rows*90],'storyboard':str(image),'vtt':str(track)}))
if __name__=='__main__':main()