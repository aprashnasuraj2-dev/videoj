"""Accessible, independent editorial graphics drawn as reproducible images."""
from __future__ import annotations
import hashlib
import math
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import regex
from .i18n import font_path, language, is_nepali, has_devanagari, verify_text_engine

PALETTE = {
    'bg0': (7, 19, 29), 'bg1': (10, 43, 53), 'white': (244,246,243),
    'muted':(175,196,205), 'aqua':(88,218,197), 'gold':(239,180,106),
    'red':(240,126,118), 'line':(65,108,118), 'card':(21,49,60)
}
def font(size, bold=False, nepali=False):
    return ImageFont.truetype(font_path(nepali=nepali,bold=bold), max(8, round(size)))


def glyph_runs(content: str):
    """Group Unicode graphemes by script, keeping punctuation with the active run.

    Pillow does not automatically fall back fonts inside one draw call. Latin
    digits, USD signs, ticker symbols and Nepali sentences need separate fonts.
    """
    chunks=[];run='';script=None
    for cluster in regex.findall(r'\X',str(content)):
        # Neutral punctuation joins previous run; glyph fonts can display it.
        current = 'dev' if has_devanagari(cluster) else 'lat' if cluster.strip() and any(ch.isascii() and ch.isalnum() or ch in '$€£×%' for ch in cluster) else script or 'lat'
        if run and script!=current:
            chunks.append((run,script));run=cluster
        else:run+=cluster
        script=current
    if run: chunks.append((run,script or 'lat'))
    return chunks


def measure_rich(draw,content,size,bold=False):
    return sum(draw.textlength(run,font=font(size,bold,nepali=(script=='dev')))
               for run,script in glyph_runs(str(content)))


def draw_rich(draw,x,y,content,size,fill,bold=False,anchor=None):
    """Render mixed Nepali + Latin without to-fu boxes or broken conjuncts."""
    runs=glyph_runs(str(content))
    widths=[draw.textlength(run,font=font(size,bold,nepali=script=='dev'))
            for run,script in runs]
    if anchor in {'ra','rt','rm'}: x-=sum(widths)
    elif anchor in {'ma','mm','mt'}: x-=sum(widths)/2
    for (run,script),w in zip(runs,widths):
        draw.text((round(x),round(y)),run,font=font(size,bold,nepali=script=='dev'),
                  fill=fill,anchor='lt')
        x+=w


