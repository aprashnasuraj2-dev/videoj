"""Original cinema-grade illustration overlays for The Signal / 2026 Balen-India news explainer.
No fake documentary footage; visualizations are labelled schematic and sourced."""
from __future__ import annotations
import json, math, os, sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
repo_path=Path(__file__).resolve().parents[4]
sys.path.insert(0, str(repo_path if (repo_path/'newsroom').is_dir() else Path('/mnt/data/newsroom-engine')))
from newsroom.graphics import draw_rich, measure_rich, textwrap_pixels, font
from newsroom.i18n import font_path

ROOT=Path(__file__).parent
obj=json.loads((ROOT/'story.json').read_text())
OUT=ROOT/'output/illustrations';OUT.mkdir(parents=True,exist_ok=True)
W,H=1080,1920
C={'bg':(6,13,22),'blue':(12,32,42),'blue2':(13,57,70),'gold':(247,189,105),'mint':(67,219,182),'white':(245,247,245),'muted':(161,185,192),'red':(249,128,110),'line':(60,94,104)}

def txt(d,x,y,text,sz=38,color='white',bold=False,anchor=None):
 draw_rich(d,x,y,str(text),sz,C.get(color,color),bold,anchor)

def rounded(d,xy,fill,rad=22,outline=None,w=2):
 d.rounded_rectangle(xy,rad,fill=fill,outline=outline,width=w)

def line(d,pts,fill='mint',width=4,joint='curve'):
 d.line(pts,fill=C.get(fill,fill),width=width,joint=joint)

def base(i):
 # Fine blue-black gradient, large lighting gradient, restrained 35mm grain
 rng=np.random.default_rng(300+i*137)
 y=np.linspace(0,1,H,dtype=np.float32)[:,None]
 x=np.linspace(0,1,W,dtype=np.float32)[None,:]
 halo=np.exp(-((x-.72)**2/.26+(y-.44)**2/.08))
 vert=np.clip(y,0,1)
 a=np.zeros((H,W,3),dtype=np.float32)
 colors0=np.array(C['bg']);colors1=np.array(C['blue'])
 for k in range(3):a[:,:,k]=colors0[k]*(1-vert)+colors1[k]*vert +halo*[11,25,29][k]
 a+=rng.normal(0,.9,(H,W,1))
 im=Image.fromarray(np.uint8(np.clip(a,0,255)),'RGB');return im

def glow(im,rect,color='mint',r=35):
 layer=Image.new('RGBA',(W,H),(0,0,0,0));d=ImageDraw.Draw(layer)
 col=C.get(color,color)
 d.rounded_rectangle(rect,22,fill=(*col,56))
 layer=layer.filter(ImageFilter.GaussianBlur(r));im.paste(layer,(0,0),layer)

def draw_top(d,scene,idx):
 # English wordmark is intentionally editorial original branding, not an existing publisher
 txt(d,56,44,'THE SIGNAL',31,'white',True)
 line(d,(56,103,1024,103),'line',2)
 txt(d,56,124,'विशेष विश्लेषण  /  २० नोभेम्बर २०२६',29,'muted')
 txt(d,1022,51,f'0{idx+1} / 09',25,'mint',anchor='ra')
 txt(d,56,211,scene['eyebrow'],32,'mint',True)
 # headlines text wrapped to 3 lines
 title=scene['headline'];fontsize=75 if len(title)<27 else 67
 lines=textwrap_pixels(d,title,943,fontsize,True,maxlines=3,nepali=True)
 for k,s in enumerate(lines):txt(d,56,288+k*112,s,fontsize,'white',True)
 line(d,(56,1431,1024,1431),'line',2)
 rounded(d,(56,1465,1024,1735),fill=(17,40,52),rad=25,outline=(42,83,89),w=2)
 # subtitles burned into this area later
 txt(d,76,1761,'२० नोभेम्बर २०२६ सम्मका तथ्य  /  स्रोत संलग्न',25,'muted')
 line(d,(56,1810,1024,1810),'line',2)
 txt(d,58,1833,'THE SIGNAL  /  दाबी होइन, प्रमाण',23,'muted')
 txt(d,1022,1833,'३ ढोका, १ परीक्षा',23,'gold',anchor='ra')

