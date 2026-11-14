#!/usr/bin/env python3
"""DHAGO / From Fibre to Fabric — original procedural motion film.

No third-party image, footage, voice, or recorded field sound.
This is explicitly an ARTISTIC RECONSTRUCTION of thread and interlacing,
not documentary footage of Nepali craftspeople or a named textile tradition.
Output: deterministic H.264/AAC + optional VP9/Opus, poster and contact sheet.
Requires Pillow, NumPy, OpenCV, FFmpeg; no proprietary services or account fees.
"""
import argparse, math, random, subprocess, tempfile, wave
from pathlib import Path
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

FPS=24
W,H=1280,720
DURATION=64
rng=np.random.default_rng(31014)
random.seed(31014)
SCALE=1.12
BW,BH=int(W*SCALE),int(H*SCALE)

FONT='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'


def rgb(s):
    return tuple(int(s[i:i+2],16) for i in (1,3,5))


def soft_background(a,b, glow=(.67,.30), strength=.25):
    yy,xx=np.mgrid[0:BH,0:BW].astype(np.float32)
    y=(yy/BH)[...,None]
    top=np.array(rgb(a),np.float32); bottom=np.array(rgb(b),np.float32)
    base=top*(1-y)+bottom*y
    haze=np.exp(-((xx/BW-glow[0])**2/.14+(yy/BH-glow[1])**2/.28))*strength
    base=base*(1-haze[...,None])+np.array([222,179,117])*haze[...,None]
    tiny=rng.normal(0,1.0,(BH,BW,1))
    return Image.fromarray(np.uint8(np.clip(base+tiny,0,255)), 'RGB').convert('RGBA')


def fibre_frame():
    im=soft_background('#171b18','#403d2f',(.64,.31),.28)
    # A dense, light-catching carded roving. Geometry stays on the cloth:
    # fibers are curved but attached to the body, never particles in the air.
    shadow=Image.new('RGBA',(BW,BH));sd=ImageDraw.Draw(shadow,'RGBA')
    sd.ellipse((BW*.11,BH*.17,BW*.92,BH*.85),fill=(10,9,8,195))
    im=Image.alpha_composite(im,shadow.filter(ImageFilter.GaussianBlur(45)))
    body=Image.new('RGBA',(BW,BH)); bd=ImageDraw.Draw(body,'RGBA')
    for j in range(20000):
        cx=random.gauss(BW*.48,BW*.205)
        cy=random.gauss(BH*.51,BH*.16)
        if abs(cx-BW*.48)>BW*.41 or abs(cy-BH*.52)>BH*.30:continue
        length=random.uniform(26,185)
        angle=random.gauss(-.14,.22)
        sway=random.uniform(2,13)
        phase=random.uniform(0,math.tau)
        pts=[]
        for i in range(7):
            t=i/6
            pts.append((int(cx+length*(t-.5)*math.cos(angle)),
                        int(cy+length*(t-.5)*math.sin(angle)+sway*math.sin(t*math.pi*1.6+phase))))
        shade=random.gauss(0,22)
        col=tuple(int(max(0,min(255,c+shade))) for c in (218,203,171))
        bd.line(pts,fill=(*col,random.randint(55,205)),width=random.choice([1,1,2,2,3]))
    im=Image.alpha_composite(im,body)
    # Fluffy stray ends are most visible against the darker edges.
    wisp=Image.new('RGBA',(BW,BH)); wd=ImageDraw.Draw(wisp,'RGBA')
    for j in range(2600):
        theta=random.uniform(0,math.tau)
        radius=random.uniform(.67,1.12)
        x=BW*.49+BW*.365*radius*math.cos(theta)
        y=BH*.51+BH*.245*radius*math.sin(theta)
        length=random.uniform(12,95)
        dx=math.cos(theta)*length;dy=math.sin(theta)*length*.47
        wd.line((x,y,x+dx*.4,y+dy*.7,x+dx,y+dy),fill=(237,223,192,random.randint(25,150)),width=1)
    im=Image.alpha_composite(im,wisp)
    return np.asarray(im.convert('RGB'))[:,:,::-1].copy()


