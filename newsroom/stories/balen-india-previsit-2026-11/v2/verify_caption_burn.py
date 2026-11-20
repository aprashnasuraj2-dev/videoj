"""Visual regression guard: detect invisible subtitles in rendered MP4.

A structural ffprobe pass can succeed even when SRT is never drawn. This gate
compares actual exported video frames with known blank illustration boxes.
"""
from __future__ import annotations
import subprocess, tempfile
from pathlib import Path
import numpy as np
from PIL import Image


def inspect_caption_burn(video:Path, pictures:Path)->dict:
    video=Path(video);pictures=Path(pictures)
    samples=[(3.6,1),(15.0,3),(30.6,5),(40.3,6),(52.5,7),(65.9,9),(69.4,9)]
    results=[]
    for t,scene in samples:
        with tempfile.TemporaryDirectory(prefix='subcheck_') as tmp:
            frame=Path(tmp)/'frame.png'
            p=subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-ss',str(t),'-i',str(video),'-frames:v','1',str(frame)],capture_output=True,text=True)
            if p.returncode or not frame.is_file():raise RuntimeError('Failed video-frame caption verification: '+p.stderr[-200:])
            img=np.asarray(Image.open(frame).convert('RGB'),np.int16)
            base=np.asarray(Image.open(pictures/f'scene_{scene:02}.png').convert('RGB'),np.int16)
            assert img.shape==base.shape
            # Subtitle region: x=110..980 / y=1540..1690. Mask texts brighter than card.
            crop=(slice(1540,1700),slice(110,980))
            a=img[crop].mean(2); b=base[crop].mean(2)
            visible=int(np.count_nonzero((a-b>62)&(a>130)))
            results.append({'at_second':t,'scene':scene,'bright_subtitle_pixels':visible,'passed':visible>300})
    return {'passed':all(x['passed'] for x in results),'samples':results}


if __name__=='__main__':
 import json
 r=Path(__file__).parent
 o=inspect_caption_burn(r/'output/Balen_India_Three_Doors_NEURAL_VOICE_CORRECTED.mp4',r/'output/illustrations')
 print(json.dumps(o,indent=2))
 if not o['passed']:raise SystemExit(2)