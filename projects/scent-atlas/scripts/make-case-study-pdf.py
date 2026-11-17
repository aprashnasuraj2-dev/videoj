"""Six-page editorial case-study PDF from original Scent Atlas assets and verified release facts."""
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.lib.utils import ImageReader,simpleSplit
from PIL import Image
from pathlib import Path
root=Path(__file__).resolve().parents[1]
out=root/'portfolio/Scent-Atlas-Case-Study.pdf'
W,H=960,720
ink=HexColor('#1c271f'); paper=HexColor('#f4f0e5'); gold=HexColor('#d0b68a');muted=HexColor('#657066');light=HexColor('#e8e4d7')
c=canvas.Canvas(str(out),pagesize=(W,H),pageCompression=1)
c.setTitle('Scent Atlas — A Perfume Store for People Who Cannot Smell the Screen')
c.setAuthor('Scent Atlas — Independent Creative Concept')
c.setSubject('Fictional fragrance discovery concept, design rationale, implementation and live evidence')
def rect(x,y,w,h,col):c.setFillColor(col);c.rect(x,y,w,h,fill=1,stroke=0)
def txt(x,y,s,font='Helvetica',size=12,color=ink):c.setFillColor(color);c.setFont(font,size);c.drawString(x,y,s)
def paragraph(s,x,y,width,font='Helvetica',size=13,leading=19,color=ink):
 for line in simpleSplit(s,font,size,width):txt(x,y,line,font,size,color);y-=leading
 return y
def footer(n,dark=False):
 col=gold if dark else muted
 c.setStrokeColor(col);c.setLineWidth(.6);c.line(50,38,910,38)
 txt(50,20,'SCENT ATLAS / SELF-INITIATED CONCEPT / NOVEMBER 2026','Helvetica',8,col)
 txt(866,20,f'{n:02d} / 06','Helvetica',8,col)
