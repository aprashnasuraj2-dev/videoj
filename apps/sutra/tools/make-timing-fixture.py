"""Generate a silent, synthetic timing fixture. Not an instructional film or submission video."""
from pathlib import Path
import subprocess,json,hashlib
root=Path(__file__).resolve().parents[1]/'public/media';root.mkdir(parents=True,exist_ok=True)
media=root/'timing-fixture.mp4'
subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-f','lavfi','-i','color=c=0x183e3d:s=640x360:r=10:d=8','-vf',"drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:text='SYNTHETIC TIMING FIXTURE':fontcolor=white:fontsize=24:x=(w-tw)/2:y=(h-th)/2",'-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart','-an',str(media)],check=True)
text='Synthetic timing marker. This is not a training instruction.'
cues=[dict(id='timing-marker',start=2,end=4,text=text)]
canonical=json.dumps(cues,sort_keys=True,separators=(',',':')).encode()
source=dict(id='synthetic-timing-fixture',version='v1',hash=hashlib.sha256(canonical).hexdigest(),mediaHash=hashlib.sha256(media.read_bytes()).hexdigest(),duration=8,cues=cues)
receipt=dict(version=1,sourceId=source['id'],sourceVersion=source['version'],sourceHash=source['hash'],mediaHash=source['mediaHash'],cueId='timing-marker',start=2,end=4,excerpt=text,retrievedAt='2026-11-23T00:00:00Z',verification='unverified')
(root/'timing-source.json').write_text(json.dumps({'source':source,'receipt':receipt},indent=2)+'\n')
metadata=root.parents[1]/'src/fixtures';metadata.mkdir(parents=True,exist_ok=True)
(metadata/'timing-source.json').write_text(json.dumps({'source':source,'receipt':receipt},indent=2)+'\n')
(root/'timing-chapters.vtt').write_text('WEBVTT\n\n00:00.000 --> 00:02.000\nSynthetic start\n\n00:02.000 --> 00:04.000\nTiming marker\n\n00:04.000 --> 00:08.000\nSynthetic end\n')
(root/'timing-captions.vtt').write_text('WEBVTT\n\n00:00.000 --> 00:08.000\nSilent synthetic timing fixture. Not a training lesson.\n')
print('Generated',media.stat().st_size,'bytes; SHA-256',source['mediaHash'])