def spinning_frame():
    im=soft_background('#151917','#494034',(.56,.37),.25)
    d=ImageDraw.Draw(im,'RGBA')
    # A drafting fan with visibly irregular filaments converging on the yarn.
    origin=(int(BW*.52),int(BH*.51))
    for j in range(850):
        sy=random.gauss(BH*.52,BH*.23);sx=random.uniform(-60,BW*.28)
        points=[];k=random.uniform(1.2,2.0); wiggle=random.uniform(1,13)
        for i in range(18):
            t=i/17
            points.append((int(sx+(origin[0]-sx)*t),int(sy+(origin[1]-sy)*t**k + wiggle*math.sin(t*8+j))))
        color=random.choice([(239,220,182,95),(243,231,201,90),(206,178,138,110),(164,136,111,90)])
        d.line(points,fill=color,width=random.choice([1,1,2]))
    # Warm wood-toned spindle body, but no claim of a particular actual tool.
    x=int(BW*.83); y=int(BH*.46)
    d.ellipse((x-80,y+155,x+80,y+180),fill=(3,9,9,110))
    d.polygon([(x-16,y-185),(x+12,y-185),(x+30,y+220),(x-12,y+220)],fill=(95,58,38,230))
    d.ellipse((x-106,y+70,x+106,y+135),fill=(126,74,40,245),outline=(213,150,83,230),width=4)
    d.ellipse((x-77,y+89,x+77,y+119),fill=(60,44,30,250),outline=(217,167,100,160),width=2)
    # Fine diagonal grain lines for intentional material continuity.
    for j in range(34):
        yy=y-164+j*9
        d.line((x-8,yy,x+13,yy+2),fill=(215,170,111,48),width=1)
    return np.asarray(im.convert('RGB'))[:,:,::-1].copy()


def loom_frame():
    im=soft_background('#161c1a','#2b302b',(.66,.35),.1)
    d=ImageDraw.Draw(im,'RGBA')
    # A loom-derived schematic, physically coherent over/under topology.
    x0,x1=70,BW-85; y0,y1=82,BH-80
    d.rectangle((x0-23,y0-38,x1+23,y1+40),outline=(113,77,50,255),width=28)
    d.rectangle((x0-10,y0-24,x1+10,y1+24),outline=(196,151,89,110),width=3)
    colors=[(184,165,135),(212,186,147),(158,145,120),(230,199,158)]
    warp_n=51;weft_n=38
    for i in range(warp_n):
        x=x0+(x1-x0)*i/(warp_n-1)
        d.line((int(x+1),y0,int(x+1),y1),fill=(25,23,20,180),width=5)
        c=colors[i%4]
        d.line((int(x),y0,int(x),y1),fill=(*c,220),width=3)
    for j in range(weft_n):
        y=y0+(y1-y0)*(.42+.58*j/(weft_n-1))
        d.line((x0,y+2,x1,y+2),fill=(8,13,12,125),width=5)
        c=colors[(j+1)%4]
        d.line((x0,y,x1,y),fill=(*c,195),width=3)
        for i in range((j%2),warp_n,2):
            x=x0+(x1-x0)*i/(warp_n-1)
            d.line((x-3,y,x+3,y),fill=(*colors[i%4],255),width=5)
    return np.asarray(im.convert('RGB'))[:,:,::-1].copy()


def cloth_frame():
    im=soft_background('#1b221d','#564639',(.70,.18),.22)
    d=ImageDraw.Draw(im,'RGBA')
    x0,y0=68,73;x1,y1=BW-74,BH-70
    d.polygon([(x0+60,y0),(x1-3,y0+30),(x1,y1-68),(x0,y1)],fill=(182,161,127,255))
    # Thousands of crossing warp/weft traces: raised crossing catches light,
    # dark recesses stay dark, selvedge remains imperfect.
    for i,x in enumerate(range(x0+38,x1-7,7)):
        shade=12*math.sin(i*.14)
        v=int(180+shade)
        d.line((x,y0+7,x-21,y1-28),fill=(65,57,47,100),width=5)
        d.line((x-1,y0+7,x-22,y1-28),fill=(v,min(255,v+10),v-7,220),width=3)
    for j,y in enumerate(range(y0+16,y1-17,6)):
        v=int(194+10*math.sin(j*.15))
        d.line((x0+17,y,x1-12,y+9),fill=(82,65,49,110),width=5)
        d.line((x0+17,y-1,x1-12,y+8),fill=(v,v-13,v-37,230),width=3)
        for i,x in enumerate(range(x0+38,x1-7,14)):
            if (i+j)%2:
                d.line((x-3,y,x+3,y),fill=(233,208,165,180),width=3)
    # Dark fold on right catches directional light, cloth is tactile rather
    # than a flat repeating textile wallpaper.
    d.line([(x0+5,y0+55),(x0+118,y0+62),(x0+53,y1-18)],fill=(238,212,166,155),width=5)
    d.line([(x1-114,y0+15),(x1-55,y0+56),(x1-120,y1-63)],fill=(63,52,45,140),width=14)
    # Small selvedge irregularities at edge.
    for j in range(118):
        y=y0+18+j*5
        d.line((x0+11,y,x0+1-random.randint(1,24),y+random.randint(-7,7)),fill=(229,201,167,random.randint(90,160)),width=1)
    return np.asarray(im.convert('RGB'))[:,:,::-1].copy()