def image_cover(p,x,y,w,h):
 im=Image.open(p).convert('RGB');ratio=max(w/im.width,h/im.height);sw,sh=round(im.width*ratio),round(im.height*ratio)
 im=im.resize((sw,sh),Image.Resampling.LANCZOS);im=im.crop(((sw-w)//2,(sh-h)//2,(sw+w)//2,(sh+h)//2));c.drawImage(ImageReader(im),x,y,width=w,height=h)
def cap(text,x,y,color=muted):txt(x,y,text.upper(),'Helvetica-Bold',9,color)
# 01 / full cover
c.drawImage(ImageReader(str(root/'portfolio/COVER-1600x1200.png')),0,0,width=W,height=H);c.linkURL('https://scent-atlas.aafnaipatro.com/',(0,0,W,H),relative=0);c.showPage()
# 02 / framing
rect(0,0,W,H,paper);rect(0,H-9,W,9,ink)
cap('01 / THE PROBLEM',52,659);txt(52,590,'The thing a screen','Times-Roman',55,ink);txt(52,530,'cannot do.', 'Times-Italic',58,ink)
y=466
y=paragraph('A fragrance can be described in a hundred beautiful words and still be impossible to picture. Scent Atlas begins somewhere more familiar: the smell of a place you already remember.',52,y,430,'Times-Roman',20,28)
y-=25
cap('THE CREATIVE RESPONSE',52,y)
y-=26
y=paragraph('Instead of a perfume glossary or a mandatory personality quiz, offer three sensory scenes. Each leads to one curated sample kit with a leading fragrance and two supporting contrasts.',52,y,430,'Helvetica',13,20)
image_cover(root/'media/rain.webp',545,106,356,518)
txt(551,88,'RAIN ON PAVEMENT   /   COOL STONE + CRUSHED LEAVES','Helvetica-Bold',9,muted)
footer(2);c.showPage()
# 03 / three worlds
rect(0,0,W,H,ink);cap('02 / THE THREE WORLDS',52,659,gold);txt(52,605,'Make the materials tangible.','Times-Roman',47,paper)
items=[('rain','01 / RAIN ON PAVEMENT','AFTER RAIN','Rain on Stone / Green Air / Pencil Cedar'),('cedar','02 / CEDAR WORKSHOP','WOOD BENCH','Cedar Shavings / Pencil Cedar / Peel & Wood'),('orange','03 / FRESH ORANGE PEEL','FRESHLY PEELED','Fresh Peel / Peel & Wood / Green Air')]
for i,(img,label,title,samples) in enumerate(items):
 x=52+ i*288;image_cover(root/f'media/{img}.webp',x,225,272,330)
 txt(x,201,label,'Helvetica-Bold',9,gold);txt(x,159,title,'Times-Roman',25,paper)
 y=136
 for line in simpleSplit(samples,'Helvetica',10,250):txt(x,y,line,'Helvetica',10,paper);y-=15
footer(3,True);c.showPage()
# 04 / experience map
rect(0,0,W,H,paper);cap('03 / THE USER JOURNEY',52,659);txt(52,602,'From scene to sample','Times-Roman',51,ink)
txt(52,566,'Three deliberate choices. Comparison is optional. No account. No checkout.','Helvetica',13,muted)
plates=[('01-DISCOVERY.jpg','01 / CHOOSE','A material memory'),('02-COMPARISON.jpg','02 / COMPARE','Six plain-language profiles'),('03-KIT-REVIEW.jpg','03 / REVIEW','Three named 2 mL concept vials')]
for i,(f,label,desc) in enumerate(plates):
 x=52+i*292;image_cover(root/'portfolio'/f,x,275,271,234)
 txt(x,247,label,'Helvetica-Bold',10,ink)
 txt(x,221,desc,'Times-Roman',16,ink)
rect(52,120,855,64,light)
txt(68,161,'DEMO COMPLETE. NO ORDER WAS PLACED.','Helvetica-Bold',15,ink)
txt(68,139,'The page is a truthful completion state, not a fictional transaction receipt.','Helvetica',11,muted)
footer(4);c.showPage()
# 05 / engineering / evidence
rect(0,0,W,H,paper);cap('04 / RELEASE EVIDENCE',52,660);txt(52,603,'Designed to be checked.','Times-Roman',49,ink)
metrics=[('11 / 11','LIVE ROUTES VERIFIED'),('6 / 6','CATALOG TESTS PASSED'),('153 KiB','LANDING RAW ASSET SUM')]
for i,(big,desc) in enumerate(metrics):
 x=52+i*290;rect(x,398,269,151,light)
 txt(x+17,469,big,'Times-Roman',45,ink)
 txt(x+17,428,desc,'Helvetica-Bold',9,muted)
cap('ENGINEERING DECISIONS',52,350)
y=319
for heading,content in [('Static, linkable by design','11 generated public routes and a friendly 404; no client-side router required.'),('One catalog, not scattered copy','Six identities and three three-vial kits validated for unique references and correct membership.'),('Respectful failure states','No account, cookies, checkout, address, or analytics data collection. Core content works without JavaScript.')]:
 txt(52,y,heading,'Times-Roman',17,ink);y-=21;y=paragraph(content,52,y,660,'Helvetica',11,16,muted);y-=17
rect(52,77,855,34,ink);txt(64,90,'NOT CLAIMED: BUYER CONVERSION LIFT / REAL PERFUME FORMULAS / VERIFIED LCP / FULL WCAG AUDIT','Helvetica-Bold',8,paper)
footer(5);c.showPage()
# 06 / closing
rect(0,0,W,H,ink);image_cover(root/'media/orange.webp',530,0,430,720)
rect(0,0,548,H,ink)
cap('05 / THE NEXT CONVERSATION',54,662,gold)
txt(54,572,'What if a fragrance','Times-Roman',47,paper);txt(54,512,'store felt more like','Times-Roman',47,paper);txt(54,452,'a remembered place?','Times-Italic',49,gold)
y=370
y=paragraph('Scent Atlas is an independently developed proof of concept, built for the conversation a fragrance house, beauty retailer or creative studio might want to have next.',54,y,427,'Helvetica',15,23,paper)
y-=29
cap('EXPLORE THE WORKING EXPERIENCE',54,y,gold);y-=27
url='scent-atlas.aafnaipatro.com';txt(54,y,url,'Helvetica-Bold',18,paper);c.linkURL('https://'+url,(52,y-3,460,y+22),relative=0)
y-=57
cap('SOURCE / RELEASE EVIDENCE',54,y,gold);y-=22
rev='0730f5e3146269dc9c099ea554e314a6e3c8d4da'
txt(54,y,rev,'Courier',9,paper)
y-=40
paragraph('Concept only. No order placed; sample kits and profiles are illustrative.',54,y,416,'Helvetica',10,15,gold)
footer(6,True);c.showPage()
c.save()
print('PDF created:',out,out.stat().st_size)
