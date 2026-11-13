"""Original code-generated 64-second film. No third-party imagery/music.
Requires Pillow, numpy and ffmpeg. Output is committed for reproducible web use.
"""
from pathlib import Path
import math, subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFont

out=Path('apps/preview/public/media');out.mkdir(parents=True,exist_ok=True)
tmp=Path('tmp/film');tmp.mkdir(parents=True,exist_ok=True)
W,H=1280,720
font='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
palettes=[('#E8BC87','#BD5942','#443D40'),('#D1BFA2','#9E7663','#344C4A'),('#ABABB7','#6B717A','#232A38'),('#E6C7A4','#BC7153','#66505A')]
names=['A thread of light','The shape of quiet','Where shadows gather','Coming home']
def rgb(h):return np.array([int(h[i:i+2],16) for i in (1,3,5)])
for scene,(top,bottom,ink) in enumerate(palettes):
 y=np.linspace(0,1,H)[:,None,None];a=rgb(top);b=rgb(bottom)
 arr=np.broadcast_to((a[None,None,:]*(1-y)+b[None,None,:]*y),(H,W,3)).copy()
 rng=np.random.default_rng(41+scene)
 arr+=rng.normal(0,1.4,(H,W,1));im=Image.fromarray(np.uint8(np.clip(arr,0,255))).convert('RGB');d=ImageDraw.Draw(im)
 # Original contour landscape, drawn as closely spaced threads.
 cx=900 if scene%2==0 else 310;cy=210
 d.ellipse((cx-75,cy-75,cx+75,cy+75),fill='#F2DFC0')
 for strand in range(112):
  base=350+strand*5
  pts=[]
  for x in range(-10,W+12,5):
   ridge=75*math.sin(x/340+scene*.8)+38*math.sin(x/130+scene)+12*math.cos(x/60+strand*.012)
   yy=base+ridge*math.exp(-strand/140)
   pts.append((x,int(yy)))
  mix=strand/112;col=tuple(int(v) for v in rgb(ink)*(1-mix*.24)+rgb(bottom)*mix*.24)
  d.line(pts,fill=col,width=3)
 # Delicate warp, not copied textile motifs.
 for x in range(0,W,7):
  d.line((x,0,x,H),fill=tuple(int(v) for v in rgb(top)*.55+rgb(ink)*.45),width=1)
 # Lines disappear behind an untextured title plate.
 d.rounded_rectangle((54,52,475,145),radius=3,fill='#171918')
 d.text((76,71),f'STUDIES IN THREAD  /  {scene+1:02}',font=ImageFont.truetype(font,14),fill='#E9CDAA')
 d.text((76,103),names[scene],font=ImageFont.truetype(font,22),fill='#F4EBDD')
 im.save(tmp/f'scene-{scene}.png')
 subprocess.run(['ffmpeg','-y','-loglevel','error','-loop','1','-i',str(tmp/f'scene-{scene}.png'),'-vf',"zoompan=z='1+0.00006*on':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=384:s=1280x720:fps=24",'-t','16','-c:v','libx264','-preset','fast','-crf','24','-pix_fmt','yuv420p',str(tmp/f'part-{scene}.mp4')],check=True)
 # First chapter is the truthful poster frame.
 if scene==0:im.save(out/'poster.webp',quality=88)
(tmp/'concat.txt').write_text('\n'.join(f"file 'part-{i}.mp4'" for i in range(4)))
subprocess.run(['ffmpeg','-y','-loglevel','error','-f','concat','-safe','0','-i',str(tmp/'concat.txt'),'-f','lavfi','-i','sine=frequency=174:sample_rate=44100:duration=64','-filter:a','volume=0.04,afade=t=in:d=3,afade=t=out:st=59:d=5','-c:v','copy','-c:a','aac','-b:a','64k','-shortest','-movflags','+faststart',str(out/'studies-in-thread.mp4')],check=True)
print('Created original film:',out/'studies-in-thread.mp4')
