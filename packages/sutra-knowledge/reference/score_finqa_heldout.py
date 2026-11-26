#!/usr/bin/env python3
import json,math,re,sys
from fractions import Fraction
OPS={'add':lambda a,b:a+b,'subtract':lambda a,b:a-b,'multiply':lambda a,b:a*b,'divide':lambda a,b:a/b}
PAT=re.compile(r'(add|subtract|multiply|divide)\(\s*([^,()]+?)\s*,\s*([^,()]+?)\s*\)');NUM=re.compile(r'-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?')
def fnv(s):
 h=0x811c9dc5
 for ch in s:h^=ord(ch);h=(h*0x01000193)&0xffffffff
 return h
def val(t,steps):
 m=re.fullmatch(r'#([0-9]+)',t)
 if m:return steps[int(m.group(1))]
 m=re.fullmatch(r'const_([1-9][0-9]*)',t)
 if m:return Fraction(int(m.group(1)))
 assert NUM.fullmatch(t);return Fraction(t)
def oracle(p):
 out=[];pos=0
 while pos<len(p):
  m=PAT.match(p,pos);assert m
  out.append(OPS[m.group(1)](val(m.group(2),out),val(m.group(3),out)));pos=m.end()
  if pos<len(p):assert p[pos:pos+2]==', ';pos+=2
 return out[-1]
def pred(v):
 if v is None:return None
 return Fraction(v)
def match(p,g):return p is not None and abs(p-Fraction(g))<=Fraction(1,100000)
def wilson(k,n):
 if n==0:return None
 z=1.959963984540054;p=k/n;d=1+z*z/n;c=(p+z*z/(2*n))/d;h=z*math.sqrt(p*(1-p)/n+z*z/(4*n*n))/d
 return [max(0,c-h),min(1,c+h)]
def main():
 if len(sys.argv)!=3:raise SystemExit('usage: score corpus predictions')
 c=json.load(open(sys.argv[1],encoding='utf8'));r=json.load(open(sys.argv[2],encoding='utf8'));assert len(c['inventory'])==1147 and len(c['cases'])==40
 inv=sorted(c['inventory'],key=lambda x:(x['rank'],x['id']));assert all(x['rank']==fnv(x['id']) for x in inv);want=inv[24:64];assert [(x['id'],x['rank']) for x in c['cases']]==[(x['id'],x['rank']) for x in want]
 gold={x['id']:x for x in c['cases']};assert [x['id'] for x in r['rows']]==[x['id'] for x in c['cases']]
 for x in c['cases']:assert abs(oracle(x['program'])-Fraction(x['answer']))<=Fraction(1,100000)
 scores={};sutra={}
 for row in r['rows']:sutra[row['id']]=match(pred(row['arms']['sutra_exact_gold_ir']['prediction']),gold[row['id']]['answer'])
 for arm in r['arms']:
  covered=correct=ops=0;fail=[]
  for row in r['rows']:
   x=row['arms'][arm];ops+=x['operations'];p=pred(x['prediction'])
   if p is not None:
    covered+=1
    if match(p,gold[row['id']]['answer']):correct+=1
    else:fail.append(row['id'])
  both=[row['id'] for row in r['rows'] if sutra[row['id']] and not match(pred(row['arms'][arm]['prediction']),gold[row['id']]['answer'])]
  reverse=[row['id'] for row in r['rows'] if not sutra[row['id']] and match(pred(row['arms'][arm]['prediction']),gold[row['id']]['answer'])]
  scores[arm]={'covered':covered,'correct':correct,'total':40,'coverage':covered/40,'overallAccuracy':correct/40,'accuracyOnCovered':None if covered==0 else correct/covered,'coverage95':wilson(covered,40),'overallAccuracy95':wilson(correct,40),'declaredOperations':ops,'failures':fail,'pairedVsSutra':{'sutraCorrectOtherWrong':len(both),'otherCorrectSutraWrong':len(reverse)}}
 assert scores['sutra_exact_gold_ir']['correct']==40 and scores['sutra_exact_gold_ir']['covered']==40
 print(json.dumps({'version':1,'scorer':'independent-python-fraction','scores':scores,'counterexample':'Float64 may tie exact arithmetic on this simple held-out slice; no superiority is inferred.','decisionAuthority':'NONE'},indent=2))
if __name__=='__main__':main()