def door_scene(im,d):
 txt(d,80,675,'एक भ्रमण  •  तीन संरचनागत प्रश्न',33,'muted')
 for j,(name,tag,col) in enumerate([('बजार','विद्युत्','mint'),('आकाश','उडान','gold'),('वित्त','सहायता','red')]):
  xx=73+j*320;yy=780
  glow(im,(xx,yy,xx+290,yy+520),col,28)
  d.rounded_rectangle((xx,yy,xx+290,yy+520),radius=22,fill=(15,37,47),outline=C[col],width=5)
  d.rounded_rectangle((xx+23,yy+24,xx+267,yy+487),radius=11,outline=(45,84,93),width=3)
  d.ellipse((xx+218,yy+246,xx+247,yy+275),fill=C[col])
  txt(d,xx+36,yy+325,name,53,'white',True)
  txt(d,xx+36,yy+397,tag,30,'muted')

def calendar(im,d):
 glow(im,(235,726,851,1258),'gold',45)
 d.rounded_rectangle((260,745,830,1265),radius=35,fill=(18,42,52),outline=C['gold'],width=5)
 rounded(d,(260,744,830,875),fill=C['gold'],rad=31)
 txt(d,317,786,'NOV 2026',46,C['bg'],True)
 txt(d,343,922,'22',169,'white',True)
 txt(d,603,922,'23',169,'white',True)
 line(d,(543,939,543,1160),'line',3)
 txt(d,311,1148,'आइत',31,'muted');txt(d,602,1148,'सोम',31,'muted')
 txt(d,90,1327,'भ्रमण तय  ≠  परिणाम प्राप्त',44,'red',True)

def grid_lines(d,y0=925):
 for j in range(6):
  x=110+j*160
  line(d,(x,y0+70,x+70,y0-160), 'line',3)
  line(d,(x+70,y0-160,x+140,y0+70),'line',3)
  line(d,(x+25,y0-10,x+115,y0-10),'line',2)
  for k in range(3):d.ellipse((x+60,y0-160+k*70,x+78,y0-142+k*70),fill=C['mint'])

def target(im,d):
 txt(d,69,720,'दस वर्षको निर्यात लक्ष्य',42,'muted')
 glow(im,(115,816,967,1134),'mint',52)
 txt(d,74,843,'10,000',182,'gold',True)
 txt(d,776,1014,'MW',71,'mint',True)
 line(d,(85,1159,981,1159),'line',3)
 grid_lines(d,1293)
 txt(d,77,1371,'लक्ष्य हो, भएको बिक्री होइन',34,'muted')

def capacity(im,d):
 txt(d,78,721,'सीमापार प्रसारण क्षमता बढाउने सहमति',36,'muted')
 x0,y0,x1,y1=85,883,970,1014
 rounded(d,(x0,y0,x1,y1),fill=(23,51,61),rad=23)
 rounded(d,(x0,y0,x0+583,y1),fill=C['mint'],rad=23)
 txt(d,98,917,'1,100',70,C['bg'],True)
 txt(d,707,917,'1,650',63,'white',True)
 txt(d,102,1077,'पहिले',35,'muted')
 txt(d,670,1077,'सहमतिमा',35,'gold',True)
 txt(d,82,1224,'+ ५५० MW',95,'gold',True)
 txt(d,79,1346,'क्षमता र बिक्री फरक हुन्',38,'red',True)

def approvals(im,d):
 for j,(headline,amt,label,co) in enumerate([('स्वीकृत','615.02 MW','भारतमा थप निर्यात अनुमति','mint'),('बाँकी','+20 MW','बंगलादेशमा थप निर्यात अनुमति','red')]):
  y=690+j*318
  glow(im,(65,y,1016,y+255),co,27)
  rounded(d,(65,y,1016,y+268),fill=(18,42,52),rad=26,outline=C[co],w=3)
  txt(d,93,y+29,headline,46,co,True)
  txt(d,360,y+20,amt,85,'white',True)
  txt(d,93,y+161,label,35,'muted')
 txt(d,88,1377,'एकतर्फ स्वीकृति, अर्कोतर्फ प्रतीक्षा।',33,'gold',True)

