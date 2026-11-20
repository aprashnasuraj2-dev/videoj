"""Accessible, independent editorial graphics drawn as reproducible images."""
from __future__ import annotations
import hashlib
import math
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont

PALETTE = {
    'bg0': (7, 19, 29), 'bg1': (10, 43, 53), 'white': (244,246,243),
    'muted':(175,196,205), 'aqua':(88,218,197), 'gold':(239,180,106),
    'red':(240,126,118), 'line':(65,108,118), 'card':(21,49,60)
}
FONT_BOLD = ["/usr/share/fonts/truetype/lato/Lato-Heavy.ttf","/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"]
FONT_REG = ["/usr/share/fonts/truetype/lato/Lato-Regular.ttf","/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"]


def font(size, bold=False):
    for p in (FONT_BOLD if bold else FONT_REG):
        if Path(p).exists():
            return ImageFont.truetype(p, size)
    return ImageFont.load_default(size=size)


def textwrap_pixels(draw, content, maxw, size, bold=False, maxlines=5):
    f=font(size,bold)
    lines=[]
    for paragraph in str(content).split('\n'):
        words=paragraph.split(); line=''
        for word in words:
            n=(line+' '+word).strip()
            if line and draw.textlength(n,font=f)>maxw:
                lines.append(line);line=word
            else:line=n
        if line:lines.append(line)
    if len(lines)>maxlines:
        raise ValueError(f"Text too long for graphic ({maxlines} lines at {size}px): {content[:90]}")
    return lines


def base_background(w,h,seed):
    # Retains deterministic look while avoiding external media licences.
    rng=np.random.default_rng(seed)
    y=np.linspace(0,1,h,dtype=np.float32)[:,None,None]
    x=np.linspace(0,1,w,dtype=np.float32)[None,:,None]
    a=np.asarray(PALETTE['bg0'],np.float32)[None,None,:]*(1-y)+np.asarray(PALETTE['bg1'],np.float32)[None,None,:]*y
    a=np.broadcast_to(a,(h,w,3)).copy()
    halo=np.exp(-(((x-.83)/.3)**2+((y-.24)/.3)**2))
    a+=halo*np.array([9,26,27],np.float32)[None,None,:]
    # Coarse grain at preview scale, ~1% added texture.
    noise=rng.normal(0,1.1,(h,w,1))
    a=np.uint8(np.clip(a+noise,0,255))
    return Image.fromarray(a,'RGB')


def render_scene(scene, meta, ix, total, out:Path, w=1080,h=1920):
    out=Path(out); out.parent.mkdir(parents=True,exist_ok=True)
    scale=w/1080
    P=lambda z:round(z*scale)
    im=base_background(w,h,seed=5000+ix*31)
    dr=ImageDraw.Draw(im)
    c=PALETTE
    L=P(64);R=w-L
    def write(x,y,s,sz,col='white',bold=False,anchor=None):
        dr.text((P(x),P(y)),str(s),font=font(P(sz),bold),fill=c.get(col,col),anchor=anchor)
    def ruled(y,color='line'):dr.line((L,P(y),R,P(y)),fill=c.get(color,color),width=max(1,P(2)))
    def multiline(x,y,s,sz,col='white',maxlines=5,spacing=1.18,bold=False):
        lines=textwrap_pixels(dr,s,P(945),P(sz),bold,maxlines)
        for t in lines:
            write(x,y,t,sz,col,bold)
            y+=round(sz*spacing)
        return y
    # Edge-safe layout: video title remains above subtitle safe area.
    write(65,56,meta['publisher'].upper(),26,'white',True)
    write(65,99,'INDEPENDENT NEWS ANALYSIS',20,'muted')
    write(1010,61,meta['as_of'],20,'muted',anchor='ra')
    ruled(155)
    dr.rectangle((L,P(227),L+P(13),P(256)), fill=c['aqua'])
    write(99,222,scene.get('eyebrow',scene['layout']).upper(),25,'aqua',True)
    # Title auto-fits to region; long headlines are not silently cropped.
    title=scene['headline'].upper()
    title_font=122 if len(title)<=25 else 100 if len(title)<=40 else 78
    y=multiline(65,330,title,title_font,'white',maxlines=4,spacing=1.06,bold=True)
    y=max(y+50,700)
    layout=scene['layout']
    main=scene.get('value','')
    if layout in {'cover','stat','closing'}:
        if main:
            vsize=182 if len(main)<=8 else 126 if len(main)<=14 else 90
            multiline(65,y,str(main),vsize,'gold',maxlines=2,spacing=1.08,bold=True)
        if scene.get('detail'):
            multiline(69,1250,str(scene['detail']),41,'muted',maxlines=4,spacing=1.25)
        if layout=='cover':
            for k in range(5):
                radius=P(160+37*k);cx=P(835);cy=P(1088)
                dr.arc((cx-radius,cy-radius,cx+radius,cy+radius),start=180+k*9,end=320+k*9,fill=c['aqua'],width=max(2,P(3)))
    elif layout=='bars':
        bars=scene['bars']; vals=[float(a['value']) for a in bars];lo=min(0,min(vals));hi=max(vals) or 1
        yy=round(max(720,y))
        for b in bars[:5]:
            val=float(b['value']);label=str(b['label'])[:32]
            write(68,yy,label.upper(),31,'muted',True)
            write(1000,yy,str(b.get('display',val)),37,'white',True,anchor='ra')
            ww=int(P(910)*abs(val)/(hi-lo if hi>lo else 1))
            dr.rounded_rectangle((P(66),P(yy+70),P(995),P(yy+109)),radius=P(12),fill=c['card'])
            if ww>0:dr.rounded_rectangle((P(66),P(yy+70),P(66)+max(P(4),ww),P(yy+109)),radius=P(12),fill=c['aqua'])
            yy+=163
    elif layout=='compare':
        for k,key in enumerate(['left','right']):
            block=scene[key]
            yy=round(max(700,y))+k*315
            dr.rounded_rectangle((P(62),P(yy),P(1015),P(yy+270)),radius=P(24),fill=c['card'],outline=c['line'],width=max(1,P(2)))
            write(92,yy+28,block.get('label',key).upper(),29,'aqua' if k==0 else 'red',True)
            multiline(93,yy+92,block.get('body',''),38,'white',maxlines=3)
    else:
        if scene.get('detail'):
            multiline(69,round(max(790,y)),scene['detail'],51,'muted',maxlines=6,spacing=1.27)
        for k in range(5):
            cy=P(930+k*85);ww=P(55+125*k)
            dr.rounded_rectangle((P(900)-ww,cy,P(900),cy+P(28)),radius=P(7),fill=c['aqua'] if k<3 else c['gold'])
    # Captions use region ~1550–1770 (generated during final mux); protect it.
    ruled(1510)
    foot=' • '.join(scene.get('source_ids',[])[:3]) or 'INDEPENDENT ANALYSIS'
    write(66,1535,foot.upper(),19,'muted')
    ruled(1835)
    write(65,1850,f"{meta['publisher'].upper()}  •  AI-ASSISTED EDITORIAL",17,'muted')
    write(1008,1850,f"{ix+1:02d} / {total:02d}",19,'muted',anchor='ra')
    im.save(out,optimize=True)
    return out