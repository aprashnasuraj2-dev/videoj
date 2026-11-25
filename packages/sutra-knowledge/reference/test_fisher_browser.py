"""Independent verification of actual browser-exported two-group conditional report."""
import json,sys,subprocess
from copy import deepcopy
from pathlib import Path
from verify_conflict import rawhash,require
from verify_reviewed_fisher import verify
def main():
    root=Path(sys.argv[1]);archive=Path(sys.argv[2]).resolve();path=root/'living-fisher.json';data=path.read_bytes()
    pins=[(root/f'living-fisher{suffix}.sha256').read_text().strip() for suffix in ('','-version','-plan')]
    r=verify(data,*pins);require(r['status']=='VERIFIED' and r['result']['exactConditionalTail']=='1063/46189' and r['result']['observedDifferenceAminusB']=='3/5' and len(r['result']['unresolvedDesign'])==9)
    run=subprocess.run([sys.executable,'-I','-S',str(archive),str(path.resolve()),'--fisher','--pin',pins[0],'--version-pin',pins[1],'--plan-pin',pins[2]],capture_output=True,text=True,check=True);require(json.loads(run.stdout)==r)
    original=json.loads(data)
    for k,v in [('exactConditionalTail','0/1'),('observedDifferenceAminusB','0/1'),('mathematicalThreshold','TAIL_ABOVE_DECLARED_THRESHOLD'),('unresolvedDesign',[]),('decisionAuthority','VERIFIED'),('familySize',3),('alternative','less'),('qualification','Hypothesis true')]:
        m=deepcopy(original);m['result'][k]=v;require(m!=original);s=json.dumps(m,ensure_ascii=False,separators=(',',':'));require(verify(s.encode(),rawhash(s),pins[1],pins[2])['status']=='REFUSED')
    require(verify(data+b' ',*pins)['status']=='REFUSED')
    for i in (1,2):
        p=pins.copy();p[i]='sha256:'+'0'*64;require(verify(data,*p)['status']=='REFUSED')
    print('ACCEPTED actual browser exact two-group tail through independent Fraction/math.comb; REJECTED eight derived mutations and three pin controls.')
if __name__=='__main__':main()
