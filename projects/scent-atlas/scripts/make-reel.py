"""A 27 second silent, captioned motion storyboard using authentic UI captures."""
from PIL import Image,ImageDraw,ImageFont,ImageEnhance
from pathlib import Path
import subprocess
root=Path(__file__).resolve().parents[1];out=root/'portfolio';tmp=out/'.frames';tmp.mkdir(exist_ok=True)
shots=[
 ('COVER-1600x1200.png','A SCENT BEGINS SOMEWHERE','A perfume store for people who cannot smell the screen.',None),
 ('../docs/landing-1440.png','CHOOSE A PLACE YOU ALREADY KNOW','Rain on pavement. A cedar workshop. Fresh orange peel.',(0,150,1440,970)),
 ('../docs/rain-1440.png','FOLLOW THE FEELING','From what opens first, to what follows, to what lingers.',(0,0,1440,870)),
 ('../docs/compare-1440.png','SIX SCENTS. PLAIN WORDS.','A genuine comparison, not invented precision.',(0,0,1440,890)),
 ('../docs/cedar-1440.png','DISCOVER A SECOND MEMORY','The familiar, intimate smell of newly worked wood.',(0,0,1440,880)),
 ('../docs/kit-1440.png','ONE LEAD. TWO CONTRASTS.','Three imagined 2 mL vials with a reason to try each.',(0,0,1440,920)),
 ('../docs/complete-1440.png','DEMO COMPLETE. NO ORDER PLACED.','Just a place to imagine. A kit to understand.',(0,0,1440,900)),
]
serif='/usr/share/fonts/truetype/noto/NotoSerif-Regular.ttf';sans='/usr/share/fonts/opentype/inter/Inter-Regular.otf';bold='/usr/share/fonts/opentype/inter/Inter-SemiBold.otf'
W,H=1600,900
for idx,(file,title,desc,crop) in enumerate(shots):
    p=out/file;source=Image.open(p).convert('RGB')
    if crop:source=source.crop(crop)
    ratio=max(W/source.width,(H-156)/source.height);source=source.resize((round(source.width*ratio),round(source.height*ratio)),Image.Resampling.LANCZOS)
    startx=(source.width-W)//2;starty=(source.height-(H-156))//2
    canvas=source.crop((startx,starty,startx+W,starty+H-156))
    frame=Image.new('RGB',(W,H),'#1c271f');frame.paste(canvas,(0,0))
    d=ImageDraw.Draw(frame);d.rectangle((0,H-157,W,H),fill='#1c271f')
    d.line((66,H-151,W-66,H-151),fill='#c0b48a',width=2)
    d.text((68,H-132),f'{idx+1:02}  /  SCENT ATLAS',font=ImageFont.truetype(bold,20),fill='#d2b88c')
    d.text((380,H-133),title,font=ImageFont.truetype(serif,37),fill='#f8f2e5')
    d.text((381,H-73),desc,font=ImageFont.truetype(sans,21),fill='#c1c9bb')
    frame.save(tmp/f'frame-{idx:02d}.png',optimize=True)
# Seven captioned stills with brief dark dissolves; exactly 27 seconds, no audio.
segments=[]
for idx in range(len(shots)):
    duration=3 if idx==6 else 4
    dest=tmp/f'segment-{idx:02d}.mp4'
    subprocess.run(['ffmpeg','-y','-hide_banner','-loglevel','error','-loop','1','-framerate','30','-t',str(duration),'-i',str(tmp/f'frame-{idx:02d}.png'),'-vf',f'fps=30,fade=t=in:st=0:d=0.25,fade=t=out:st={duration-0.25}:d=0.25','-an','-c:v','libx264','-preset','veryfast','-crf','26','-pix_fmt','yuv420p','-movflags','+faststart',str(dest)],check=True,timeout=60)
    segments.append(dest)
concat=tmp/'segments.txt'
concat.write_text(''.join("file '"+str(x)+"'\n" for x in segments))
subprocess.run(['ffmpeg','-y','-hide_banner','-loglevel','error','-f','concat','-safe','0','-i',str(concat),'-c','copy','-movflags','+faststart',str(out/'SCENT-ATLAS-27s-REEL.mp4')],check=True,timeout=60)
print('Wrote',out/'SCENT-ATLAS-27s-REEL.mp4',(out/'SCENT-ATLAS-27s-REEL.mp4').stat().st_size,'bytes')
