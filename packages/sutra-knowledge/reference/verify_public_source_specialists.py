#!/usr/bin/env python3
"""Independent arithmetic and immutable fact-card verifier for two public-source specialist cases."""
import hashlib,json,sys
from fractions import Fraction
FIN='SEC Apple 2025 Form 10-K fact card. Services net sales: 2025=109158 USD million; 2024=96169 USD million; reported change=14%; Total net sales: 2025=416161 USD million; 2024=391035 USD million; reported change=6%;'
ENG='FHWA-HIF-22-025 fact card. Iteration 3: phiVn=338 kip; Vu(DC)=213.4 kip; Vu(PS)=-1.1 kip; Vum(inv)=92.1 kip; reported shear load rating factor=1.36;'
PINS={'finance':'sha256:67e99e05e03e509da9cb8abc7da8d01f54d2f24eb6804e14bd6a21021a8837b5','engineering':'sha256:e8e2d10f2fc6086052d11fb5b1a7ee94de6afb3bd013baac0a7f47a35ca1815e'}
def pin(s):return 'sha256:'+hashlib.sha256(s.encode()).hexdigest()
def main():
 x=json.load(sys.stdin)
 assert set(x)=={'finance','engineering'}
 assert x['finance']['factCard']==FIN and pin(FIN)==PINS['finance']
 assert x['engineering']['factCard']==ENG and pin(ENG)==PINS['engineering']
 f=x['finance']['values'];svc=(Fraction(f['services25'])-Fraction(f['services24']))/Fraction(f['services24']);total=(Fraction(f['total25'])-Fraction(f['total24']))/Fraction(f['total24'])
 assert svc>total and Fraction(f['servicesReported'])>Fraction(f['totalReported'])
 e=x['engineering']['values'];margin=Fraction(e['phiVn'])-Fraction(e['dead'])-Fraction(e['prestress']);assert margin>Fraction(e['live']) and Fraction(e['reportedRF'])>0
 print(json.dumps({'finance':{'servicesGrowth':str(svc),'totalGrowth':str(total),'result':'SUPPORTED'},'engineering':{'availableMarginKip':str(margin),'liveKip':str(Fraction(e['live'])),'result':'SUPPORTED'},'authority':'NONE'}))
if __name__=='__main__':main()