def label_overlay():
    labels=['01  /  ORIGINS','02  /  SPINNING','03  /  INTERLACING','04  /  CLOTH']
    names=['Raw fibre','Twist into thread','Warp meets weft','Cloth holds time']
    layers=[]
    for number,title in zip(labels,names):
        ui=Image.new('RGBA',(W,H));draw=ImageDraw.Draw(ui,'RGBA')
        draw.rounded_rectangle((62,563,510,675),radius=3,fill=(15,20,18,172))
        draw.text((83,581),number,font=ImageFont.truetype(FONT,18),fill=(210,188,149,255))
        draw.text((81,613),title,font=ImageFont.truetype(FONT,30),fill=(245,235,217,255))
        layers.append(np.asarray(ui)[:,:, [2,1,0,3]].copy())
    return layers


def dynamic_frame(bases,labels,sec):
    section=min(3,int(sec//16));local=sec-section*16
    base=bases[section]
    # Optical slow push, under 2.5% across scene; no fake perspective jolts.
    zoom=1.006+.012*(local/16)
    theta=.07*math.sin(sec*.18)
    M=cv2.getRotationMatrix2D((BW/2,BH/2),theta,zoom)
    M[0,2]-=(BW-W)/2 - 5*math.sin(sec*.2)
    M[1,2]-=(BH-H)/2 - 3*math.sin(sec*.23)
    frame=cv2.warpAffine(base,M,(W,H),flags=cv2.INTER_LINEAR,borderMode=cv2.BORDER_REFLECT101)
    if section==1:
        # Continuous drafted yarn. A moving twisted highlight shows torsion;
        # drawn as illustration, never passed off as actual filmed mechanics.
        middle=(int(W*.52),int(H*.51));end=(int(W*.83),int(H*.46))
        for k in range(13):
            p=[];o=k-6
            for i in range(0,90):
                t=i/89
                x=int(middle[0]+(end[0]-middle[0])*t)
                yy=middle[1]+(end[1]-middle[1])*t+3*math.sin(t*math.tau*16+sec*math.tau*2+k*.44)+o*.5
                p.append([x,int(yy)])
            c=(177+((k*11)%38),210+((k*7)%27),235+((k*5)%19))
            cv2.polylines(frame,[np.array(p,np.int32)],False,c,1,cv2.LINE_AA)
        # Moving spindle whorl highlight, understated.
        cx=int(W*.83);cy=int(H*.46)+100
        s=math.sin(sec*math.tau*2)
        cv2.ellipse(frame,(cx,cy),(75,11),0,5+180*s/3,15+180*s/3,(172,194,219),2,cv2.LINE_AA)
    elif section==2:
        # A moving shuttle-shaped wooden silhouette along a *single* weft.
        t=sec*0.55
        progress=(t%2)
        if progress>1:progress=2-progress
        cx=int(145+progress*(W-300))
        yy=int(H*.60+5*math.sin(sec*2.8))
        poly=np.array([[cx-85,yy],[cx-48,yy-11],[cx+52,yy-11],[cx+89,yy],[cx+52,yy+12],[cx-48,yy+12]],np.int32)
        cv2.fillConvexPoly(frame,poly,(52,83,119),cv2.LINE_AA)
        cv2.polylines(frame,[poly],True,(122,161,191),2,cv2.LINE_AA)
        cv2.line(frame,(cx-38,yy-2),(cx+40,yy-2),(159,193,217),1,cv2.LINE_AA)
        cv2.line(frame,(70,yy),(cx-85,yy),(171,183,203),2,cv2.LINE_AA)
    elif section==3:
        # Sheen tracks woven ridges as a raking source moves across cloth.
        xx=np.arange(W,dtype=np.float32)
        wave=np.exp(-((xx-(180+sec%16*52))/145)**2).astype(np.float32)
        frame=np.uint8(np.clip(frame.astype(np.float32)+wave[None,:,None]*8,0,255))
    # Subtle natural falloff, not fake film damage.
    yy,xx=np.mgrid[0:H,0:W].astype(np.float32)
    v=1-.12*((xx-W*.5)/(W*.5))**2-.1*((yy-H*.5)/(H*.5))**2
    frame=np.uint8(np.clip(frame*v[...,None],0,255))
    # Opening 2.5 seconds remain exclusively textile imagery. Labels arise
    # with restrained fade and vanish before the next scene.
    if local>2.5 and local<14.8:
        alpha=min(1,(local-2.5)/.8,(14.8-local)/.8)
        layer=labels[section];a=layer[:,:,3:4].astype(np.float32)/255*alpha
        frame=np.uint8(np.clip(frame.astype(np.float32)*(1-a)+layer[:,:,:3]*a,0,255))
    return frame


def sound(path):
    sr=48000;n=sr*DURATION
    r=np.random.default_rng(24011)
    t=np.arange(n,dtype=np.float64)/sr
    # Original restrained studio sound design: two low partials, filtered
    # fibre-like friction, tiny timing accents in the interlacing chapter.
    # These are NOT field-recorded sound effects.
    drone=.009*np.sin(2*np.pi*110*t)+.006*np.sin(2*np.pi*164.81*t)
    air=r.standard_normal(n).astype(np.float32)
    air=np.convolve(air[:],np.ones(33,dtype=np.float32)/33,'same')
    bed=drone+.020*air
    for at in [18,20.5,22.5,25.8,28.3,33.1,35.6,38.2,40.9,44,46.5]:
        p=int(at*sr);length=int(.13*sr)
        z=np.arange(length)/sr
        tick=.012*np.sin(2*np.pi*171*z)*np.exp(-z*31)
        bed[p:p+length]+=tick
    envelope=np.clip(t/2.5,0,1)*np.clip((DURATION-t)/3.5,0,1)
    bed*=envelope*9
    # Mild stereo divergence without phase-inverting the low fundamentals.
    left=bed*.94;right=bed*.96+np.roll(bed,147)*.06
    pcm=np.uint16(np.clip(np.stack([left,right],axis=1),-1,1)*32767+32768).astype('<u2')
    with wave.open(str(path),'wb') as f:
        f.setnchannels(2);f.setsampwidth(2);f.setframerate(sr)
        f.writeframes((pcm.astype(np.int32)-32768).astype('<i2').tobytes())


def run(cmd):
    print('+',' '.join(map(str,cmd)),flush=True)
    subprocess.run(list(map(str,cmd)),check=True)


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--out',default='output/dhago')
    parser.add_argument('--samples-only',action='store_true')
    parser.add_argument('--webm',action='store_true')
    args=parser.parse_args()
    out=Path(args.out);out.mkdir(parents=True,exist_ok=True)
    print('Creating original textile material scenes…',flush=True)
    bases=[fibre_frame(),spinning_frame(),loom_frame(),cloth_frame()]
    labels=label_overlay()
    checks=[.15,3.8,12.5,18,23.5,34,42,51.5,61]
    photos=[]
    for i,s in enumerate(checks):
        frame=dynamic_frame(bases,labels,s)
        cv2.imwrite(str(out/f'frame-{i:02d}-{int(s*1000):05d}.jpg'),frame,[cv2.IMWRITE_JPEG_QUALITY,94])
        photos.append(cv2.resize(frame,(480,270)))
    sheet=np.concatenate([np.concatenate(photos[i:i+3],axis=1) for i in range(0,9,3)],axis=0)
    cv2.imwrite(str(out/'contact-sheet.jpg'),sheet,[cv2.IMWRITE_JPEG_QUALITY,94])
    cv2.imwrite(str(out/'poster.jpg'),dynamic_frame(bases,labels,.15),[cv2.IMWRITE_JPEG_QUALITY,97])
    cv2.imwrite(str(out/'poster.webp'),dynamic_frame(bases,labels,.15),[cv2.IMWRITE_WEBP_QUALITY,95])
    if args.samples_only:
        print('Sample frames ready in',out);return
    with tempfile.TemporaryDirectory(prefix='dhago-film-') as td:
        tm=Path(td); silent=tm/'silent.mp4';wav=tm/'sound.wav'
        cmd=['ffmpeg','-hide_banner','-loglevel','error','-y','-f','rawvideo','-pix_fmt','bgr24','-s',f'{W}x{H}','-r',str(FPS),'-i','pipe:0','-an','-c:v','libx264','-preset','veryfast','-crf','21','-pix_fmt','yuv420p','-movflags','+faststart',str(silent)]
        proc=subprocess.Popen(cmd,stdin=subprocess.PIPE)
        try:
            for k in range(DURATION*FPS):
                proc.stdin.write(dynamic_frame(bases,labels,k/FPS).tobytes())
                if k%240==0:print(f'Film frames {k}/{DURATION*FPS}',flush=True)
        finally:
            proc.stdin.close()
        if proc.wait():raise RuntimeError('H.264 frame encode failed')
        print('Synthesizing restrained original sound…',flush=True)
        sound(wav)
        master=out/'from-fibre-to-fabric.mp4'
        run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',silent,'-i',wav,'-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-b:a','128k','-ar','48000','-ac','2','-shortest','-movflags','+faststart',master])
    if args.webm:
        run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',master,'-c:v','libvpx-vp9','-crf','33','-b:v','0','-deadline','realtime','-cpu-used','6','-row-mt','1','-threads','4','-c:a','libopus','-b:a','96k',out/'from-fibre-to-fabric.webm'])
    print('Film ready:',master,flush=True)

if __name__=='__main__':main()