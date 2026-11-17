"""Generate original portfolio layouts from the project's own scenes and UI captures.
Requires Pillow; no user assets, trademarks or font files are distributed.
"""
from PIL import Image, ImageDraw, ImageFont, ImageEnhance, ImageFilter
from pathlib import Path
root=Path(__file__).resolve().parents[1];out=root/'portfolio';out.mkdir(exist_ok=True)
C='#1c271f';P='#f4f0e5';G='#d0b68a';S='#bcc5b6'
serif='/usr/share/fonts/truetype/noto/NotoSerif-Regular.ttf'
sans='/usr/share/fonts/opentype/inter/Inter-Regular.otf'
bold='/usr/share/fonts/opentype/inter/Inter-SemiBold.otf'
font=lambda f,size:ImageFont.truetype(f,size)
FR=font(serif,118);FSub=font(serif,43);FBody=font(sans,30);FSmall=font(bold,18)
def fill_crop(im,target):
    w,h=target; ratio=max(w/im.width,h/im.height);scaled=im.resize((round(im.width*ratio),round(im.height*ratio)),Image.Resampling.LANCZOS);x=(scaled.width-w)//2;y=(scaled.height-h)//2;return scaled.crop((x,y,x+w,y+h))
def text(draw,xy,t,ft,fill):draw.text(xy,t,font=ft,fill=fill)
# 1600 x 1200 case-study cover: unique editorial photography and typeset words.
cv=Image.new('RGB',(1600,1200),C);d=ImageDraw.Draw(cv)
d.line((70,64,1530,64),fill='#5c685b',width=2)
text(d,(72,27),'SCENT ATLAS     /     AN EXERCISE IN SCENT MEMORY',FSmall,P)
text(d,(1350,27),'2026 / 001',FSmall,S)
text(d,(73,102),'Where would',FR,P);text(d,(73,247),'you rather be?',FR,G)
text(d,(79,410),'A perfume store for people who cannot smell the screen.',FSub,P)
text(d,(80,475),'Begin with a place. End with a three-vial concept kit.',FBody,S)
for i,(name,label) in enumerate([('rain','01 / RAIN ON PAVEMENT'),('cedar','02 / CEDAR WORKSHOP'),('orange','03 / FRESH ORANGE PEEL')]):
    left=78+i*483;top=565
    src=Image.open(root/f'media/{name}.webp').convert('RGB');photo=fill_crop(src,(450,510));cv.paste(photo,(left,top))
    over=Image.new('RGBA',(450,125),(0,0,0,0));od=ImageDraw.Draw(over)
    for y in range(125):od.line((0,y,449,y),fill=(7,11,9,round(180*y/125)))
    cv.paste(over,(left,top+385),over)
    text(d,(left+20,top+457),label,FSmall,P)
d.line((78,1120,1522,1120),fill='#5c685b',width=2)
text(d,(78,1145),'THREE SCENES     /     SIX IMAGINED SCENTS     /     THREE CURATED KITS',FSmall,P)
text(d,(1441,1145),'↗' if False else '001',FSmall,S)
cv.save(out/'COVER-1600x1200.png',optimize=True)
cv.save(root/'media/social-cover.webp',format='WEBP',quality=83,method=6)
# Three annotated interface stills — screenshots from rendered project UI, not invented product mocks.
entries=[('01-DISCOVERY','landing-1440.png','THE FIRST DECISION','Three material memories, not a quiz.',(0,160,1440,1700)),('02-COMPARISON','compare-1440.png','THE COMPARISON','Plain words, side by side.',(0,0,1440,1710)),('03-KIT-REVIEW','kit-1440.png','THE THREE-VIAL EDIT','One lead. Two purposeful contrasts.',(0,0,1440,1710))]
for item,shot,headline,sub,crop in entries:
    img=Image.new('RGB',(1600,1100),C);dr=ImageDraw.Draw(img)
    text(dr,(66,48),'SCENT ATLAS  /  EXPERIENCE DETAIL',FSmall,G)
    text(dr,(65,113),headline,font(serif,71),P)
    text(dr,(67,224),sub,font(sans,25),S)
    screenshot=Image.open(root/'docs'/shot).convert('RGB').crop(crop)
    screenshot=fill_crop(screenshot,(1434,710))
    img.paste(screenshot,(83,329));dr.rectangle((82,328,1518,1040),outline='#cabd9c',width=2)
    text(dr,(70,1064),item.replace('-',' / '),FSmall,P)
    img.save(out/(item+'.png'),optimize=True)
print('cover and three annotated screenshots produced',[(x.name,x.stat().st_size) for x in out.glob('*.png')])
