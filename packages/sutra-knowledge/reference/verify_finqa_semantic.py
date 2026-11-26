#!/usr/bin/env python3
"""Independent FinQA gold-program interpreter for the deterministic public-test subset."""
import json,re,sys
from fractions import Fraction
OPS={'add':lambda a,b:a+b,'subtract':lambda a,b:a-b,'multiply':lambda a,b:a*b,'divide':lambda a,b:a/b}
PAT=re.compile(r'(add|subtract|multiply|divide)\(\s*([^,()]+?)\s*,\s*([^,()]+?)\s*\)')
NUM=re.compile(r'-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?')
def val(t,steps):
    m=re.fullmatch(r'#([0-9]+)',t)
    if m:
        i=int(m.group(1));assert 0<=i<len(steps);return steps[i]
    m=re.fullmatch(r'const_([1-9][0-9]*)',t)
    if m:return Fraction(int(m.group(1)),1)
    assert NUM.fullmatch(t);return Fraction(t)
def run(p):
    steps=[];pos=0
    while pos<len(p):
        m=PAT.match(p,pos);assert m
        a,b=val(m.group(2),steps),val(m.group(3),steps);steps.append(OPS[m.group(1)](a,b));pos=m.end()
        if pos<len(p):assert p[pos:pos+2]==', ';pos+=2
    assert steps;return steps[-1]
def main():
    c=json.load(sys.stdin);assert c['version']==1 and len(c['cases'])==24
    rows=[]
    for x in c['cases']:
        got=run(x['program']);gold=Fraction(x['answer']);ok=abs(got-gold)<=Fraction(1,100000);assert ok
        rows.append({'id':x['id'],'result':f'{got.numerator}/{got.denominator}','goldMatch':ok})
    print(json.dumps({'implementation':'python-fraction-finqa-gold-program','count':len(rows),'rows':rows,'decisionAuthority':'NONE'}))
if __name__=='__main__':main()