def textwrap_pixels(draw, content, maxw, size, bold=False, maxlines=5, nepali=False):
    """Width-measured Unicode wrap without slicing conjuncts or vowel marks.

    Pillow must use RAQM for Nepali. regex \\X splits only at grapheme cluster
    boundaries when exceptionally long unspaced terms exceed the region.
    """
    lines=[]
    def append_token(token):
        if measure_rich(draw,token,size,bold) <= maxw:
            return [token]
        parts=[]; part=''
        for cluster in regex.findall(r"\X",token):
            next_part=part+cluster
            if part and measure_rich(draw,next_part,size,bold)>maxw:
                parts.append(part);part=cluster
            else:part=next_part
        if part: parts.append(part)
        if any(measure_rich(draw,z,size,bold)>maxw for z in parts):
            raise ValueError('Single Unicode grapheme exceeds text region; reduce font or change layout')
        return parts
    for paragraph in str(content).split('\n'):
        words=paragraph.split();line=''
        for word in words:
            for subword in append_token(word):
                candidate=(line+' '+subword).strip()
                if line and measure_rich(draw,candidate,size,bold)>maxw:
                    lines.append(line);line=subword
                else:line=candidate
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
    lang=language(meta);nepali=is_nepali(meta)
    if nepali:verify_text_engine(lang)
    L=P(64);R=w-L
    def write(x,y,s,sz,col='white',bold=False,anchor=None):
        draw_rich(dr,P(x),P(y),s,P(sz),c.get(col,col),bold,anchor)
    def ruled(y,color='line'):dr.line((L,P(y),R,P(y)),fill=c.get(color,color),width=max(1,P(2)))
    def multiline(x,y,s,sz,col='white',maxlines=5,spacing=1.18,bold=False,max_width=945):
        is_ne=nepali or has_devanagari(s)
        lines=textwrap_pixels(dr,s,P(max_width),P(sz),bold,maxlines,nepali=is_ne)
        lineheight=max(spacing,1.37 if is_ne else 1.18)
        for t in lines:
            write(x,y,t,sz,col,bold)
            y+=round(sz*lineheight)
        return y
    def fit_multiline(x,y,s,max_sz,min_sz,max_end_y,maxlines=4,**kwargs):
        for sz in range(max_sz,min_sz-1,-3):
            try:
                lines=textwrap_pixels(dr,s,P(kwargs.get('max_width',945)),P(sz),kwargs.get('bold',False),maxlines,nepali=nepali or has_devanagari(s))
            except ValueError:
                continue
            leading=max(kwargs.get('spacing',1.18),1.37 if nepali or has_devanagari(s) else 1.18)
            if y+len(lines)*sz*leading<=max_end_y:
                return multiline(x,y,s,sz,maxlines=maxlines,**kwargs)
        raise ValueError(f'Headline cannot fit without clipping: {str(s)[:75]}')
    # Edge-safe layout: video title remains above subtitle safe area.
    write(65,56,meta['publisher'].upper(),26,'white',True)
    write(65,99,'स्वतन्त्र समाचार विश्लेषण' if nepali else 'INDEPENDENT NEWS ANALYSIS',20,'muted')
    write(1010,61,meta['as_of'],20,'muted',anchor='ra')
    ruled(155)
    dr.rectangle((L,P(227),L+P(13),P(256)), fill=c['aqua'])
    eyebrow=str(scene.get('eyebrow',scene['layout']))
    write(99,222,eyebrow if nepali else eyebrow.upper(),25,'aqua',True)
    # Title auto-fits to region; long headlines are not silently cropped.
    title=str(scene['headline']) if nepali else str(scene['headline']).upper()
    title_font=(104 if len(title)<=28 else 90) if nepali else (122 if len(title)<=25 else 100 if len(title)<=40 else 78)
    y=fit_multiline(65,310 if nepali else 330,title,title_font,52,710,
                    col='white',maxlines=4,spacing=1.12,bold=True)
    y=max(y+40,730 if nepali else 700)
    layout=scene['layout']
    main=scene.get('value','')
    if layout in {'cover','stat','closing'}:
        if main:
            vsize=182 if len(main)<=8 else 126 if len(main)<=14 else 90
            fit_multiline(65,y,str(main),vsize,42,1160,
                          col='gold',maxlines=2,spacing=1.08,bold=True)
        if scene.get('detail'):
            fit_multiline(69,1250,str(scene['detail']),41,30,1480,
                          col='muted',maxlines=4,spacing=1.25)
        if layout=='cover':
            for k in range(5):
                radius=P(160+37*k);cx=P(835);cy=P(1088)
                dr.arc((cx-radius,cy-radius,cx+radius,cy+radius),start=180+k*9,end=320+k*9,fill=c['aqua'],width=max(2,P(3)))
    elif layout=='bars':
        bars=scene['bars']; vals=[float(a['value']) for a in bars];lo=min(0,min(vals));hi=max(vals) or 1
        yy=round(max(720,y))
        for b in bars[:5]:
            val=float(b['value']);label=str(b['label'])
            write(68,yy,label if nepali else label.upper(),31,'muted',True)
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
            label=str(block.get('label',key))
            write(92,yy+28,label if nepali else label.upper(),29,'aqua' if k==0 else 'red',True)
            fit_multiline(93,yy+92,block.get('body',''),38,27,yy+255,
                          col='white',maxlines=3,max_width=870)
    else:
        if scene.get('detail'):
            fit_multiline(69,round(max(790,y)),scene['detail'],51,30,1470,
                          col='muted',maxlines=6,spacing=1.27)
        for k in range(5):
            cy=P(930+k*85);ww=P(55+125*k)
            dr.rounded_rectangle((P(900)-ww,cy,P(900),cy+P(28)),radius=P(7),fill=c['aqua'] if k<3 else c['gold'])
    # Captions use region ~1550–1770 (generated during final mux); protect it.
    ruled(1510)
    foot=' • '.join(scene.get('source_ids',[])[:3]) or ('स्वतन्त्र विश्लेषण' if nepali else 'INDEPENDENT ANALYSIS')
    write(66,1535,foot.upper(),19,'muted')
    ruled(1835)
    write(65,1850,f"{meta['publisher'].upper()}  •  {'एआई-सहायता प्राप्त सामग्री' if nepali else 'AI-ASSISTED EDITORIAL'}",17,'muted')
    write(1008,1850,f"{ix+1:02d} / {total:02d}",19,'muted',anchor='ra')
    im.save(out,optimize=True)
    return out