def runway(im,d):
 cx=540
 d.polygon([(cx-100,1430),(cx+100,1430),(cx+24,814),(cx-24,814)],fill=(21,45,56))
 line(d,(cx-95,1425,cx-22,824),'gold',4);line(d,(cx+95,1425,cx+22,824),'gold',4)
 for k in range(8):
  y=870+k**1.42*43
  width=2+k*1.5
  line(d,(cx,y,cx,y+14+width),'white',int(2+width))
 # air access concept line
 pts=[(178,1066),(260,985),(349,933),(430,889),(510,856)]
 for a,b in zip(pts[::2],pts[1::2]):line(d,(*a,*b),'mint',8)
 d.ellipse((492,837,536,881),fill=C['red'])
 txt(d,94,724,'भैरहवाको हवाई प्रवेशमार्ग',46,'muted')
 txt(d,96,1275,'थप प्रवेशमार्गको माग',43,'white',True)
 txt(d,96,1341,'निर्णय अझै बाँकी',32,'red',True)

def finance(im,d):
 txt(d,79,705,'वित्तीय सहयोगका सर्त',41,'muted')
 line(d,(540,795,540,1264),'gold',8)
 line(d,(257,875,830,875),'gold',9)
 d.polygon([(507,784),(574,784),(540,740)],fill=C['gold'])
 d.polygon([(470,1285),(610,1285),(540,1197)],fill=C['gold'])
 for x,lbl,col in [(273,'अनुदान','mint'),(785,'ऋण','red')]:
  line(d,(x,875,x,1036),'line',5)
  d.polygon([(x-150,1040),(x+150,1040),(x+103,1130),(x-100,1130)],fill=C[col])
  txt(d,x,1142,lbl,57,'white',True,anchor='ma')
 txt(d,77,1325,'सर्त  •  ब्याज  •  किस्ता  •  समयसीमा',34,'muted')

def both(im,d):
 left=(77,714,521,1301);right=(559,714,1003,1301)
 glow(im,left,'mint',28);glow(im,right,'gold',28)
 rounded(d,left,(15,53,58),rad=26,outline=C['mint'],w=3)
 rounded(d,right,(61,39,31),rad=26,outline=C['gold'],w=3)
 txt(d,132,757,'सहयोग',62,'mint',True)
 txt(d,598,757,'सीमा',62,'gold',True)
 for y in [936,1030,1124]:
  d.ellipse((164,y,189,y+25),fill=C['mint']);line(d,(213,y+11,440,y+11),'mint',5)
  d.ellipse((672,y,697,y+25),outline=C['gold'],width=4);line(d,(722,y+11,951,y+11),'gold',5)
 txt(d,90,1336,'सहयोग छ, तर सबै निर्णय भइसकेका छैनन्।',30,'white',True)

def closing(im,d):
 labels=['बजार पहुँचमा नयाँ अनुमति?','हवाई प्रवेशमार्गमा निर्णय?','कार्यान्वयनको निश्चित मिति?']
 for j,s in enumerate(labels):
  y=706+j*191
  rounded(d,(80,y,1004,y+150),fill=(21,46,57),rad=24,outline=C['line'],w=3)
  d.rounded_rectangle((114,y+48,169,y+103),radius=12,outline=C['gold'],width=5)
  txt(d,195,y+47,s,40,'white',True)
 txt(d,110,1325,'अनुमतिको निर्भरता कति घट्यो?',46,'gold',True)

def draw_one(scene,i):
 im=base(i);d=ImageDraw.Draw(im)
 draw_top(d,scene,i)
 [door_scene,calendar,target,capacity,approvals,runway,finance,both,closing][i](im,d)
 # Adobe-like slim lower accent representing work in progress and editorial context
 p=OUT/f'scene_{i+1:02}.png';im.save(p,optimize=True)
 return str(p)

if __name__=='__main__':
 for i,sc in enumerate(obj['scenes']):print(draw_one(sc,i),flush=True)