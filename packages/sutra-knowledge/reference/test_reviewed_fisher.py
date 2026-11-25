"""Cross-language exact profile parity and nonidentity mutation controls."""
import sys,json
from copy import deepcopy
from verify_conflict import rawhash,require
from verify_reviewed_fisher import verify
def run():
    cases=json.load(sys.stdin);require(len(cases)==18)
    def check(b,pin=None,vpin=None,ppin=None):
        t=json.dumps(b,ensure_ascii=False,separators=(',',':'))
        return verify(t.encode(),pin or rawhash(t),vpin or b['versionDigest'],ppin or b['planDigest'])['status']
    for b in cases:require(check(b)=='VERIFIED')
    b=cases[2];mutants=[]
    for key,value in [('exactConditionalTail','1/1'),('observedDifferenceAminusB','0/1'),('feasibleTables',0),('decisionAuthority','APPROVED'),('unresolvedDesign',[]),('mathematicalThreshold','TAIL_ABOVE_DECLARED_THRESHOLD')]:
        m=deepcopy(b);m['result'][key]=value
        if m!=b:mutants.append(m)
    require(len(mutants)>=5)
    for m in mutants:require(check(m)=='REFUSED')
    for i in range(3):
        args=[None,None,None];args[i]='sha256:'+'0'*64;require(check(b,*args)=='REFUSED')
    print('Independent Fisher replay: 18 exact tables/directions; rejected',len(mutants),'derived mutants and 3 pin controls.')
if __name__=='__main__':run()
